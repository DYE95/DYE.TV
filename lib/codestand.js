// lib/codestand.js — merkt, ob seit dem Start neuer Code auf der Platte liegt.
// Typisch: git pull (z. B. GitHub Desktop), waehrend der Server weiterlaeuft.
// Dann hat der Prozess noch den alten server.js/lib-Code im Speicher, und neue
// Routen fehlen, obwohl neue Seiten schon ausgeliefert werden.
//
// Fingerabdruck = git-HEAD (direkt aus .git gelesen, ohne git zu starten)
// plus SHA-1 ueber Inhalt von server.js und lib/*.js. Nur eine Aenderung am
// Code verlangt einen Neustart; ein neuer HEAD allein (z. B. nur Doku oder
// public/) nicht.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function readHead(root) {
  try {
    let gitDir = path.join(root, ".git");
    const st = fs.statSync(gitDir);
    if (st.isFile()) {
      // Worktree: ".git" ist eine Datei mit "gitdir: <pfad>"
      const m = fs.readFileSync(gitDir, "utf8").match(/^gitdir:\s*(.+)\s*$/m);
      if (!m) return null;
      gitDir = path.resolve(root, m[1].trim());
    }
    const head = fs.readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();
    const ref = head.match(/^ref:\s*(.+)$/);
    if (!ref) return /^[0-9a-f]{40}$/.test(head) ? head : null;
    let common = gitDir;
    try { common = path.resolve(gitDir, fs.readFileSync(path.join(gitDir, "commondir"), "utf8").trim()); } catch {}
    for (const dir of [gitDir, common]) {
      try { return fs.readFileSync(path.join(dir, ref[1]), "utf8").trim(); } catch {}
    }
    const packed = fs.readFileSync(path.join(common, "packed-refs"), "utf8");
    const line = packed.split("\n").find((l) => l.endsWith(` ${ref[1]}`));
    return line ? line.split(" ")[0] : null;
  } catch {
    return null;
  }
}

function codeFiles(root) {
  const files = ["server.js"];
  try {
    for (const f of fs.readdirSync(path.join(root, "lib")).sort()) if (f.endsWith(".js")) files.push(`lib/${f}`);
  } catch {}
  return files;
}

function fingerprint(root) {
  const files = {};
  const all = crypto.createHash("sha1");
  for (const rel of codeFiles(root)) {
    try {
      const h = crypto.createHash("sha1").update(fs.readFileSync(path.join(root, rel))).digest("hex");
      files[rel] = h;
      all.update(`${rel}\0${h}\n`);
    } catch {}
  }
  return { head: readHead(root), code: all.digest("hex"), files };
}

function compare(start, now) {
  const changed = [];
  for (const rel of new Set([...Object.keys(start.files), ...Object.keys(now.files)])) {
    if (start.files[rel] !== now.files[rel]) changed.push(rel);
  }
  return {
    restartNeeded: start.code !== now.code,
    headChanged: Boolean(start.head && now.head && start.head !== now.head),
    startedHead: start.head ? start.head.slice(0, 7) : "",
    currentHead: now.head ? now.head.slice(0, 7) : "",
    changed: changed.slice(0, 20),
  };
}

// Haelt den Start-Fingerabdruck und rechnet hoechstens alle ttl ms neu.
function createWatcher({ root, ttl = 10000, clock = Date.now } = {}) {
  const start = fingerprint(root);
  let cache = null;
  let cachedAt = 0;
  let since = null;
  return {
    start,
    check() {
      const now = clock();
      if (!cache || now - cachedAt >= ttl) {
        cache = compare(start, fingerprint(root));
        cachedAt = now;
        if (cache.restartNeeded && !since) since = new Date(now).toISOString();
        if (!cache.restartNeeded) since = null;
      }
      return { ...cache, since };
    },
  };
}

module.exports = { readHead, fingerprint, compare, createWatcher, codeFiles };
