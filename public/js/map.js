const MapKit = { draggingId: null, lastSig: "", tool: "move", zoneStart: null };

function initials(label) {
  return String(label || "?").split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}
function activeEnc(ses) {
  if (!ses) return null;
  const list = ses.encounters || [];
  return list.find((e) => e.id === ses.activeEncounterId) || list[0] || null;
}
function tokenStatus(token, state) {
  const ses = (state.sessions || []).find((s) => s.id === state.active?.sessionId);
  const queued = (ses?.spotlightQueue || []).some((q) => q.characterId === token.characterId);
  const spot = ses?.activeSpotlight && ses.activeSpotlight.characterId === token.characterId;
  const seat = (state.presence || []).find((p) => p.characterId === token.characterId);
  if (spot) return "spotlight";
  if (queued) return "queued";
  if (seat?.status && seat.status !== "online") return seat.status;
  if (ses?.narrating && token.kind === "pc") return "narrating";
  return seat ? "online" : "";
}
function renderMap(stage, state, opts = {}) {
  if (!stage) return;
  stage._emberRender = () => renderMap(stage, state, opts);
  // ... rest unchanged
}  const tokens = map.tokens || [];
  const live = new Set(tokens.map((t) => t.id));
  [...stage.querySelectorAll(".token")].forEach((el) => { if (!live.has(el.dataset.id)) el.remove(); });
  tokens.forEach((token) => {
    let el = stage.querySelector(`.token[data-id="${token.id}"]`);
    if (!el) {
      el = document.createElement("button");
      el.type = "button";
      el.dataset.id = token.id;
      el.addEventListener("pointerdown", (ev) => startDrag(ev, el, token, opts));
      stage.appendChild(el);
    }
    el.className = `token ${token.kind || "pc"} ${tokenStatus(token, state)}`;
    if (MapKit.draggingId !== token.id) {
      el.style.left = token.x + "%";
      el.style.top = token.y + "%";
    }
    el.style.background = token.color || "#e85d04";
    const pc = token.characterId && (state.characters || []).find((c) => c.id === token.characterId);
    const face = token.portrait || pc?.portrait || "";
    if (pc?.color) el.style.background = pc.color;
    el.innerHTML = `<span class="ring"></span>${face ? `<img src="${face}" alt="" draggable="false" />` : `<span>${initials(token.label)}</span>`}<span class="token-label">${token.label}</span>`;
  });
  drawFog(fog, stage, map, opts);
  drawOverlays(stage, ses, opts);
  bindFieldTools(stage, opts);
}
function drawFog(canvas, stage, map, opts) {
  const fow = map.fow || {};
  const w = Math.max(1, stage.clientWidth);
  const h = Math.max(1, stage.clientHeight);
  // NEW: skip entirely if stage isn't laid out yet (hidden view)
  if (w <= 1 || h <= 1) { canvas.style.opacity = "0"; return; }
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  // ... rest unchanged
}function drawOverlays(stage, ses, opts) {
  const enc = activeEnc(ses);
  [...stage.querySelectorAll(".zone,.trap-mark")].forEach((n) => n.remove());
  if (!enc) return;
  const gm = opts.viewer === "gm";
  (enc.zones || []).forEach((z) => {
    if (!gm && z.secret && !z.sprung) return;
    const el = document.createElement("div");
    el.className = "zone" + (z.sprung ? " sprung" : "") + (z.secret ? " secret" : "");
    el.style.left = z.x + "%"; el.style.top = z.y + "%";
    el.style.width = z.w + "%"; el.style.height = z.h + "%";
    el.innerHTML = `<span>${z.label}</span>`;
    stage.appendChild(el);
  });
  (enc.traps || []).forEach((t) => {
    if (!gm && !t.sprung) return;
    const el = document.createElement("div");
    el.className = "trap-mark" + (t.sprung ? " sprung" : "");
    el.style.left = t.x + "%"; el.style.top = t.y + "%";
    el.textContent = t.sprung ? "!" : "▴";
    stage.appendChild(el);
  });
}
function bindFieldTools(stage, opts) {
  if (stage.dataset.tools === "1") return;
  stage.dataset.tools = "1";
  stage.addEventListener("pointerdown", async (ev) => {
    if (ev.target.closest(".token")) return;
    if (opts.actor !== "gm") return;
    const box = stage.getBoundingClientRect();
    const x = ((ev.clientX - box.left) / box.width) * 100;
    const y = ((ev.clientY - box.top) / box.height) * 100;
    if (MapKit.tool === "brush") {
      await fetch("/api/session/map/brush", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ as: "gm", x, y, r: 9 }) });
    } else if (MapKit.tool === "trap") {
      const label = prompt("Snare?", "Fallgrube") || "Snare";
      const note = prompt("Was geschieht?", "") || "";
      await fetch("/api/session/map/trap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ as: "gm", x, y, r: 7, label, note }) });
    } else if (MapKit.tool === "zone") {
      if (!MapKit.zoneStart) { MapKit.zoneStart = { x, y }; return; }
      const a = MapKit.zoneStart; MapKit.zoneStart = null;
      const label = prompt("Threshold?", "Der Boden gibt nach") || "Threshold";
      const text = prompt("Wenn jemand eintritt?", "") || "";
      await fetch("/api/session/map/zone", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ as: "gm", x: Math.min(a.x, x), y: Math.min(a.y, y), w: Math.max(6, Math.abs(a.x - x)), h: Math.max(6, Math.abs(a.y - y)), label, text, secret: true }),
      });
    }
  });
}
function startDrag(ev, el, token, opts) {
  if (MapKit.tool && MapKit.tool !== "move") return;
  if (opts && opts.canMove && !opts.canMove(token)) return;
  ev.preventDefault();
  try { el.setPointerCapture(ev.pointerId); } catch {}
  MapKit.draggingId = token.id;
  const stage = el.parentElement;
  const move = (e) => {
    const box = stage.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((e.clientX - box.left) / box.width) * 100));
    const y = Math.max(4, Math.min(96, ((e.clientY - box.top) / box.height) * 100));
    el.style.left = x + "%"; el.style.top = y + "%";
    el.dataset.x = String(x); el.dataset.y = String(y);
  };
  const up = async () => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    MapKit.draggingId = null;
    const x = Number(el.dataset.x), y = Number(el.dataset.y);
    if (!Number.isFinite(x)) return;
    await fetch("/api/session/map/move", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: token.id, x, y, as: opts.actor || "player", characterId: opts.characterId || token.characterId || null }),
    }).catch(() => {});
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
}
function statusLabel(code) {
  return ({ online: "am Tisch", queued: "Want Spotlight", spotlight: "im Spotlight", rolling: "würfelt", narrating: "lauscht" })[code] || "fort";
}
function startStateFeed(apply) {
  let last = 0;
  const pull = () => fetch("/api/state").then((r) => r.json()).then((s) => { last = Date.now(); apply(s); }).catch(() => {});
  pull();
  const es = new EventSource("/api/events");
  es.addEventListener("message", (ev) => { last = Date.now(); try { apply(JSON.parse(ev.data)); } catch {} });
  setInterval(() => { if (Date.now() - last > 4000) pull(); }, 2500);
}
// NEW: re-render maps when the stage becomes visible / resizes
let _emberResizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(_emberResizeTimer);
  _emberResizeTimer = setTimeout(() => {
    document.querySelectorAll(".stage").forEach((s) => {
      if (s.offsetParent && s._emberRender) s._emberRender();
    });
  }, 80);
});
