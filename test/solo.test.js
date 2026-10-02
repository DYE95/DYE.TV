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
