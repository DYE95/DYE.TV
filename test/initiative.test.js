const test = require("node:test");
const assert = require("node:assert/strict");
const initiative = require("../lib/initiative");

function table() {
  return {
    activeEncounterId: "enc1",
    encounters: [{ id: "enc1", status: "live" }],
    map: {
      tokens: [
        { id: "t1", kind: "pc", label: "Sable", characterId: "c1" },
        { id: "t2", kind: "pc", label: "Ivo", characterId: "c2" },
        { id: "t3", kind: "foe", label: "Ash Hound" },
      ],
    },
  };
}

test("seed setzt Charaktere, Foe und SL", () => {
  const session = table();
  initiative.seed(session);
  assert.deepEqual(session.initiative.order.map((r) => r.label), ["Sable", "Ivo", "Ash Hound", "SL"]);
  assert.equal(session.initiative.round, 1);
  assert.equal(session.initiative.on, true);
  assert.equal(initiative.current(session).label, "Sable");
});

test("entfernen vor dem Zeiger lässt die dran seiende Person", () => {
  const session = table();
  initiative.seed(session);
  initiative.apply(session, { action: "next" });
  const sable = session.initiative.order[0].id;
  initiative.apply(session, { action: "remove", id: sable });
  assert.equal(initiative.current(session).label, "Ivo");
  assert.equal(session.initiative.index, 0);
});

test("Gegenseite springt vom Charakter zur Gegenseite und zählt erst am Ende hoch", () => {
  const session = table();
  initiative.seed(session);
  initiative.apply(session, { action: "side" });
  assert.equal(initiative.current(session).label, "Ash Hound");
  assert.equal(session.initiative.round, 1);
  initiative.apply(session, { action: "side" });
  assert.equal(initiative.current(session).label, "Sable");
  assert.equal(session.initiative.round, 2);
});

test("ein Wurf schiebt nur im live Event und nur einmal", () => {
  const session = table();
  initiative.seed(session);
  session.encounters[0].status = "ready";
  assert.equal(initiative.completeIfActor(session, "c1"), false);
  session.encounters[0].status = "live";
  assert.equal(initiative.completeIfActor(session, "c2"), false);
  assert.equal(initiative.completeIfActor(session, "c1"), true);
  assert.equal(initiative.current(session).label, "Ivo");
  assert.equal(initiative.completeIfActor(session, "c1"), false);
});

test("next über das Ende hebt die Runde", () => {
  const session = table();
  initiative.seed(session);
  for (let i = 0; i < 4; i += 1) initiative.apply(session, { action: "next" });
  assert.equal(session.initiative.round, 2);
  assert.equal(initiative.current(session).label, "Sable");
  assert.match(initiative.spoken(session), /Runde 2 — Sable/);
});
