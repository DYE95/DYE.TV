// /ember → „Die Glut zünden“: vom Tisch-Hub muss man immer weiterkommen.
// Testlauf 2026-10-10: Tisch 1046 px hoch, Kampagne und „Rein“ abgeschnitten
// (overflow:hidden), „Rein“ ohne Spieler für immer aus.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { hubEnter } = require("../public/js/hub-enter.js");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("frische Installation: Knopf führt zur Kampagne statt aus zu sein", () => {
  const how = hubEnter({ hasCampaign: false, seated: 0, ready: 0 });
  assert.equal(how.disabled, false);
  assert.equal(how.action, "campaign");
  assert.match(how.hint, /Quickstart/);
});

test("Kampagne, aber niemand am Tisch: SL kommt trotzdem rein", () => {
  const how = hubEnter({ hasCampaign: true, seated: 0, ready: 0 });
  assert.deepEqual([how.disabled, how.action, how.auto], [false, "enter", false]);
});

test("teilweise bereit: rein ohne zu warten, mit Zählung; alle bereit: automatisch", () => {
  const some = hubEnter({ hasCampaign: true, seated: 3, ready: 1 });
  assert.equal(some.disabled, false);
  assert.match(some.label, /1 von 3/);
  const all = hubEnter({ hasCampaign: true, seated: 2, ready: 2 });
  assert.equal(all.auto, true);
  assert.equal(hubEnter({ hasCampaign: true, seated: 2, ready: 9 }).auto, true, "ready wird gedeckelt");
});

test("Hub-Layout: nichts wird abgeschnitten, Tisch folgt der Höhe", () => {
  const css = read("public/css/start.css");
  const hub = css.match(/^\.hub \{([^}]*)\}/m)[1];
  assert.doesNotMatch(hub, /overflow:\s*hidden/, "Knöpfe unter dem Tisch waren unerreichbar");
  assert.match(css, /\.table-layout \{[^}]*display:grid/);
  assert.match(css, /\.fire-figure #tableIndicator \{[^}]*100dvh/);
});

test("index.html: „Rein“ startet nicht disabled, hub-enter.js vor gm.js", () => {
  const html = read("public/index.html");
  const btn = html.match(/<button[^>]*id="btnEnter"[^>]*>/)[0];
  assert.doesNotMatch(btn, /disabled/);
  assert.ok(html.indexOf("/js/hub-enter.js") > 0 && html.indexOf("/js/hub-enter.js") < html.indexOf("/js/gm.js"));
  assert.match(html, /dataset\.action === "campaign"/);
  assert.match(read("public/js/gm.js"), /window\.hubEnter\(/);
});
