const STORE = "ember.home.desk.v2";

const BUILTIN = [
  { id: "ember", title: "Ember", sub: "Die Glut · SL", href: "/ember" },
  { id: "player", title: "Spieler", sub: "Bogen antippen", href: "/player" },
  { id: "token", title: "Tokenatelier", sub: "Pixel-Maker", href: "/token" },
  { id: "pixelstube", title: "Pixelstube", sub: "Raster, Palette, PNG", href: "/pixelstube" },
  { id: "media", title: "Mediathek", sub: "Videos lokal abspielen", panel: "panelMedia" },
  { id: "bibliothek", title: "Bibliothek", sub: "PDFs und Regeln", href: "/bibliothek" },
  { id: "karten", title: "Karten", sub: "Print and Play", href: "/karten" },
  { id: "solo", title: "Solo", sub: "Übung, keine Runde", href: "/solo" },
  { id: "heft", title: "Heft", sub: "Notizen · Markdown", href: "/heft" },
  { id: "settings", title: "Einstellungen", sub: "Schrift, Kacheln, Raster", panel: "panelSettings" },
];

function defaults() {
  return {
    fontSize: 15,
    tileW: 260,
    tileH: 88,
    grid: 24,
    locked: false,
    tiles: {
      ember: { x: 24, y: 24 },
      player: { x: 312, y: 24 },
      token: { x: 600, y: 24 },
      pixelstube: { x: 888, y: 24 },
      media: { x: 24, y: 136 },
      bibliothek: { x: 312, y: 136 },
      karten: { x: 600, y: 136 },
      solo: { x: 888, y: 136 },
      heft: { x: 24, y: 248 },
      settings: { x: 312, y: 248 },
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
  } catch {
    return defaults();
  }
}

function save() {
  localStorage.setItem(STORE, JSON.stringify(state));
}

function snap(n) {
  const g = Math.max(8, Number(state.grid) || 24);
  return Math.round(n / g) * g;
}

function catalog() {
  return BUILTIN.concat(state.custom);
}

let state = load();
const desk = document.getElementById("desk");
const nodes = {};

function applyChrome() {
  const px = state.fontSize + "px";
  document.body.style.fontSize = px;
  document.getElementById("houseTitle").style.fontSize = state.fontSize * 1.7 + "px";
  desk.style.fontSize = px;
  desk.style.setProperty("--grid", state.grid + "px");
  document.body.classList.toggle("locked", Boolean(state.locked));
  document.getElementById("fontSize").value = state.fontSize;
  document.getElementById("tileW").value = state.tileW;
  document.getElementById("tileH").value = state.tileH;
  document.getElementById("grid").value = state.grid;
  document.getElementById("lockDesk").checked = Boolean(state.locked);
  document.getElementById("layoutReadout").textContent =
    state.fontSize + "px · Kachel " + state.tileW + "×" + state.tileH + " · Raster " + state.grid +
    (state.locked ? " · fest" : "");
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
  if (id) document.getElementById(id).classList.remove("hidden");
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
    if (ev.button !== 0) return;
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
      state.tiles[item.id] = { x: snap(24 + (n % 3) * (state.tileW + state.grid)), y: snap(24 + Math.floor(n / 3) * (state.tileH + state.grid)) };
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
  const list = document.getElementById("profileList");
  const names = Object.keys(state.profiles);
  list.innerHTML = names.length ? "" : "<p class='hint'>Noch kein Profil.</p>";
  names.forEach((name) => {
    const row = document.createElement("div");
    row.className = "row";
    const label = document.createElement("span");
    label.textContent = name;
    const loadBtn = document.createElement("button");
    loadBtn.className = "btn tiny";
    loadBtn.textContent = "Laden";
    loadBtn.addEventListener("click", () => {
      const p = state.profiles[name];
      const profiles = state.profiles;
      state = { ...defaults(), ...p, profiles, custom: p.custom || [], activeProfile: name };
      applyChrome();
      buildTiles();
      save();
      renderProfiles();
    });
    const delBtn = document.createElement("button");
    delBtn.className = "btn tiny ghost";
    delBtn.textContent = "Weg";
    delBtn.addEventListener("click", () => {
      delete state.profiles[name];
      save();
      renderProfiles();
    });
    row.appendChild(label);
    row.appendChild(loadBtn);
    row.appendChild(delBtn);
    list.appendChild(row);
  });
}

["fontSize", "tileW", "tileH", "grid"].forEach((id) => {
  document.getElementById(id).addEventListener("input", (ev) => {
    state[id] = Number(ev.target.value);
    applyChrome();
    catalog().forEach((t) => place(t.id));
  });
  document.getElementById(id).addEventListener("change", save);
});

document.getElementById("lockDesk").addEventListener("change", (ev) => {
  state.locked = ev.target.checked;
  applyChrome();
  save();
});

document.getElementById("btnAddTile").addEventListener("click", () => {
  if (state.locked) return alert("Tisch ist fest.");
  const title = document.getElementById("newTitle").value.trim();
  if (!title) return alert("Titel fehlt.");
  const id = "c_" + Date.now().toString(36);
  state.custom.push({
    id,
    title,
    sub: document.getElementById("newSub").value.trim(),
    href: document.getElementById("newHref").value.trim(),
  });
  save();
  buildTiles();
  document.getElementById("newTitle").value = "";
  document.getElementById("newSub").value = "";
  document.getElementById("newHref").value = "";
});

document.getElementById("btnSaveProfile").addEventListener("click", () => {
  const name = document.getElementById("profileName").value.trim();
  if (!name) return alert("Profilnamen eintragen.");
  state.profiles[name] = {
    fontSize: state.fontSize,
    tileW: state.tileW,
    tileH: state.tileH,
    grid: state.grid,
    locked: state.locked,
    tiles: JSON.parse(JSON.stringify(state.tiles)),
    custom: JSON.parse(JSON.stringify(state.custom)),
  };
  state.activeProfile = name;
  save();
  renderProfiles();
});

document.getElementById("btnResetLayout").addEventListener("click", () => {
  if (state.locked) return alert("Tisch ist fest.");
  const keep = state.profiles;
  state = defaults();
  state.profiles = keep;
  applyChrome();
  buildTiles();
  save();
});

document.querySelectorAll("[data-close]").forEach((b) => {
  b.addEventListener("click", () => openPanel(null));
});

document.getElementById("btnSaveName").addEventListener("click", async () => {
  const houseName = document.getElementById("setHouseName").value.trim() || "Ember";
  await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ houseName }),
  });
  document.getElementById("houseTitle").textContent = houseName;
  document.title = houseName;
});

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
function u16(n) { return [n & 255, (n >>> 8) & 255]; }
function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }

function zipFiles(files) {
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
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
    version: 1,
    houseName: document.getElementById("houseTitle").textContent,
    desk: state,
  }, null, 2);
}

document.getElementById("btnExport").addEventListener("click", () => {
  const zip = zipFiles([
    { name: "ember-home.json", data: packPayload() },
    { name: "liesmich.txt", data: "Ember Home-Paket. Unter Einstellungen → Paket laden wieder einspielen." },
  ]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([zip], { type: "application/zip" }));
  a.download = "ember-home.zip";
  a.click();
});

document.getElementById("packFile").addEventListener("change", async (ev) => {
  const file = ev.target.files && ev.target.files[0];
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
    alert("Kein Ember-Home-Paket.");
    return;
  }
  state = { ...defaults(), ...payload.desk, profiles: payload.desk.profiles || {} };
  applyChrome();
  buildTiles();
  save();
  renderProfiles();
  if (payload.houseName) {
    document.getElementById("setHouseName").value = payload.houseName;
    document.getElementById("houseTitle").textContent = payload.houseName;
    document.title = payload.houseName;
  }
});

applyChrome();
buildTiles();
renderProfiles();

document.getElementById("btnUpdate").addEventListener("click", async () => {
  const log = document.getElementById("updateLog");
  log.textContent = "Prüfe …";
  try {
    const res = await fetch("/api/update", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      log.textContent = "Fehler:\n" + (data.error || "unbekannt") + "\n" + (data.stdout || "") + (data.stderr || "");
      return;
    }
    if (!data.changed) {
      log.textContent = "Schon aktuell (" + data.after + ").";
      return;
    }
    log.textContent =
      "Neue Commits: " + data.before + " → " + data.after + "\n" +
      data.pullLog + "\n" +
      (data.installLog ? "npm install ausgeführt.\n" : "") +
      "\n➜ Klick auf „Server neu starten“, damit der neue Code lädt.";
  } catch (err) {
    log.textContent = "Konnte den Server nicht erreichen: " + err.message;
  }
});
document.getElementById("btnRestart").addEventListener("click", async () => {
  if (!confirm("Ember neu starten? Das Browserfenster verliert für ~2 Sekunden die Verbindung.")) return;
  const log = document.getElementById("updateLog");
  log.textContent = "Neustart läuft … nach ~2 Sekunden diese Seite neu laden (F5).";
  try { await fetch("/api/restart", { method: "POST" }); } catch {}
});
fetch("/api/state").then((r) => r.json()).then((s) => {
  const title = (s.settings && s.settings.houseName) || "Ember";
  document.getElementById("houseTitle").textContent = title;
  document.title = title;
  document.getElementById("setHouseName").value = title;
  applyChrome();
  const list = document.getElementById("clipList");
  const video = document.getElementById("homeVideo");
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
});

attachVideoDeck(document.getElementById("homeVideo"));
document.getElementById("clipFile").addEventListener("change", (ev) => {
  const file = ev.target.files && ev.target.files[0];
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
