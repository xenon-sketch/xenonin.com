/* Xenon Industries site script */

/* ---- Stock + order buttons: edit here when stock changes ----
   status: "buy"      -> "Buy now" button, opens the order form (cash on delivery)
   status: "preorder" -> "Pre-order" button, opens the same order form
   status: "soon"     -> "Coming soon" + a "Get notified" link to Instagram       */
const NOTIFY_URL = "https://www.instagram.com/xenon.industries";
// Each PikoBot has its own order form link (taken from the old site)
const PRODUCTS = {
  classic: { status: "preorder", formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfCW9DRiWOvLXy0NVFJLAx4bVV4eMl2Oq83eg4WDIAkjex2NQ/viewform?usp=pp_url&entry.550752312=PikoBot+Classic&entry.1019478409=Cash+on+Delivery" },
  bruno:   { status: "preorder", formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfCW9DRiWOvLXy0NVFJLAx4bVV4eMl2Oq83eg4WDIAkjex2NQ/viewform?usp=pp_url&entry.550752312=PikoBot+Transparent+(Limited+Version)&entry.1019478409=Cash+on+Delivery" },
  bw:      { status: "preorder", formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfCW9DRiWOvLXy0NVFJLAx4bVV4eMl2Oq83eg4WDIAkjex2NQ/viewform?usp=pp_url&entry.550752312=PikoBot+Black+%26+White&entry.1019478409=Cash+on+Delivery" },
  tofubot: { status: "soon" },
  zenlamp: { status: "soon" },
  clock:   { status: "soon" },
};

document.querySelectorAll("[data-action]").forEach((slot) => {
  const p = PRODUCTS[slot.dataset.action];
  if (!p) return;
  const style = slot.dataset.style || "btn--ink";
  if (p.status === "buy") {
    slot.innerHTML = `<a class="btn ${style}" href="${p.formUrl}" target="_blank" rel="noopener">Buy now</a><span class="stock">In stock, cash on delivery</span>`;
  } else if (p.status === "preorder") {
    slot.innerHTML = `<a class="btn ${style}" href="${p.formUrl}" target="_blank" rel="noopener">Pre-order</a><span class="stock stock--out">Pre-order now, delivered in 15–20 days</span>`;
  } else {
    slot.innerHTML = `<span class="stock stock--out">Coming soon</span><a class="btn ${style}" href="${NOTIFY_URL}" target="_blank" rel="noopener">Get notified</a>`;
  }
});

document.querySelectorAll("[data-pill]").forEach((el) => {
  const p = PRODUCTS[el.dataset.pill];
  if (p) el.textContent = { buy: "In stock", preorder: "Pre-order", soon: "Soon" }[p.status];
});

/* ---- Nav ---- */
const nav = document.getElementById("nav");
const toggle = document.getElementById("navToggle");
const hero = document.querySelector(".hero");
const onScroll = () => {
  const limit = hero ? hero.offsetTop + hero.offsetHeight - 80 : 40;
  nav.classList.toggle("is-scrolled", window.scrollY > limit || nav.classList.contains("is-open"));
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();
toggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(open));
  toggle.textContent = open ? "Close" : "Menu";
  onScroll();
});
document.querySelectorAll(".nav__links a").forEach((a) =>
  a.addEventListener("click", () => {
    nav.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
    if (toggle) toggle.textContent = "Menu";
    onScroll();
  })
);

/* ---- The eyes in "big mood" ---- */
const pupils = [...document.querySelectorAll(".eye__pupil")];
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (pupils.length && !reduce) {
  const look = (x, y) => {
    pupils.forEach((p) => {
      const r = p.parentElement.getBoundingClientRect();
      const dx = x - (r.left + r.width / 2);
      const dy = y - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const max = r.width * 0.22;
      const k = Math.min(1, d / 400);
      p.style.setProperty("--px", `${(dx / d) * max * k}px`);
      p.style.setProperty("--py", `${(dy / d) * max * 0.9 * k}px`);
    });
  };
  window.addEventListener("pointermove", (e) => look(e.clientX, e.clientY), { passive: true });

  // touch screens have no cursor: glance around on their own
  if (!window.matchMedia("(hover: hover)").matches) {
    const spots = [[0, 0], [-1, 0], [1, -0.4], [0, 0.6], [1, 0]];
    let i = 0;
    setInterval(() => {
      const [sx, sy] = spots[i++ % spots.length];
      pupils.forEach((p) => {
        const w = p.parentElement.offsetWidth * 0.22;
        p.style.setProperty("--px", `${sx * w}px`);
        p.style.setProperty("--py", `${sy * w}px`);
      });
    }, 1600);
  }

  const blink = () => {
    pupils.forEach((p) => p.style.setProperty("--blink", "0.08"));
    setTimeout(() => pupils.forEach((p) => p.style.setProperty("--blink", "1")), 130);
    setTimeout(blink, 2400 + Math.random() * 3200);
  };
  setTimeout(blink, 1800);
}

const y = document.getElementById("year");
if (y) y.textContent = new Date().getFullYear();

/* ---- Reels: muted autoplay in view, tap for sound, chapter buttons ---- */
const reels = [...document.querySelectorAll(".reel__video")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const userStarted = new WeakSet();   // videos the visitor started or unmuted themselves

const setSoundState = (video) => {
  const btn = document.querySelector(`[data-play="${video.id}"]`);
  if (btn) btn.hidden = !video.muted;
};
const startReel = (video, from) => {
  if (!video) return;
  reels.forEach((v) => { if (v !== video) { v.pause(); v.muted = true; setSoundState(v); } });
  if (typeof from === "number") video.currentTime = from;
  video.muted = false;
  userStarted.add(video);
  video.play().catch(() => {});
  setSoundState(video);
};
document.querySelectorAll("[data-play]").forEach((btn) =>
  btn.addEventListener("click", () => startReel(document.getElementById(btn.dataset.play)))
);
document.querySelectorAll("[data-seek]").forEach((btn) =>
  btn.addEventListener("click", () => startReel(document.getElementById(btn.dataset.target), Number(btn.dataset.seek)))
);
reels.forEach((v) => {
  v.muted = true;
  v.loop = true;
  v.addEventListener("volumechange", () => { if (!v.muted) userStarted.add(v); setSoundState(v); });
});

// play muted while on screen, pause when scrolled away
if (!reduceMotion && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target: v, isIntersecting }) => {
      if (isIntersecting) {
        if (v.paused && (v.muted || !userStarted.has(v))) v.play().catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  }, { threshold: 0.5 });
  reels.forEach((v) => io.observe(v));
}
