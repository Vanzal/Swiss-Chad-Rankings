(() => {
  "use strict";

  /* ---------- Drop countdown ---------- */
  // Drops run every two days at 17:00 Swiss time, counted from 2 Oct 2026.
  const TZ = "Europe/Zurich";
  const ANCHOR_DAY = Date.UTC(2026, 9, 2); // calendar date only
  const DROP_HOUR = 17;
  const DAY_MS = 86400000;

  const zurichParts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });

  // Wall-clock fields in Zurich for a UTC instant.
  function wall(ms) {
    const p = {};
    for (const part of zurichParts.formatToParts(new Date(ms))) {
      if (part.type !== "literal") p[part.type] = Number(part.value);
    }
    return p;
  }

  // Offset of Zurich from UTC (ms) at a UTC instant; handles CET/CEST.
  function offsetAt(ms) {
    const p = wall(ms);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
    return asUtc - Math.floor(ms / 1000) * 1000;
  }

  // UTC instant of a Zurich wall-clock time, given as a UTC "day" plus hour.
  function zurichToUtc(dayMs, hour) {
    const naive = dayMs + hour * 3600000;
    const first = naive - offsetAt(naive);
    return naive - offsetAt(first);
  }

  function nextDrop(now) {
    const p = wall(now);
    const today = Date.UTC(p.year, p.month - 1, p.day);
    const index = Math.round((today - ANCHOR_DAY) / DAY_MS);
    let day = index + (((index % 2) + 2) % 2); // next drop day on the two-day grid
    let at = zurichToUtc(ANCHOR_DAY + day * DAY_MS, DROP_HOUR);
    if (at <= now) {
      day += 2;
      at = zurichToUtc(ANCHOR_DAY + day * DAY_MS, DROP_HOUR);
    }
    return at;
  }

  function formatLeft(ms) {
    const totalMin = Math.max(0, Math.floor(ms / 60000));
    const hours = Math.floor(totalMin / 60);
    if (hours < 24) return `${hours}:${String(totalMin % 60).padStart(2, "0")} h`;
    return `${Math.floor(hours / 24)}d ${hours % 24} h`;
  }

  const timer = document.querySelector("[data-drop-timer]");
  if (timer) {
    const tick = () => {
      const now = Date.now();
      const at = nextDrop(now);
      timer.textContent = formatLeft(at - now);
      timer.dateTime = new Date(at).toISOString();
    };
    tick();
    setInterval(tick, 30000);
  }

  /* ---------- Banner ---------- */
  const BANNER_KEY = "scr-banner-dismissed";
  const bannerClose = document.querySelector("[data-banner-close]");
  if (bannerClose) {
    bannerClose.addEventListener("click", () => {
      document.documentElement.classList.add("no-banner");
      try {
        localStorage.setItem(BANNER_KEY, "1");
      } catch {
        /* storage unavailable: dismissal lasts for this page view */
      }
    });
  }

  /* ---------- Mobile menu ---------- */
  const menuBtn = document.querySelector("[data-menu-toggle]");
  const menu = menuBtn && document.getElementById(menuBtn.getAttribute("aria-controls"));
  if (menuBtn && menu) {
    const setOpen = (open) => {
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Menü schliessen" : "Menü öffnen");
      menu.hidden = !open;
    };

    menuBtn.addEventListener("click", () => {
      setOpen(menuBtn.getAttribute("aria-expanded") !== "true");
    });

    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        menuBtn.focus();
      }
    });
  }
})();
