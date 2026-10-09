const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Eigener Datenordner, damit der Test nie die echte data/ember.json anfasst.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ember-data-"));
process.env.EMBER_DATA = dir;
const store = require("../lib/store");

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test("EMBER_DATA lenkt den Speicher um", () => {
  assert.equal(store.ROOT, dir);
  store.write(store.read());
  assert.ok(fs.existsSync(path.join(dir, "ember.json")));
});

test("backup sichert nur lesbare Dateien", () => {
  const bak = `${store.FILE}.bak`;
  store.write(store.read());
  assert.equal(store.backup(), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(bak, "utf8")), JSON.parse(fs.readFileSync(store.FILE, "utf8")));
  fs.writeFileSync(store.FILE, "{ kaputt");
  assert.equal(store.backup(), false);
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(bak, "utf8")));
});
