import json
import os
import threading
from collections import deque
from datetime import datetime, timezone

from dotenv import load_dotenv
from flask import Flask, flash, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

import firebase_admin
from firebase_admin import credentials, db as rtdb
import paho.mqtt.client as mqtt

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET", "replace-this-in-prod")


# --- Firebase Realtime Database initialization ---
FIREBASE_CRED = os.environ.get("FIREBASE_CREDENTIALS")
FIREBASE_DATABASE_URL = os.environ.get("FIREBASE_DATABASE_URL")

firebase_ready = False
if not FIREBASE_CRED or not os.path.exists(FIREBASE_CRED):
    print(f'FIREBASE_CREDENTIALS not set or file not found at "{FIREBASE_CRED}". Firebase disabled.')
elif not FIREBASE_DATABASE_URL:
    print("FIREBASE_DATABASE_URL not set in .env. Firebase disabled.")
else:
    cred = credentials.Certificate(FIREBASE_CRED)
    firebase_admin.initialize_app(cred, {"databaseURL": FIREBASE_DATABASE_URL})
    firebase_ready = True
    print(f"Firebase Realtime Database connected: {FIREBASE_DATABASE_URL}")

users_ref = rtdb.reference("users") if firebase_ready else None
health_ref = rtdb.reference("health_data") if firebase_ready else None


# --- In-memory live data buffer ---
RECENT_MAXLEN = 500
recent_readings = deque(maxlen=RECENT_MAXLEN)
recent_lock = threading.Lock()


def add_recent_reading(reading: dict):
    with recent_lock:
        recent_readings.append(reading)


def get_recent_readings(limit: int = 100, newest_first: bool = True):
    with recent_lock:
        items = list(recent_readings)
    if newest_first:
        items = list(reversed(items))
    return items[:limit]


def save_health_to_firebase(payload: dict):
    if not firebase_ready:
        print("Firebase not configured; skipping remote save.")
        return

    try:
        doc = payload.copy()
        if "device_id" not in doc:
            doc["device_id"] = "mydevice"
        health_ref.push(doc)
    except Exception as exc:
        print("Error saving to Firebase Realtime Database:", exc)


def fetch_recent_from_firebase(limit: int = 100):
    if not firebase_ready:
        return []

    try:
        snapshot = health_ref.order_by_key().limit_to_last(limit).get() or {}
        items = [value for _, value in sorted(snapshot.items(), key=lambda item: item[0], reverse=True)]
        return items
    except Exception as exc:
        print("Error reading from Firebase Realtime Database:", exc)
        return []


def find_user_by_email(email: str):
    if not firebase_ready:
        return None

    try:
        matches = users_ref.order_by_child("email").equal_to(email).get()
        if not matches:
            return None
        key, value = next(iter(matches.items()))
        value["_key"] = key
        return value
    except Exception as exc:
        print("Error querying user from Firebase:", exc)
        return None


# --- MQTT client setup ---
MQTT_BROKER = os.environ.get("MQTT_BROKER", "test.mosquitto.org")
MQTT_PORT = int(os.environ.get("MQTT_PORT", 1883))
MQTT_TOPIC = os.environ.get("MQTT_TOPIC", "data/53384208/all")


def _to_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _to_float(value, default=None):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize_health_payload(data: dict, topic: str):
    steps = data.get("steps")
    if steps is None:
        steps = data.get("step_count")
    if steps is None:
        steps = data.get("pedometry")

    hr = data.get("hr_avg")
    if hr is None:
        hr = data.get("hr")
    if hr is None:
        hr = data.get("heart_rate")

    spo2 = data.get("spo2")
    temp = data.get("temp")
    if temp is None:
        temp = data.get("temperature")

    motion = data.get("mpu")
    if motion is None:
        motion = {
            "accel": data.get("accel"),
            "gyro": data.get("gyro"),
        }

    now = datetime.now(timezone.utc)
    mapped_data = {
        "pedometry": _to_int(steps, 0),
        "hr": _to_float(hr, None),
        "spo2": _to_float(spo2, None),
        "temp": _to_float(temp, None),
        "motion": motion,
        "topic": topic,
        "device_id": data.get("device_id", "mydevice"),
        "received_at": now.isoformat(),
    }

    return mapped_data, now


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"Connected successfully to {MQTT_BROKER}")
        client.subscribe(MQTT_TOPIC)
        print(f"Subscribed to topic: {MQTT_TOPIC}")
    else:
        print(f"Connection failed with code {rc}")


def on_message(client, userdata, msg):
    try:
        payload = msg.payload.decode("utf-8")
        data = json.loads(payload)
    except json.JSONDecodeError:
        print("Received invalid JSON payload:", msg.payload)
        return
    except Exception as exc:
        print("Error decoding message:", exc)
        return

    mapped_data, now = normalize_health_payload(data, msg.topic)

    print(
        f"[{now.strftime('%H:%M:%S')}] Data received -> "
        f"steps={mapped_data['pedometry']} hr={mapped_data['hr']} "
        f"spo2={mapped_data['spo2']} temp={mapped_data['temp']}"
    )

    add_recent_reading(mapped_data)
    save_health_to_firebase(mapped_data)


def start_mqtt_listener():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
    except Exception as exc:
        print("Failed to connect to MQTT broker:", exc)
        return

    client.loop_forever()


@app.route("/")
def index():
    if "user" in session:
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        email = request.form["email"].strip().lower()
        password = request.form["password"]

        if not email or not password:
            flash("Email and password required", "danger")
            return redirect(url_for("register"))

        if not firebase_ready:
            flash("Server not configured with Firebase. Signup disabled.", "danger")
            return redirect(url_for("register"))

        if find_user_by_email(email):
            flash("Email already registered", "warning")
            return redirect(url_for("register"))

        users_ref.push(
            {
                "email": email,
                "password_hash": generate_password_hash(password),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )

        flash("Account created - please sign in", "success")
        return redirect(url_for("login"))

    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form["email"].strip().lower()
        password = request.form["password"]

        if not firebase_ready:
            flash("Server not configured with Firebase. Login disabled.", "danger")
            return redirect(url_for("login"))

        user = find_user_by_email(email)
        if not user or not check_password_hash(user.get("password_hash", ""), password):
            flash("Invalid credentials", "danger")
            return redirect(url_for("login"))

        session["user"] = email
        flash("Signed in", "success")
        return redirect(url_for("dashboard"))

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.pop("user", None)
    flash("Signed out", "info")
    return redirect(url_for("login"))


@app.route("/dashboard")
def dashboard():
    if "user" not in session:
        return redirect(url_for("login"))

    entries = get_recent_readings(limit=100, newest_first=True)
    if not entries:
        entries = fetch_recent_from_firebase(limit=100)

    return render_template("dashboard.html", entries=entries)


@app.route("/history")
def history():
    if "user" not in session:
        return redirect(url_for("login"))

    rows = fetch_recent_from_firebase(limit=500)
    rows = list(reversed(rows))
    data = [
        {
            "ts": row.get("received_at"),
            "hr": row.get("hr"),
            "spo2": row.get("spo2"),
            "pedometry": row.get("pedometry"),
        }
        for row in rows
    ]

    return render_template("history.html", data=json.dumps(data))


@app.route("/api/recent")
def api_recent():
    entries = get_recent_readings(limit=50, newest_first=True)
    if entries:
        return jsonify(entries)
    return jsonify(fetch_recent_from_firebase(limit=50))


if __name__ == "__main__":
    listener = threading.Thread(target=start_mqtt_listener, daemon=True)
    listener.start()
    app.run(host="0.0.0.0", port=5000, debug=True)