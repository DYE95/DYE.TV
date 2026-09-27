/* Ember — Startseite mit Menü + Desk-Modus */
(function () {
  const STORE = "ember.home.desk.v1";

  const BUILTIN = [
    { id: "ember",    title: "Die Glut",       sub: "SL-Werkstatt · Session, Events", href: "/ember" },
    { id: "player",   title: "Spieler-Tisch",  sub: "Bogen wählen, mitspielen",       href: "/player" },
    { id: "token",    title: "Tokenatelier",   sub: "Pixel-Maker",                    href: "/token" },
    { id: "runner",   title: "Leitungsparcours", sub: "DYE · Endless Runner",         href: "/runner" },
    { id: "media",    title: "Mediathek",      sub: "Videos lokal abspielen",         panel: "panelMedia" },
  ];

  function defaults() {
    return {
      mode: "menu",
      fontSize: 15,
      tileW: 260,
      tileH: 88,
      grid: 24,
      locked: false,
      tiles: {
        ember:  { x: 24,  y: 24  },
        player: { x: 312, y: 24  },
        token:  { x: 24,  y: 136 },
        runner: { x: 312, y: 136 },
        media:  { x: 24,  y: 248 },
      },
      custom: [],
      profiles: {},
      activeProfile: "",
    };
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || "null");
      if (!raw) return defaults();
      return {
        ...defaults(),
        ...raw,
        tiles: { ...defaults().tiles, ...(raw.tiles || {}) },
        custom: Array.isArray(raw.custom) ? raw.custom : [],
      };
    } catch { return defaults(); }
  }
  function save() { localStorage.setItem(STORE, JSON.stringify(state)); }

  let state = load();
  const desk = document.getElementById("desk");
  const startMain = document.getElementById("startMain");
  const nodes = {};

  function snap(n) {
    const g = Math.max(8, Number(state.grid) || 24);
    return Math.round(n / g) * g;
  }
  function catalog() { return BUILTIN.concat(state.custom); }

  function applyMode() {
    const deskMode = state.mode === "desk";
    startMain?.classList.toggle("hidden", deskMode);
    desk?.classList.toggle("hidden", !deskMode);
    document.getElementById("tabMenu")?.classList.toggle("on", !deskMode);
    document.getElementById("tabDesk")?.classList.toggle("on", deskMode);
    document.getElementById("tabMenu")?.classList.toggle("ghost", deskMode);
    document.getElementById("tabDesk")?.classList.toggle("ghost", !deskMode);
    if (deskMode) {
      // Falls noch nicht gebaut, jetzt bauen
      if (!Object.keys(nodes).length) buildTiles();
      else catalog().forEach((t) => place(t.id));
    }
  }

  function applyChrome() {
    document.body.style.fontSize = state.fontSize + "px";
    desk.style.setProperty("--grid", state.grid + "px");
    document.body.classList.toggle("locked", Boolean(state.locked));
  }

  function place(id) {
    const el = nodes[id];
    if (!el) return;
    const pos = state.tiles[id] || { x: 24, y: 24 };
    el.style.width = state.tileW + "px";
    el.style.height = state.tileH + "px";
    el.style.left = pos.x + "px";
    el.style.top = pos.y + "px";
    el.style.fontSize = state.fontSize + "px";
  }

  function openPanel(id) {
    document.querySelectorAll(".desk-panel").forEach((p) => p.classList.add("hidden"));
    if (id) document.getElementById(id)?.classList.remove("hidden");
  }

  function activate(item) {
    if (item.href) {
      if (/^https?:/i.test(item.href)) window.open(item.href, "_blank", "noopener");
      else location.href = item.href;
    } else if (item.panel) openPanel(item.panel);
  }

  function bindDrag(el, item) {
    let drag = null;
    el.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0 || state.locked) return;
      ev.preventDefault();
      el.setPointerCapture(ev.pointerId);
      const pos = state.tiles[item.id] || { x: 24, y: 24 };
      drag = { x: ev.clientX, y: ev.clientY, ox: pos.x, oy: pos.y, moved: false };
    });
    el.addEventListener("pointermove", (ev) => {
      if (!drag || state.locked) return;
      const dx = ev.clientX - drag.x;
      const dy = ev.clientY - drag.y;
      if (Math.hypot(dx, dy) > 4) drag.moved = true;
      if (!drag.moved) return;
      state.tiles[item.id] = {
        x: snap(Math.max(0, drag.ox + dx)),
        y: snap(Math.max(0, drag.oy + dy)),
      };
      place(item.id);
    });
    el.addEventListener("pointerup", () => {
      if (!drag) return;
      const wasDrag = drag.moved && !state.locked;
      drag = null;
      if (wasDrag) save();
      else activate(item);
    });
  }

  function buildTiles() {
    desk.innerHTML = "";
    Object.keys(nodes).forEach((k) => delete nodes[k]);
    catalog().forEach((item) => {
      if (!state.tiles[item.id]) {
        const n = Object.keys(state.tiles).length;
        state.tiles[item.id] = {
          x: snap(24 + (n % 3) * (state.tileW + state.grid)),
          y: snap(24 + Math.floor(n / 3) * (state.tileH + state.grid)),
        };
      }
      const el = document.createElement("button");
      el.type = "button";
      el.className = "desk-tile";
      el.innerHTML = "<b>" + item.title + "</b><span>" + (item.sub || "") + "</span>";
      desk.appendChild(el);
      nodes[item.id] = el;
      bindDrag(el, item);
      place(item.id);
    });
  }

  function renderProfiles() {
    // wird derzeit nicht sichtbar gerendert, nur intern gehalten
  }

  /* ——— UI Wiring ——— */
  document.getElementById("tabMenu")?.addEventListener("click", () => {
    state.mode = "menu"; save(); applyMode();
  });
  document.getElementById("tabDesk")?.addEventListener("click", () => {
    state.mode = "desk"; save(); applyMode();
  });
  document.getElementById("btnModeMenu")?.addEventListener("click", () => {
    state.mode = "menu"; save(); applyMode();
  });
  document.getElementById("btnModeDesk")?.addEventListener("click", () => {
    state.mode = "desk"; save(); applyMode();
  });

  document.getElementById("btnOpenMedia")?.addEventListener("click", () => openPanel("panelMedia"));
  document.getElementById("btnAddTile")?.addEventListener("click", () => {
    if (state.locked) return alert("Tisch ist fest.");
    const title = prompt("Titel der Kachel?", "Notizen");
    if (!title) return;
    const sub = prompt("Untertitel?", "kurz") || "";
    const href = prompt("Link (z.B. /ember oder https://…)", "/ember") || "";
    state.custom.push({ id: "c_" + Date.now().toString(36), title, sub, href });
    save(); buildTiles(); applyMode();
  });

  document.getElementById("btnSaveProfile")?.addEventListener("click", () => {
    const name = prompt("Profilname?", "Tisch 1");
    if (!name) return;
    state.profiles[name] = {
      fontSize: state.fontSize,
      tileW: state.tileW,
      tileH: state.tileH,
      grid: state.grid,
      locked: state.locked,
      tiles: JSON.parse(JSON.stringify(state.tiles)),
      custom: JSON.parse(JSON.stringify(state.custom)),
      mode: state.mode,
    };
    state.activeProfile = name;
    save();
    alert("Profil gespeichert: " + name);
  });

  /* ——— ZIP Export / Import (store-only, ASCII-Namen) ——— */
  function crcTable() {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  }
  const CRC = crcTable();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  const u16 = (n) => [n & 255, (n >>> 8) & 255];
  const u32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];

  function zipFiles(files) {
    const enc = new TextEncoder();
    const parts = [], central = [];
    let offset = 0;
    files.forEach((file) => {
      const name = enc.encode(file.name);
      const data = typeof file.data === "string" ? enc.encode(file.data) : file.data;
      const crc = crc32(data);
      const local = [0x50, 0x4b, 0x03, 0x04, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        .concat(u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      const localBuf = new Uint8Array(local.concat([...name], [...data]));
      parts.push(localBuf);
      const cen = [0x50, 0x4b, 0x01, 0x02, 20, 0, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        .concat(u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset));
      central.push(new Uint8Array(cen.concat([...name])));
      offset += localBuf.length;
    });
    const cenAll = central.reduce((n, b) => n + b.length, 0);
    const end = new Uint8Array(
      [0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0]
        .concat(u16(files.length), u16(files.length), u32(cenAll), u32(offset), u16(0))
    );
    const total = offset + cenAll + end.length;
    const out = new Uint8Array(total);
    let p = 0;
    parts.forEach((b) => { out.set(b, p); p += b.length; });
    central.forEach((b) => { out.set(b, p); p += b.length; });
    out.set(end, p);
    return out;
  }

  function packPayload() {
    return JSON.stringify({
      kind: "ember-home-pack",
      version: 2,
      houseName: "Ember",
      desk: state,
      settings: window.EmberSettings?.get?.() || null,
    }, null, 2);
  }

  document.getElementById("btnExport")?.addEventListener("click", () => {
    const zip = zipFiles([
      { name: "ember-home.json", data: packPayload() },
      { name: "liesmich.txt",    data: "Ember Home-Paket. Import über den Tisch-Tab → Import." },
    ]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([zip], { type: "application/zip" }));
    a.download = "ember-home.zip";
    a.click();
  });

  document.getElementById("packFile")?.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    let payload = null;
    if (file.name.endsWith(".json") || text.trim().startsWith("{")) {
      payload = JSON.parse(text);
    } else {
      const idx = text.indexOf("ember-home.json");
      const brace = text.indexOf("{", idx);
      const end = text.lastIndexOf("}");
      if (brace >= 0 && end > brace) payload = JSON.parse(text.slice(brace, end + 1));
    }
    if (!payload || payload.kind !== "ember-home-pack" || !payload.desk) {
      alert("Kein Ember-Home-Paket."); return;
    }
    state = { ...defaults(), ...payload.desk, profiles: payload.desk.profiles || {} };
    if (payload.settings) {
      // Theme + Typo aus Paket anwenden
      window.EmberSettings?.set?.(payload.settings);
    }
    save();
    applyChrome();
    buildTiles();
    applyMode();
  });

  document.querySelectorAll("[data-close]").forEach((b) => {
    b.addEventListener("click", () => openPanel(null));
  });

  /* ——— Mediathek ——— */
  const video = document.getElementById("homeVideo");
  if (video && window.attachVideoDeck) window.attachVideoDeck(video);
  document.getElementById("clipFile")?.addEventListener("change", (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const data = String(reader.result).split(",")[1] || "";
      const ext = /webm/i.test(file.type || file.name) ? "webm" : "mp4";
      await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, ext, name: file.name }),
      });
      location.reload();
    };
    reader.readAsDataURL(file);
  });

  fetch("/api/state").then(r => r.json()).then((s) => {
    const list = document.getElementById("clipList");
    if (!list) return;
    const media = s.media || [];
    list.innerHTML = "";
    media.forEach((clip, i) => {
      const b = document.createElement("button");
      b.className = "card";
      b.textContent = clip.name;
      b.addEventListener("click", () => {
        video.src = "/uploads/" + clip.file;
        video.play().catch(() => {});
      });
      list.appendChild(b);
      if (i === 0 && !video.src) video.src = "/uploads/" + clip.file;
    });
    if (!media.length) list.innerHTML = "<p class='hint'>Noch kein Clip.</p>";
  }).catch(() => {});

  /* ——— Start ——— */
  applyChrome();
  applyMode();
  if (state.mode === "desk") buildTiles();
})();