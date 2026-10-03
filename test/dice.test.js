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

test("Advantage addiert den W6", () => {
  const roll = resolveActionRoll({ hopeDie: 4, fearDie: 2, mode: "advantage", advantageDie: 3, difficulty: 0 });
  assert.equal(roll.total, 9);
  assert.equal(roll.hopeDelta, 1);
});

test("Disadvantage zieht den W6 ab", () => {
  const roll = resolveActionRoll({ hopeDie: 2, fearDie: 4, mode: "disadvantage", advantageDie: 3, difficulty: 0 });
  assert.equal(roll.total, 3);
  assert.equal(roll.fearDelta, 1);
});

test("negativer Trait-Mod zeigt sein Vorzeichen korrekt", () => {
  const roll = resolveActionRoll({ hopeDie: 5, fearDie: 2, traitMod: -2, difficulty: 0 });
  assert.equal(roll.total, 5);
  assert.ok(roll.spoken.includes(" -2 = "));
  assert.ok(!roll.spoken.includes("+-2"));
});

test("ohne Würfel wird zufällig im Bereich 1-12 gewürfelt", () => {
  const roll = resolveActionRoll({ difficulty: 0 });
  assert.ok(roll.hopeDie >= 1 && roll.hopeDie <= 12);
  assert.ok(roll.fearDie >= 1 && roll.fearDie <= 12);
});
