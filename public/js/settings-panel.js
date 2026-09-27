/**
 * Ember — global settings panel.
 * Lädt CSS aus /css/settings-panel.css.
 * Persistiert unter "ember.settings.v1".
 */
(function () {
  const KEY = "ember.settings.v1";

  const THEMES = [
    { id: "ember",    label: "Ember",    bg: "#0c0908", panel: "#161010", line: "#3a2a24", accent: "#e85d04" },
    { id: "umbra",    label: "Umbra",    bg: "#08060a", panel: "#100c14", line: "#2c2438", accent: "#9b5de5" },
    { id: "frost",    label: "Frost",    bg: "#070a0d", panel: "#0e141a", line: "#243440", accent: "#4cc9f0" },
    { id: "moss",     label: "Moss",     bg: "#080b08", panel: "#101410", line: "#233024", accent: "#86a85a" },
    { id: "wine",     label: "Wein",     bg: "#0d0708", panel: "#180d0f", line: "#3a1f22", accent: "#c4506a" },
    { id: "sand",     label: "Sand",     bg: "#0d0a06", panel: "#1a140c", line: "#3a2e1e", accent: "#d4a373" },
    { id: "ocean",    label: "Ozean",    bg: "#050a0c", panel: "#0c161a", line: "#1f3540", accent: "#2ec4b6" },
    { id: "ash",      label: "Asche",    bg: "#0a0a0a", panel: "#141414", line: "#2e2e2e", accent: "#b8b8b8" },
  ];

  const DEFAULTS = {
    fontScale: 100,
    fontFamily: "auto",
    lineHeight: 145,
    maxWidth: 1100,
    letterSpacing: 0,
    density: "cozy",
    motion: "full",
    contrast: "default",
    theme: "ember",
  };

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!raw) return { ...DEFAULTS };
      return { ...DEFAULTS, ...raw };
    } catch { return { ...DEFAULTS }; }
  }
  function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }

  let state = load();

  function applyTheme() {
    const t = THEMES.find((x) => x.id === state.theme) || THEMES[0];
    const root = document.documentElement;
    root.style.setProperty("--bg", t.bg);
    root.style.setProperty("--panel", t.panel);
    root.style.setProperty("--line", t.line);
    root.style.setProperty("--ember", t.accent);
    // Helligkeits-abhängige Akzente
    root.style.setProperty("--gold", "#f4d6a0");
    root.style.setProperty("--hope", "#e9c46a");
    document.body.dataset.theme = t.id;
  }

  function apply() {
    const root = document.documentElement;
    const body = document.body;
    root.style.setProperty("--ember-font-scale", state.fontScale + "%");
    root.style.fontSize = state.fontScale + "%";
    body.style.lineHeight = (state.lineHeight / 100).toFixed(2);
    const map = {
      auto:  "",
      serif: "'Palatino Linotype', Palatino, Georgia, serif",
      sans:  "'Segoe UI', system-ui, -apple-system, sans-serif",
    };
    body.style.fontFamily = map[state.fontFamily] || "";
    body.style.letterSpacing = (state.letterSpacing * 0.01) + "em";
    root.style.setProperty("--ember-maxw", state.maxWidth + "px");
    root.style.setProperty(
      "--ember-pad",
      state.density === "compact" ? "8px" : state.density === "comfy" ? "20px" : "14px"
    );
    root.style.setProperty("--ember-motion", state.motion === "reduced" ? "0.001" : "1");
    body.classList.toggle("reduce-motion", state.motion === "reduced");
    body.classList.toggle("high-contrast", state.contrast === "high");
    applyTheme();

    document.querySelectorAll("[data-ember-setting]").forEach((el) => {
      const k = el.dataset.emberSetting;
      el.value = state[k];
      const out = el.parentElement.querySelector("output");
      if (out) out.textContent = el.value;
    });
    document.querySelectorAll(".ember-theme-swatch").forEach((el) => {
      el.classList.toggle("on", el.dataset.theme === state.theme);
    });
    save(state);
  }

  function build() {
    if (document.getElementById("emberSettingsDock")) return;

    const dock = document.createElement("div");
    dock.id = "emberSettingsDock";
    dock.innerHTML = `
      <button type="button" class="ember-dock-btn" id="emberDockBtn" title="Einstellungen" aria-label="Einstellungen">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 3.5v2.2M12 18.3V21M4.9 6.5l1.6 1.6M17.5 16.9l1.6 1.6M3.5 12h2.2M18.3 12H21M4.9 17.5l1.6-1.6M17.5 7.1l1.6-1.6"/>
        </svg>
      </button>
    `;
    document.body.appendChild(dock);

    const themeSwatches = THEMES.map((t) => `
      <button type="button" class="ember-theme-swatch" data-theme="${t.id}"
        title="${t.label}"
        style="background:linear-gradient(135deg, ${t.bg} 0%, ${t.panel} 55%, ${t.accent} 100%);">
        <span>${t.label}</span>
      </button>
    `).join("");

    const panel = document.createElement("aside");
    panel.id = "emberSettingsPanel";
    panel.className = "ember-settings hidden";
    panel.innerHTML = `
      <header>
        <h2>Einstellungen</h2>
        <button type="button" class="ember-close" id="emberCloseBtn" aria-label="Schließen">×</button>
      </header>
      <div class="ember-settings-body">

        <div class="ember-section">
          <h3>Farbschema</h3>
          <div class="ember-themes">${themeSwatches}</div>
        </div>

        <div class="ember-section">
          <h3>Typografie</h3>
          <label class="ember-field">
            <span>Schriftgröße <output></output></span>
            <input type="range" min="70" max="140" step="5" data-ember-setting="fontScale" />
          </label>
          <label class="ember-field">
            <span>Schriftfamilie</span>
            <select data-ember-setting="fontFamily">
              <option value="auto">Automatisch</option>
              <option value="serif">Serif (Palatino)</option>
              <option value="sans">Sans (Segoe)</option>
            </select>
          </label>
          <label class="ember-field">
            <span>Zeilenabstand <output></output></span>
            <input type="range" min="100" max="200" step="5" data-ember-setting="lineHeight" />
          </label>
          <label class="ember-field">
            <span>Zeichenabstand <output></output></span>
            <input type="range" min="-1" max="4" step="1" data-ember-setting="letterSpacing" />
          </label>
        </div>

        <div class="ember-section">
          <h3>Layout</h3>
          <label class="ember-field">
            <span>Inhaltsbreite <output></output>px</span>
            <input type="range" min="600" max="1600" step="20" data-ember-setting="maxWidth" />
          </label>
          <label class="ember-field">
            <span>Dichte</span>
            <select data-ember-setting="density">
              <option value="compact">Kompakt</option>
              <option value="cozy">Gemütlich</option>
              <option value="comfy">Luftig</option>
            </select>
          </label>
        </div>

        <div class="ember-section">
          <h3>Barrierefreiheit</h3>
          <label class="ember-field">
            <span>Bewegung</span>
            <select data-ember-setting="motion">
              <option value="full">Voll</option>
              <option value="reduced">Reduziert</option>
            </select>
          </label>
          <label class="ember-field">
            <span>Kontrast</span>
            <select data-ember-setting="contrast">
              <option value="default">Standard</option>
              <option value="high">Hoch</option>
            </select>
          </label>
        </div>

        <div class="ember-settings-actions">
          <button type="button" class="btn" id="emberResetBtn">Zurücksetzen</button>
          <button type="button" class="btn primary" id="emberCloseBtn2">Fertig</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    document.getElementById("emberDockBtn").addEventListener("click", () => {
      panel.classList.toggle("hidden");
    });
    panel.querySelectorAll("[data-ember-setting]").forEach((el) => {
      el.addEventListener("input", () => {
        const k = el.dataset.emberSetting;
        state[k] = el.type === "range" || el.type === "number" ? Number(el.value) : el.value;
        apply();
      });
    });
    panel.querySelectorAll(".ember-theme-swatch").forEach((el) => {
      el.addEventListener("click", () => {
        state.theme = el.dataset.theme;
        apply();
      });
    });
    panel.querySelectorAll("#emberCloseBtn, #emberCloseBtn2").forEach((b) => {
      b.addEventListener("click", () => panel.classList.add("hidden"));
    });
    document.getElementById("emberResetBtn").addEventListener("click", () => {
      state = { ...DEFAULTS };
      apply();
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") panel.classList.add("hidden");
    });
  }

  function style() {
    // Lädt settings-panel.css, falls noch nicht vorhanden
    if (document.querySelector('link[data-ember-settings]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/settings-panel.css?v=1";
    link.dataset.emberSettings = "1";
    document.head.appendChild(link);
  }

  function init() { style(); build(); apply(); }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.EmberSettings = {
    get: () => state,
    set: (p) => { state = { ...state, ...p }; apply(); },
    reset: () => { state = { ...DEFAULTS }; apply(); },
    themes: THEMES,
  };
})();