// Server-Tests: echter node server.js mit eigenem Datenordner und Port.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ember-srv-"));
const port = 31000 + Math.floor(Math.random() * 2000);
let child;

function request(method, url, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, method, path: url, headers }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let json = null;
        try { json = JSON.parse(text); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, text, json });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

const postJson = (url, data, headers = {}) =>
  request("POST", url, { headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(data) });

test.before(async () => {
  child = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    env: { ...process.env, EMBER_DATA: dir, EMBER_PORT: String(port), EMBER_HOST: "127.0.0.1" },
    stdio: "ignore",
  });
  for (let i = 0; i < 100; i += 1) {
    try {
      await request("GET", "/api/state");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error("Server startet nicht.");
});

test.after(() => {
  if (child) child.kill();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("Zustand kommt als JSON, mit Schutz-Headern", async () => {
  const res = await request("GET", "/api/state");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.json.characters));
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.ok(fs.existsSync(path.join(dir, "ember.json")));
});

test("Spielerseite wird ausgeliefert", async () => {
  const res = await request("GET", "/player");
  assert.equal(res.status, 200);
  assert.match(res.headers["content-type"], /text\/html/);
});

test("Profil anlegen, doppelter Name gibt 409", async () => {
  const first = await postJson("/api/profiles", { name: "Testi", pin: "1234" }, { "Sec-Fetch-Site": "same-origin" });
  assert.equal(first.status, 200);
  const again = await postJson("/api/profiles", { name: "testi", pin: "9999" });
  assert.equal(again.status, 409);
});

test("fremde Seite darf nicht posten", async () => {
  const res = await request("POST", "/api/restart", {
    headers: { "Content-Type": "text/plain", Origin: "https://boese.example", "Sec-Fetch-Site": "cross-site" },
    body: "{}",
  });
  assert.equal(res.status, 403);
});

test("kaputtes JSON gibt 400, zu grosses 413", async () => {
  const bad = await request("POST", "/api/profiles", { headers: { "Content-Type": "application/json" }, body: "{ nein" });
  assert.equal(bad.status, 400);
  const big = await request("POST", "/api/profiles", {
    headers: { "Content-Type": "application/json", "Content-Length": String(65 * 1024 * 1024) },
  }).catch(() => ({ status: 413 }));
  assert.equal(big.status, 413);
});

test("Tunnel-Besucher bekommt die SL-PIN nicht", async () => {
  const local = await request("GET", "/api/sl-pin");
  assert.equal(local.status, 200);
  const tunnel = await request("GET", "/api/sl-pin", { headers: { "cf-connecting-ip": "203.0.113.9" } });
  assert.equal(tunnel.status, 403);
});

test("Range: Teil gibt 206, Unsinn gibt 416", async () => {
  const part = await request("GET", "/css/ember.css", { headers: { Range: "bytes=0-9" } });
  assert.equal(part.status, 206);
  assert.equal(part.text.length, 10);
  const bad = await request("GET", "/css/ember.css", { headers: { Range: "bytes=999999999-" } });
  assert.equal(bad.status, 416);
  assert.equal(bad.headers["content-length"], String(Buffer.byteLength(bad.text)));
});

test("Pfade aus dem public-Ordner heraus sind gesperrt", async () => {
  const res = await request("GET", "/docs/regeln/..%2f..%2fserver.js");
  assert.notEqual(res.status, 200);
});

test("Solo-Spiel: neuer Lauf, Aktion, Stand bleibt in solo.json", async () => {
  const start = await request("GET", "/api/solo/game");
  assert.equal(start.status, 200);
  assert.ok(start.json.heroes.length >= 5);
  const fresh = await postJson("/api/solo/game/new", { hero: "cat:2" });
  assert.equal(fresh.status, 200);
  assert.equal(fresh.json.save.run.hero.name, "Garrick Reed");
  const go = fresh.json.actions.find((a) => a.id === "go");
  const moved = await postJson("/api/solo/game/act", { action: go });
  assert.equal(moved.status, 200);
  assert.equal(moved.json.save.run.at, go.to);
  const bad = await postJson("/api/solo/game/act", { action: { id: "attack" } });
  assert.equal(bad.status, 400);
  const saved = JSON.parse(fs.readFileSync(path.join(dir, "solo.json"), "utf8"));
  assert.equal(saved.run.at, go.to);
  const early = await postJson("/api/solo/game/run", {});
  assert.equal(early.status, 409);
});
