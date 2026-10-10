const test = require("node:test");
const assert = require("node:assert/strict");
const { parseRange } = require("../lib/range");

test("ohne Range gibt es die ganze Datei", () => {
  assert.equal(parseRange(undefined, 100), null);
  assert.equal(parseRange("", 100), null);
  assert.equal(parseRange("items=0-5", 100), null);
});

test("offener und geschlossener Bereich", () => {
  assert.deepEqual(parseRange("bytes=0-", 100), { start: 0, end: 99 });
  assert.deepEqual(parseRange("bytes=10-19", 100), { start: 10, end: 19 });
  assert.deepEqual(parseRange("bytes=90-500", 100), { start: 90, end: 99 });
});

test("Suffix liefert das Ende der Datei", () => {
  assert.deepEqual(parseRange("bytes=-10", 100), { start: 90, end: 99 });
  assert.deepEqual(parseRange("bytes=-500", 100), { start: 0, end: 99 });
});

test("Unsinn wird 416 statt Absturz", () => {
  for (const bad of ["bytes=0-abc", "bytes=abc-", "bytes=-", "bytes=0-1,5-9", "bytes=50-10", "bytes=100-", "bytes=-0"]) {
    assert.deepEqual(parseRange(bad, 100), { invalid: true }, bad);
  }
});

test("leere Datei kann keinen Bereich liefern", () => {
  assert.deepEqual(parseRange("bytes=0-", 0), { invalid: true });
});
