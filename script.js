/* ──────────────────────────────────────────────────────────
   INCHARGE · script.js
   Fetch de status, render dos cards, KPIs e timer ao vivo.
   ────────────────────────────────────────────────────────── */
(function () {
  // ── Configuração ─────────────────────────────────────────
  const REFRESH_MS = 30000;
  const TICK_MS    = 1000;

  // Locais de carregamento
  const locations = [
    { name: "PC128", key: "pc128" },
    { name: "PC106", key: "pc106" },
  ];

  const STATUS_LABEL = {
    Available: "Disponível",
    Preparing: "Preparando",
    Charging:  "Carregando",
    Finishing: "Finalizando",
    Offline:   "Offline",
  };

  // ── Elementos ────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const root       = document.documentElement;
  const elKpis     = $("#kpis");
  const elLocs     = $("#locations");
  const elUpdated  = $("#last-update");
  const elLive     = $("#live-pill");
  const elBanner   = $("#banner");
  const elBtnTheme = $("#theme-toggle");

  // ── Estado ───────────────────────────────────────────────
  const allKeys = locations.map(l => l.key);
  let data       = {};     // { key: [{ plug, status, online }, ...] }
  let lastFetch  = 0;
  let usingMock  = false;

  // ── Utils ────────────────────────────────────────────────
  function getStatus(ch) {
    if (!ch || ch.online === 0) return "Offline";
    return STATUS_LABEL[ch.status] ? ch.status : "Available";
  }
  function statusClass(ch) {
    return "is-" + getStatus(ch).toLowerCase();
  }
  function paymentLink(key, plug) {
    return `https://incharge.app/now/${String(key).toUpperCase()}/${plug}`;
  }

  // Mini DOM builder
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("data-")) node.setAttribute(k, v);
      else if (k in node) node[k] = v;
      else node.setAttribute(k, v);
    }
    for (const c of children.flat()) {
      if (c == null) continue;
      node.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  // ── KPIs ─────────────────────────────────────────────────
  function aggregate() {
    const s = { total: 0, available: 0, charging: 0, finishing: 0, preparing: 0, offline: 0 };
    allKeys.forEach(k => {
      (data[k] || []).forEach(ch => {
        s.total++;
        const st = getStatus(ch).toLowerCase();
        if (s[st] != null) s[st]++;
      });
    });
    return s;
  }

  function renderKpis() {
    const s = aggregate();
    const items = [
      { label: "Total",       value: s.total,     cls: "kpi--total"     },
      { label: "Disponíveis", value: s.available,  cls: "kpi--available" },
      { label: "Carregando",  value: s.charging,   cls: "kpi--charging"  },
      { label: "Finalizando", value: s.finishing,  cls: "kpi--finishing" },
      { label: "Offline",     value: s.offline,    cls: "kpi--offline"   },
    ];
    elKpis.replaceChildren(...items.map(it =>
      el("div", { class: `kpi ${it.cls}` },
        el("div", { class: "kpi__swatch" }),
        el("div", { class: "kpi__body" },
          el("span", { class: "kpi__label" }, it.label),
          el("span", { class: "kpi__value" }, String(it.value)),
        )
      )
    ));
  }

  // ── Plug ─────────────────────────────────────────────────
  function renderPlug(key, ch) {
    const a = el("a", {
      class: `plug ${statusClass(ch)}`,
      href: paymentLink(key, ch.plug),
      target: "_blank",
      rel: "noopener noreferrer",
      title: `${key.toUpperCase()} · Plug ${ch.plug} — ${STATUS_LABEL[getStatus(ch)] || getStatus(ch)}`,
    });
    a.append(
      el("span", { class: "plug__dot" }),
      el("span", { class: "plug__num" }, `P${ch.plug}`),
      el("span", { class: "plug__status" }, STATUS_LABEL[getStatus(ch)] || getStatus(ch)),
    );
    return a;
  }

  function renderLoadingPlug() {
    return el("div", { class: "plug is-loading" },
      el("span", { class: "plug__num" }, "—"),
      el("span", { class: "plug__status" }, "…"),
    );
  }

  // ── Unit (charger station) ────────────────────────────────
  function renderUnit(key) {
    const list   = Array.isArray(data[key]) ? data[key] : [];
    const ok     = list.filter(c => getStatus(c) !== "Offline").length;
    const upper  = key.toUpperCase();
    const prefix = upper.replace(/\d+$/, "");
    const suffix = upper.slice(prefix.length);

    const unit = el("article", { class: "unit" });
    unit.append(
      el("div", { class: "unit__head" },
        el("span", { class: "unit__id" },
          el("span", { class: "unit__id-prefix" }, prefix),
          suffix,
        ),
        el("span", { class: "unit__health" }, list.length ? `${ok}/${list.length}` : "—"),
      ),
    );

    const plugs = el("div", { class: "plugs", "data-count": String(Math.max(list.length, 1)) });
    if (list.length === 0) {
      plugs.append(renderLoadingPlug(), renderLoadingPlug());
    } else {
      list.forEach(ch => plugs.append(renderPlug(key, ch)));
    }
    unit.append(plugs);
    return unit;
  }

  // ── Location cards ────────────────────────────────────────
  function renderLocations() {
    const frag = document.createDocumentFragment();

    locations.forEach(loc => {
      const list = data[loc.key] || [];
      const avail   = list.filter(c => getStatus(c) === "Available").length;
      const charging = list.filter(c => getStatus(c) === "Charging").length;
      const finishing = list.filter(c => getStatus(c) === "Finishing").length;
      const offline  = list.filter(c => getStatus(c) === "Offline").length;

      const summary = el("div", { class: "loc-card__summary" });
      if (avail)    summary.append(el("span", { class: "loc-card__stat", "data-st": "available", title: "Disponíveis" }, String(avail)));
      if (charging) summary.append(el("span", { class: "loc-card__stat", "data-st": "charging",  title: "Carregando"  }, String(charging)));
      if (finishing) summary.append(el("span", { class: "loc-card__stat", "data-st": "finishing", title: "Finalizando" }, String(finishing)));
      if (offline)  summary.append(el("span", { class: "loc-card__stat", "data-st": "offline",   title: "Offline"     }, String(offline)));

      const head = el("div", { class: "loc-card__head" },
        el("div", { class: "loc-card__name" }, loc.name),
        summary,
      );

      const body = el("div", { class: "loc-card__body" });
      body.append(renderUnit(loc.key));

      frag.append(el("article", { class: "loc-card" }, head, body));
    });

    elLocs.replaceChildren(frag);
  }

  // ── Timer "há Xs" ─────────────────────────────────────────
  function fmtSince() {
    if (!lastFetch) return "esperando dados…";
    const s = Math.floor((Date.now() - lastFetch) / 1000);
    if (s < 5)    return "agora";
    if (s < 60)   return `há ${s}s`;
    if (s < 3600) return `há ${Math.floor(s / 60)}min ${s % 60}s`;
    return `há ${Math.floor(s / 3600)}h`;
  }

  function renderUpdated() {
    elUpdated.textContent = fmtSince();
    const stale = lastFetch && (Date.now() - lastFetch > REFRESH_MS * 2);
    elLive.classList.toggle("is-stale", !!stale);
    elLive.querySelector(".live-text").textContent = stale ? "PAUSADO" : "AO VIVO";
  }

  // ── Render all ───────────────────────────────────────────
  function renderAll() {
    renderKpis();
    renderLocations();
  }

  // ── Fetch ────────────────────────────────────────────────
  async function fetchOne(key) {
    try {
      const res = await fetch(`https://api.incharge.app/api/v2/now/${key}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const arr = Array.isArray(json) ? json : Array.isArray(json?.chargers) ? json.chargers : [];
      return { key, data: arr, ok: true };
    } catch (err) {
      return { key, data: [], ok: false };
    }
  }

  async function refresh() {
    try {
      const results = await Promise.all(allKeys.map(fetchOne));
      const okCount = results.filter(r => r.ok).length;

      if (okCount === 0) {
        if (!usingMock) {
          usingMock = true;
          applyMock();
          showBanner("Visualizando com dados de exemplo — a API real está bloqueada por CORS neste preview.");
        }
      } else {
        usingMock = false;
        const next = {};
        results.forEach(r => { next[r.key] = r.data; });
        data = next;
        lastFetch = Date.now();
        hideBanner();
      }

      renderAll();
      renderUpdated();
    } catch (e) {
      console.error("[INCHARGE] refresh falhou", e);
    }
  }

  // ── Mock data (fallback CORS) ─────────────────────────────
  function applyMock() {
    const statuses = ["Available", "Available", "Available", "Charging", "Charging", "Finishing", "Preparing"];
    const pick = () => statuses[Math.floor(Math.random() * statuses.length)];
    const next = {};
    allKeys.forEach((key, idx) => {
      const n = key.startsWith("pc") ? 2 : 3;
      const goOffline = idx % 9 === 0;
      next[key] = Array.from({ length: n }, (_, i) => ({
        plug: i + 1,
        status: pick(),
        online: goOffline && i === 0 ? 0 : 1,
      }));
    });
    data = next;
    lastFetch = Date.now();
  }

  function showBanner(msg) {
    if (!elBanner) return;
    elBanner.textContent = "";
    elBanner.append(
      el("span", { class: "banner__dot" }),
      el("span", null, msg),
    );
    elBanner.style.display = "flex";
  }
  function hideBanner() { if (elBanner) elBanner.style.display = "none"; }

  // ── Tema ─────────────────────────────────────────────────
  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem("incharge.theme", theme); } catch (_) {}
  }
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("incharge.theme"); } catch (_) {}
    if (saved === "light" || saved === "dark") applyTheme(saved);
    elBtnTheme && elBtnTheme.addEventListener("click", () => {
      applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  }

  // ── Boot ─────────────────────────────────────────────────
  function boot() {
    initTheme();
    renderAll();          // placeholder imediato
    refresh();
    setInterval(refresh, REFRESH_MS);
    setInterval(renderUpdated, TICK_MS);

    window.__incharge = { refresh, renderAll };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
