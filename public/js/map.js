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
  const ses = (state.sessions || []).find((s) => s.id === state.active?.sessionId);
  const map = ses?.map || { image: "", tokens: [] };
  if (map.image) stage.style.backgroundImage = `url("${map.image}")`;
  let fog = stage.querySelector("canvas.fow");
  if (!fog) {
    fog = document.createElement("canvas");
    fog.className = "fow";
    stage.prepend(fog);
  }
  const tokens = map.tokens || [];
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
    const turn = (ses?.initiative?.on && (ses.initiative.order || [])[ses.initiative.index]) || null;
    const onTurn = turn && (turn.tokenId === token.id || (turn.characterId && turn.characterId === token.characterId));
    el.className = `token ${token.kind || "pc"} ${tokenStatus(token, state)}${onTurn ? " turn" : ""}`;
    el.style.touchAction = "none";
    el.dataset.rev = String(token.rev || 0);
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
  drawPing(stage, ses);
  drawOverlays(stage, ses, opts);
  bindFieldTools(stage, opts);
}
function drawPing(stage, ses) {
  const old = stage.querySelector(".ping");
  if (old) old.remove();
  const ping = ses?.ping;
  if (!ping || Date.now() - ping.at > 4000) return;
  const el = document.createElement("div");
  el.className = "ping";
  el.style.left = ping.x + "%";
  el.style.top = ping.y + "%";
  el.textContent = ping.name;
  stage.appendChild(el);
  const left = Math.max(200, 4000 - (Date.now() - ping.at));
  setTimeout(() => el.remove(), left);
}
function segments(map) {
  const lines = (map.walls || []).map((w) => [w.x1, w.y1, w.x2, w.y2]);
  (map.doors || []).filter((d) => !d.open).forEach((d) => lines.push([d.x - 3, d.y, d.x + 3, d.y]));
  return lines;
}
function hit(x1, y1, x2, y2, lines) {
  let best = 1;
  for (const [ax, ay, bx, by] of lines) {
    const den = (x2 - x1) * (ay - by) - (y2 - y1) * (ax - bx);
    if (!den) continue;
    const t = ((ax - x1) * (ay - by) - (ay - y1) * (ax - bx)) / den;
    const u = ((ax - x1) * (y2 - y1) - (ay - y1) * (x2 - x1)) / den;
    if (t > 0.02 && t < best && u >= 0 && u <= 1) best = t;
  }
  return best;
}
function drawFog(canvas, stage, map, opts) {
  try {
  const fow = map.fow || {};
  const w = Math.max(1, stage.clientWidth);
  const h = Math.max(1, stage.clientHeight);
  if (w < 2 || h < 2) return;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  const lines = segments(map);
  const sight = fow.on || (opts.viewer !== "gm" && lines.length);
  if (!sight) { canvas.style.opacity = "0"; MapKit.draggingId = null; return; }
  canvas.style.opacity = opts.viewer === "gm" ? "0.72" : "1";
  ctx.fillStyle = "rgba(4,2,2,0.88)";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "destination-out";
  const radiusPct = Number(fow.radius || 16);
  const stamps = [...(fow.explored || [])];
  (map.tokens || []).filter((t) => t.kind === "pc").forEach((t) => {
    if (opts.viewer !== "gm" && opts.characterId && t.characterId !== opts.characterId) return;
    const cx = (t.x / 100) * w;
    const cy = (t.y / 100) * h;
    const reach = (radiusPct / 100) * Math.min(w, h) * 1.6;
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const far = hit(t.x, t.y, t.x + Math.cos(a) * radiusPct, t.y + Math.sin(a) * radiusPct, lines);
      const x = cx + Math.cos(a) * reach * far;
      const y = cy + Math.sin(a) * reach * far;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  });
  stamps.forEach((s) => {
    const x = (s.x / 100) * w;
    const y = (s.y / 100) * h;
    const r = ((s.r || radiusPct) / 100) * Math.min(w, h) * 1.6;
    const g = ctx.createRadialGradient(x, y, r * 0.35, x, y, r);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalCompositeOperation = "source-over";
  } catch {}
}
function drawOverlays(stage, ses, opts) {
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
  const map = ses?.map || {};
  (map.walls || []).forEach((w) => {
    const el = document.createElement("div");
    el.className = "wall";
    el.style.left = w.x1 + "%";
    el.style.top = w.y1 + "%";
    el.style.width = Math.abs(w.x2 - w.x1) + "%";
    el.style.height = Math.max(2, Math.abs(w.y2 - w.y1)) + "%";
    stage.appendChild(el);
  });
  (map.doors || []).forEach((d) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "door" + (d.open ? " open" : "");
    el.style.left = d.x + "%";
    el.style.top = d.y + "%";
    el.textContent = d.open ? "auf" : "zu";
    if (opts.actor === "gm") el.addEventListener("click", () => fetch("/api/session/map/door", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ as: "gm", id: d.id }) }));
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
    } else if (MapKit.tool === "ping") {
      await fetch("/api/session/ping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ as: "gm", x, y, name: "SL" }) });
    } else if (MapKit.tool === "measure") {
      if (!MapKit.measureStart) { MapKit.measureStart = { x, y }; return; }
      const a = MapKit.measureStart; MapKit.measureStart = null;
      const dx = x - a.x, dy = y - a.y;
      const steps = Math.max(1, Math.round(Math.sqrt(dx * dx + dy * dy) / 5));
      const line = document.createElement("div");
      line.className = "measure-line";
      line.style.left = Math.min(a.x, x) + "%";
      line.style.top = Math.min(a.y, y) + "%";
      line.style.width = Math.abs(dx) + "%";
      line.style.height = Math.abs(dy) + "%";
      line.textContent = steps + (steps === 1 ? " Schritt" : " Schritte");
      stage.appendChild(line);
      setTimeout(() => line.remove(), 4000);
    } else if (MapKit.tool === "wall") {
      if (!MapKit.wallStart) { MapKit.wallStart = { x, y }; return; }
      const a = MapKit.wallStart; MapKit.wallStart = null;
      await fetch("/api/session/map/wall", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ as: "gm", x1: a.x, y1: a.y, x2: x, y2: y }) });
    } else if (MapKit.tool === "door") {
      await fetch("/api/session/map/door", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ as: "gm", x, y }) });
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
    el.removeEventListener("pointercancel", up);
    MapKit.draggingId = null;
    const x = Number(el.dataset.x), y = Number(el.dataset.y);
    if (!Number.isFinite(x)) return;
    const res = await fetch("/api/session/map/move", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: token.id, x, y, rev: Number(el.dataset.rev || 0), as: opts.actor || "player", characterId: opts.characterId || token.characterId || null }),
    });
    if (res.status === 409) alert("Das Token hat schon jemand gezogen.");
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
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
