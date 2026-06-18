/* ──────────────────────────────────────────────────────────
   INCHARGE · tweaks.js
   Painel de Tweaks — Layout / Densidade / KPIs.
   ────────────────────────────────────────────────────────── */
(function () {
  const root = document.documentElement;

  const DEFAULTS = (window.__TWEAK_DEFAULTS && { ...window.__TWEAK_DEFAULTS }) || {
    layout: "grid",
    density: "cozy",
    showKpis: true,
  };

  let state = { ...DEFAULTS };
  try {
    const saved = JSON.parse(localStorage.getItem("incharge.tweaks") || "{}");
    state = { ...state, ...saved };
  } catch (_) {}

  function applyState() {
    root.setAttribute("data-layout",   state.layout);
    root.setAttribute("data-density",  state.density);
    root.setAttribute("data-show-kpis", state.showKpis ? "true" : "false");
    try { localStorage.setItem("incharge.tweaks", JSON.stringify(state)); } catch (_) {}
  }

  function setTweak(patch) {
    state = { ...state, ...patch };
    applyState();
    renderPanel();
  }

  // ── Build panel ──────────────────────────────────────────
  const panel = document.createElement("aside");
  panel.className = "tweaks";
  panel.setAttribute("aria-label", "Tweaks");

  const fab = document.createElement("button");
  fab.className = "tweaks-fab";
  fab.setAttribute("aria-label", "Abrir ajustes");
  fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`;

  function show() { panel.classList.add("is-open"); fab.classList.remove("is-visible"); }
  function hide() { panel.classList.remove("is-open"); fab.classList.add("is-visible"); }

  fab.addEventListener("click", show);

  function seg(label, key, options) {
    const wrap = document.createElement("div");
    wrap.className = "tweak";
    wrap.innerHTML = `<div class="tweak__label">${label}</div>`;
    const s = document.createElement("div");
    s.className = "seg";
    options.forEach(opt => {
      const b = document.createElement("button");
      b.className = "seg__opt" + (state[key] === opt.value ? " is-on" : "");
      b.textContent = opt.label;
      b.addEventListener("click", () => setTweak({ [key]: opt.value }));
      s.append(b);
    });
    wrap.append(s);
    return wrap;
  }

  function sw(label, key) {
    const wrap = document.createElement("div");
    wrap.className = "tweak";
    const row = document.createElement("button");
    row.type = "button";
    row.className = "switch" + (state[key] ? " is-on" : "");
    row.innerHTML = `<span class="switch__label">${label}</span><span class="switch__toggle"></span>`;
    row.addEventListener("click", () => setTweak({ [key]: !state[key] }));
    wrap.append(row);
    return wrap;
  }

  function renderPanel() {
    panel.innerHTML = "";
    const head = document.createElement("div");
    head.className = "tweaks__head";
    head.innerHTML = `<div class="tweaks__title">Ajustes</div>`;
    const close = document.createElement("button");
    close.className = "tweaks__close";
    close.setAttribute("aria-label", "Fechar");
    close.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
    close.addEventListener("click", hide);
    head.append(close);
    panel.append(head);

    const body = document.createElement("div");
    body.className = "tweaks__body";
    body.append(
      seg("Layout", "layout", [
        { label: "Grid",     value: "grid"    },
        { label: "Lista",    value: "list"    },
        { label: "Compacto", value: "compact" },
      ]),
      seg("Densidade", "density", [
        { label: "Compacto", value: "compact"     },
        { label: "Médio",    value: "cozy"         },
        { label: "Espaçoso", value: "comfortable"  },
      ]),
      sw("Mostrar KPIs", "showKpis"),
    );
    panel.append(body);
  }

  // Mount
  document.body.append(panel, fab);
  applyState();
  renderPanel();
  fab.classList.add("is-visible");
})();
