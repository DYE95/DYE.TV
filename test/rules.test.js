const test = require("node:test");
const assert = require("node:assert/strict");
const { applyHit, ownedExperiences, levelRow } = require("../lib/rules");

test("Rüstung senkt Schaden um 1 und markiert einen Slot", () => {
  const pc = { armorScore: 3, armorMarked: 0, hpMarked: 0, hpMax: 6, major: 3, severe: 5 };
  const hit = applyHit(pc, 4);
  assert.equal(hit.soaked, 1);
  assert.equal(hit.dmg, 3);
  assert.equal(pc.armorMarked, 1);
  assert.equal(pc.hpMarked, 3);
  assert.equal(hit.mark, "major");
});

test("ohne freien Slot geht der ganze Schaden durch", () => {
  const pc = { armorScore: 1, armorMarked: 1, hpMarked: 0, hpMax: 6, major: 7, severe: 14 };
  const hit = applyHit(pc, 2);
  assert.equal(hit.soaked, 0);
  assert.equal(pc.hpMarked, 2);
});

test("Experiences müssen am Bogen stehen", () => {
  const pc = { experiences: [{ name: "Schmied", bonus: 2 }] };
  assert.equal(ownedExperiences(pc, [{ name: "Schmied" }, { name: "Dieb" }]).length, 1);
});

test("Level-Zeile hebt Proficiency und Kartenplätze", () => {
  assert.equal(levelRow(1).proficiency, 1);
  assert.equal(levelRow(5).domainSlots, 3);
  assert.equal(levelRow(8).proficiency, 3);
});
