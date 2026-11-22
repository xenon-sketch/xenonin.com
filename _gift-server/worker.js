// TofuBot gift server: Cloudflare Worker + D1 database (binding name DB). Deployed by .github/workflows/gift-server.yml.
//
// Bots (the 8-character code is the bot's own key):
//   GET  /v1/d/<code>?f=<firmware>     what is waiting. Plain text:
//                                       "tofu 1"
//                                       "i <id> <t|b|g> <shows> <expires unix> <bytes> <face> [text]"   one line per gift (max 3)
//                                       "l <version> <bytes> <count>"                                  the gifter's daily texts
//   GET  /v1/m/<code>/<id>             the file of one gift: a GIF (g) or a text picture (b, see below)
//   GET  /v1/a/<code>/<id>             "I have it": delivered. The file is then deleted here.
//   GET  /v1/l/<code>                  the daily texts as one file (see below)
// Gifter page (xenonin.com/tofubot/gift). Everything except check and pin needs the header  x-pin: <4 digits>
//   GET  /v1/check/<code>              {ok, ago, pin, lock}: has this TofuBot been online, is a PIN set
//   POST /v1/pin/<code>                {"pin":"1234"}: the first visit sets the PIN (only while none is set)
//   GET  /v1/me/<code>                 PIN check + overview: daily text count, sent gifts and their status
//   GET  /v1/daily/<code>              the daily texts (only for Edit)
//   POST /v1/daily/<code>              {"items":[{"t":"text"} | {"t":"text","b":"<base64 text picture>"}]}: replaces the list (max 20)
//   POST /v1/send/<code>?kind=t|b|g&shows=N
//                                      t: body = English text. b: body = {"t":text,"b":base64 text picture}. g: body = a GIF.
//   POST /v1/del/<code>/<id>           take back a gift that has not reached the bot yet
//
// Text picture (kind b, and Bengali daily texts): the page draws the text in the browser (Hind Siliguri), because the bot cannot
// join Bengali letters itself. 'B', n (reading length 1..90), lines (1..3), W (block width <= 200),
// then per line: x, w, h, top (int8, strip top from the baseline), then per line ceil(w*h/2) bytes of 4-bit alpha (high nibble first).
// Daily file: 'T','D', version (u32 LE), count, then per text: kind ('t' or 'b'), length (u16 LE), the text or the text picture.
// A gift's day starts when it reaches the bot, so a TofuBot that was offline does not lose it.

const CODE = /^[2-9A-HJKMNP-Z]{8}$/, ID = /^[a-z0-9]{10}$/;
const MAX_WAITING = 3, MAX_GIF = 700000, MAX_TEXT = 90, MAX_PIC = 8192, MAX_DAILY = 20, SHOWS = { t: 5, b: 5, g: 4 };
const now = () => Math.floor(Date.now() / 1000);
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,x-pin', 'access-control-max-age': '86400' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS } });
const text = (t, status = 200) => new Response(t, { status, headers: { 'content-type': 'text/plain', 'cache-control': 'no-store', ...CORS } });
const bytes = (b, type) => new Response(b, { headers: { 'content-type': type, 'content-length': String(b.byteLength), 'cache-control': 'no-store' } });
const normCode = c => String(c || '').toUpperCase().replace(/[^0-9A-Z]/g, '');

function cleanNote(t) {   // English texts are drawn by the bot's own font: plain ASCII only
  t = String(t || '').normalize('NFKD').replace(/[‘’‛′]/g, "'").replace(/[“”″]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...');
  return t.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim();
}
function checkPic(b) {   // the same checks the bot makes before it shows a text picture
  if (!b || b.length < 8 || b.length > MAX_PIC || b[0] !== 0x42) return false;
  const n = b[1], nl = b[2], W = b[3];
  if (n < 1 || n > 90 || nl < 1 || nl > 3 || W < 1 || W > 200) return false;
  let need = 4 + nl * 4;
  for (let k = 0; k < nl; k++) {
    const x = b[4 + k * 4], w = b[5 + k * 4], h = b[6 + k * 4], top = (b[7 + k * 4] << 24) >> 24;
    if (!w || !h || h > 40 || x + w > W || top < -40 || top > 20) return false;
    need += Math.ceil(w * h / 2);
  }
  return need === b.length;
}
function unb64(s) {
  try { const r = atob(String(s || '')); const b = new Uint8Array(r.length); for (let i = 0; i < r.length; i++) b[i] = r.charCodeAt(i); return b; }
  catch (e) { return null; }
}
function newId() { const a = 'abcdefghijklmnopqrstuvwxyz0123456789', r = crypto.getRandomValues(new Uint8Array(10)); return Array.from(r, x => a[x % 36]).join(''); }
async function hashPin(salt, pin) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tofubot:' + salt + ':' + pin));
  return Array.from(new Uint8Array(d), x => x.toString(16).padStart(2, '0')).join('');
}
async function tidy(db, code) {   // finished gifts go a day after their last day; never-delivered ones after 14 days
  const t = now();
  await db.prepare('DELETE FROM items WHERE code = ? AND ((delivered IS NOT NULL AND expires < ?) OR (delivered IS NULL AND created < ?))').bind(code, t - 86400, t - 14 * 86400).run();
}
// PIN check. 5 wrong tries lock the code for 15 min, each further wrong try doubles the lock (max a day).
async function auth(db, code, req) {
  const pin = req.headers.get('x-pin') || '', t = now();
  const o = await db.prepare('SELECT salt, hash, fails, lock_until FROM owners WHERE code = ?').bind(code).first();
  if (!o) return json({ ok: 0, nopin: 1, error: 'Set a PIN first' }, 401);
  if (o.lock_until > t) return json({ ok: 0, lock: o.lock_until - t, error: 'Too many wrong tries' }, 429);
  if (!/^\d{4}$/.test(pin) || await hashPin(o.salt, pin) !== o.hash) {
    const f = o.fails + 1, lock = f >= 5 ? t + Math.min(86400, 900 * 2 ** (f - 5)) : 0;
    await db.prepare('UPDATE owners SET fails = ?, lock_until = ? WHERE code = ?').bind(f, lock, code).run();
    return lock ? json({ ok: 0, lock: lock - t, error: 'Too many wrong tries' }, 429) : json({ ok: 0, left: 5 - f, error: 'Wrong PIN' }, 403);
  }
  if (o.fails || o.lock_until) await db.prepare('UPDATE owners SET fails = 0, lock_until = 0 WHERE code = ?').bind(code).run();
  return null;
}
function dailyBlob(ver, items) {   // the file the bot stores
  const parts = items.map(it => it.k === 'b' ? it.pic : new TextEncoder().encode(it.t));
  const size = 7 + parts.reduce((s, p) => s + 3 + p.length, 0), b = new Uint8Array(size);
  b[0] = 0x54; b[1] = 0x44; b[2] = ver & 255; b[3] = (ver >>> 8) & 255; b[4] = (ver >>> 16) & 255; b[5] = (ver >>> 24) & 255; b[6] = items.length;
  let o = 7;
  items.forEach((it, i) => { const p = parts[i]; b[o] = it.k.charCodeAt(0); b[o + 1] = p.length & 255; b[o + 2] = p.length >> 8; b.set(p, o + 3); o += 3 + p.length; });
  return b;
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const db = env.DB; if (!db) return text('D1 binding DB is missing', 500);
    const u = new URL(req.url), p = u.pathname.split('/').filter(Boolean);   // ["v1", op, code, id]
    if (p[0] !== 'v1') return text('TofuBot gift server');
    const op = p[1], code = normCode(p[2]), id = p[3] || '', t = now(), bot = ['d', 'm', 'a', 'l'].includes(op);
    if (!CODE.test(code)) return bot ? text('bad code', 400) : json({ ok: 0, error: 'That code does not look right' }, 400);

    // ---------- bots
    if (op === 'd') {
      const fw = (u.searchParams.get('f') || '').slice(0, 24);
      await db.prepare('INSERT INTO devices (code, seen, fw) VALUES (?, ?, ?) ON CONFLICT(code) DO UPDATE SET seen = excluded.seen, fw = excluded.fw WHERE devices.seen < excluded.seen - 600').bind(code, t, fw).run();
      const r = await db.prepare('SELECT id, kind, shows, days, size, face, text FROM items WHERE code = ? AND delivered IS NULL ORDER BY created LIMIT ?').bind(code, MAX_WAITING).all();
      let out = 'tofu 1\n';
      for (const g of r.results) out += `i ${g.id} ${g.kind} ${g.shows} ${t + g.days * 86400} ${g.size} ${g.face}${g.kind === 't' ? ' ' + g.text : ''}\n`;
      const d = await db.prepare('SELECT ver, n, length(blob) AS size FROM daily WHERE code = ?').bind(code).first();
      out += d ? `l ${d.ver} ${d.n ? d.size : 0} ${d.n}\n` : 'l 0 0 0\n';
      return text(out);
    }
    if (op === 'm') {
      if (!ID.test(id)) return text('not found', 404);
      const g = await db.prepare("SELECT kind, data FROM items WHERE id = ? AND code = ? AND kind IN ('g', 'b') AND data IS NOT NULL").bind(id, code).first();
      if (!g) return text('not found', 404);
      return bytes(new Uint8Array(g.data), g.kind === 'g' ? 'image/gif' : 'application/octet-stream');
    }
    if (op === 'a') {
      if (!ID.test(id)) return text('not found', 404);
      await db.prepare('UPDATE items SET delivered = ?, expires = ? + days * 86400, data = NULL WHERE id = ? AND code = ? AND delivered IS NULL').bind(t, t, id, code).run();
      return text('ok');
    }
    if (op === 'l') {
      const d = await db.prepare('SELECT blob FROM daily WHERE code = ?').bind(code).first();
      return d ? bytes(new Uint8Array(d.blob), 'application/octet-stream') : text('not found', 404);
    }

    // ---------- gifter page
    if (op === 'check') {
      const d = await db.prepare('SELECT seen FROM devices WHERE code = ?').bind(code).first();
      if (!d) return json({ ok: 0 });
      const o = await db.prepare('SELECT lock_until FROM owners WHERE code = ?').bind(code).first();
      return json({ ok: 1, ago: Math.max(0, t - d.seen), pin: o ? 1 : 0, lock: o && o.lock_until > t ? o.lock_until - t : 0 });
    }
    if (op === 'pin' && req.method === 'POST') {
      const d = await db.prepare('SELECT seen FROM devices WHERE code = ?').bind(code).first();
      if (!d) return json({ ok: 0, error: 'This TofuBot has not been online yet' }, 404);
      const pin = String(((await req.json().catch(() => ({}))) || {}).pin || '');
      if (!/^\d{4}$/.test(pin)) return json({ ok: 0, error: 'The PIN is 4 digits' }, 400);
      const salt = newId(), r = await db.prepare('INSERT INTO owners (code, salt, hash, fails, lock_until, created) VALUES (?, ?, ?, 0, 0, ?) ON CONFLICT(code) DO NOTHING').bind(code, salt, await hashPin(salt, pin), t).run();
      return r.meta.changes ? json({ ok: 1 }) : json({ ok: 0, error: 'A PIN is already set for this TofuBot' }, 409);
    }
    const bad = await auth(db, code, req); if (bad) return bad;

    if (op === 'me') {
      await tidy(db, code);
      const d = await db.prepare('SELECT seen FROM devices WHERE code = ?').bind(code).first();
      const l = await db.prepare('SELECT n FROM daily WHERE code = ?').bind(code).first();
      const r = await db.prepare('SELECT id, kind, text, shows, created, delivered, expires FROM items WHERE code = ? ORDER BY created DESC LIMIT 20').bind(code).all();
      return json({ ok: 1, now: t, ago: d ? Math.max(0, t - d.seen) : -1, daily: l ? l.n : 0, items: r.results });
    }
    if (op === 'daily' && req.method === 'GET') {
      const d = await db.prepare('SELECT texts FROM daily WHERE code = ?').bind(code).first();
      return json({ ok: 1, items: d ? JSON.parse(d.texts) : [] });
    }
    if (op === 'daily' && req.method === 'POST') {
      const body = await req.json().catch(() => null), list = body && Array.isArray(body.items) ? body.items : null;
      if (!list || list.length > MAX_DAILY) return json({ ok: 0, error: 'At most 20 daily texts' }, 400);
      const items = [];
      for (const it of list) {
        const raw = String((it && it.t) || '').replace(/\s+/g, ' ').trim().slice(0, 300);
        if (!raw) continue;
        if (it.b) {
          const pic = unb64(it.b);
          if (!checkPic(pic)) return json({ ok: 0, error: 'A text could not be prepared: ' + raw.slice(0, 40) }, 400);
          items.push({ k: 'b', t: raw, pic });
        } else {
          const c = cleanNote(raw);
          if (!c || c.length > MAX_TEXT) return json({ ok: 0, error: 'Too long: ' + raw.slice(0, 40) }, 400);
          items.push({ k: 't', t: c });
        }
      }
      const old = await db.prepare('SELECT ver FROM daily WHERE code = ?').bind(code).first();
      const ver = Math.max(t, old ? old.ver + 1 : 0);
      await db.prepare('INSERT INTO daily (code, ver, n, texts, blob, updated) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET ver = excluded.ver, n = excluded.n, texts = excluded.texts, blob = excluded.blob, updated = excluded.updated')
        .bind(code, ver, items.length, JSON.stringify(items.map(x => x.t)), dailyBlob(ver, items), t).run();
      return json({ ok: 1, n: items.length });
    }
    if (op === 'del' && req.method === 'POST') {
      if (!ID.test(id)) return json({ ok: 0 }, 404);
      const r = await db.prepare('DELETE FROM items WHERE id = ? AND code = ? AND delivered IS NULL').bind(id, code).run();
      return r.meta.changes ? json({ ok: 1 }) : json({ ok: 0, error: 'It already reached TofuBot' }, 409);
    }
    if (op === 'send' && req.method === 'POST') {
      const n = await db.prepare('SELECT COUNT(*) AS n FROM items WHERE code = ? AND delivered IS NULL').bind(code).first();
      if (n.n >= MAX_WAITING) return json({ ok: 0, error: 'Already 3 gifts on the way. Wait until TofuBot picks them up.' }, 409);
      const kind = ['t', 'b', 'g'].includes(u.searchParams.get('kind')) ? u.searchParams.get('kind') : 't';
      const shows = Math.min(SHOWS[kind], Math.max(1, parseInt(u.searchParams.get('shows'), 10) || 1)), gid = newId();
      if (kind === 't') {
        const note = cleanNote(await req.text());
        if (!note || note.length > MAX_TEXT) return json({ ok: 0, error: note ? 'Too long' : 'Write a message' }, 400);
        await db.prepare("INSERT INTO items (id, code, kind, text, face, shows, days, created) VALUES (?, ?, 't', ?, 6, ?, 1, ?)").bind(gid, code, note, shows, t).run();
        return json({ ok: 1, id: gid });
      }
      if (kind === 'b') {
        const body = await req.json().catch(() => null), pic = body && unb64(body.b), raw = String((body && body.t) || '').trim().slice(0, 300);
        if (!checkPic(pic)) return json({ ok: 0, error: 'The message could not be prepared' }, 400);
        await db.prepare("INSERT INTO items (id, code, kind, text, face, shows, days, created, size, data) VALUES (?, ?, 'b', ?, 6, ?, 1, ?, ?, ?)").bind(gid, code, raw, shows, t, pic.length, pic).run();
        return json({ ok: 1, id: gid });
      }
      const b = new Uint8Array(await req.arrayBuffer());
      if (b.length < 20 || b.length > MAX_GIF || String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'GIF8') return json({ ok: 0, error: 'The picture must be a GIF under 700 KB' }, 400);
      await db.prepare("INSERT INTO items (id, code, kind, face, shows, days, created, size, data) VALUES (?, ?, 'g', 6, ?, 1, ?, ?, ?)").bind(gid, code, shows, t, b.length, b).run();
      return json({ ok: 1, id: gid });
    }
    return json({ ok: 0, error: 'Not found' }, 404);
  }
};
