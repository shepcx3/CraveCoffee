// ---------- Nav ----------
const nav = document.getElementById("nav");
const toggle = document.getElementById("navToggle");
const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

const closeNav = () => {
  nav.classList.remove("is-open");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open menu");
  document.body.style.overflow = "";
};
toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  document.body.style.overflow = open ? "hidden" : "";
});
document.querySelectorAll("#navLinks a").forEach((a) => a.addEventListener("click", closeNav));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeNav(); });

// ---------- Open / closed status (Kingston time) ----------
const OPEN = 7 * 60 + 30; // 7:30 a.m.
const CLOSE = 20 * 60;    // 8:00 p.m.
function kingstonNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, mins: (Number(get("hour")) % 24) * 60 + Number(get("minute")) };
}
function updateStatus() {
  const { day, mins } = kingstonNow();
  const pill = document.getElementById("statusPill");
  const text = document.getElementById("statusText");
  const open = mins >= OPEN && mins < CLOSE;
  pill.classList.toggle("is-open", open);
  pill.classList.toggle("is-closed", !open);
  if (open) {
    const left = CLOSE - mins;
    text.textContent = left <= 60 ? `Open now · closes in ${left} min` : "Open now · until 8 p.m.";
  } else {
    text.textContent = mins < OPEN ? "Closed · opens 7:30 a.m." : "Closed · opens 7:30 a.m. tomorrow";
  }
  document.querySelectorAll("#hours tr").forEach((tr) =>
    tr.classList.toggle("is-today", Number(tr.dataset.day) === day)
  );
}
updateStatus();
setInterval(updateStatus, 60_000);

// ---------- Menu ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
(function renderMenu() {
  const root = document.getElementById("menuRoot");
  const menu = (window.CRAVE_MENU || []).filter((c) => c && c.items && c.items.length);
  if (!menu.length) {
    root.innerHTML = `
      <div class="menu__soon reveal">
        <div>
          <h3>Fresh menu,<br/>brewing now.</h3>
          <p>Our full drinks &amp; bakery menu is landing here soon. Until then, the best way to see it is in person — the chalkboard is waiting at 166 Princess St.</p>
          <ul class="menu__chips">
            <li>Espresso</li><li>Lattes</li><li>Iced &amp; Cold Foam</li><li>Tea</li><li>Croissants</li><li>Sweets</li><li>Savoury</li>
          </ul>
        </div>
        <div class="menu__brew" aria-hidden="true"><span class="ring"></span><span class="ring"></span><img src="assets/img/logo.png" alt=""/></div>
      </div>`;
    return;
  }
  root.innerHTML = `<div class="menu__cats">${menu.map((c) => `
    <div class="menu__cat reveal">
      <h3>${esc(c.name)}</h3>
      ${c.items.map((it) => `
        <div class="menu__item">
          <b>${esc(it.name)}</b><i></i><span>${it.price ? `$${esc(it.price)}` : ""}</span>
          ${it.note ? `<small>${esc(it.note)}</small>` : ""}
        </div>`).join("")}
    </div>`).join("")}</div>`;
})();

// ---------- Reveal on scroll ----------
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

// ---------- Parallax ----------
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduce) {
  const bgWord = document.querySelector(".hero__bgword span");
  const para = [...document.querySelectorAll("[data-parallax]")];
  let ticking = false;
  const run = () => {
    const y = window.scrollY;
    if (y < window.innerHeight * 1.2) bgWord.style.transform = `translateX(calc(-12% + ${(y * -0.35).toFixed(1)}px))`;
    const vh = window.innerHeight;
    para.forEach((el) => {
      const r = el.getBoundingClientRect();
      const d = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax);
      el.style.setProperty("--py", `${d.toFixed(1)}px`);
    });
    ticking = false;
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
  run();
}

document.getElementById("year").textContent = new Date().getFullYear();
