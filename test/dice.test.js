const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveActionRoll, applyPools } = require("../lib/dice");

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

test("acht Regressionswürfe aus der Spec", () => {
  const failureHope = resolveActionRoll({ hopeDie: 8, fearDie: 3, difficulty: 12 });
  assert.equal(failureHope.total, 11);
  assert.equal(failureHope.outcome.label, "Failure with Hope");
  assert.equal(failureHope.hopeDelta, 1);

  const critical = resolveActionRoll({ hopeDie: 6, fearDie: 6, difficulty: 20 });
  assert.equal(critical.outcome.label, "Critical Success");
  assert.equal(critical.outcome.success, true);
  assert.equal(critical.hopeDelta, 1);
  assert.equal(critical.fearDelta, 0);

  const successFear = resolveActionRoll({ hopeDie: 10, fearDie: 12, traitMod: 2, difficulty: 15 });
  assert.equal(successFear.total, 24);
  assert.equal(successFear.outcome.label, "Success with Fear");
  assert.equal(successFear.fearDelta, 1);

  const advantage = resolveActionRoll({ hopeDie: 4, fearDie: 9, mode: "advantage", advantageDie: 6, difficulty: 18 });
  assert.equal(advantage.total, 19);
  assert.equal(advantage.outcome.label, "Success with Fear");

  const paid = resolveActionRoll({ hopeDie: 7, fearDie: 2, experiences: [{ bonus: 2 }], difficulty: 10 });
  assert.equal(paid.total, 11);
  assert.equal(paid.outcome.label, "Success with Hope");
  assert.equal(paid.hopeDelta, 0);

  const costly = resolveActionRoll({
    hopeDie: 3,
    fearDie: 8,
    experiences: [{ bonus: 1 }, { bonus: 1 }],
    difficulty: 14,
  });
  assert.equal(costly.total, 13);
  assert.equal(costly.outcome.label, "Failure with Fear");
  assert.equal(costly.hopeDelta, -2);
  assert.equal(costly.fearDelta, 1);

  const disadvantage = resolveActionRoll({ hopeDie: 9, fearDie: 4, mode: "disadvantage", advantageDie: 5, difficulty: 14 });
  assert.equal(disadvantage.total, 8);
  assert.equal(disadvantage.outcome.label, "Failure with Hope");

  const open = resolveActionRoll({ hopeDie: 2, fearDie: 2, difficulty: 0 });
  assert.equal(open.outcome.label, "Critical Success");
  assert.equal(open.hopeDelta, 1);
});

test("Deckel: Hope läuft nicht in Fear, Fear-Überlauf tickt die Uhr, Fehlbetrag bleibt unpaid", () => {
  const fullHope = applyPools({ hope: 6, hopeMax: 6, fear: 3, fearMax: 12 }, { hopeDelta: 1, fearDelta: 0 });
  assert.equal(fullHope.hope, 6);
  assert.equal(fullHope.fear, 3);
  assert.equal(fullHope.clockTick, 0);
  assert.equal(fullHope.unpaid, 0);

  const overflow = applyPools({ hope: 2, hopeMax: 6, fear: 12, fearMax: 12 }, { hopeDelta: 0, fearDelta: 1 });
  assert.equal(overflow.fear, 12);
  assert.equal(overflow.clockTick, 1);

  const short = applyPools({ hope: 0, hopeMax: 6, fear: 4, fearMax: 12 }, { hopeDelta: -2, fearDelta: 1 });
  assert.equal(short.hope, 0);
  assert.equal(short.unpaid, 2);
  assert.equal(short.fear, 5);
  assert.equal(short.clockTick, 0);
});
