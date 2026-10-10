// /solo: Menü mit grossen Zielen (Vollbild, Startseite, Held wechseln,
// Spiel zurücksetzen, Schriftgrösse) und sichtbarer Gegenzug.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const soloGame = require("../lib/solo-game");

const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "public", "solo.html"), "utf8");
const js = fs.readFileSync(path.join(ROOT, "public", "solo", "solo-game.js"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "public", "solo", "solo-game.css"), "utf8");

test("jede Id aus solo-game.js steht in solo.html", () => {
  const ids = new Set([...js.matchAll(/\$\("#([\w-]+)"\)/g)].map((m) => m[1]));
  const missing = [...ids].filter((id) => !html.includes(`id="${id}"`));
  assert.deepEqual(missing, []);
});

test("Menü: alle Einträge da, auch vom Startbildschirm aus erreichbar", () => {
  for (const id of ["btnMenuClose", "btnMenuFull", "btnMenuHome", "btnMenuHero", "btnMenuReset", "btnFontDown", "btnFontUp", "btnStartMenu"]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.match(html, /id="btnMenu"[^>]*>[^<]*<span[^>]*>☰<\/span> Menü/, "Knopf trägt das Wort Menü");
  assert.match(html, /id="btnMenuHome" href="\/"/);
  assert.match(css, /\.sg-overlay\.sg-menu \{ z-index: 20; \}/, "Menü liegt über Start- und Endbildschirm");
  assert.match(css, /\.sg-btn\.big \{ min-height: 4\.2rem/);
  assert.match(js, /"\/api\/solo\/game\/reset"/);
  assert.match(js, /ev\.key\.toLowerCase\(\) === "m"/);
});

test("Schriftgrösse teilt sich den Speicher der Startseite", () => {
  assert.match(js, /const DESK = "ember\.home\.desk\.v3"/);
  assert.match(js, /--sg-scale/);
  assert.match(css, /html \{ font-size: calc\(clamp\(14px, 1vw, 48px\) \* var\(--sg-scale, 1\)\); \}/);
  const home = fs.readFileSync(path.join(ROOT, "public", "js", "home-desk.js"), "utf8");
  assert.match(home, /const STORE = "ember\.home\.desk\.v3"/);
  assert.match(home, /fontSize: 18/, "Basis 18 px wie in solo-game.js");
});

test("Gegenzug wird gespielt: Animation, Zeile unter den Würfeln", () => {
  assert.match(html, /id="foeTurn"/);
  assert.match(js, /run\(\)\.foeTurn/);
  assert.match(js, /classList\.add\("strike"\)/);
  assert.match(css, /\.sg-foe\.strike \{ animation: foeStrike/);
  assert.match(css, /\.sg-hero\.hit \{ animation: heroHit/);
});

test("Spiel zurücksetzen löscht Held und Lauf", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ember-solo-"));
  const ctx = { dir, characters: [] };
  const made = soloGame.route("POST", "/api/solo/game/new", { hero: "cat:2" }, ctx);
  assert.equal(made.status, 200);
  assert.ok(made.body.save.run);
  const reset = soloGame.route("POST", "/api/solo/game/reset", {}, ctx);
  assert.equal(reset.status, 200);
  assert.equal(reset.body.save.run, null);
  assert.equal(reset.body.save.profile, null);
  fs.rmSync(dir, { recursive: true, force: true });
});
