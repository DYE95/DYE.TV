// data/sl.pin: nie mehr "ECHO ist ausgeschaltet". Node schreibt die PIN,
// cmd-Reste gelten als keine PIN, sl.pin ist die Quelle des SL-Schluessels.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { spawn, spawnSync } = require("child_process");
const slpin = require("../lib/slpin");

const ROOT = path.join(__dirname, "..");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "ember-pin-"));
const JUNK = "ECHO ist ausgeschaltet (OFF).";

test("cmd-Reste und zu kurze PINs taugen nicht", () => {
  for (const junk of [JUNK, "ECHO is off.", "echo ist eingeschaltet (ON).", "ECHO est désactivé."]) {
    assert.ok(slpin.isJunk(junk), junk);
    assert.match(slpin.problem(junk), /cmd-Rest/);
  }
  assert.equal(slpin.problem(""), "leer");
  assert.equal(slpin.problem("   \r\n"), "leer");
  assert.match(slpin.problem("123"), /kürzer/);
  assert.equal(slpin.problem("4711"), "");
  assert.equal(slpin.problem("\uFEFF4711\r\n"), "");
  assert.equal(slpin.problem("Echolot"), "", "nur echte cmd-Ausgabe zählt als Rest");
});

test("inspect/read/write: Datei mit CRLF, kaputte Datei liefert keine PIN", () => {
  const dir = tmp();
  assert.equal(slpin.inspect(dir).state, "fehlt");
  fs.writeFileSync(path.join(dir, "sl.pin"), JUNK + "\r\n");
  const bad = slpin.inspect(dir);
  assert.equal(bad.state, "kaputt");
  assert.equal(slpin.read(dir), "");
  assert.throws(() => slpin.write(dir, "  "), /leer/);
  slpin.write(dir, " 4711 ");
  assert.equal(fs.readFileSync(path.join(dir, "sl.pin"), "utf8"), "4711\r\n");
  assert.equal(slpin.read(dir), "4711");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("syncGmKey: PIN gewinnt, cmd-Rest als Schlüssel fliegt raus", () => {
  const dir = tmp();
  const state = { settings: { gmKey: JUNK } };
  fs.writeFileSync(path.join(dir, "sl.pin"), JUNK + "\r\n");
  assert.equal(slpin.syncGmKey(state, dir), "junk-weg");
  assert.equal(state.settings.gmKey, undefined);
  state.settings.gmKey = "gm_zufall";
  assert.equal(slpin.syncGmKey(state, dir), "", "ohne PIN bleibt ein echter Schlüssel");
  slpin.write(dir, "4711");
  assert.equal(slpin.syncGmKey(state, dir), "pin");
  assert.equal(state.settings.gmKey, "4711");
  assert.equal(slpin.syncGmKey(state, dir), "");
  fs.rmSync(dir, { recursive: true, force: true });
});

function runTool(dir, input) {
  return spawnSync(process.execPath, [path.join(ROOT, "tools", "slpin.js")], {
    input, encoding: "utf8", timeout: 10000,
    env: { ...process.env, EMBER_DATA: dir, EMBER_PIN_FORCE_PROMPT: input == null ? "" : "1" },
  });
}

test("tools/slpin.js repariert ECHO-Datei, fragt bei leerer Eingabe erneut", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "sl.pin"), JUNK + "\r\n");
  const r = runTool(dir, "\n12\n4711\n");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /unbrauchbar/);
  assert.match(r.stdout, /PIN leer/);
  assert.match(r.stdout, /kürzer/);
  assert.match(r.stdout, /PIN gespeichert/);
  assert.equal(fs.readFileSync(path.join(dir, "sl.pin"), "utf8"), "4711\r\n");
  // zweiter Start: keine Frage mehr
  const again = runTool(dir, "");
  assert.match(again.stdout, /liegt in data\\sl\.pin/);
  assert.doesNotMatch(again.stdout, /Spielleiter-PIN \(/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("tools/slpin.js ohne Eingabe: schreibt nichts, Exitcode 0, start.bat läuft weiter", () => {
  const dir = tmp();
  const r = runTool(dir, "");
  assert.equal(r.status, 0);
  assert.equal(fs.existsSync(path.join(dir, "sl.pin")), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("Batch-Dateien: keine PIN mehr per cmd, CRLF per .gitattributes", () => {
  // nur Befehle, keine rem-Kommentare
  const bat = fs.readFileSync(path.join(ROOT, "start.bat"), "utf8").split(/\r?\n/).filter((l) => !/^\s*rem\b/i.test(l)).join("\n");
  assert.match(bat, /node tools\\slpin\.js/);
  assert.doesNotMatch(bat, /set \/p/i, "set /p hat ECHO-Reste erzeugt");
  assert.doesNotMatch(bat, />\s*data\\sl\.pin/i, "cmd schreibt sl.pin nicht mehr");
  const attrs = fs.readFileSync(path.join(ROOT, ".gitattributes"), "utf8");
  assert.match(attrs, /^\*\.bat\s+text\s+eol=crlf\s*$/m);
  assert.ok(attrs.endsWith("\n"));
  assert.equal(fs.existsSync(path.join(ROOT, "Ember.bat")), false, "Ember.bat ist in start.bat aufgegangen");
});

function get(port, url) {
  return new Promise((resolve, reject) => {
    http.get({ host: "127.0.0.1", port, path: url }, (res) => {
      let text = "";
      res.on("data", (c) => (text += c));
      res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(text || "null") }));
    }).on("error", reject);
  });
}

async function withServer(dataDir, fn) {
  const port = 39000 + Math.floor(Math.random() * 900);
  const child = spawn(process.execPath, [path.join(ROOT, "server.js")], {
    env: { ...process.env, EMBER_DATA: dataDir, EMBER_PORT: String(port), EMBER_HOST: "127.0.0.1" }, stdio: "ignore",
  });
  try {
    for (let i = 0; i < 100; i += 1) {
      try { await get(port, "/api/sl-pin"); break; } catch { await new Promise((r) => setTimeout(r, 100)); }
    }
    await fn(port);
  } finally {
    child.kill();
  }
}

async function gmKeyEventually(dataDir, want) {
  for (let i = 0; i < 50; i += 1) {
    const json = JSON.parse(fs.readFileSync(path.join(dataDir, "ember.json"), "utf8"));
    if (json.settings.gmKey === want) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

test("Server: ECHO-Rest wird kein Schlüssel, neue PIN ersetzt den alten", async () => {
  const dir = tmp();
  // Daves Stand: ember.json mit cmd-Rest als gmKey, sl.pin mit demselben Rest
  fs.writeFileSync(path.join(dir, "sl.pin"), JUNK + "\r\n");
  fs.writeFileSync(path.join(dir, "ember.json"), JSON.stringify({ version: 2, settings: { language: "de", gmKey: JUNK }, campaigns: [], profiles: [], characters: [], sessions: [], media: [], active: { campaignId: null, sessionId: null } }));
  await withServer(dir, async (port) => {
    assert.deepEqual((await get(port, "/api/sl-pin")).json, { pin: "" });
    assert.ok(await gmKeyEventually(dir, undefined), "cmd-Rest raus aus ember.json");
  });
  slpin.write(dir, "4711");
  await withServer(dir, async (port) => {
    assert.deepEqual((await get(port, "/api/sl-pin")).json, { pin: "4711" });
    assert.ok(await gmKeyEventually(dir, "4711"), "PIN ist der SL-Schlüssel");
  });
  fs.rmSync(dir, { recursive: true, force: true });
});
