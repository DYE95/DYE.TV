const fs = require("fs");
const path = require("path");
const { id, pin } = require("./ids");

const ROOT = path.join(__dirname, "..", "data");
const FILE = path.join(ROOT, "ember.json");

function defaultFow() {
  return { on: false, radius: 16, persist: false, gmSeesAll: true, explored: [] };
}

function makeEncounter(name, map) {
  return {
    id: id("enc"),
    name: name || "Prepared Event",
    status: "ready",
    map: map || { image: "", tokens: [], fow: defaultFow() },
    traps: [],
    zones: [],
    alerts: [],
  };
}

function activeEncounter(session) {
  if (!session) return null;
  if (!session.encounters) session.encounters = [];
  if (!session.map) session.map = { image: "", tokens: [], fow: defaultFow() };
  if (!session.map.fow) session.map.fow = defaultFow();
  if (!session.encounters.length) {
    const enc = makeEncounter("", session.map);
    enc.hidden = true;
    session.encounters.push(enc);
    session.activeEncounterId = enc.id;
  }
  let enc = session.encounters.find((e) => e.id === session.activeEncounterId) || session.encounters[0];
  session.activeEncounterId = enc.id;
  if (!enc.map) enc.map = session.map;
  if (!enc.map.fow) enc.map.fow = defaultFow();
  enc.traps = enc.traps || [];
  enc.zones = enc.zones || [];
  enc.alerts = enc.alerts || [];
  session.map = enc.map;
  return enc;
}

function blankState() {
  return {
    version: 2,
    settings: {
      language: "de",
      houseName: "Ember",
      github: "",
    },
    campaigns: [],
    characters: [],
    sessions: [],
    media: [],
    active: { campaignId: null, sessionId: null },
  };
}

function makeCampaign(name) {
  return {
    id: id("cmp"),
    name: name || "Neue Glut",
    frame: "",
    notes: "",
    gmFear: 0,
    fearMax: 12,
    createdAt: new Date().toISOString(),
  };
}

function makeCharacter(partial = {}) {
  return {
    id: id("pc"),
    campaignId: partial.campaignId || null,
    playerPin: pin(),
    name: partial.name || "Unbenannt",
    pronouns: partial.pronouns || "",
    ancestry: partial.ancestry || "",
    community: partial.community || "",
    class: partial.class || partial.klass || "",
    subclass: partial.subclass || "",
    level: partial.level || 1,
    traits: partial.traits || { agility: 0, strength: 0, finesse: 0, instinct: 0, presence: 0, knowledge: 0 },
    experiences: partial.experiences || [],
    hope: 2,
    hopeMax: 6,
    stressMarked: 0,
    stressMax: 6,
    hpMarked: 0,
    hpMax: 6,
    major: 7,
    severe: 14,
    evasion: 10,
    armorScore: 0,
    armorMarked: 0,
    proficiency: 1,
    portrait: partial.portrait || "",
    color: partial.color || "#e85d04",
    hopeFeature: "",
    features: [],
    weapons: [],
    armor: { name: "", thresholds: "", score: 0, feature: "" },
    notes: "",
    sheetPhotos: [],
    createdAt: new Date().toISOString(),
    ...partial,
    id: partial.id || id("pc"),
    playerPin: partial.playerPin || pin(),
  };
}

function makeSession(campaignId) {
  return {
    id: id("ses"),
    campaignId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    narrating: false,
    log: [{
      id: id("log"),
      at: new Date().toISOString(),
      kind: "system",
      author: "Ember",
      text: "Die Glut ist klein. Jemand muss sprechen, bevor die Umbra näherkommt.",
      meta: {},
    }],
    spotlightQueue: [],
    activeSpotlight: null,
    map: { image: "", tokens: [], fow: defaultFow() },
    encounters: [],
    activeEncounterId: null,
  };
}

function migrate(state) {
  if (!state.settings) state.settings = {};
  if (!state.settings.houseName) state.settings.houseName = "Ember";
  if (state.settings.github == null) state.settings.github = "";
  if (!state.media) state.media = [];
  for (const s of state.sessions || []) activeEncounter(s);
  return state;
}

function ensure() {
  fs.mkdirSync(path.join(ROOT, "uploads"), { recursive: true });
  if (!fs.existsSync(FILE)) {
    const state = blankState();
    const campaign = makeCampaign("Erste Glut");
    campaign.frame = "Age of Umbra";
    state.campaigns.push(campaign);
    state.active.campaignId = campaign.id;
    fs.writeFileSync(FILE, JSON.stringify(state, null, 2));
  }
}

function read() {
  ensure();
  const state = migrate(JSON.parse(fs.readFileSync(FILE, "utf8")));
  const seedPath = path.join(__dirname, "..", "public", "data", "probe-lichtung.json");
  if (fs.existsSync(seedPath)) {
    const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
    const revision = seed.revision || 1;
    const have = (state.campaigns || []).find((c) => c.name === "Asche über der Lichtung");
    if (!have || (have.probeRevision || 0) < revision) {
      state.campaigns = (state.campaigns || []).filter((c) => c.name !== "Asche über der Lichtung");
      state.characters = (state.characters || []).filter((c) => !have || c.campaignId !== have.id);
      state.sessions = (state.sessions || []).filter((s) => !have || s.campaignId !== have.id);
      for (const c of seed.campaigns || []) c.probeRevision = revision;
      state.campaigns.push(...(seed.campaigns || []));
      state.characters.push(...(seed.characters || []));
      state.sessions.push(...(seed.sessions || []));
      if (seed.active) state.active = seed.active;
      write(state);
    }
  }
  return state;
}

function write(state) {
  fs.mkdirSync(ROOT, { recursive: true });
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(tmp, FILE);
}

function patchById(list, itemId, patch) {
  const i = list.findIndex((x) => x.id === itemId);
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch, id: list[i].id };
  return list[i];
}

module.exports = {
  read, write, makeCampaign, makeCharacter, makeSession,
  makeEncounter, activeEncounter, defaultFow, patchById, ROOT,
};
