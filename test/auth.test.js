const test = require("node:test");
const assert = require("node:assert/strict");
const { isGm, isLocalAddress, recordGmKey } = require("../lib/auth");

function stateWith(key) {
  return key ? { settings: { gmKey: key } } : { settings: {} };
}

test("isGm braucht as=gm", () => {
  assert.equal(isGm(stateWith(null), {}), false);
  assert.equal(isGm(stateWith(null), { as: "player" }), false);
  assert.equal(isGm(null, { as: "gm" }), false);
});

test("ohne bekannten Schluessel ist der SL offen", () => {
  assert.equal(isGm(stateWith(null), { as: "gm" }), true);
});

test("falscher Schluessel wird abgelehnt", () => {
  assert.equal(isGm(stateWith("gm_abc"), { as: "gm", gmKey: "gm_xyz" }), false);
  assert.equal(isGm(stateWith("gm_abc"), { as: "gm" }), false);
  assert.equal(isGm(stateWith("gm_abc"), { as: "gm", gmKey: "" }), false);
});

test("richtiger Schluessel oeffnet", () => {
  assert.equal(isGm(stateWith("gm_abc"), { as: "gm", gmKey: "gm_abc" }), true);
});

test("recordGmKey setzt nur beim GM-Ping vom SL-Rechner", () => {
  const state = { settings: {} };
  assert.equal(recordGmKey(state, { role: "player", gmKey: "gm_1" }, "127.0.0.1"), false);
  assert.equal(recordGmKey(state, { role: "gm", gmKey: "" }, "127.0.0.1"), false);
  assert.equal(recordGmKey(state, { role: "gm", gmKey: "gm_1" }, "192.168.0.10"), false);
  assert.equal(state.settings.gmKey, undefined);
  assert.equal(recordGmKey(state, { role: "gm", gmKey: "gm_1" }, "127.0.0.1"), true);
  assert.equal(state.settings.gmKey, "gm_1");
});

test("recordGmKey ueberschreibt den Schluessel nicht", () => {
  const state = { settings: { gmKey: "gm_alt" } };
  assert.equal(recordGmKey(state, { role: "gm", gmKey: "gm_neu" }, "127.0.0.1"), false);
  assert.equal(state.settings.gmKey, "gm_alt");
});

test("Localhost-Adressen werden erkannt", () => {
  for (const a of ["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"]) assert.equal(isLocalAddress(a), true);
  assert.equal(isLocalAddress("192.168.0.5"), false);
  assert.equal(isLocalAddress(""), false);
});
