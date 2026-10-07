const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const solo = require("../lib/solo");
const store = require("../lib/store");

test("halb zufälliger Crawl hat vier benannte Räume und einen Foe", () => {
  const rooms = solo.generate(4);
  assert.equal(rooms.length, 4);
  assert.deepEqual(rooms.map((r) => r.name), ["Schwelle 1", "Krypta 2", "Brunnen 3", "Galerie 4"]);
  assert.equal(rooms.filter((r) => r.bot).length, 2);
  assert.equal(rooms.filter((r) => !r.bot).length, 2);
  rooms.forEach((room, i) => {
    assert.equal(room.clear, false);
    assert.ok(room.x >= 12 && room.y >= 18);
    assert.equal(room.id, "room_" + i);
  });
});

test("Asche unter der Schwelle legt sich einmal und klaut keine offene Session", () => {
  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "seeds", "asche-schwelle.json"), "utf8"));
  const state = {
    campaigns: [{ id: "cmp_live", name: "Weg zum Olymp" }],
    characters: [],
    sessions: [{ id: "live", campaignId: "cmp_live", endedAt: null }],
    active: { campaignId: "cmp_live", sessionId: "live" },
  };
  assert.equal(store.importProbe(state, seed, "Asche unter der Schwelle"), true);
  assert.equal(store.importProbe(state, seed, "Asche unter der Schwelle"), false);
  assert.equal(state.active.sessionId, "live");
  assert.equal(state.campaigns.some((c) => c.name === "Asche unter der Schwelle"), true);
  assert.equal(state.characters[0].name, "Ira");
});
