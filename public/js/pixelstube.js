const PALETTES = {
  ember: {
    name: "Ember",
    colors: ["#141210", "#3a312a", "#6d5646", "#a78968", "#e4d2b0", "#f4efe4", "#7c2832", "#c4513a", "#e39b62", "#1f3326", "#46633a", "#86a85a", "#1c3142", "#3e6578", "#8eb4c4", "#5a4d68"],
  },
  pico: {
    name: "PICO-8",
    colors: ["#000000", "#1d2b53", "#7e2553", "#008751", "#ab5236", "#5f574f", "#c2c3c7", "#fff1e8", "#ff004d", "#ffa300", "#ffec27", "#00e436", "#29adff", "#83769c", "#ff77a8", "#ffccaa"],
  },
  boy: { name: "Game Boy", colors: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"] },
  kohle: { name: "Kohlenfeuer", colors: ["#14110e", "#2a2118", "#5c3a2e", "#a3543a", "#e07a3d", "#f0c36a", "#f6efe2", "#7d9a78"] },
};
const SIZES = [16, 24, 32, 48, 64];
const ZOOMS = [1, 2, 3, 4, 6, 8, 10, 12, 16, 24, 32, 48];
const SCALES = [1, 8, 16];
const KEY = "dye.pixelstube.v1";

const Studio = {
  w: 32,
  h: 32,
  pixels: new Uint32Array(32 * 32),
  tool: "pencil",
  palette: "pico",
  color: "#ff004d",
  brush: 1,
  zoomMode: "fit",
  fitted: 12,
  grid: true,
  scale: 8,
  past: [],
  future: [],
  stroke: null,
  clearArmed: false,
};

function hexToColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  return ((0xff << 24) | n) >>> 0;
}
function colorToHex(color) {
  if ((color >>> 24) === 0) return null;
  const pair = (v) => v.toString(16).padStart(2, "0");
  return "#" + pair((color >>> 16) & 255) + pair((color >>> 8) & 255) + pair(color & 255);
}
function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < Studio.w && y < Studio.h;
}
function stamp(x, y, color) {
  const origin = Math.floor((Studio.brush - 1) / 2);
  for (let dy = 0; dy < Studio.brush; dy++) {
    for (let dx = 0; dx < Studio.brush; dx++) {
      const px = x + dx - origin;
      const py = y + dy - origin;
      if (inBounds(px, py)) Studio.pixels[py * Studio.w + px] = color;
    }
  }
}
function line(x0, y0, x1, y1, plot) {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    plot(x, y);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}
function stroke(x0, y0, x1, y1, color) {
  line(x0, y0, x1, y1, (x, y) => stamp(x, y, color));
}
function flood(x, y, replacement) {
  if (!inBounds(x, y)) return false;
  const target = Studio.pixels[y * Studio.w + x];
  if (target === replacement) return false;
  const stack = [[x, y]];
  let changed = false;
  while (stack.length) {
    const next = stack.pop();
    const cx = next[0];
    const cy = next[1];
    if (!inBounds(cx, cy)) continue;
    const i = cy * Studio.w + cx;
    if (Studio.pixels[i] !== target) continue;
    Studio.pixels[i] = replacement;
    changed = true;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return changed;
}
function cloneSnap() {
  return { w: Studio.w, h: Studio.h, pixels: Studio.pixels.slice() };
}
function sameSnap(snap) {
  if (snap.w !== Studio.w || snap.h !== Studio.h) return false;
  for (let i = 0; i < snap.pixels.length; i++) if (snap.pixels[i] !== Studio.pixels[i]) return false;
  return true;
}
function pushHist() {
  Studio.past.push(cloneSnap());
  if (Studio.past.length > 80) Studio.past.shift();
  Studio.future = [];
}
function applySnap(snap) {
  Studio.w = snap.w;
  Studio.h = snap.h;
  Studio.pixels = snap.pixels.slice();
}
function isBlank() {
  for (let i = 0; i < Studio.pixels.length; i++) if (Studio.pixels[i] !== 0) return false;
  return true;
}
function stepZoom(current, direction) {
  if (direction > 0) return ZOOMS.find((z) => z > current) || 48;
  for (let i = ZOOMS.length - 1; i >= 0; i--) if (ZOOMS[i] < current) return ZOOMS[i];
  return 1;
}
function shownZoom() {
  return Studio.zoomMode === "fit" ? Studio.fitted : Studio.zoomMode;
}
function ink() {
  return Studio.tool === "eraser" ? 0 : hexToColor(Studio.color);
}

function blit(canvas) {
  const ctx = canvas.getContext("2d");
  if (canvas.width !== Studio.w || canvas.height !== Studio.h) {
    canvas.width = Studio.w;
    canvas.height = Studio.h;
  }
  const image = ctx.createImageData(Studio.w, Studio.h);
  for (let i = 0; i < Studio.pixels.length; i++) {
    const color = Studio.pixels[i];
    const o = i * 4;
    image.data[o] = (color >>> 16) & 255;
    image.data[o + 1] = (color >>> 8) & 255;
    image.data[o + 2] = color & 255;
    image.data[o + 3] = (color >>> 24) & 255;
  }
  ctx.putImageData(image, 0, 0);
}

function cellRaw(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  return {
    x: Math.floor(((clientX - rect.left) / rect.width) * Studio.w),
    y: Math.floor(((clientY - rect.top) / rect.height) * Studio.h),
  };
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      w: Studio.w,
      h: Studio.h,
      pixels: Array.from(Studio.pixels),
      tool: Studio.tool,
      palette: Studio.palette,
      color: Studio.color,
      brush: Studio.brush,
      grid: Studio.grid,
      scale: Studio.scale,
    }));
  } catch {}
}

function layout() {
  const zoom = shownZoom();
  const frame = document.getElementById("frame");
  const checker = document.getElementById("checker");
  const canvas = document.getElementById("paint");
  const grid = document.getElementById("grid");
  checker.style.width = Studio.w * zoom + "px";
  checker.style.height = Studio.h * zoom + "px";
  checker.style.backgroundSize = zoom * 2 + "px " + zoom * 2 + "px";
  checker.style.backgroundPosition = "0 0, 0 " + zoom + "px, " + zoom + "px " + (-zoom) + "px, " + (-zoom) + "px 0";
  grid.classList.toggle("hidden", !Studio.grid);
  grid.style.backgroundSize = zoom + "px " + zoom + "px";
  frame.style.width = Studio.w * zoom + "px";
  blit(canvas);
  const hover = Studio.hover;
  const preview = document.getElementById("preview");
  const inside = hover && inBounds(hover.x, hover.y) && Studio.tool !== "pan";
  preview.classList.toggle("hidden", !inside);
  if (inside) {
    const size = Studio.tool === "pencil" || Studio.tool === "eraser" ? Studio.brush : 1;
    const origin = Math.floor((size - 1) / 2);
    preview.style.left = (hover.x - origin) * zoom + "px";
    preview.style.top = (hover.y - origin) * zoom + "px";
    preview.style.width = size * zoom + "px";
    preview.style.height = size * zoom + "px";
  }
  document.getElementById("empty").classList.toggle("hidden", !isBlank() || inside);
  const names = { pencil: "Stift", eraser: "Radierer", fill: "Füllen", picker: "Pipette", pan: "Schieben" };
  const where = hover && inBounds(hover.x, hover.y) ? " · " + hover.x + "," + hover.y : "";
  document.getElementById("status").textContent = Studio.w + "×" + Studio.h + " · " + names[Studio.tool] + " · " + Studio.color.toUpperCase() + where;
  document.getElementById("chip").style.background = Studio.color;
  document.querySelectorAll("[data-tool]").forEach((b) => b.classList.toggle("on", b.getAttribute("data-tool") === Studio.tool));
  document.querySelectorAll("[data-size]").forEach((b) => b.classList.toggle("on", Number(b.getAttribute("data-size")) === Studio.w));
  document.querySelectorAll("[data-brush]").forEach((b) => b.classList.toggle("on", Number(b.getAttribute("data-brush")) === Studio.brush));
  document.querySelectorAll("[data-scale]").forEach((b) => b.classList.toggle("on", Number(b.getAttribute("data-scale")) === Studio.scale));
  document.getElementById("btnGrid").classList.toggle("on", Studio.grid);
  document.getElementById("btnFit").classList.toggle("on", Studio.zoomMode === "fit");
  document.getElementById("btnUndo").disabled = Studio.past.length === 0;
  document.getElementById("btnRedo").disabled = Studio.future.length === 0;
  const clear = document.getElementById("btnClear");
  clear.classList.toggle("on", Studio.clearArmed);
  clear.textContent = Studio.clearArmed ? "Sicher?" : "Leeren";
  canvas.className = Studio.tool === "pan" ? (Studio.stroke ? "grabbing" : "grab") : "cross";
}

function measure() {
  const stage = document.getElementById("stage");
  const raw = Math.floor(Math.min((stage.clientWidth - 72) / Studio.w, (stage.clientHeight - 72) / Studio.h));
  Studio.fitted = Math.max(1, Math.min(48, raw || 1));
  if (Studio.zoomMode === "fit") layout();
}

function chooseColor(hex) {
  Studio.color = hex.toLowerCase();
  if (Studio.tool === "eraser" || Studio.tool === "picker" || Studio.tool === "pan") Studio.tool = "pencil";
  renderSwatches();
  persist();
  layout();
}

function renderSwatches() {
  const box = document.getElementById("swatches");
  const colors = PALETTES[Studio.palette].colors;
  const known = colors.some((c) => c.toLowerCase() === Studio.color);
  const list = known ? colors : [Studio.color].concat(colors);
  box.innerHTML = "";
  list.forEach((hex) => {
    const b = document.createElement("button");
    b.type = "button";
    b.title = hex.toUpperCase();
    b.style.background = hex;
    b.className = hex.toLowerCase() === Studio.color ? "on" : "";
    b.setAttribute("aria-label", hex);
    b.addEventListener("click", () => chooseColor(hex));
    box.appendChild(b);
  });
}

function undo() {
  const prev = Studio.past.pop();
  if (!prev) return;
  Studio.future.push(cloneSnap());
  applySnap(prev);
  persist();
  layout();
}
function redo() {
  const next = Studio.future.pop();
  if (!next) return;
  Studio.past.push(cloneSnap());
  applySnap(next);
  persist();
  layout();
}
function resize(n) {
  if (Studio.w === n && Studio.h === n) return;
  pushHist();
  const next = new Uint32Array(n * n);
  const ox = Math.floor((n - Studio.w) / 2);
  const oy = Math.floor((n - Studio.h) / 2);
  for (let y = 0; y < Studio.h; y++) {
    for (let x = 0; x < Studio.w; x++) {
      const nx = x + ox;
      const ny = y + oy;
      if (nx >= 0 && ny >= 0 && nx < n && ny < n) next[ny * n + nx] = Studio.pixels[y * Studio.w + x];
    }
  }
  Studio.w = n;
  Studio.h = n;
  Studio.pixels = next;
  persist();
  measure();
  layout();
}
function clearCanvas() {
  if (!Studio.clearArmed) {
    Studio.clearArmed = true;
    layout();
    setTimeout(() => { Studio.clearArmed = false; layout(); }, 2400);
    return;
  }
  Studio.clearArmed = false;
  if (isBlank()) return layout();
  pushHist();
  Studio.pixels.fill(0);
  persist();
  layout();
}
function exportPng() {
  const src = document.createElement("canvas");
  blit(src);
  const out = document.createElement("canvas");
  out.width = Studio.w * Studio.scale;
  out.height = Studio.h * Studio.scale;
  const ctx = out.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, out.width, out.height);
  out.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pixelstube-" + Studio.w + "x" + Studio.h + (Studio.scale > 1 ? "@" + Studio.scale + "x" : "") + ".png";
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

function endStroke() {
  const live = Studio.stroke;
  Studio.stroke = null;
  if (live && live.kind === "draw") {
    const last = Studio.past[Studio.past.length - 1];
    if (last && sameSnap(last)) Studio.past.pop();
  }
  if (live) persist();
  layout();
}

function boot() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && raw.pixels && raw.w * raw.h === raw.pixels.length && SIZES.includes(raw.w)) {
      Studio.w = raw.w;
      Studio.h = raw.h;
      Studio.pixels = Uint32Array.from(raw.pixels);
      if (PALETTES[raw.palette]) Studio.palette = raw.palette;
      if (typeof raw.color === "string") Studio.color = raw.color;
      if (["pencil", "eraser", "fill", "picker", "pan"].includes(raw.tool)) Studio.tool = raw.tool;
      if ([1, 2, 3].includes(raw.brush)) Studio.brush = raw.brush;
      if (typeof raw.grid === "boolean") Studio.grid = raw.grid;
      if (SCALES.includes(raw.scale)) Studio.scale = raw.scale;
    }
  } catch {}

  const palette = document.getElementById("palette");
  Object.keys(PALETTES).forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = PALETTES[id].name;
    palette.appendChild(opt);
  });
  palette.value = Studio.palette;
  palette.addEventListener("change", () => {
    Studio.palette = palette.value;
    renderSwatches();
    persist();
  });
  renderSwatches();

  document.querySelectorAll("[data-tool]").forEach((b) => {
    b.addEventListener("click", () => { Studio.tool = b.getAttribute("data-tool"); layout(); persist(); });
  });
  document.querySelectorAll("[data-size]").forEach((b) => {
    b.addEventListener("click", () => resize(Number(b.getAttribute("data-size"))));
  });
  document.querySelectorAll("[data-brush]").forEach((b) => {
    b.addEventListener("click", () => { Studio.brush = Number(b.getAttribute("data-brush")); persist(); layout(); });
  });
  document.querySelectorAll("[data-scale]").forEach((b) => {
    b.addEventListener("click", () => { Studio.scale = Number(b.getAttribute("data-scale")); persist(); layout(); });
  });
  document.getElementById("btnGrid").addEventListener("click", () => { Studio.grid = !Studio.grid; persist(); layout(); });
  document.getElementById("btnZoomOut").addEventListener("click", () => { Studio.zoomMode = stepZoom(shownZoom(), -1); layout(); });
  document.getElementById("btnZoomIn").addEventListener("click", () => { Studio.zoomMode = stepZoom(shownZoom(), 1); layout(); });
  document.getElementById("btnFit").addEventListener("click", () => { Studio.zoomMode = "fit"; measure(); layout(); });
  document.getElementById("btnUndo").addEventListener("click", undo);
  document.getElementById("btnRedo").addEventListener("click", redo);
  document.getElementById("btnClear").addEventListener("click", clearCanvas);
  document.getElementById("btnPng").addEventListener("click", exportPng);

  const canvas = document.getElementById("paint");
  const stage = document.getElementById("stage");
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    try { canvas.setPointerCapture(ev.pointerId); } catch {}
    const point = cellRaw(canvas, ev.clientX, ev.clientY);
    Studio.hover = point;
    if (Studio.tool === "pan") {
      Studio.stroke = { kind: "pan", x: ev.clientX, y: ev.clientY, left: stage.scrollLeft, top: stage.scrollTop };
      layout();
      return;
    }
    if (Studio.tool === "picker") {
      if (inBounds(point.x, point.y)) {
        const hex = colorToHex(Studio.pixels[point.y * Studio.w + point.x]);
        if (hex) { Studio.color = hex; renderSwatches(); persist(); }
      }
      Studio.stroke = { kind: "pick" };
      layout();
      return;
    }
    if (Studio.tool === "fill") {
      if (!inBounds(point.x, point.y)) return;
      pushHist();
      if (!flood(point.x, point.y, hexToColor(Studio.color))) Studio.past.pop();
      persist();
      layout();
      return;
    }
    pushHist();
    stroke(point.x, point.y, point.x, point.y, ink());
    Studio.stroke = { kind: "draw", x: point.x, y: point.y };
    blit(canvas);
    layout();
  });
  canvas.addEventListener("pointermove", (ev) => {
    const samples = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
    const list = samples.length ? samples : [ev];
    let point = cellRaw(canvas, ev.clientX, ev.clientY);
    const live = Studio.stroke;
    if (live && live.kind === "pan") {
      stage.scrollLeft = live.left - (ev.clientX - live.x);
      stage.scrollTop = live.top - (ev.clientY - live.y);
      return;
    }
    if (live && live.kind === "draw") {
      let prev = { x: live.x, y: live.y };
      const color = ink();
      list.forEach((sample) => {
        point = cellRaw(canvas, sample.clientX, sample.clientY);
        stroke(prev.x, prev.y, point.x, point.y, color);
        prev = point;
      });
      live.x = point.x;
      live.y = point.y;
      blit(canvas);
    } else if (live && live.kind === "pick") {
      list.forEach((sample) => {
        point = cellRaw(canvas, sample.clientX, sample.clientY);
        if (!inBounds(point.x, point.y)) return;
        const hex = colorToHex(Studio.pixels[point.y * Studio.w + point.x]);
        if (hex) Studio.color = hex;
      });
      renderSwatches();
    }
    Studio.hover = point;
    layout();
  });
  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointercancel", endStroke);
  canvas.addEventListener("pointerleave", () => { if (!Studio.stroke) { Studio.hover = null; layout(); } });
  canvas.addEventListener("wheel", (ev) => {
    if (!ev.ctrlKey && !ev.metaKey) return;
    ev.preventDefault();
    Studio.zoomMode = stepZoom(shownZoom(), ev.deltaY > 0 ? -1 : 1);
    layout();
  }, { passive: false });

  window.addEventListener("keydown", (ev) => {
    const tag = ev.target && ev.target.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    const key = ev.key.toLowerCase();
    if ((ev.ctrlKey || ev.metaKey) && key === "z") {
      ev.preventDefault();
      if (ev.shiftKey) redo(); else undo();
      return;
    }
    if ((ev.ctrlKey || ev.metaKey) && key === "y") { ev.preventDefault(); redo(); return; }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (key === "b") Studio.tool = "pencil";
    else if (key === "e") Studio.tool = "eraser";
    else if (key === "f") Studio.tool = "fill";
    else if (key === "i") Studio.tool = "picker";
    else if (key === "h") Studio.tool = "pan";
    else if (key === "g") Studio.grid = !Studio.grid;
    else if (key === "[") Studio.brush = Math.max(1, Studio.brush - 1);
    else if (key === "]") Studio.brush = Math.min(3, Studio.brush + 1);
    else if (key === "+" || key === "=") Studio.zoomMode = stepZoom(shownZoom(), 1);
    else if (key === "-" || key === "_") Studio.zoomMode = stepZoom(shownZoom(), -1);
    else return;
    persist();
    layout();
  });

  new ResizeObserver(measure).observe(stage);
  measure();
  layout();
}

boot();
