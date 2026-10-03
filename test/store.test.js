const test = require("node:test");
const assert = require("node:assert/strict");
const store = require("../lib/store");

test("defaultFow hat alle Felder und ist aus", () => {
  const fow = store.defaultFow();
  assert.deepEqual(Object.keys(fow).sort(), ["explored", "gmSeesAll", "on", "persist", "radius"]);
  assert.equal(fow.on, false);
  assert.equal(fow.persist, false);
});

test("patchById überschreibt nur gegebene Felder und behält die id", () => {
  const list = [{ id: "a", name: "Alt", notes: "bleibt" }];
  const patched = store.patchById(list, "a", { name: "Neu", extra: 1 });
  assert.equal(patched.name, "Neu");
  assert.equal(patched.notes, "bleibt");
  assert.equal(patched.id, "a");
  assert.equal(list.length, 1);
  assert.equal(store.patchById(list, "b", { name: "X" }), null);
});

test("makeEncounter startet bereit mit leeren Fallen und Zonen", () => {
  const enc = store.makeEncounter("Test", { image: "", tokens: [] });
  assert.equal(enc.status, "ready");
  assert.deepEqual(enc.traps, []);
  assert.deepEqual(enc.zones, []);
  assert.deepEqual(enc.alerts, []);
});

test("makeCharacter setzt Standardwerte und eine vierstellige PIN", () => {
  const c = store.makeCharacter({ name: "Sable", campaignId: "camp1" });
  assert.equal(c.name, "Sable");
  assert.equal(c.campaignId, "camp1");
  assert.equal(c.hope, 2);
  assert.equal(c.hopeMax, 6);
  assert.match(c.playerPin, /^\d{4}$/);
});
