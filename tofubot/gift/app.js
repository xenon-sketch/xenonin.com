// Send to TofuBot: the gifter's page. Talks to the gift server whose address is in api.txt (written by the deploy workflow).
// Bengali can't be joined into letters on the bot itself, so a Bengali text is drawn here (Hind Siliguri, the bot's own Bengali
// font) and sent as a small 4-bit picture of the text. English texts are sent as text and drawn by the bot's English font.
// The previews draw exactly what the bot will draw: same wrapping, same cloud, same pixels.
import { GIFEncoder, quantize, applyPalette, parseGIF, decompressFrames } from './gif.js';
import { MED } from './fontmed.js';

const $ = (id) => document.getElementById(id);
const AB = '23456789ABCDEFGHJKMNPQRSTUVWXYZ', MAXW = 190, BN_PITCH = 31, MAX_DAILY = 20, MAX_GIF = 700000, S = 240;
let proof = '';   // the 8-letter proof from the QR on TofuBot's screen (#CODE.PROOF): lets the first PIN be set without waiting
let API = '', code = '', pin = '', me = null, mShows = 4, pShows = 3, gif = null, busy = false;

// ---------------------------------------------------------------- small helpers
function say(id, t, cls = '') { const e = $(id); e.textContent = t || ''; e.className = 'msg' + (cls ? ' ' + cls : ''); }
const fmtCode = (c) => c.slice(0, 4) + '-' + c.slice(4);
const cleanCode = (v) => v.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 8);
const mins = (s) => Math.max(1, Math.ceil(s / 60));
function ago(s) {
  if (s < 120) return 'just now';
  if (s < 5400) return Math.round(s / 60) + ' min ago';
  if (s < 129600) return Math.round(s / 3600) + ' h ago';
  return Math.round(s / 86400) + ' days ago';
}
function save() { try { sessionStorage.setItem('tofugift', JSON.stringify({ c: code, p: pin })); } catch (e) { /* private window */ } }
function forget() { try { sessionStorage.removeItem('tofugift'); } catch (e) { /* ignore */ } }
async function call(path, opt = {}) {
  const headers = { ...(opt.headers || {}) };
  if (pin) headers['x-pin'] = pin;
  let r;
  try { r = await fetch(API + path, { ...opt, headers, cache: 'no-store' }); }
  catch (e) { return { ok: 0, status: 0, error: 'No connection. Check the internet and try again.' }; }
  const j = await r.json().catch(() => ({ ok: 0, error: 'The server had a problem (' + r.status + '). Try again.' }));
  j.status = r.status;
  return j;
}
function stepper(el, max, cur, set) {   // [-] N [+], 1..max
  el.innerHTML = '';
  const mk = (t, l) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.setAttribute('aria-label', l); el.appendChild(b); return b; };
  const dn = mk('\u2212', 'Fewer times'), n = document.createElement('output'), up = mk('+', 'More times');
  el.insertBefore(n, up); n.setAttribute('aria-live', 'polite');
  const show = () => { n.textContent = cur; dn.disabled = cur <= 1; up.disabled = cur >= max; set(cur); };
  dn.onclick = () => { if (cur > 1) { cur--; show(); } };
  up.onclick = () => { if (cur < max) { cur++; show(); } };
  show();
}
function grow(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 4 + 'px'; }

// ---------------------------------------------------------------- texts, the way the bot shows them
const BN = /[ঀ-৿]/;
const FONT = '600 22px "Hind Siliguri"';
const medBm = Uint8Array.from(atob(MED.bm), (c) => c.charCodeAt(0));
const medAdv = (ch) => { const i = ch.charCodeAt(0) - MED.first; return i >= 0 && i < MED.gl.length ? MED.gl[i][5] : 0; };
function cleanNote(t) {   // same as the server: the bot's English font has plain ASCII only
  t = String(t || '').normalize('NFKD').replace(/[‘’‛′]/g, "'").replace(/[“”″]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...');
  return t.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim();
}
const scratch = document.createElement('canvas'); scratch.width = 300; scratch.height = 60;
const sx = scratch.getContext('2d', { willReadFrequently: true });

// prep(text) -> { kind: 't' | 'b', ok, err, lines, ... }   kind t: { clean, lines: [{s, w}] }   kind b: { pic: Uint8Array, strips, W }
function prep(raw) {
  const t0 = String(raw || '').replace(/[\p{Extended_Pictographic}️⃣]/gu, '').replace(/\s+/g, ' ').trim();
  if (!t0) return { ok: false, empty: true };
  if (!BN.test(t0)) {   // English: wrapped like the bot's thought cloud (190 px, 4 lines)
    const clean = cleanNote(t0);
    if (!clean) return { ok: false, empty: true };
    const sp = medAdv(' '), lines = [];
    for (const word of clean.split(' ')) {
      const ww = [...word].reduce((a, c) => a + medAdv(c), 0), L = lines[lines.length - 1];
      if (L && L.w + sp + ww <= MAXW) { L.s += ' ' + word; L.w += sp + ww; } else lines.push({ s: word, w: ww });
    }
    const r = { kind: 't', clean, lines: lines.slice(0, 4), ok: true };
    if (clean.length > 90 || lines.length > 4) Object.assign(r, { ok: false, err: 'Too long for TofuBot\'s cloud. Make it a little shorter.' });
    else if (lines.some((l) => l.w > MAXW)) Object.assign(r, { ok: false, err: 'One word is too long to fit.' });
    return r;
  }
  // Bengali (or mixed): drawn here with Hind Siliguri, 3 lines of 190 px at most
  sx.font = FONT;
  const lines = [];
  for (const w of t0.split(' ')) {
    const L = lines[lines.length - 1];
    if (L !== undefined && sx.measureText(L + ' ' + w).width <= MAXW) lines[lines.length - 1] = L + ' ' + w; else lines.push(w);
  }
  const aw = lines.map((l) => sx.measureText(l).width);
  if (lines.length > 3) return { kind: 'b', ok: false, err: 'Too long for TofuBot\'s cloud. Make it a little shorter.', ...draw(lines.slice(0, 3), aw.slice(0, 3)) };
  if (Math.max(...aw) > MAXW + 0.5) return { kind: 'b', ok: false, err: 'One word is too long to fit.' };
  const d = draw(lines, aw);
  if (!d.pic) return { kind: 'b', ok: false, err: 'This text could not be prepared.' };
  return { kind: 'b', ok: true, ...d, n: Math.min(90, Math.max(1, [...t0].length)) };
}
function draw(lines, aw) {   // each line -> a cropped 4-bit strip; then the "B" text picture the bot reads
  const W0 = Math.ceil(Math.max(...aw.map((a) => Math.min(a, 200)))), PX = 50, BASE = 38, strips = [];
  for (let k = 0; k < lines.length; k++) {
    sx.clearRect(0, 0, 300, 60); sx.font = FONT; sx.fillStyle = '#000'; sx.textBaseline = 'alphabetic';
    sx.fillText(lines[k], PX + Math.round((W0 - aw[k]) / 2), BASE);
    const a = sx.getImageData(0, 0, 300, 60).data;
    let r0 = 99, r1 = -1, c0 = 999, c1 = -1;
    for (let y = 0; y < 60; y++) for (let x = 0; x < 300; x++) if (Math.round(a[(y * 300 + x) * 4 + 3] * 15 / 255)) { if (y < r0) r0 = y; if (y > r1) r1 = y; if (x < c0) c0 = x; if (x > c1) c1 = x; }
    if (r1 < 0) { strips.push({ x: 0, w: 1, h: 1, top: -1, px: new Uint8Array(1) }); continue; }
    const w = c1 - c0 + 1, h = r1 - r0 + 1, px = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px[y * w + x] = Math.round(a[((r0 + y) * 300 + c0 + x) * 4 + 3] * 15 / 255);
    strips.push({ x: c0 - PX, w, h, top: r0 - BASE, px });
  }
  const shift = Math.max(0, -Math.min(...strips.map((s) => s.x)));
  strips.forEach((s) => { s.x += shift; });
  const W = Math.max(W0 + shift, ...strips.map((s) => s.x + s.w));
  if (W > 200 || strips.some((s) => s.h > 40 || s.top < -40 || s.top > 20)) return { strips, W };
  const size = 4 + strips.length * 4 + strips.reduce((n, s) => n + Math.ceil(s.w * s.h / 2), 0);
  if (size > 8192) return { strips, W };
  const pic = new Uint8Array(size);
  pic[0] = 0x42; pic[1] = 1; pic[2] = strips.length; pic[3] = W;
  let o = 4;
  for (const s of strips) { pic[o++] = s.x; pic[o++] = s.w; pic[o++] = s.h; pic[o++] = s.top & 255; }
  for (const s of strips) {
    for (let i = 0; i < s.w * s.h; i += 2) pic[o++] = (s.px[i] << 4) | (i + 1 < s.w * s.h ? s.px[i + 1] : 0);
  }
  return { pic, strips, W };
}
function withN(p) { if (p.pic) p.pic[1] = p.n; return p.pic; }
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode(...u8.subarray(i, i + 8192)); return btoa(s); };

// ---------------------------------------------------------------- the preview: TofuBot's screen with the thought cloud
const face = new Image(); face.src = 'screen-face.png';
function screen(cv, p) {
  const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  if (face.complete && face.naturalWidth) g.drawImage(face, 0, 142);
  if (!p || p.empty || !(p.lines || p.strips)) return;
  const bn = p.kind === 'b', nl = bn ? p.strips.length : p.lines.length, pitch = bn ? BN_PITCH : 28, top = bn ? 3 : 0;
  const mw = Math.max(90, bn ? p.W : Math.max(...p.lines.map((l) => l.w)));
  const boxW = Math.min(236, mw + 44), boxH = nl * pitch + 26 + top, boxX = (S - boxW) >> 1, boxY = (nl >= 4 ? 152 : 138) - boxH;
  const ix0 = boxX + 14, iy0 = boxY + 14, ix1 = boxX + boxW - 14, iy1 = boxY + boxH - 14, R = 16;
  g.fillStyle = '#fff'; g.fillRect(ix0, iy0, ix1 - ix0 + 1, iy1 - iy0 + 1);
  const dot = (x, y) => { g.beginPath(); g.arc(x, y, R, 0, 7); g.fill(); };
  const nx = Math.floor((ix1 - ix0) / 24) + 1, ny = Math.floor((iy1 - iy0) / 24) + 1;
  for (let i = 0; i <= nx; i++) { const x = ix0 + Math.floor((ix1 - ix0) * i / nx); dot(x, iy0); dot(x, iy1); }
  for (let j = 0; j <= ny; j++) { const y = iy0 + Math.floor((iy1 - iy0) * j / ny); dot(ix0, y); dot(ix1, y); }
  const img = g.getImageData(0, 0, S, S), d = img.data;
  const put = (X, Y, a) => {   // ink (30,30,40) over the cloud, 4-bit alpha, like the bot
    if (!a || X < 0 || X >= S || Y < 0 || Y >= S) return;
    const i = (Y * S + X) * 4;
    d[i] += Math.round((30 - d[i]) * a / 15); d[i + 1] += Math.round((30 - d[i + 1]) * a / 15); d[i + 2] += Math.round((40 - d[i + 2]) * a / 15);
  };
  if (bn) {
    p.strips.forEach((s, k) => {
      const X0 = ((S - p.W) >> 1) + s.x, Y0 = boxY + 35 + top + k * pitch + s.top;
      for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) put(X0 + x, Y0 + y, s.px[y * s.w + x]);
    });
  } else {
    p.lines.forEach((l, k) => {
      let px = (S - l.w) >> 1; const base = boxY + 35 + k * 28;
      for (const ch of l.s) {
        const gl = MED.gl[ch.charCodeAt(0) - MED.first]; if (!gl) continue;
        const [off, w, h, xo, yo, adv] = gl;
        if (ch !== ' ') for (let r = 0; r < h; r++) for (let x = 0; x < w; x++) {
          const idx = r * w + x, b = medBm[off + (idx >> 1)];
          put(px + xo + x, base + yo + r, idx & 1 ? b & 15 : b >> 4);
        }
        px += adv;
      }
    });
  }
  g.putImageData(img, 0, 0);
}

// ---------------------------------------------------------------- 1. the code
async function start() {
  try { API = (await (await fetch('api.txt', { cache: 'no-store' })).text()).trim().replace(/\/+$/, ''); } catch (e) { API = ''; }
  if (!/^https?:\/\/[^\s]+$/.test(API) || API.includes('REPLACE')) {
    say('cm', 'Sending to TofuBot is being set up. Please try again a little later.', 'bad'); $('code').disabled = true; return;
  }
  let s = {}; try { s = JSON.parse(sessionStorage.getItem('tofugift') || '{}'); } catch (e) { /* ignore */ }
  const raw = decodeURIComponent(location.hash.slice(1)).toUpperCase().replace(/[^0-9A-Z]/g, '');
  const fromLink = raw.slice(0, 8); if (raw.length === 16) proof = raw.slice(8);
  const c = fromLink.length === 8 ? fromLink : (s.c || '');
  if (c.length === 8) {
    $('code').value = fmtCode(c);
    if (s.c === c && /^\d{4}$/.test(s.p || '')) { code = c; pin = s.p; if (await login(true)) return; }
    check(c);
  }
}
$('code').addEventListener('input', () => {
  proof = '';   // a typed code has no proof
  const ci = $('code'), c = cleanCode(ci.value);
  ci.value = c.length > 4 ? fmtCode(c) : c;
  if (c.length === 8) check(c); else say('cm', '');
});
async function check(c) {
  if ([...c].some((ch) => !AB.includes(ch))) { say('cm', 'TofuBot codes never use 0, 1, I, L or O. Check the code again.', 'bad'); return; }
  say('cm', 'Looking for this TofuBot…');
  const j = await call('/v1/check/' + c + (proof ? '?t=' + proof : ''));
  if (j.status === 0) { say('cm', j.error, 'bad'); return; }
  if (!j.ok) { say('cm', 'No TofuBot with this code has been online yet. Check the code, and keep TofuBot on Wi-Fi for a few minutes.', 'bad'); return; }
  code = c; pin = ''; say('cm', '');
  history.replaceState(null, '', '#' + c);
  showPin(!j.pin, j.lock, j.ready);
}

// ---------------------------------------------------------------- 2. the PIN
let pinNew = false, waitTimer = 0;
// A new PIN can only be set while the code is on TofuBot's screen (and 10 minutes after): whoever has the TofuBot in front of them.
async function recheck() {
  const j = await call('/v1/check/' + code + (proof ? '?t=' + proof : ''));
  if ($('stPin').hidden) return;
  if (j.ok && j.pin) showPin(false, j.lock, 0);
  else if (j.ok && j.ready) showPin(true, 0, j.ready);
  else waitTimer = setTimeout(recheck, 4000);
}
function showPin(isNew, lock, ready) {
  pinNew = isNew; clearTimeout(waitTimer);
  $('stCode').hidden = true; $('stPin').hidden = false; $('stApp').hidden = true;
  const wait = isNew && !ready;
  $('pinForm').hidden = wait; $('pinGo').hidden = wait;
  if (wait) {
    $('hPin').textContent = 'set a pin'; $('forgot').hidden = true;
    $('pinSub').textContent = 'TofuBot ' + fmtCode(code) + ' has no PIN yet. To set one, show its code on its screen: TofuBot panel, Send to TofuBot, Show code on screen.';
    say('pm', 'Waiting for TofuBot…');
    waitTimer = setTimeout(recheck, 4000);
    return;
  }
  $('hPin').textContent = isNew ? 'set a pin' : 'enter your pin';
  $('pinSub').textContent = isNew
    ? 'TofuBot ' + fmtCode(code) + ' is all yours. Pick 4 digits, so only you can send to it and see your daily texts.'
    : 'TofuBot ' + fmtCode(code);
  $('pin2L').hidden = !isNew; $('pinGo').textContent = isNew ? 'Save PIN' : 'Open';
  $('pin1').value = $('pin2').value = ''; $('pinGo').disabled = true; $('forgot').hidden = isNew;
  say('pm', lock ? 'Too many tries. Try again in ' + mins(lock) + ' min.' : '', lock ? 'bad' : '');
  $('pin1').focus();
}
for (const id of ['pin1', 'pin2']) {
  $(id).addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    const a = $('pin1').value, b = $('pin2').value;
    $('pinGo').disabled = a.length !== 4 || (pinNew && b.length !== 4);
    if (pinNew && id === 'pin1' && a.length === 4) $('pin2').focus();
    if (!pinNew && a.length === 4) pinGo();
  });
}
$('pinGo').onclick = pinGo;
$('pinBack').onclick = () => { clearTimeout(waitTimer); forget(); code = pin = ''; $('stPin').hidden = true; $('stCode').hidden = false; $('code').value = ''; history.replaceState(null, '', location.pathname); $('code').focus(); };
async function pinGo() {
  if (busy) return;
  const a = $('pin1').value, b = $('pin2').value;
  if (pinNew && a !== b) { say('pm', 'The two PINs are different. Type them again.', 'bad'); $('pin2').value = ''; $('pin2').focus(); return; }
  busy = true; $('pinGo').disabled = true; say('pm', pinNew ? 'Saving…' : 'Opening…');
  if (pinNew) {
    const j = await call('/v1/pin/' + code, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin: a, t: proof }) });
    if (!j.ok) { busy = false; if (j.status === 409) { showPin(false, 0, 0); say('pm', 'Someone already set a PIN for this TofuBot.', 'bad'); } else if (j.show) showPin(true, 0, 0); else say('pm', j.error, 'bad'); return; }
  }
  pin = a; busy = false;
  if (!(await login(false))) { pin = ''; $('pin1').value = ''; $('pin1').focus(); }
}
async function login(quiet) {
  const j = await call('/v1/me/' + code);
  if (!j.ok) {
    if (quiet) { forget(); pin = ''; return false; }
    $('forgot').hidden = false;
    if (j.status === 429) say('pm', 'Too many tries. Try again in ' + mins(j.lock) + ' min.', 'bad');
    else if (j.status === 403) say('pm', 'Wrong PIN. ' + j.left + (j.left === 1 ? ' try' : ' tries') + ' left.', 'bad');
    else say('pm', j.error, 'bad');
    $('pinGo').disabled = true;
    return false;
  }
  save(); me = j;
  $('stCode').hidden = true; $('stPin').hidden = true; $('stApp').hidden = false;
  history.replaceState(null, '', '#' + code);
  render();
  return true;
}
$('lock').onclick = () => {
  forget(); pin = ''; me = null; closeDaily();
  $('stApp').hidden = true; showPin(false, 0, 0);
};

// ---------------------------------------------------------------- 3. the gifter's space
function render() {
  $('codeShow').textContent = fmtCode(code);
  const on = me.ago >= 0 && me.ago < 3600;
  $('dot').className = 'dot' + (on ? '' : ' dot--off');
  $('seen').textContent = me.ago < 0 ? '' : on ? 'Online ' + ago(me.ago) : 'Last online ' + ago(me.ago) + '. Gifts wait until it is back.';
  $('dCount').textContent = me.daily + ' / ' + MAX_DAILY;
  if (me.left) {   // today's sends: up to 10 messages and 3 photos
    const L = me.limits || { t: 10, g: 3 }, lt = (n) => n ? n + ' left today' : 'none left today, more tomorrow';
    $('mLim').textContent = 'Up to ' + L.t + ' messages a day · ' + lt(me.left.t);
    $('pLim').textContent = 'Up to ' + L.g + ' photos a day · ' + lt(me.left.g);
    mUpdate(); if (gif) $('pSend').disabled = me.left.g <= 0;
  }
  const el = $('sent'); el.innerHTML = '';
  if (!me.items.length) { el.innerHTML = '<p class="small">Nothing yet.</p>'; return; }
  for (const it of me.items) {
    const row = document.createElement('div'); row.className = 'sent__item';
    const ic = it.kind === 'g'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-5 4 4 3-3 4 4"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>';
    row.innerHTML = '<span class="sent__ic">' + ic + '</span><div style="min-width:0"><b class="bn"></b><small></small></div>';
    row.querySelector('b').textContent = it.kind === 'g' ? 'Picture' : it.text;
    const sm = row.querySelector('small');
    const times = it.shows + (it.shows === 1 ? ' time' : ' times');
    if (!it.delivered) {
      sm.textContent = 'On the way · ' + times;
      const b = document.createElement('button'); b.className = 'linkbtn'; b.textContent = 'Take back';
      b.onclick = async () => { b.disabled = true; const j = await call('/v1/del/' + code + '/' + it.id, { method: 'POST' }); if (!j.ok) alertMsg(j.error); refresh(); };
      row.appendChild(b);
    } else if (it.expires > me.now) { sm.textContent = 'On TofuBot today · ' + times; sm.className = 'on'; }
    else sm.textContent = 'Shown';
    el.appendChild(row);
  }
}
function alertMsg(t) { say('mm', t, 'bad'); }
async function refresh() {
  if (!pin) return;
  const j = await call('/v1/me/' + code);
  if (j.ok) { me = j; render(); }
  else if (j.status === 403 || j.status === 429 || j.status === 401) $('lock').click();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && me) refresh(); });

// ---- daily texts: hidden until Edit
let dFocus = null;
async function openDaily() {
  $('dEdit').disabled = true; say('dm', 'Opening…');
  const j = await call('/v1/daily/' + code);
  $('dEdit').disabled = false;
  if (!j.ok) { say('dm', j.error, 'bad'); return; }
  say('dm', '');
  $('dList').innerHTML = '';
  (j.items.length ? j.items : ['']).forEach((t) => addRow(t));
  $('dView').hidden = true; $('dEditBox').hidden = false;
  showDaily($('dList').querySelector('textarea'));
}
function closeDaily() { $('dEditBox').hidden = true; $('dView').hidden = false; $('dList').innerHTML = ''; }
function addRow(text) {
  const n = $('dList').children.length; if (n >= MAX_DAILY) return null;
  const row = document.createElement('div'); row.className = 'daily__row';
  row.innerHTML = '<span></span><textarea class="field" rows="1" placeholder="English or বাংলা"></textarea><button class="del" type="button" aria-label="Remove this text">×</button>';
  const ta = row.querySelector('textarea'); ta.value = text;
  ta.addEventListener('input', () => { grow(ta); check1(ta); showDaily(ta); });
  ta.addEventListener('focus', () => showDaily(ta));
  row.querySelector('.del').onclick = () => { row.remove(); number(); showDaily($('dList').querySelector('textarea')); };
  $('dList').appendChild(row); number(); requestAnimationFrame(() => grow(ta)); check1(ta);
  return ta;
}
function number() {
  [...$('dList').children].forEach((r, i) => { r.querySelector('span').textContent = i + 1; });
  $('dAdd').disabled = $('dList').children.length >= MAX_DAILY;
}
function check1(ta) { const p = prep(ta.value); ta.classList.toggle('is-bad', !p.ok && !p.empty); ta.title = p.err || ''; return p; }
function showDaily(ta) { dFocus = ta; screen($('dPrev'), ta ? prep(ta.value) : null); }
$('dEdit').onclick = openDaily;
$('dCancel').onclick = () => { closeDaily(); say('dm', ''); };
$('dAdd').onclick = () => { const ta = addRow(''); if (ta) { ta.focus(); showDaily(ta); } };
$('dSave').onclick = async () => {
  const items = [];
  const tas = [...$('dList').querySelectorAll('textarea')];
  for (let i = 0; i < tas.length; i++) {
    const p = check1(tas[i]);
    if (p.empty) continue;
    if (!p.ok) { tas[i].focus(); showDaily(tas[i]); say('dm', 'Text ' + (i + 1) + ': ' + p.err, 'bad'); return; }
    items.push(p.kind === 'b' ? { t: tas[i].value.trim(), b: b64(withN(p)) } : { t: p.clean });
  }
  $('dSave').disabled = true; say('dm', 'Saving…');
  const j = await call('/v1/daily/' + code, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }) });
  $('dSave').disabled = false;
  if (!j.ok) { say('dm', j.error, 'bad'); return; }
  closeDaily();
  me.daily = j.n; $('dCount').textContent = j.n + ' / ' + MAX_DAILY;
  say('dm', j.n ? 'Saved. TofuBot gets them within 30 minutes.' : 'Saved. No daily texts now.', 'ok');
};

// ---- a message for today
function mUpdate() {
  const p = prep($('mText').value); grow($('mText'));
  screen($('mPrev'), p);
  $('mFit').textContent = p.empty ? '' : p.ok ? 'Fits' : p.err; $('mFit').className = 'fit' + (p.ok || p.empty ? '' : ' bad');
  $('mText').classList.toggle('is-bad', !p.ok && !p.empty);
  $('mSend').disabled = !p.ok || !!(me && me.left && me.left.t <= 0);
  return p;
}
$('mText').addEventListener('input', () => { mUpdate(); say('mm', ''); });
$('mSend').onclick = async () => {
  const p = mUpdate(); if (!p.ok) return;
  $('mSend').disabled = true; say('mm', 'Sending…');
  const j = p.kind === 'b'
    ? await call('/v1/send/' + code + '?kind=b&shows=' + mShows, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: $('mText').value.trim(), b: b64(withN(p)) }) })
    : await call('/v1/send/' + code + '?kind=t&shows=' + mShows, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: p.clean });
  if (!j.ok) { say('mm', j.error, 'bad'); $('mSend').disabled = false; if (j.limit) refresh(); return; }
  $('mText').value = ''; mUpdate();
  say('mm', 'Sent. TofuBot picks it up within 30 minutes.', 'ok'); refresh();
};

// ---- a picture for today (turned into a 240x240 GIF here)
function cover(ctx, src, w, h) { const k = Math.max(S / w, S / h), dw = w * k, dh = h * k; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, S, S); ctx.drawImage(src, (S - dw) / 2, (S - dh) / 2, dw, dh); }
function encode(frames) {
  const g = GIFEncoder();
  for (const f of frames) { const pal = quantize(f.data, 256), idx = applyPalette(f.data, pal); g.writeFrame(idx, S, S, { palette: pal, delay: f.delay, repeat: 0 }); }
  g.finish(); return g.bytes();
}
$('file').onchange = async () => {
  const f = $('file').files[0]; if (!f) return;
  gif = null; $('pSend').disabled = true; say('pmsg', ''); $('pInfo').textContent = 'Preparing…';
  const c = document.createElement('canvas'); c.width = c.height = S; const ctx = c.getContext('2d', { willReadFrequently: true });
  try {
    let frames = [];
    if (f.type === 'image/gif') {
      const g = parseGIF(await f.arrayBuffer()), fr = decompressFrames(g, true), W = g.lsd.width, H = g.lsd.height;
      const full = document.createElement('canvas'); full.width = W; full.height = H; const fx = full.getContext('2d', { willReadFrequently: true });
      const patch = document.createElement('canvas'), px = patch.getContext('2d');
      for (const p of fr.slice(0, 150)) {
        const before = p.disposalType === 3 ? fx.getImageData(0, 0, W, H) : null;
        patch.width = p.dims.width; patch.height = p.dims.height;
        px.putImageData(new ImageData(p.patch, p.dims.width, p.dims.height), 0, 0);
        fx.drawImage(patch, p.dims.left, p.dims.top);
        cover(ctx, full, W, H); frames.push({ data: ctx.getImageData(0, 0, S, S).data, delay: Math.max(20, p.delay || 100) });
        if (p.disposalType === 2) fx.clearRect(p.dims.left, p.dims.top, p.dims.width, p.dims.height); else if (before) fx.putImageData(before, 0, 0);
      }
    } else {
      const img = await createImageBitmap(f); cover(ctx, img, img.width, img.height);
      frames = [{ data: ctx.getImageData(0, 0, S, S).data, delay: 1000 }];
    }
    if (!frames.length) throw new Error('empty');
    let bytes = encode(frames), tries = 0;
    while (bytes.length > MAX_GIF && frames.length > 2 && tries++ < 4) { frames = frames.filter((_, i) => i % 2 === 0).map((x) => ({ ...x, delay: x.delay * 2 })); bytes = encode(frames); }
    if (bytes.length > MAX_GIF) throw new Error('This GIF is too big. Try a shorter one.');
    gif = bytes;
    $('pv').src = URL.createObjectURL(new Blob([bytes], { type: 'image/gif' })); $('picScreen').hidden = false;
    $('pickT').textContent = 'Choose another';
    $('pInfo').textContent = (frames.length > 1 ? 'GIF, ' + frames.length + ' frames' : 'Photo') + ' · ' + Math.max(1, Math.round(bytes.length / 1024)) + ' KB';
    $('pSend').disabled = !!(me && me.left && me.left.g <= 0);
  } catch (e) {
    $('pInfo').textContent = ''; say('pmsg', e.message && e.message.length > 12 ? e.message : 'This file could not be opened. Try a JPG, PNG or GIF.', 'bad');
  }
};
$('pSend').onclick = async () => {
  if (!gif) return;
  $('pSend').disabled = true; say('pmsg', 'Sending…');
  const j = await call('/v1/send/' + code + '?kind=g&shows=' + pShows, { method: 'POST', headers: { 'content-type': 'image/gif' }, body: gif });
  if (!j.ok) { say('pmsg', j.error, 'bad'); $('pSend').disabled = false; if (j.limit) refresh(); return; }
  gif = null; $('file').value = ''; $('picScreen').hidden = true; $('pickT').textContent = 'Choose a photo or GIF'; $('pInfo').textContent = '';
  say('pmsg', 'Sent. TofuBot picks it up within 30 minutes.', 'ok'); refresh();
};

// ---------------------------------------------------------------- go
stepper($('mTimes'), 20, mShows, (v) => { mShows = v; });
stepper($('pTimes'), 20, pShows, (v) => { pShows = v; });
face.onload = () => { screen($('mPrev'), prep($('mText').value)); if (dFocus) showDaily(dFocus); };
document.fonts.load(FONT, 'অA').catch(() => {}).finally(() => { mUpdate(); start(); });
