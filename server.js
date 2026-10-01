const { execSync } = require("child_process");

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const store = require("./lib/store");
const { resolveActionRoll } = require("./lib/dice");
const { addresses } = require("./lib/lan");
const { id } = require("./lib/ids");
const catalog = require("./lib/catalog");
const spark = require("./lib/spark");
const initiative = require("./lib/initiative");

const PORT = Number(process.env.EMBER_PORT || 3478);
const HOST = process.env.EMBER_HOST || "0.0.0.0";
const PUBLIC = path.join(__dirname, "public");
const UPLOADS = path.join(__dirname, "data", "uploads");
const clients = new Set();
const presence = new Map();
let presenceEmitAt = 0;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".m4v": "video/mp4",
};

function presenceList() {
  const now = Date.now();
  for (const [key, row] of presence) if (now - row.at > 15000) presence.delete(key);
  return [...presence.values()];
}

function snapshot() {
  return { ...store.read(), presence: presenceList(), lan: { port: PORT, addresses: addresses() } };
}

function emitState() {
  const payload = `data: ${JSON.stringify(snapshot())}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { clients.delete(res); }
  }
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function addLog(session, entry) {
  session.log.push({
    id: id("log"),
    at: new Date().toISOString(),
    kind: entry.kind || "system",
    author: entry.author || "Ember",
    text: entry.text || "",
    meta: entry.meta || {},
  });
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const raw = await readBody(req);
  if (!raw.length) return {};
  return JSON.parse(raw.toString("utf8"));
}

function safeJoin(root, rel) {
  const resolved = path.resolve(root, rel);
  if (!resolved.startsWith(path.resolve(root))) return null;
  return resolved;
}

function serveFile(res, filePath, req) {
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Nicht gefunden.");
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    const range = req && req.headers.range;
    if (range && /^bytes=/.test(range)) {
      const [startStr, endStr] = range.replace("bytes=", "").split("-");
      const start = Number(startStr) || 0;
      const end = endStr ? Number(endStr) : st.size - 1;
      res.writeHead(206, {
        "Content-Type": type,
        "Content-Range": `bytes ${start}-${end}/${st.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
      });
      return fs.createReadStream(filePath, { start, end }).pipe(res);
    }
    res.writeHead(200, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Length": st.size });
    fs.createReadStream(filePath).pipe(res);
  });
}

function checkTriggers(session, enc, token) {
  if (!enc || enc.status === "ended") return;
  for (const trap of enc.traps || []) {
    if (trap.sprung) continue;
    const dx = token.x - trap.x;
    const dy = token.y - trap.y;
    if (dx * dx + dy * dy <= (trap.r || 7) * (trap.r || 7)) {
      trap.sprung = true;
      const text = (token.label || "Jemand") + " löst aus: " + trap.label + (trap.note ? " — " + trap.note : "");
      addLog(session, { kind: "system", author: "Snare", text });
      enc.alerts.unshift({ id: id("al"), kind: "snare", text, at: new Date().toISOString() });
    }
  }
  for (const zone of enc.zones || []) {
    if (zone.sprung) continue;
    if (token.x >= zone.x && token.x <= zone.x + zone.w && token.y >= zone.y && token.y <= zone.y + zone.h) {
      zone.sprung = true;
      const text = (token.label || "Jemand") + " betritt " + zone.label + (zone.text ? " — " + zone.text : "");
      addLog(session, { kind: "system", author: "Threshold", text });
      enc.alerts.unshift({ id: id("al"), kind: "threshold", text, at: new Date().toISOString() });
    }
  }
  enc.alerts = (enc.alerts || []).slice(0, 12);
}

async function handleApi(req, res, url) {
  const method = req.method;
  const p = url.pathname;

  if (method === "GET" && p === "/api/state") return send(res, 200, snapshot());
  if (method === "GET" && p === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("data: " + JSON.stringify(snapshot()) + "\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  if (method === "POST" && p === "/api/campaigns") {
    const body = await readJson(req);
    const state = store.read();
    const campaign = store.makeCampaign(body.name);
    if (body.frame) campaign.frame = body.frame;
    if (body.notes) campaign.notes = body.notes;
    state.campaigns.push(campaign);
    if (!state.active.campaignId) state.active.campaignId = campaign.id;
    store.write(state); emitState();
    return send(res, 200, campaign);
  }
  const patchCamp = p.match(/^\/api\/campaigns\/([^/]+)$/);
  if (method === "PATCH" && patchCamp) {
    const state = store.read();
    const campaign = store.patchById(state.campaigns, patchCamp[1], await readJson(req));
    if (!campaign) return send(res, 404, { error: "Kampagne fehlt." });
    store.write(state); emitState();
    return send(res, 200, campaign);
  }
  const fearCamp = p.match(/^\/api\/campaigns\/([^/]+)\/fear$/);
  if (method === "POST" && fearCamp) {
    const body = await readJson(req);
    const state = store.read();
    const campaign = state.campaigns.find((c) => c.id === fearCamp[1]);
    if (!campaign) return send(res, 404, { error: "Kampagne fehlt." });
    campaign.gmFear = clamp(Number(body.gmFear), 0, campaign.fearMax || 12);
    store.write(state); emitState();
    return send(res, 200, campaign);
  }
  if (method === "POST" && p === "/api/active-campaign") {
    const body = await readJson(req);
    const state = store.read();
    state.active.campaignId = body.campaignId || null;
    store.write(state); emitState();
    return send(res, 200, state.active);
  }
  if (method === "POST" && p === "/api/characters") {
    const body = await readJson(req);
    const state = store.read();
    const character = store.makeCharacter({ ...body, campaignId: body.campaignId || state.active.campaignId });
    state.characters.push(character);
    store.write(state); emitState();
    return send(res, 200, character);
  }
  const patchChar = p.match(/^\/api\/characters\/([^/]+)$/);
  if (method === "PATCH" && patchChar) {
    const body = await readJson(req);
    delete body.id;
    const state = store.read();
    const character = store.patchById(state.characters, patchChar[1], body);
    if (!character) return send(res, 404, { error: "Charakter fehlt." });
    character.hope = clamp(Number(character.hope || 0), 0, character.hopeMax || 6);
    character.stressMarked = clamp(Number(character.stressMarked || 0), 0, character.stressMax || 6);
    character.hpMarked = clamp(Number(character.hpMarked || 0), 0, character.hpMax || 6);
    store.write(state); emitState();
    return send(res, 200, character);
  }
  const photoChar = p.match(/^\/api\/characters\/([^/]+)\/photos$/);
  if (method === "POST" && photoChar) {
    const body = await readJson(req);
    const state = store.read();
    const character = state.characters.find((c) => c.id === photoChar[1]);
    if (!character) return send(res, 404, { error: "Charakter fehlt." });
    fs.mkdirSync(UPLOADS, { recursive: true });
    const files = [];
    for (const pic of body.photos || []) {
      const ext = (pic.name && path.extname(pic.name).toLowerCase()) || ".jpg";
      const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
      const filename = id("pic") + safeExt;
      fs.writeFileSync(path.join(UPLOADS, filename), Buffer.from(pic.data, "base64"));
      files.push({ id: id("pic"), file: filename, original: pic.name || filename, addedAt: new Date().toISOString() });
    }
    character.sheetPhotos = [...(character.sheetPhotos || []), ...files];
    store.write(state); emitState();
    return send(res, 200, character);
  }

  const portChar = p.match(/^\/api\/characters\/([^/]+)\/portrait$/);
  if (method === "POST" && portChar) {
    const body = await readJson(req);
    const state = store.read();
    const character = state.characters.find((c) => c.id === portChar[1]);
    if (!character) return send(res, 404, { error: "Charakter fehlt." });
    fs.mkdirSync(UPLOADS, { recursive: true });
    const filename = id("tok") + ".png";
    fs.writeFileSync(path.join(UPLOADS, filename), Buffer.from(body.data, "base64"));
    character.portrait = "/uploads/" + filename;
    if (body.color) character.color = body.color;
    store.write(state); emitState();
    return send(res, 200, character);
  }

  if (method === "POST" && p === "/api/settings") {
    const body = await readJson(req);
    const state = store.read();
    state.settings = { ...(state.settings || {}), ...body };
    store.write(state); emitState();
    return send(res, 200, state.settings);
  }

  if (method === "POST" && p === "/api/media") {
    const body = await readJson(req);
    const state = store.read();
    if (!state.media) state.media = [];
    fs.mkdirSync(UPLOADS, { recursive: true });
    const ext = body.ext === "webm" ? "webm" : "mp4";
    const filename = id("vid") + "." + ext;
    fs.writeFileSync(path.join(UPLOADS, filename), Buffer.from(body.data, "base64"));
    const clip = {
      id: id("vid"),
      file: filename,
      name: body.name || filename,
      addedAt: new Date().toISOString(),
    };
    state.media.unshift(clip);
    store.write(state); emitState();
    return send(res, 200, clip);
  }

  if (method === "POST" && p === "/api/session/start") {
    const body = await readJson(req);
    const state = store.read();
    const campaignId = body.campaignId || state.active.campaignId;
    if (!campaignId) return send(res, 400, { error: "Keine Kampagne gewählt." });
    const session = store.makeSession(campaignId);
    const camp = state.campaigns.find((c) => c.id === campaignId);
    const heroes = state.characters.filter((c) => c.campaignId === campaignId);
    if (camp && /sablewood/i.test(camp.name)) session.map = catalog.defaultMap(heroes);
    else {
      session.map.tokens = heroes.map((c, i) => ({
        id: id("tok"), kind: "pc", characterId: c.id,
        label: c.name.split(" ")[0], color: c.color || "#e85d04", x: 20 + i * 10, y: 60,
      }));
    }
    store.activeEncounter(session);
    if (session.encounters[0]) {
      session.encounters[0].name = camp && /sablewood/i.test(camp.name) ? "The Road Into Sablewood" : "The First Dark";
    }
    state.sessions.push(session);
    state.active.campaignId = campaignId;
    state.active.sessionId = session.id;
    store.write(state); emitState();
    return send(res, 200, session);
  }
  if (method === "POST" && p === "/api/session/end") {
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (session) session.endedAt = new Date().toISOString();
    state.active.sessionId = null;
    store.write(state); emitState();
    return send(res, 200, { ok: true });
  }
  if (method === "POST" && p === "/api/session/narrate") {
    const body = await readJson(req);
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine offene Session." });
    session.narrating = Boolean(body.narrating);
    addLog(session, {
      kind: "system",
      text: session.narrating ? "Speak the Dark — die Umbra lauscht." : "Die Stimme verstummt.",
    });
    store.write(state); emitState();
    return send(res, 200, { narrating: session.narrating });
  }
  if (method === "POST" && p === "/api/session/log") {
    const body = await readJson(req);
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine offene Session." });
    addLog(session, { kind: body.kind || "note", author: body.author || "SL", text: body.text || "" });
    store.write(state); emitState();
    return send(res, 200, { ok: true });
  }
  if (method === "POST" && p === "/api/session/spotlight") {
    const body = await readJson(req);
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine offene Session." });
    const pc = state.characters.find((c) => c.id === body.characterId);
    session.spotlightQueue.push({
      id: id("spot"),
      characterId: body.characterId || null,
      name: pc ? pc.name : "Spieler",
      action: body.action || "",
      question: body.question || "",
      at: new Date().toISOString(),
    });
    store.write(state); emitState();
    return send(res, 200, { ok: true });
  }
  const resolveSpot = p.match(/^\/api\/session\/spotlight\/([^/]+)\/resolve$/);
  if (method === "POST" && resolveSpot) {
    const body = await readJson(req);
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    const item = session.spotlightQueue.find((q) => q.id === resolveSpot[1]);
    session.spotlightQueue = session.spotlightQueue.filter((q) => q.id !== resolveSpot[1]);
    if (body.accept && item) session.activeSpotlight = item;
    store.write(state); emitState();
    return send(res, 200, { ok: true });
  }

  if (method === "POST" && p === "/api/roll") {
    const body = await readJson(req);
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    const character = state.characters.find((c) => c.id === body.characterId);
    const roll = resolveActionRoll(body);
    if (character) {
      character.hope = clamp((character.hope || 0) + roll.hopeDelta, 0, character.hopeMax || 6);
    }
    if (session && roll.fearDelta > 0) {
      const camp = state.campaigns.find((c) => c.id === session.campaignId);
      if (camp) camp.gmFear = clamp((camp.gmFear || 0) + roll.fearDelta, 0, camp.fearMax || 12);
    }
    if (session) addLog(session, { kind: "roll", author: character ? character.name : "Tisch", text: roll.spoken, meta: roll });
    if (session && character && initiative.completeIfActor(session, character.id)) {
      addLog(session, { kind: "system", author: "Initiative", text: initiative.spoken(session) });
    }
    store.write(state); emitState();
    return send(res, 200, { roll, character });
  }

  if (method === "POST" && p === "/api/presence") {
    const body = await readJson(req);
    const key = body.key || id("seat");
    const prev = presence.get(key);
    const row = {
      key, role: body.role || "player", name: body.name || "Unbekannt",
      characterId: body.characterId || null, status: body.status || "online",
      detail: body.detail || "", at: Date.now(),
    };
    presence.set(key, row);
    const changed = !prev || prev.status !== row.status;
    if (changed || Date.now() - presenceEmitAt > 2500) {
      presenceEmitAt = Date.now();
      emitState();
    }
    return send(res, 200, { key });
  }

  if (method === "POST" && p === "/api/quickstart/sablewood") {
    const state = store.read();
    const exists = state.campaigns.find((c) => c.name === "Sablewood Messengers");
    if (exists) {
      state.active.campaignId = exists.id;
      store.write(state); emitState();
      return send(res, 200, { campaignId: exists.id, reused: true });
    }
    const campaign = store.makeCampaign("Sablewood Messengers");
    campaign.frame = "Age of Umbra";
    campaign.notes = "The crate to Hush. Marlowe must walk this road.";
    const heroes = catalog.sablewoodPregens().map((h) => { h.campaignId = campaign.id; return h; });
    state.campaigns.push(campaign);
    state.characters.push(...heroes);
    state.active.campaignId = campaign.id;
    store.write(state); emitState();
    return send(res, 200, { campaignId: campaign.id, reused: false });
  }

  if (method === "POST" && p === "/api/session/map") {
    const body = await readJson(req);
    if (body.as !== "gm") return send(res, 403, { error: "Nur der SL." });
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    store.activeEncounter(session);
    if (body.image) session.map.image = body.image;
    if (Array.isArray(body.tokens)) session.map.tokens = body.tokens;
    store.write(state); emitState();
    return send(res, 200, session.map);
  }
  if (method === "POST" && p === "/api/session/map/token") {
    const body = await readJson(req);
    if (body.as !== "gm") return send(res, 403, { error: "Nur der SL." });
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    store.activeEncounter(session);
    const token = {
      id: id("tok"), kind: body.kind || "marker", characterId: body.characterId || null,
      label: body.label || "Pin", color: body.color || "#e85d04", portrait: body.portrait || "",
      x: Number(body.x ?? 50), y: Number(body.y ?? 50),
    };
    session.map.tokens.push(token);
    store.write(state); emitState();
    return send(res, 200, token);
  }
  if (method === "POST" && p === "/api/session/map/move") {
    const body = await readJson(req);
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session || !session.map) return send(res, 400, { error: "Keine Karte." });
    const token = session.map.tokens.find((t) => t.id === body.id);
    if (!token) return send(res, 404, { error: "Token fehlt." });
    if (body.as !== "gm" && (!body.characterId || token.characterId !== body.characterId)) {
      return send(res, 403, { error: "Nur das eigene Token." });
    }
    token.x = clamp(Number(body.x), 2, 98);
    token.y = clamp(Number(body.y), 4, 96);
    const enc = store.activeEncounter(session);
    if (token.kind === "pc") checkTriggers(session, enc, token);
    store.write(state); emitState();
    return send(res, 200, token);
  }
  if (method === "POST" && p === "/api/session/map/fow") {
    const body = await readJson(req);
    if (body.as !== "gm") return send(res, 403, { error: "Nur der SL." });
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    store.activeEncounter(session);
    session.map.fow = {
      on: body.on ?? session.map.fow?.on ?? false,
      radius: Number(body.radius ?? session.map.fow?.radius ?? 16),
      persist: false,
      gmSeesAll: body.gmSeesAll ?? true,
      explored: body.clear ? [] : (session.map.fow?.explored || []),
    };
    store.write(state); emitState();
    return send(res, 200, session.map.fow);
  }
  if (method === "POST" && p === "/api/session/map/image") {
    const body = await readJson(req);
    if (body.as !== "gm") return send(res, 403, { error: "Nur der SL." });
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    store.activeEncounter(session);
    if (body.data) {
      fs.mkdirSync(UPLOADS, { recursive: true });
      const ext = body.ext === "png" || body.ext === "webp" ? body.ext : "jpg";
      const filename = id("map") + "." + ext;
      fs.writeFileSync(path.join(UPLOADS, filename), Buffer.from(body.data, "base64"));
      session.map.image = "/uploads/" + filename;
    } else if (body.image) session.map.image = body.image;
    store.write(state); emitState();
    return send(res, 200, session.map);
  }
  if (method === "POST" && p === "/api/session/map/brush") {
    const body = await readJson(req);
    if (body.as !== "gm") return send(res, 403, { error: "Nur der SL." });
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    const enc = store.activeEncounter(session);
    enc.map.fow = enc.map.fow || store.defaultFow();
    enc.map.fow.on = true;
    enc.map.fow.explored = enc.map.fow.explored || [];
    enc.map.fow.explored.push({ x: Number(body.x), y: Number(body.y), r: Number(body.r || 10) });
    if (enc.map.fow.explored.length > 120) enc.map.fow.explored = enc.map.fow.explored.slice(-120);
    store.write(state); emitState();
    return send(res, 200, enc.map.fow);
  }
  if (method === "POST" && p === "/api/session/map/trap") {
    const body = await readJson(req);
    if (body.as !== "gm") return send(res, 403, { error: "Nur der SL." });
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    const enc = store.activeEncounter(session);
    const trap = { id: id("trp"), label: body.label || "Snare", note: body.note || "", x: Number(body.x ?? 50), y: Number(body.y ?? 50), r: Number(body.r ?? 7), sprung: false };
    enc.traps.push(trap);
    store.write(state); emitState();
    return send(res, 200, trap);
  }
  if (method === "POST" && p === "/api/session/map/zone") {
    const body = await readJson(req);
    if (body.as !== "gm") return send(res, 403, { error: "Nur der SL." });
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    const enc = store.activeEncounter(session);
    const zone = {
      id: id("zon"), label: body.label || "Threshold", text: body.text || "", secret: body.secret !== false,
      x: Number(body.x ?? 40), y: Number(body.y ?? 40), w: Number(body.w ?? 18), h: Number(body.h ?? 14), sprung: false,
    };
    enc.zones.push(zone);
    store.write(state); emitState();
    return send(res, 200, zone);
  }
  if (method === "POST" && p === "/api/session/encounter") {
    const body = await readJson(req);
    if (body.as !== "gm") return send(res, 403, { error: "Nur der SL." });
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    store.activeEncounter(session);
    const enc = store.makeEncounter(body.name || "Prepared Event", {
      image: body.image || session.map?.image || "",
      tokens: (session.map?.tokens || []).filter((t) => t.kind === "pc").map((t, i) => ({ ...t, x: 18 + i * 10, y: 70 })),
      fow: store.defaultFow(),
    });
    session.encounters.push(enc);
    session.activeEncounterId = enc.id;
    session.map = enc.map;
    addLog(session, { kind: "system", text: "Ein Event liegt bereit: " + enc.name });
    store.write(state); emitState();
    return send(res, 200, enc);
  }
  if (method === "POST" && p === "/api/session/encounter/select") {
    const body = await readJson(req);
    if (body.as !== "gm") return send(res, 403, { error: "Nur der SL." });
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    store.activeEncounter(session);
    const enc = session.encounters.find((e) => e.id === body.id);
    if (!enc) return send(res, 404, { error: "Event fehlt." });
    session.activeEncounterId = enc.id;
    session.map = enc.map;
    store.write(state); emitState();
    return send(res, 200, enc);
  }
  if (method === "POST" && p === "/api/session/encounter/status") {
    const body = await readJson(req);
    if (body.as !== "gm") return send(res, 403, { error: "Nur der SL." });
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    const enc = store.activeEncounter(session);
    enc.status = body.status || enc.status;
    if (enc.status === "live") {
      session.narrating = false;
      if (!session.initiative || !session.initiative.order || !session.initiative.order.length) initiative.seed(session);
      else session.initiative.on = true;
      addLog(session, { kind: "system", text: "Play Event — " + enc.name + ". " + (initiative.spoken(session) || "Der Boden gibt nach.") });
    } else if (enc.status === "ended") {
      if (session.initiative) session.initiative.on = false;
      addLog(session, { kind: "system", text: "Das Event verlischt: " + enc.name });
    }
    store.write(state); emitState();
    return send(res, 200, enc);
  }
  if (method === "POST" && p === "/api/session/initiative") {
    const body = await readJson(req);
    if (body.as !== "gm") return send(res, 403, { error: "Nur der SL." });
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    const before = initiative.spoken(session);
    initiative.apply(session, body);
    const after = initiative.spoken(session);
    if ((body.action === "next" || body.action === "prev" || body.action === "set" || body.action === "seed" || body.action === "side") && after && after !== before) {
      addLog(session, { kind: "system", author: "Initiative", text: after });
    }
    store.write(state); emitState();
    return send(res, 200, session.initiative);
  }
  if (method === "POST" && p === "/api/restart") {
  const remote = req.socket.remoteAddress || "";
  const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"].includes(remote);
  if (!local) return send(res, 403, { error: "Neustart nur am SL-Rechner." });
  send(res, 200, { restarting: true });
  setTimeout(() => process.exit(42), 250);
  return;
}
if (method === "POST" && p === "/api/update") {
  const remote = req.socket.remoteAddress || "";
  const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"].includes(remote);
  if (!local) return send(res, 403, { error: "Update nur am SL-Rechner." });

  try {
    const cwd = __dirname;
    const before = execSync("git rev-parse HEAD", { cwd }).toString().trim();
    execSync("git fetch --all --prune", { cwd, stdio: "pipe" });
    const pullLog = execSync("git pull --ff-only", { cwd }).toString().trim();
    const after = execSync("git rev-parse HEAD", { cwd }).toString().trim();
    const changed = before !== after;

    let installLog = "";
    if (changed) {
      const diff = execSync(`git diff --name-only ${before} ${after}`, { cwd }).toString();
      if (diff.split("\n").some((f) => f.trim() === "package.json")) {
        installLog = execSync("npm install --omit=dev", { cwd }).toString();
      }
    }

    return send(res, 200, {
      changed,
      before: before.slice(0, 8),
      after: after.slice(0, 8),
      pullLog,
      installLog,
      needsRestart: changed,
    });
  } catch (err) {
    return send(res, 500, {
      error: err.message,
      stdout: err.stdout ? err.stdout.toString() : "",
      stderr: err.stderr ? err.stderr.toString() : "",
    });
  }
}
  return send(res, 404, { error: "Unbekannte Route." });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    if (url.pathname === "/player" || url.pathname === "/player/") {
      return serveFile(res, path.join(PUBLIC, "player.html"), req);
    }
    if (url.pathname.startsWith("/uploads/")) {
      const file = safeJoin(UPLOADS, path.basename(url.pathname));
      if (!file) { res.writeHead(403); return res.end(); }
      return serveFile(res, file, req);
    }
    if (url.pathname === "/" || url.pathname === "/house") {
      return serveFile(res, path.join(PUBLIC, "home.html"), req);
    }
    if (url.pathname === "/ember" || url.pathname === "/ember/") {
      return serveFile(res, path.join(PUBLIC, "index.html"), req);
    }
    if (url.pathname === "/token" || url.pathname === "/token/") {
      return serveFile(res, path.join(PUBLIC, "token.html"), req);
    }
    if (url.pathname === "/runner" || url.pathname === "/runner/") {
      return serveFile(res, path.join(PUBLIC, "runner.html"), req);
    }
    const rel = url.pathname.replace(/^\/+/, "");
    const file = safeJoin(PUBLIC, rel);
    if (!file) { res.writeHead(403); return res.end(); }
    return serveFile(res, file, req);
  } catch (err) {
    send(res, 500, { error: err.message || "Serverfehler" });
  }
});

server.listen(PORT, HOST, async () => {
  await spark.ignite({ label: "Ember zündet" });
  const urls = addresses();
  console.log("");
  console.log("  Ember brennt.");
  console.log("  Home:            http://127.0.0.1:" + PORT + "/");
  console.log("  Die Glut:        http://127.0.0.1:" + PORT + "/ember");
  if (!urls.length) console.log("  Kein LAN-Interface.");
  else for (const u of urls) console.log("  Spieler-Ansicht: http://" + u.address + ":" + PORT + "/player   (" + u.name + ")");
  console.log("");
});
