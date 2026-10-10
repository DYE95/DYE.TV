// Neuer Code auf der Platte: Fingerabdruck, Vergleich, Cache.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const cs = require("../lib/codestand");

const SHA1 = "a".repeat(40);
const SHA2 = "b".repeat(40);

function fakeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ember-code-"));
  fs.mkdirSync(path.join(root, ".git", "refs", "heads"), { recursive: true });
  fs.mkdirSync(path.join(root, "lib"));
  fs.writeFileSync(path.join(root, ".git", "HEAD"), "ref: refs/heads/DYE.TV\n");
  fs.writeFileSync(path.join(root, ".git", "refs", "heads", "DYE.TV"), `${SHA1}\n`);
  fs.writeFileSync(path.join(root, "server.js"), "// server\n");
  fs.writeFileSync(path.join(root, "lib", "a.js"), "module.exports = 1;\n");
  fs.writeFileSync(path.join(root, "lib", "notiz.txt"), "kein Code\n");
  return root;
}

test("HEAD aus .git: Ref-Datei, packed-refs, losgelöst, Worktree, ohne git", () => {
  const root = fakeRepo();
  try {
    assert.equal(cs.readHead(root), SHA1);
    fs.rmSync(path.join(root, ".git", "refs", "heads", "DYE.TV"));
    fs.writeFileSync(path.join(root, ".git", "packed-refs"), `# pack-refs\n${SHA2} refs/heads/DYE.TV\n`);
    assert.equal(cs.readHead(root), SHA2);
    fs.writeFileSync(path.join(root, ".git", "HEAD"), `${SHA1}\n`);
    assert.equal(cs.readHead(root), SHA1);
    const wt = path.join(root, "wt");
    fs.mkdirSync(path.join(root, ".git", "worktrees", "wt"), { recursive: true });
    fs.writeFileSync(path.join(root, ".git", "worktrees", "wt", "HEAD"), "ref: refs/heads/DYE.TV\n");
    fs.writeFileSync(path.join(root, ".git", "worktrees", "wt", "commondir"), "../..\n");
    fs.mkdirSync(wt);
    fs.writeFileSync(path.join(wt, ".git"), `gitdir: ${path.join(root, ".git", "worktrees", "wt")}\n`);
    assert.equal(cs.readHead(wt), SHA2);
    assert.equal(cs.readHead(os.tmpdir() + "/gibt-es-nicht"), null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("nur Code zählt: lib/*.js und server.js, nicht HEAD allein oder andere Dateien", () => {
  const root = fakeRepo();
  try {
    const start = cs.fingerprint(root);
    assert.deepEqual(Object.keys(start.files), ["server.js", "lib/a.js"]);
    assert.equal(cs.compare(start, cs.fingerprint(root)).restartNeeded, false);

    fs.writeFileSync(path.join(root, ".git", "refs", "heads", "DYE.TV"), `${SHA2}\n`);
    fs.writeFileSync(path.join(root, "lib", "notiz.txt"), "anders\n");
    const headOnly = cs.compare(start, cs.fingerprint(root));
    assert.equal(headOnly.restartNeeded, false);
    assert.equal(headOnly.headChanged, true);
    assert.equal(headOnly.startedHead, "aaaaaaa");
    assert.equal(headOnly.currentHead, "bbbbbbb");

    fs.writeFileSync(path.join(root, "lib", "a.js"), "module.exports = 2;\n");
    fs.writeFileSync(path.join(root, "lib", "neu.js"), "// neu\n");
    const changed = cs.compare(start, cs.fingerprint(root));
    assert.equal(changed.restartNeeded, true);
    assert.deepEqual(changed.changed.sort(), ["lib/a.js", "lib/neu.js"]);

    // gleicher Inhalt, nur neu gespeichert: kein Neustart
    const root2 = fakeRepo();
    const s2 = cs.fingerprint(root2);
    const later = new Date(Date.now() + 60000);
    fs.utimesSync(path.join(root2, "server.js"), later, later);
    assert.equal(cs.compare(s2, cs.fingerprint(root2)).restartNeeded, false);
    fs.rmSync(root2, { recursive: true, force: true });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Watcher rechnet höchstens alle ttl ms neu und merkt sich seit wann", () => {
  const root = fakeRepo();
  try {
    let now = 1000000;
    const w = cs.createWatcher({ root, ttl: 10000, clock: () => now });
    assert.equal(w.check().restartNeeded, false);
    fs.writeFileSync(path.join(root, "server.js"), "// neu\n");
    now += 5000;
    assert.equal(w.check().restartNeeded, false, "noch im Cache");
    now += 5000;
    const r = w.check();
    assert.equal(r.restartNeeded, true);
    assert.equal(r.since, new Date(now).toISOString());
    now += 20000;
    assert.equal(w.check().since, r.since);
    fs.writeFileSync(path.join(root, "server.js"), "// server\n");
    now += 10000;
    assert.deepEqual([w.check().restartNeeded, w.check().since], [false, null]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
