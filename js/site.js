/* Xenon Industries site script */

/* ---- Stock + order links: edit here when stock changes ----
   inStock: true  -> shows "Order, cash on delivery" and opens the order form
   inStock: false -> shows "Sold out" and a restock link to Instagram          */
const FORM = "https://docs.google.com/forms/d/e/1FAIpQLSfCW9DRiWOvLXy0NVFJLAx4bVV4eMl2Oq83eg4WDIAkjex2NQ/viewform?usp=pp_url&entry.1019478409=Cash+on+Delivery&entry.550752312=";
const PRODUCTS = {
  classic: { inStock: false, formName: "PikoBot Classic" },
  bruno:   { inStock: false, formName: "PikoBot Bruno" },
  bw:      { inStock: false, formName: "PikoBot Black & White" },
};
const RESTOCK_URL = "https://www.instagram.com/xenon.industries";

document.querySelectorAll("[data-product]").forEach((card) => {
  const p = PRODUCTS[card.dataset.product];
  const slot = card.querySelector("[data-action]");
  if (!p || !slot) return;
  const featured = card.classList.contains("bot--hero");
  if (p.inStock) {
    slot.innerHTML = `<a class="btn ${featured ? "btn--ink" : "btn--orange"}" href="${FORM + encodeURIComponent(p.formName).replace(/%20/g, "+")}" target="_blank" rel="noopener">Order, cash on delivery</a>`;
  } else {
    slot.innerHTML = `<span class="stock stock--out">Sold out</span><a class="btn btn--ghost" href="${RESTOCK_URL}" target="_blank" rel="noopener">Ask about restock</a>`;
  }
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
