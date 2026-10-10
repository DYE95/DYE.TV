// Spieler am Handy über den Tunnel: Live-Stream verbindet sich selbst neu,
// Würfeln und Eintreten überstehen ein wackliges Netz, Layout passt hochkant.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), "utf8");

// map.js in einer kleinen Schein-Umgebung laden: EventSource, document, window.
function feedSandbox() {
  const sources = [];
  const timers = [];
  const listeners = { window: {}, document: {} };
  const on = (bag) => (type, fn) => { (bag[type] = bag[type] || []).push(fn); };
  const fire = (bag, type, ev = {}) => (bag[type] || []).forEach((fn) => fn(ev));
  class FakeSource {
    constructor(url) { this.url = url; this.readyState = 0; this.handlers = {}; this.closed = false; sources.push(this); }
    addEventListener(type, fn) { (this.handlers[type] = this.handlers[type] || []).push(fn); }
    emit(type, ev = {}) { (this.handlers[type] || []).forEach((fn) => fn(ev)); }
    close() { this.closed = true; this.readyState = 2; }
  }
  FakeSource.CONNECTING = 0; FakeSource.OPEN = 1; FakeSource.CLOSED = 2;
  const pulls = [];
  const document = {
    hidden: false,
    addEventListener: on(listeners.document),
    createElement: () => ({ setAttribute() {}, style: {}, hidden: false }),
    body: { appendChild() {} },
  };
  const ctx = {
    console, JSON, Math, Date, Promise,
    EventSource: FakeSource,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    document,
    fetch: (url) => { pulls.push(url); return Promise.resolve({ json: () => Promise.resolve({ characters: [] }) }); },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: () => {},
    setInterval: () => 0,
  };
  ctx.window = { addEventListener: on(listeners.window), dispatchEvent() {} };
  vm.createContext(ctx);
  vm.runInContext(read("public", "js", "map.js"), ctx);
  return { ctx, sources, timers, pulls, document, fireWin: (t, ev) => fire(listeners.window, t, ev), fireDoc: (t, ev) => fire(listeners.document, t, ev) };
}

test("Stream: nach endgültigem Abbruch (z. B. 502 vom Tunnel) verbindet Ember selbst neu", () => {
  const box = feedSandbox();
  box.ctx.startStateFeed(() => {});
  assert.equal(box.sources.length, 1);
  const first = box.sources[0];
  first.readyState = 2; // Browser gibt auf
  first.emit("error");
  const retry = box.timers.find((t) => t.ms === 2000); // erste Pause 2 s (Hinweis-Timer hat 4 s)
  assert.ok(retry, "Neuverbindung ist geplant");
  retry.fn();
  assert.equal(box.sources.length, 2, "neuer EventSource");
  assert.equal(first.closed, true);
});

test("Stream: Handy entsperrt oder Seite aus dem Zurück-Cache holt frischen Stand und neue Leitung", () => {
  const box = feedSandbox();
  box.ctx.startStateFeed(() => {});
  box.sources[0].readyState = 1;
  const pullsBefore = box.pulls.length;
  box.document.hidden = true;
  box.fireDoc("visibilitychange");
  box.document.hidden = false;
  box.fireDoc("visibilitychange");
  assert.ok(box.pulls.length > pullsBefore, "Stand wird neu geholt");
  box.fireWin("pagehide");
  assert.equal(box.sources.at(-1).closed, true);
  const count = box.sources.length;
  box.fireWin("pageshow", { persisted: true });
  assert.equal(box.sources.length, count + 1, "nach bfcache neu verbunden");
});

test("Spieler: Würfeln und Eintreten fangen Netzfehler ab, kein Doppelwurf", () => {
  const js = read("public", "js", "player.js");
  const roll = js.slice(js.indexOf("async function playerRoll"), js.indexOf("$(\"#btnHarm\")"));
  assert.match(roll, /catch \(err\)/);
  assert.match(roll, /Keine Verbindung/);
  assert.match(roll, /if \(rolling\) return/);
  const profile = js.slice(js.indexOf("async function saveProfile"), js.indexOf("$(\"#btnProfileEnter\")"));
  assert.match(profile, /catch \(err\)/);
  assert.match(profile, /if \(profileBusy\) return/);
});

test("Spieler hochkant: Seite scrollt statt Karte über den Knöpfen, 16px-Felder", () => {
  const html = read("public", "player.html");
  const narrow = html.slice(html.indexOf("@media (max-width: 959px)"), html.indexOf("@media (min-width: 960px)"));
  assert.match(narrow, /overflow: visible/);
  assert.match(narrow, /font-size: 16px/);
  assert.match(html, /\/js\/map\.js\?v=13/);
});
