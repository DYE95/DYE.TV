const { execSync } = require("child_process");

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const store = require("./lib/store");
const { resolveActionRoll, applyPools } = require("./lib/dice");
const { addresses } = require("./lib/lan");
const { id } = require("./lib/ids");
const catalog = require("./lib/catalog");
const spark = require("./lib/spark");
const initiative = require("./lib/initiative");
const compendium = require("./lib/compendium");
const solo = require("./lib/solo");
const spur = require("./lib/spur");
const { isGm, recordGmKey, isLocalAddress } = require("./lib/auth");

const PORT = Number(process.env.EMBER_PORT || 3478);
const HOST = process.env.EMBER_HOST || "0.0.0.0";
const PUBLIC = path.join(__dirname, "public");
const LIBRARY = path.join(__dirname, "docs", "bibliothek");
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
  return { ...store.publicView(store.read()), presence: presenceList(), lan: { port: PORT, addresses: addresses() } };
}

function emitState() {
  const payload = `data: ${JSON.stringify(snapshot())}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { clients.delete(res); }
  }
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function nearestFoe(session, character) {
  if (!session) return null;
  const foes = (session.map?.tokens || []).filter((t) => t.kind === "foe" && t.difficulty);
  if (!foes.length) return null;
  const mine = (session.map.tokens || []).find((t) => t.characterId === character?.id);
  if (!mine) return foes[0];
  foes.sort((a, b) => Math.hypot(a.x - mine.x, a.y - mine.y) - Math.hypot(b.x - mine.x, b.y - mine.y));
  return foes[0];
}
function tableDifficulty(session, character) {
  return nearestFoe(session, character)?.difficulty || 0;
}
function closeSpur(state, session) {
  const line = spur.settle(state, session);
  if (!line) return false;
  addLog(session, { kind: "system", author: "Ereignis", text: line });
  return true;
}
function addLog(session, entry) {
  session.log.push({
    id: id("log"),
    at: new Date().toISOString(),
    kind: entry.kind || "system",
    author: entry.author || "Ember",
    text: entry.text || "",
    meta: entry.meta || {},
  });
  if (session.log.length > 500) session.log = session.log.slice(-500);
}

function remember(session, entry) {
  if (!session.undo) session.undo = [];
  session.undo.push(entry);
  if (session.undo.length > 15) session.undo.shift();
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
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    const err = new Error("Kaputtes JSON.");
    err.badJson = true;
    throw err;
  }
}

function safeJoin(root, rel) {
  const resolved = path.resolve(root, rel);
  const relPath = path.relative(path.resolve(root), resolved);
  if (relPath.startsWith("..") || path.isAbsolute(relPath)) return null;
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
      const start = Math.max(0, Number(startStr) || 0);
      let end = endStr ? Number(endStr) : st.size - 1;
      if (end > st.size - 1) end = st.size - 1;
      if (start > end) {
        res.writeHead(416, { "Content-Type": "text/plain; charset=utf-8", "Content-Range": `bytes */${st.size}` });
        return res.end("Bereich ungueltig.");
      }
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

function denyUnlessGm(res, state, body) {
  if (isGm(state, body)) return false;
  send(res, 403, { error: "Nur der SL." });
  return true;
}

const PLAYER_FIELDS = ["hope", "stressMarked", "hpMarked", "armorMarked", "notes"];

async function handleApi(req, res, url) {
  const method = req.method;
  const p = url.pathname;

  if (method === "GET" && p === "/api/chats") {
    const file = path.join(PUBLIC, "data", "chats.json");
    const dir = path.join(__dirname, "docs", "chats");
    const rows = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
    if (fs.existsSync(dir)) {
      for (const name of fs.readdirSync(dir)) {
        if (!name.endsWith(".md")) continue;
        rows.push({ id: name, title: name.replace(/\.md$/, ""), text: fs.readFileSync(path.join(dir, name), "utf8").slice(0, 1200) });
      }
    }
    return send(res, 200, rows);
  }
  if (method === "GET" && p === "/api/state") {
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (closeSpur(state, session)) { store.write(state); emitState(); }
    return send(res, 200, snapshot());
  }
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
    if (denyUnlessGm(res, state, body)) return;
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
    const body = await readJson(req);
    const state = store.read();
    if (denyUnlessGm(res, state, body)) return;
    const campaign = store.patchById(state.campaigns, patchCamp[1], body);
    if (!campaign) return send(res, 404, { error: "Kampagne fehlt." });
    store.write(state); emitState();
    return send(res, 200, campaign);
  }
  const fearCamp = p.match(/^\/api\/campaigns\/([^/]+)\/fear$/);
  if (method === "POST" && fearCamp) {
    const body = await readJson(req);
    const state = store.read();
    if (denyUnlessGm(res, state, body)) return;
    const campaign = state.campaigns.find((c) => c.id === fearCamp[1]);
    if (!campaign) return send(res, 404, { error: "Kampagne fehlt." });
    campaign.gmFear = clamp(Number(body.gmFear), 0, campaign.fearMax || 12);
    store.write(state); emitState();
    return send(res, 200, campaign);
  }
  if (method === "POST" && p === "/api/active-campaign") {
    const body = await readJson(req);
    const state = store.read();
    if (denyUnlessGm(res, state, body)) return;
    state.active.campaignId = body.campaignId || null;
    store.write(state); emitState();
    return send(res, 200, state.active);
  }
  if (method === "POST" && p === "/api/characters") {
    const body = await readJson(req);
    const state = store.read();
    if (denyUnlessGm(res, state, body)) return;
    const character = store.makeCharacter({ ...body, campaignId: body.campaignId || state.active.campaignId });
    state.characters.push(character);
    store.write(state); emitState();
    return send(res, 200, character);
  }
  const patchChar = p.match(/^\/api\/characters\/([^/]+)$/);
  if (method === "PATCH" && patchChar) {
    const body = await readJson(req);
    delete body.id;
    delete body.as;
    delete body.gmKey;
    const state = store.read();
    const gm = isGm(state, body);
    if (!gm && Object.keys(body).some((key) => key !== "as" && key !== "gmKey" && !PLAYER_FIELDS.includes(key))) {
      return send(res, 403, { error: "Nur der SL ändert den Bogen." });
    }
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
    if (denyUnlessGm(res, state, body)) return;
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
    if (denyUnlessGm(res, state, body)) return;
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
    if (!isGm(state, body) && !isLocalAddress(req.socket.remoteAddress || "")) return send(res, 403, { error: "Nur der SL." });
    delete body.as;
    delete body.gmKey;
    state.settings = { ...(state.settings || {}), ...body };
    store.write(state); emitState();
    return send(res, 200, state.settings);
  }

  if (method === "POST" && p === "/api/media") {
    const body = await readJson(req);
    const state = store.read();
    if (!isGm(state, body) && !isLocalAddress(req.socket.remoteAddress || "")) return send(res, 403, { error: "Nur der SL." });
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
    if (denyUnlessGm(res, state, body)) return;
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
    state.sessions.push(session);
    state.active.campaignId = campaignId;
    state.active.sessionId = session.id;
    store.write(state); emitState();
    return send(res, 200, session);
  }
  if (method === "POST" && p === "/api/session/end") {
    const body = await readJson(req);
    const state = store.read();
    if (denyUnlessGm(res, state, body)) return;
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (session) session.endedAt = new Date().toISOString();
    state.active.sessionId = null;
    store.write(state); emitState();
    return send(res, 200, { ok: true });
  }
  if (method === "POST" && p === "/api/session/narrate") {
    const body = await readJson(req);
    const state = store.read();
    if (denyUnlessGm(res, state, body)) return;
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine offene Session." });
    session.narrating = body.narrating == null ? !session.narrating : Boolean(body.narrating);
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
    if (denyUnlessGm(res, state, body)) return;
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
    if (!session.spotlightQueue) session.spotlightQueue = [];
    session.spotlightQueue.push({
      id: id("spot"),
      characterId: body.characterId || null,
      name: pc ? pc.name : "Spieler",
      action: body.action || "",
      question: body.question || "",
      at: new Date().toISOString(),
    });
    addLog(session, { kind: "note", author: pc ? pc.name : "Spieler", text: "Will Spotlight" + (body.action ? " · " + body.action : "") + (body.question ? ": " + body.question : "") });
    store.write(state); emitState();
    return send(res, 200, { ok: true });
  }
  const resolveSpot = p.match(/^\/api\/session\/spotlight\/([^/]+)\/resolve$/);
  if (method === "POST" && resolveSpot) {
    const body = await readJson(req);
    const state = store.read();
    if (denyUnlessGm(res, state, body)) return;
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    const item = session.spotlightQueue.find((q) => q.id === resolveSpot[1]);
    session.spotlightQueue = session.spotlightQueue.filter((q) => q.id !== resolveSpot[1]);
    if (body.accept && item) {
      session.activeSpotlight = item;
      if (initiative.giveLight(session, item.characterId)) {
        addLog(session, { kind: "system", author: "Spotlight", text: initiative.spoken(session) });
      }
    }
    store.write(state); emitState();
    return send(res, 200, { ok: true });
  }

  if (method === "POST" && p === "/api/roll") {
    const body = await readJson(req);
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    const character = state.characters.find((c) => c.id === body.characterId);
    const picked = body.tokenId ? (session?.map?.tokens || []).find((t) => t.id === body.tokenId && t.kind === "foe") : null;
    const foe = picked || nearestFoe(session, character);
    const typed = body.difficulty != null && body.difficulty !== "" ? Number(body.difficulty) : 0;
    const roll = resolveActionRoll({ ...body, hopeDie: body.hopeDie || body.hope, fearDie: body.fearDie || body.fear, difficulty: typed || foe?.difficulty || 0 });
    if (foe && !typed) roll.spoken += " · " + foe.label;
    const camp = session ? state.campaigns.find((c) => c.id === session.campaignId) : null;
    if (session && character) {
      remember(session, {
        kind: "roll",
        characterId: character.id,
        hope: character.hope,
        gmFear: camp?.gmFear || 0,
        campaignId: session.campaignId,
      });
    }
    const pools = applyPools({
      hope: character ? character.hope : 0,
      hopeMax: character ? character.hopeMax : 6,
      fear: camp ? camp.gmFear : 0,
      fearMax: camp ? camp.fearMax : 12,
    }, roll);
    if (character) character.hope = pools.hope;
    if (camp) camp.gmFear = pools.fear;
    if (session && pools.clockTick) session.sceneClock = (session.sceneClock || 0) + pools.clockTick;
    if (session) addLog(session, { kind: "roll", author: character ? character.name : "Tisch", text: roll.spoken, meta: { ...roll, unpaid: pools.unpaid, clockTick: pools.clockTick } });
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
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    const settled = closeSpur(state, session);
    if (recordGmKey(state, body, req.socket.remoteAddress || "") || settled) {
      store.write(state);
    }
    const changed = !prev || prev.status !== row.status;
    if (changed || Date.now() - presenceEmitAt > 2500) {
      presenceEmitAt = Date.now();
      emitState();
    }
    return send(res, 200, { key });
  }

  if (method === "POST" && p === "/api/quickstart/sablewood") {
    const body = await readJson(req);
    const state = store.read();
    if (denyUnlessGm(res, state, body)) return;
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
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
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
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    store.activeEncounter(session);
    const token = {
      id: id("tok"), kind: body.kind || "marker", characterId: body.characterId || null,
      label: body.label || "Pin", color: body.color || "#e85d04", portrait: body.portrait || "",
      x: Number(body.x ?? 50), y: Number(body.y ?? 50),
      difficulty: Number(body.difficulty || 0) || null,
      stress: Number(body.stress || 0),
      stressMax: Number(body.stressMax || 0) || null,
      thresholds: body.thresholds || "",
    };
    session.map.tokens.push(token);
    if (token.kind === "foe") initiative.addFoe(session, token);
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
    if (!isGm(state, body) && (!body.characterId || token.characterId !== body.characterId)) {
      return send(res, 403, { error: "Nur das eigene Token." });
    }
    if (body.rev != null && Number(body.rev) !== Number(token.rev || 0)) {
      addLog(session, { kind: "system", author: "Karte", text: (token.label || "Token") + " wurde gerade woanders gezogen." });
      store.write(state); emitState();
      return send(res, 409, { error: "Jemand hat das Token schon gezogen.", token });
    }
    remember(session, { kind: "move", tokenId: token.id, x: token.x, y: token.y });
    token.x = clamp(Number(body.x), 2, 98);
    token.y = clamp(Number(body.y), 4, 96);
    token.rev = Number(token.rev || 0) + 1;
    const enc = store.activeEncounter(session);
    if (token.kind === "pc") checkTriggers(session, enc, token);
    store.write(state); emitState();
    return send(res, 200, token);
  }
  if (method === "POST" && p === "/api/session/map/fow") {
    const body = await readJson(req);
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
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
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
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
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
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
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
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
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
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
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    store.activeEncounter(session);
    const enc = store.makeEncounter(body.name || "Prepared Event", {
      image: body.image || session.map?.image || "",
      tokens: (session.map?.tokens || []).filter((t) => t.kind === "pc" || t.kind === "foe").map((t, i) => ({ ...t, x: 18 + i * 10, y: t.kind === "foe" ? 40 : 70 })),
      walls: session.map?.walls || [],
      doors: session.map?.doors || [],
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
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
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
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
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
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
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
  if (method === "GET" && p === "/api/compendium") return send(res, 200, compendium.search(url.searchParams.get("q"), url.searchParams.get("kind"), url.searchParams.get("scope")));
  if (method === "POST" && p === "/api/session/voice") {
    const body = await readJson(req);
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    session.narrating = true;
    if (session.initiative) session.initiative.on = false;
    addLog(session, { kind: "system", text: "Zurück zur Stimme. Die Karte bleibt liegen." });
    store.write(state); emitState();
    return send(res, 200, { narrating: true });
  }
  if (method === "POST" && p === "/api/session/undo") {
    const body = await readJson(req);
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session || !session.undo || !session.undo.length) return send(res, 400, { error: "Nichts zum Zurücknehmen." });
    const entry = session.undo.pop();
    if (entry.kind === "move") {
      const token = (session.map?.tokens || []).find((t) => t.id === entry.tokenId);
      if (token) { token.x = entry.x; token.y = entry.y; }
    } else if (entry.kind === "roll") {
      const character = state.characters.find((c) => c.id === entry.characterId);
      if (character) character.hope = entry.hope;
      const camp = state.campaigns.find((c) => c.id === entry.campaignId);
      if (camp) camp.gmFear = entry.gmFear;
    }
    addLog(session, { kind: "system", author: "Undo", text: entry.kind === "move" ? "Token zurück." : "Wurf zurück." });
    store.write(state); emitState();
    return send(res, 200, { ok: true });
  }
  if (method === "POST" && p === "/api/session/fear-spend") {
    const body = await readJson(req);
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    const camp = state.campaigns.find((c) => c.id === session.campaignId);
    if (!camp || !(camp.gmFear > 0)) return send(res, 400, { error: "Kein Fear." });
    camp.gmFear -= 1;
    initiative.apply(session, { action: "side" });
    addLog(session, { kind: "system", author: "Fear", text: "Fear ausgegeben. " + (initiative.spoken(session) || "Gegenseite.") });
    store.write(state); emitState();
    return send(res, 200, { gmFear: camp.gmFear, initiative: session.initiative });
  }
  if (method === "POST" && p === "/api/session/handout") {
    const body = await readJson(req);
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    if (!session.handouts) session.handouts = [];
    const to = body.toId ? state.characters.find((c) => c.id === body.toId) : null;
    session.handouts.unshift({
      id: id("hand"),
      title: body.title || "Zettel",
      text: body.text || "",
      toId: to ? to.id : null,
      toName: to ? to.name : "",
      at: new Date().toISOString(),
    });
    session.handouts = session.handouts.slice(0, 12);
    addLog(session, { kind: "note", author: "Handout", text: (to ? to.name + ": " : "") + (body.title || "Zettel") });
    store.write(state); emitState();
    return send(res, 200, session.handouts[0]);
  }
  if (method === "POST" && p === "/api/session/ping") {
    const body = await readJson(req);
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    session.ping = { x: Number(body.x), y: Number(body.y), name: body.name || "Jemand", at: Date.now() };
    store.write(state); emitState();
    return send(res, 200, session.ping);
  }
  if (method === "POST" && p === "/api/session/harm") {
    const body = await readJson(req);
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    const amount = Math.max(0, Number(body.amount || 0));
    if (body.tokenId) {
      if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
      const token = (session.map?.tokens || []).find((t) => t.id === body.tokenId);
      if (!token) return send(res, 404, { error: "Foe fehlt." });
      token.stress = Math.min(Number(token.stressMax || 99), Number(token.stress || 0) + amount);
      addLog(session, { kind: "note", author: "Schaden", text: token.label + " +" + amount + " Stress (" + token.stress + ")" });
      store.write(state); emitState();
      return send(res, 200, token);
    }
    const character = state.characters.find((c) => c.id === body.characterId);
    if (!character) return send(res, 404, { error: "Bogen fehlt." });
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
    character.hpMarked = clamp(Number(character.hpMarked || 0) + amount, 0, character.hpMax || 6);
    addLog(session, { kind: "note", author: "Schaden", text: character.name + " +" + amount + " HP (" + character.hpMarked + "/" + character.hpMax + ")" });
    store.write(state); emitState();
    return send(res, 200, character);
  }
  if (method === "POST" && p === "/api/session/map/foe") {
    const body = await readJson(req);
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    store.activeEncounter(session);
    let token = (session.map?.tokens || []).find((t) => t.id === body.id);
    if (!token) {
      token = {
        id: id("tok"), kind: "foe", label: body.label || "Foe", color: body.color || "#6a040f",
        x: Number(body.x ?? 55), y: Number(body.y ?? 40),
        difficulty: Number(body.difficulty || 14) || null,
        stress: 0, stressMax: Number(body.stressMax || 4) || 4, thresholds: body.thresholds || "5/11",
      };
      session.map.tokens.push(token);
      initiative.addFoe(session, token);
    } else {
      if (body.difficulty != null) token.difficulty = Number(body.difficulty) || null;
      if (body.stress != null) token.stress = Number(body.stress) || 0;
      if (body.stressMax != null) token.stressMax = Number(body.stressMax) || null;
      if (body.thresholds != null) token.thresholds = body.thresholds;
    }
    store.write(state); emitState();
    return send(res, 200, token);
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
  if (method === "GET" && p === "/api/solo/bots") return send(res, 200, { bots: solo.list() });
  if (method === "POST" && p === "/api/solo/start") {
    const body = await readJson(req);
    const state = store.read();
    const character = state.characters.find((c) => c.id === body.characterId) || state.characters[0];
    if (!character) return send(res, 400, { error: "Erst einen Bogen anlegen." });
    if (!state.active.sessionId) {
      const session = store.makeSession(character.campaignId);
      session.solo = true;
      state.sessions.push(session);
      state.active.sessionId = session.id;
      state.active.campaignId = character.campaignId;
    }
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    session.solo = true;
    store.activeEncounter(session);
    if (!session.map.tokens.some((t) => t.characterId === character.id)) {
      session.map.tokens.push({ id: id("tok"), kind: "pc", characterId: character.id, label: character.name, color: "#e9c46a", x: 30, y: 70 });
    }
    addLog(session, { kind: "system", text: "Solo. " + character.name + " übt allein." });
    store.write(state); emitState();
    return send(res, 200, { text: character.name + " ist auf der Übungskarte." });
  }
  if (method === "POST" && p === "/api/solo/bot") {
    const body = await readJson(req);
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Erst Solo öffnen." });
    const bot = solo.find(body.botId);
    store.activeEncounter(session);
    const token = {
      id: id("tok"), kind: "foe", bot: true, botId: bot.id, label: bot.name, color: "#6a040f",
      x: 62, y: 36, difficulty: bot.difficulty, stress: 0, stressMax: bot.stressMax, attack: bot.attack,
    };
    session.map.tokens.push(token);
    initiative.addFoe(session, token);
    addLog(session, { kind: "system", author: "Bot", text: bot.name + " stellt sich. Difficulty " + bot.difficulty + "." });
    store.write(state); emitState();
    return send(res, 200, { text: bot.name + " steht auf der Karte." });
  }
  if (method === "POST" && p === "/api/solo/act") {
    const body = await readJson(req);
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Erst Solo öffnen." });
    const token = (session.map.tokens || []).filter((t) => t.bot).pop();
    if (!token) return send(res, 400, { error: "Kein Bot auf der Karte." });
    const character = state.characters.find((c) => c.id === body.characterId);
    const line = solo.act(token, character?.evasion || 10);
    if (line.hit) {
      if (character) character.hpMarked = Math.min(character.hpMax || 6, Number(character.hpMarked || 0) + 1);
    } else token.stress = Number(token.stress || 0) + 1;
    addLog(session, { kind: "roll", author: token.label, text: line.text });
    store.write(state); emitState();
    return send(res, 200, { text: line.text });
  }
  if (method === "GET" && p === "/api/maps") {
    const state = store.read();
    return send(res, 200, { maps: state.maps || [] });
  }
  if (method === "POST" && p === "/api/maps") {
    const body = await readJson(req);
    const state = store.read();
    if (!state.maps) state.maps = [];
    const map = { id: id("map"), name: body.name || "Karte", tokens: body.tokens || [], at: new Date().toISOString() };
    state.maps.unshift(map);
    store.write(state);
    return send(res, 200, map);
  }
  if (method === "POST" && p === "/api/maps/load") {
    const body = await readJson(req);
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    const map = (state.maps || []).find((m) => m.id === body.id);
    if (!session || !map) return send(res, 404, { error: "Karte oder Session fehlt." });
    store.activeEncounter(session);
    for (const pin of map.tokens || []) {
      session.map.tokens.push({ id: id("tok"), kind: "marker", label: pin.label, color: "#e9c46a", x: pin.x, y: pin.y });
    }
    addLog(session, { kind: "system", text: "Karte geladen: " + map.name });
    store.write(state); emitState();
    return send(res, 200, { text: map.name + " liegt auf dem Tisch." });
  }
  if (method === "POST" && p === "/api/dungeon") {
    const body = await readJson(req);
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Erst Solo öffnen." });
    const rooms = solo.generate(body.rooms);
    session.dungeon = { rooms };
    store.activeEncounter(session);
    rooms.forEach((room) => {
      session.map.tokens.push({ id: id("tok"), kind: room.bot ? "foe" : "marker", bot: Boolean(room.bot), label: room.name, color: room.bot ? "#6a040f" : "#7ea0c4", x: room.x, y: room.y, difficulty: room.bot?.difficulty || null, stress: 0, stressMax: room.bot?.stressMax || null, attack: room.bot?.attack || 0, roomId: room.id });
    });
    addLog(session, { kind: "system", text: "Dungeon mit " + rooms.length + " Räumen." });
    store.write(state); emitState();
    return send(res, 200, { text: rooms.length + " Räume liegen.", rooms });
  }
  if (method === "POST" && p === "/api/dungeon/room") {
    const body = await readJson(req);
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    const room = session?.dungeon?.rooms?.find((r) => r.id === body.roomId);
    const character = state.characters.find((c) => c.id === body.characterId);
    if (!room || !character) return send(res, 400, { error: "Raum oder Bogen fehlt." });
    if (room.clear) return send(res, 200, { text: room.name + " ist schon leer." });
    const roll = solo.act({ name: character.name, attack: Number(character.traits?.agility || 0) }, room.bot?.difficulty || 10);
    let leveled = false;
    if (roll.hit) {
      room.clear = true;
      if (session.dungeon.rooms.every((r) => r.clear || !r.bot)) {
        character.level = Number(character.level || 1) + 1;
        character.hope = character.hopeMax || 6;
        leveled = true;
      }
    }
    const text = roll.text + (leveled ? " — Level " + character.level : room.clear ? " — Raum leer" : "");
    addLog(session, { kind: "roll", author: character.name, text });
    store.write(state); emitState();
    return send(res, 200, { text, leveled });
  }

  if (method === "GET" && p === "/api/solo/subclasses") {
    const klass = url.searchParams.get("class") || "";
    return send(res, 200, { subclasses: solo.subclassesFor(klass) });
  }
  if (method === "POST" && p === "/api/solo/subclass") {
    const body = await readJson(req);
    const state = store.read();
    const character = state.characters.find((c) => c.id === body.characterId);
    if (!character) return send(res, 404, { error: "Bogen fehlt." });
    solo.applySubclass(character, body.subclass);
    store.write(state); emitState();
    return send(res, 200, { text: character.name + " · " + (character.subclass || "keine Subclass") });
  }
  if (method === "POST" && p === "/api/solo/level") {
    const body = await readJson(req);
    const state = store.read();
    const origin = state.characters.find((c) => c.id === body.characterId);
    if (!origin) return send(res, 404, { error: "Bogen fehlt." });
    const targets = body.party
      ? state.characters.filter((c) => c.campaignId === origin.campaignId)
      : [origin];
    const lines = [];
    for (const character of targets) {
      const result = solo.levelUp(character, { experience: body.experience, upgrade: body.upgrade, note: body.note, subclass: body.subclass });
      if (!result.ok) { lines.push(result.text); continue; }
      for (const xp of character.experiences || []) if (!xp.id) xp.id = id("xp");
      lines.push(result.text);
    }
    const text = lines.join(" ");
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (session) addLog(session, { kind: "system", author: "Level", text });
    store.write(state); emitState();
    return send(res, 200, { text, level: origin.level });
  }

  if (method === "GET" && p === "/api/bibliothek") {
    const indexPath = path.join(LIBRARY, "index.json");
    const books = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, "utf8")) : [];
    const mapsDir = path.join(LIBRARY, "maps");
    const maps = fs.existsSync(mapsDir) ? fs.readdirSync(mapsDir).filter((f) => /\.(jpg|png|webp)$/i.test(f)).map((f) => ({ title: f, href: "/docs/bibliothek/maps/" + f })) : [];
    return send(res, 200, { books: books.map((b) => ({ ...b, href: "/docs/bibliothek/" + b.file, missing: !fs.existsSync(path.join(LIBRARY, b.file)) })), maps });
  }
  if (method === "GET" && p === "/api/errata") {
    const file = path.join(LIBRARY, "errata.json");
    return send(res, 200, { notes: fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [] });
  }

  if (method === "GET" && p === "/api/cards") {
    const file = path.join(PUBLIC, "data", "cards.json");
    return send(res, 200, { cards: fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [] });
  }
  if (method === "POST" && p === "/api/session/map/wall") {
    const body = await readJson(req);
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    store.activeEncounter(session);
    session.map.walls = session.map.walls || [];
    session.map.walls.push({ id: id("wall"), x1: body.x1, y1: body.y1, x2: body.x2, y2: body.y2 });
    store.write(state); emitState();
    return send(res, 200, session.map.walls);
  }
  if (method === "POST" && p === "/api/session/map/door") {
    const body = await readJson(req);
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    store.activeEncounter(session);
    session.map.doors = session.map.doors || [];
    if (body.id) {
      const door = session.map.doors.find((d) => d.id === body.id);
      if (door) door.open = !door.open;
    } else {
      session.map.doors.push({ id: id("door"), x: body.x, y: body.y, open: false });
    }
    store.write(state); emitState();
    return send(res, 200, session.map.doors);
  }
  if (method === "POST" && p === "/api/session/journal") {
    const body = await readJson(req);
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    session.journal = session.journal || [];
    session.journal.push({ id: id("note"), title: body.title || "Notiz", text: body.text || "", secret: Boolean(body.secret), at: new Date().toISOString() });
    if (!body.secret) addLog(session, { kind: "handout", author: "Journal", text: body.title || "Notiz" });
    store.write(state); emitState();
    return send(res, 200, session.journal);
  }
  if (method === "POST" && p === "/api/session/scene-track") {
    const body = await readJson(req);
    const state = store.read();
    if (!isGm(state, body)) return send(res, 403, { error: "Nur der SL." });
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    const enc = store.activeEncounter(session);
    enc.track = body.track || "";
    store.write(state); emitState();
    return send(res, 200, { track: enc.track });
  }
  if (method === "POST" && p === "/api/characters/feature") {
    const body = await readJson(req);
    const state = store.read();
    if (denyUnlessGm(res, state, body)) return;
    const character = state.characters.find((c) => c.id === body.characterId);
    if (!character) return send(res, 404, { error: "Bogen fehlt." });
    character.features = character.features || [];
    character.features.push({ name: body.name || "Feature", text: body.text || "" });
    store.write(state); emitState();
    return send(res, 200, character);
  }

  if (method === "POST" && p === "/api/session/ready") {
    const body = await readJson(req);
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine offene Session." });
    session.ready = session.ready || {};
    session.ready[body.characterId] = Boolean(body.ready);
    const pc = state.characters.find((c) => c.id === body.characterId);
    addLog(session, { kind: "system", author: pc ? pc.name : "Spieler", text: body.ready ? "ready" : "nicht ready" });
    store.write(state); emitState();
    return send(res, 200, { ok: true });
  }

  if (method === "GET" && p === "/api/session/handouts") {
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    const rows = session?.handouts || [];
    if (isGm(state, { as: "gm", gmKey: url.searchParams.get("gmKey") || "" })) return send(res, 200, { handouts: rows });
    const who = url.searchParams.get("characterId") || "";
    return send(res, 200, { handouts: rows.filter((h) => !h.toId || h.toId === who) });
  }
  if (method === "GET" && p === "/api/spur") return send(res, 200, { games: spur.list() });
  if (method === "GET" && p === "/api/session/journal") {
    const state = store.read();
    if (!isGm(state, { as: "gm", gmKey: url.searchParams.get("gmKey") || "" })) return send(res, 403, { error: "Nur der SL." });
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    return send(res, 200, { journal: session?.journal || [] });
  }
  if (method === "POST" && p === "/api/session/spur") {
    const body = await readJson(req);
    const state = store.read();
    if (denyUnlessGm(res, state, body)) return;
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine offene Session." });
    const game = spur.get(body.game);
    if (!game) return send(res, 400, { error: "Ereignis fehlt." });
    const event = {
      id: id("spur"),
      game: game.id,
      title: body.title || game.title,
      blurb: game.blurb,
      href: game.href,
      stake: body.stake || "",
      payout: body.payout === "fear" ? "fear" : "hope",
      seconds: Math.max(15, Number(body.seconds) || 45),
      endsAt: Date.now() + Math.max(15, Number(body.seconds) || 45) * 1000,
      ask: game.id === "puls" ? {
        question: body.question || "Was trägt die Kiste?",
        options: [
          { id: "a", label: body.a || "Asche", right: (body.right || "a") === "a" },
          { id: "b", label: body.b || "Gold", right: body.right === "b" },
          { id: "c", label: body.c || "Nichts", right: body.right === "c" },
        ],
      } : null,
      at: new Date().toISOString(),
      scores: [],
    };
    session.spur = event;
    const camp = state.campaigns.find((c) => c.id === session.campaignId);
    if (body.keep && camp) {
      camp.spurs = camp.spurs || [];
      camp.spurs.unshift({ id: event.id, game: event.game, title: event.title, stake: event.stake });
      camp.spurs = camp.spurs.slice(0, 12);
    }
    addLog(session, { kind: "system", author: "Ereignis", text: event.title + (event.ask ? " — " + event.ask.question : "") + (event.stake ? " — " + event.stake : "") });
    store.write(state); emitState();
    return send(res, 200, event);
  }
  if (method === "POST" && p === "/api/session/spur/score") {
    const body = await readJson(req);
    const state = store.read();
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session || !session.spur) return send(res, 400, { error: "Kein Ereignis." });
    const pc = state.characters.find((c) => c.id === body.characterId);
    const graded = session.spur.game === "puls" ? spur.grade(session.spur.ask, body.choice) : null;
    const row = {
      characterId: body.characterId || null,
      name: pc ? pc.name : (body.name || "Jemand"),
      score: graded ? String(graded.score) : (body.score || ""),
      note: graded ? graded.label : (body.note || ""),
      at: new Date().toISOString(),
    };
    session.spur.scores = (session.spur.scores || []).filter((s) => s.characterId !== row.characterId);
    session.spur.scores.push(row);
    const line = spur.settle(state, session);
    if (line) addLog(session, { kind: "system", author: "Ereignis", text: line });
    else addLog(session, { kind: "note", author: row.name, text: session.spur.title + ": " + (row.score || row.note || "durch") });
    store.write(state); emitState();
    return send(res, 200, session.spur || { ended: true, result: line });
  }
  if (method === "POST" && p === "/api/session/spur/end") {
    const body = await readJson(req);
    const state = store.read();
    if (denyUnlessGm(res, state, body)) return;
    const session = state.sessions.find((s) => s.id === state.active.sessionId);
    if (!session) return send(res, 400, { error: "Keine Session." });
    if (session.spur) session.spur.endsAt = Date.now() - 1;
    const line = closeSpur(state, session);
    store.write(state); emitState();
    return send(res, 200, { ok: true, result: line || "" });
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
    if (url.pathname === "/" || url.pathname === "/home" || url.pathname === "/house") {
      return serveFile(res, path.join(PUBLIC, "home.html"), req);
    }
    if (url.pathname === "/ember" || url.pathname === "/ember/") {
      return serveFile(res, path.join(PUBLIC, "index.html"), req);
    }
    if (url.pathname === "/token" || url.pathname === "/token/") {
      return serveFile(res, path.join(PUBLIC, "token.html"), req);
    }
    if (url.pathname === "/solo" || url.pathname === "/solo/") {
      return serveFile(res, path.join(PUBLIC, "solo.html"), req);
    }
    if (url.pathname === "/bibliothek" || url.pathname === "/bibliothek/") {
      return serveFile(res, path.join(PUBLIC, "bibliothek.html"), req);
    }
    if (url.pathname === "/karten" || url.pathname === "/karten/") {
      return serveFile(res, path.join(PUBLIC, "karten.html"), req);
    }
    if (url.pathname.startsWith("/docs/bibliothek/")) {
      const rel = decodeURIComponent(url.pathname.slice("/docs/bibliothek/".length));
      const file = safeJoin(LIBRARY, rel);
      if (!file) { res.writeHead(403); return res.end(); }
      return serveFile(res, file, req);
    }
    if (url.pathname === "/runner" || url.pathname === "/runner/") {
      return serveFile(res, path.join(PUBLIC, "runner.html"), req);
    }
    if (url.pathname === "/fallwerk" || url.pathname === "/fallwerk/") {
      return serveFile(res, path.join(PUBLIC, "fallwerk.html"), req);
    }
    if (url.pathname === "/pastellpfad" || url.pathname === "/pastellpfad/") {
      return serveFile(res, path.join(PUBLIC, "pastellpfad.html"), req);
    }
    if (url.pathname === "/scharfschuss" || url.pathname === "/scharfschuss/") {
      return serveFile(res, path.join(PUBLIC, "scharfschuss.html"), req);
    }
    if (url.pathname === "/pixelstube" || url.pathname === "/pixelstube/") {
      return serveFile(res, path.join(PUBLIC, "pixelstube.html"), req);
    }
    if (url.pathname === "/puls" || url.pathname === "/puls/") {
      return serveFile(res, path.join(PUBLIC, "puls.html"), req);
    }
    if (url.pathname === "/heft" || url.pathname === "/heft/") {
      return serveFile(res, path.join(PUBLIC, "heft.html"), req);
    }
    const rel = url.pathname.replace(/^\/+/, "");
    const file = safeJoin(PUBLIC, rel);
    if (!file) { res.writeHead(403); return res.end(); }
    return serveFile(res, file, req);
  } catch (err) {
    if (err && err.badJson) return send(res, 400, { error: err.message });
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
  console.log("  Fallwerk:        http://127.0.0.1:" + PORT + "/fallwerk");
  console.log("  Pastellpfad:     http://127.0.0.1:" + PORT + "/pastellpfad");
  console.log("  Scharfschuss:    http://127.0.0.1:" + PORT + "/scharfschuss");
  console.log("  Pixelstube:      http://127.0.0.1:" + PORT + "/pixelstube");
  console.log("  Puls:            http://127.0.0.1:" + PORT + "/puls");
  console.log("  Heft:            http://127.0.0.1:" + PORT + "/heft");
  if (!urls.length) console.log("  Kein LAN-Interface.");
  else for (const u of urls) console.log("  Spieler-Ansicht: http://" + u.address + ":" + PORT + "/player   (" + u.name + ")");
  console.log("");
});
