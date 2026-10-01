const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveActionRoll } = require("../lib/dice");

test("Duality mit Hope über Fear", () => {
  const roll = resolveActionRoll({ hopeDie: 8, fearDie: 3, traitMod: 1, difficulty: 12 });
  assert.equal(roll.total, 12);
  assert.equal(roll.outcome.success, true);
  assert.equal(roll.outcome.withHope, true);
  assert.equal(roll.hopeDelta, 1);
  assert.equal(roll.fearDelta, 0);
});

test("Fear gibt Fear und keinen Hope", () => {
  const roll = resolveActionRoll({ hopeDie: 2, fearDie: 9, traitMod: 0, difficulty: 10 });
  assert.equal(roll.outcome.withHope, false);
  assert.equal(roll.outcome.success, true);
  assert.equal(roll.fearDelta, 1);
  assert.equal(roll.hopeDelta, 0);
});

test("gleiche Würfel sind Critical, auch unter der Difficulty", () => {
  const roll = resolveActionRoll({ hopeDie: 4, fearDie: 4, difficulty: 20 });
  assert.equal(roll.outcome.critical, true);
  assert.equal(roll.outcome.success, true);
  assert.equal(roll.hopeDelta, 1);
});

test("Experience kostet Hope", () => {
  const roll = resolveActionRoll({
    hopeDie: 9,
    fearDie: 2,
    experiences: [{ bonus: 2 }],
    difficulty: 10,
  });
  assert.equal(roll.total, 13);
  assert.equal(roll.hopeDelta, 0);
});
