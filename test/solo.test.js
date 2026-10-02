const test = require("node:test");
const assert = require("node:assert/strict");
const solo = require("../lib/solo");

test("Bots sind wählbar", () => {
  const bots = solo.list();
  assert.ok(bots.length >= 3);
  assert.equal(solo.find("wisp").name, "Lantern Wisp");
});

test("Bot-Zug nennt Treffer oder Fehlschlag", () => {
  const line = solo.act(solo.find("hound"), 10);
  assert.match(line.text, /trifft|verfehlt/);
  assert.ok(line.total >= 2);
});

test("Dungeon hat drei bis sechs Räume", () => {
  const rooms = solo.generate(4);
  assert.equal(rooms.length, 4);
  assert.ok(rooms.some((r) => r.bot));
  assert.ok(rooms.some((r) => !r.bot));
});

test("Level-Up hebt das Level und hängt eine Experience an", () => {
  const pc = { name: "Sable", level: 1, hopeMax: 6, experiences: [] };
  const result = solo.levelUp(pc, { experience: "Waldläufer" });
  assert.equal(result.ok, true);
  assert.equal(pc.level, 2);
  assert.equal(pc.proficiency, 2);
  assert.equal(pc.experiences[0].name, "Waldläufer");
});

test("Level 10 ist das Ende", () => {
  const pc = { name: "Ivo", level: 10 };
  const result = solo.levelUp(pc, {});
  assert.equal(result.ok, false);
  assert.equal(pc.level, 10);
});

test("Subclass hängt am Bogen", () => {
  const pc = { name: "Sable", class: "Rogue" };
  solo.applySubclass(pc, "Nightwalker");
  assert.equal(pc.subclass, "Nightwalker");
  assert.ok(solo.subclassesFor("rogue").includes("Nightwalker"));
});
