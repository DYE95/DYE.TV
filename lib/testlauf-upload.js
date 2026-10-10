// lib/testlauf-upload.js — abgelegten Testlauf nach GitHub schieben und
// Legion per Webhook Bescheid geben.
//
// Der Arbeitsordner und der aktuelle Zweig des SL bleiben unberuehrt: Wir
// arbeiten in einem eigenen git-Worktree unter data/.testlauf-worktree auf dem
// Zweig "testlaeufe". git laeuft nur ueber execFile mit Argumentlisten (keine
// Shell), mit Zeitlimit und ohne Passwort-Abfrage im Terminal.
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { execFile } = require("child_process");

const BRANCH = "testlaeufe";
const REMOTE = "origin";
const DEFAULT_REPO = "DYE95/DYE.TV";
const FALLBACK_AUTHOR = { name: "DYE95", email: "182445851+DYE95@users.noreply.github.com" };
const RUN_NAME = /^\d{4}-\d\d-\d\d_\d\d-\d\d(?:_\d+)?$/;

// ---------- git ----------
class GitError extends Error {
  constructor(stage, message, detail) {
    super(message);
    this.stage = stage;
    this.detail = detail || "";
    this.hint = hintFor(detail || message);
  }
}

function hintFor(text) {
  const t = String(text || "");
  if (/could not read Username|Authentication failed|terminal prompts disabled|403|Permission denied|invalid username|credential/i.test(t)) {
    return "Keine gültigen GitHub-Zugangsdaten. Einmal in der Konsole im Ember-Ordner „git push“ ausführen und anmelden (Git Credential Manager), dann erneut versuchen.";
  }
  if (/Could not resolve host|unable to access|Failed to connect|timed out|Network is unreachable/i.test(t)) {
    return "GitHub nicht erreichbar. Internet prüfen und erneut versuchen.";
  }
  if (/non-fast-forward|rejected|fetch first/i.test(t)) {
    return "Auf GitHub ist der Zweig testlaeufe neuer. Erneut versuchen, Ember holt ihn dann zuerst.";
  }
  if (/not a git repository|ENOENT|spawn git/i.test(t)) {
    return "Kein git gefunden oder Ember liegt nicht in einem git-Ordner (z. B. ZIP-Download).";
  }
  if (/No such remote|does not appear to be a git repository/i.test(t)) {
    return "Kein Remote „origin“ eingerichtet.";
  }
  return "";
}

function runGit(args, { cwd, timeout = 30000, env, allowFail = false, stage = "git" } = {}) {
  return new Promise((resolve, reject) => {
    execFile("git", args, {
      cwd,
      timeout,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never", LC_ALL: "C", ...(env || {}) },
    }, (err, stdout, stderr) => {
      const out = String(stdout || "").trim();
      const errText = String(stderr || "").trim();
      if (!err) return resolve({ ok: true, out, err: errText });
      if (allowFail) return resolve({ ok: false, out, err: errText || err.message, code: err.code });
      const why = err.killed ? `Zeitlimit (${Math.round(timeout / 1000)} s) überschritten` : (errText || err.message);
      reject(new GitError(stage, `git ${args[0]} fehlgeschlagen: ${why.split("\n").slice(-3).join(" ")}`, errText || err.message));
    });
  });
}

async function authorFrom(repoRoot) {
  const name = await runGit(["config", "user.name"], { cwd: repoRoot, allowFail: true });
  const email = await runGit(["config", "user.email"], { cwd: repoRoot, allowFail: true });
  return {
    name: (name.ok && name.out) || FALLBACK_AUTHOR.name,
    email: (email.ok && email.out) || FALLBACK_AUTHOR.email,
  };
}

// "owner/repo" aus der Remote-Adresse, sonst DYE95/DYE.TV.
function repoSlug(url) {
  const m = String(url || "").match(/github\.com[:/]+([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i);
  return m ? `${m[1]}/${m[2]}` : DEFAULT_REPO;
}

// Holt origin/testlaeufe. Fehlt der Zweig dort, ist das kein Fehler.
async function fetchBranch(cwd) {
  const res = await runGit(["fetch", REMOTE, `+refs/heads/${BRANCH}:refs/remotes/${REMOTE}/${BRANCH}`], { cwd, timeout: 60000, allowFail: true });
  if (res.ok) return true;
  if (/couldn't find remote ref|could not find remote ref/i.test(res.err)) return false;
  throw new GitError("fetch", `git fetch fehlgeschlagen: ${res.err.split("\n").slice(-2).join(" ")}`, res.err);
}

const hasRef = async (cwd, ref) => (await runGit(["rev-parse", "--verify", "--quiet", ref], { cwd, allowFail: true })).ok;

async function prepareWorktree(repoRoot, wt) {
  const top = await runGit(["rev-parse", "--show-toplevel"], { cwd: repoRoot, stage: "repo" });
  const root = top.out;
  await runGit(["remote", "get-url", REMOTE], { cwd: root, stage: "remote" });
  await runGit(["worktree", "prune"], { cwd: root, allowFail: true });
  const remoteHas = await fetchBranch(root);
  const valid = fs.existsSync(path.join(wt, ".git"))
    && (await runGit(["rev-parse", "--is-inside-work-tree"], { cwd: wt, allowFail: true })).ok;
  if (!valid) {
    fs.rmSync(wt, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(wt), { recursive: true });
    if (await hasRef(root, `refs/heads/${BRANCH}`)) {
      await runGit(["worktree", "add", wt, BRANCH], { cwd: root, stage: "worktree" });
    } else if (remoteHas) {
      await runGit(["worktree", "add", "-b", BRANCH, wt, `${REMOTE}/${BRANCH}`], { cwd: root, stage: "worktree" });
    } else {
      // Erster Testlauf ueberhaupt: verwaister Zweig ohne den Ember-Code.
      await runGit(["worktree", "add", "--detach", wt], { cwd: root, stage: "worktree" });
      await runGit(["checkout", "--orphan", BRANCH], { cwd: wt, stage: "worktree" });
      await runGit(["rm", "-r", "-f", "-q", "--ignore-unmatch", "."], { cwd: wt, stage: "worktree" });
      for (const entry of fs.readdirSync(wt)) if (entry !== ".git") fs.rmSync(path.join(wt, entry), { recursive: true, force: true });
    }
  }
  const head = await runGit(["symbolic-ref", "--short", "HEAD"], { cwd: wt, allowFail: true });
  if (!head.ok || head.out !== BRANCH) {
    throw new GitError("worktree", `Der Worktree steht nicht auf ${BRANCH} (${head.out || "losgelöst"}). Ordner ${wt} löschen und erneut versuchen.`);
  }
  if (remoteHas && await hasRef(wt, "HEAD")) {
    await runGit(["merge", "--ff-only", "-q", `${REMOTE}/${BRANCH}`], { cwd: wt, stage: "merge" });
  } else if (remoteHas) {
    await runGit(["reset", "-q", "--hard", `${REMOTE}/${BRANCH}`], { cwd: wt, stage: "merge" });
  }
  return root;
}

let lock = Promise.resolve();

// Legt data/testlaeufe/<name>/ nach testlaeufe/<name>/ auf dem Zweig
// testlaeufe und schiebt ihn nach origin.
function publishRun(dataDir, name, { repoRoot = path.join(__dirname, ".."), summary } = {}) {
  const job = lock.then(async () => {
    if (!RUN_NAME.test(String(name))) throw new GitError("lauf", "Unbekannter Testlauf.");
    const src = path.join(dataDir, "testlaeufe", name);
    if (!fs.existsSync(path.join(src, "bericht.md"))) throw new GitError("lauf", `Testlauf ${name} fehlt.`);
    const wt = path.join(dataDir, ".testlauf-worktree");
    const root = await prepareWorktree(repoRoot, wt);
    const rel = `testlaeufe/${name}`;
    const dest = path.join(wt, "testlaeufe", name);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
    for (const file of ["bericht.md", "bericht.json"]) {
      if (fs.existsSync(path.join(src, file))) fs.copyFileSync(path.join(src, file), path.join(dest, file));
    }
    if (fs.existsSync(path.join(src, "bilder"))) fs.cpSync(path.join(src, "bilder"), path.join(dest, "bilder"), { recursive: true });
    await runGit(["add", "-A", "--", rel], { cwd: wt, stage: "add" });
    const staged = await runGit(["diff", "--cached", "--quiet"], { cwd: wt, allowFail: true });
    const author = await authorFrom(root);
    let committed = false;
    if (!staged.ok) {
      const s = summary || {};
      const subject = `Testlauf ${name}: ${s.done ?? "?"}/${s.total ?? "?"} erledigt, ${s.fehler ?? 0} Fehler`;
      await runGit([
        "-c", `user.name=${author.name}`, "-c", `user.email=${author.email}`,
        "commit", "-q", "-m", subject, "-m", `Signed-off-by: ${author.name} <${author.email}>`,
      ], { cwd: wt, stage: "commit" });
      committed = true;
    }
    await runGit(["push", REMOTE, `${BRANCH}:${BRANCH}`], { cwd: wt, timeout: 120000, stage: "push" });
    const sha = (await runGit(["rev-parse", "HEAD"], { cwd: wt, stage: "commit" })).out;
    const url = (await runGit(["remote", "get-url", REMOTE], { cwd: root, allowFail: true })).out;
    return { branch: BRANCH, folder: `${rel}/`, commit: sha, committed, repo: repoSlug(url), author };
  });
  lock = job.catch(() => {});
  return job;
}

// ---------- Webhook ----------
const configFile = (dataDir) => path.join(dataDir, "legion-webhook.json");

function readConfig(dataDir, env = process.env) {
  let file = {};
  try { file = JSON.parse(fs.readFileSync(configFile(dataDir), "utf8")) || {}; } catch {}
  const url = String(file.url || env.LEGION_WEBHOOK_URL || "").trim();
  const key = String(file.key || env.LEGION_WEBHOOK_KEY || "").trim();
  const header = String(file.header || env.LEGION_WEBHOOK_HEADER || "Authorization").trim() || "Authorization";
  return { url, key, header, source: file.url ? "datei" : env.LEGION_WEBHOOK_URL ? "umgebung" : "" };
}

// Fuer den Browser: der Schluessel verlaesst den Rechner nie, nur "gesetzt".
function publicConfig(cfg) {
  return { url: cfg.url, header: cfg.header, keySet: Boolean(cfg.key), source: cfg.source };
}

const HEADER_NAME = /^[A-Za-z0-9-]{1,64}$/;

function saveConfig(dataDir, input = {}) {
  let cur = {};
  try { cur = JSON.parse(fs.readFileSync(configFile(dataDir), "utf8")) || {}; } catch {}
  const next = { ...cur };
  if ("url" in input) {
    const url = String(input.url || "").trim();
    if (url && !/^https?:\/\/[^\s]+$/i.test(url)) throw Object.assign(new Error("Adresse muss mit http:// oder https:// beginnen."), { status: 400 });
    next.url = url;
  }
  if (input.clearKey) next.key = "";
  else if (typeof input.key === "string" && input.key.trim()) next.key = input.key.trim().slice(0, 500);
  if ("header" in input) {
    const header = String(input.header || "").trim() || "Authorization";
    if (!HEADER_NAME.test(header)) throw Object.assign(new Error("Header-Name: nur Buchstaben, Ziffern und Bindestrich."), { status: 400 });
    next.header = header;
  }
  fs.mkdirSync(dataDir, { recursive: true });
  const tmp = `${configFile(dataDir)}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, configFile(dataDir));
  return readConfig(dataDir);
}

function webhookHeaders(cfg) {
  const headers = {};
  if (!cfg.key) return headers;
  headers["X-Webhook-Key"] = cfg.key;
  if (/^authorization$/i.test(cfg.header)) headers.Authorization = `Bearer ${cfg.key}`;
  else headers[cfg.header] = cfg.key;
  return headers;
}

function notify(cfg, payload, { timeout = 10000 } = {}) {
  return new Promise((resolve) => {
    let target;
    try { target = new URL(cfg.url); } catch { return resolve({ ok: false, error: "Webhook-Adresse ungültig." }); }
    const body = Buffer.from(JSON.stringify(payload));
    const lib = target.protocol === "https:" ? https : http;
    const req = lib.request(target, {
      method: "POST",
      timeout,
      headers: { "Content-Type": "application/json", "Content-Length": body.length, "User-Agent": "Ember-Testlauf", ...webhookHeaders(cfg) },
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => { if (chunks.length < 32) chunks.push(c); });
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8").slice(0, 300);
        const ok = res.statusCode >= 200 && res.statusCode < 300;
        resolve({ ok, status: res.statusCode, error: ok ? "" : `Webhook antwortet ${res.statusCode}${text ? `: ${text}` : ""}` });
      });
    });
    req.on("timeout", () => req.destroy(new Error("Zeitlimit")));
    req.on("error", (err) => resolve({ ok: false, error: `Webhook nicht erreichbar: ${err.message}` }));
    req.end(body);
  });
}

function buildPayload({ repo, published, report }) {
  const s = (report && report.summary) || {};
  return {
    repo: repo || DEFAULT_REPO,
    branch: published.branch,
    folder: published.folder,
    commit: published.commit,
    summary: { done: s.done || 0, total: s.total || 0, fehler: s.fehler || 0, eigen: s.eigen || 0, bilder: ((report && report.images) || []).length },
    version: (report && report.version && report.version.version) || "",
    name: report && report.name,
    url: `https://github.com/${repo || DEFAULT_REPO}/tree/${published.branch}/${published.folder}`,
  };
}

// ---------- Merkliste: welcher Lauf ist schon oben ----------
const markFile = (dataDir) => path.join(dataDir, "testlaeufe", "_hochgeladen.json");
function readMarks(dataDir) {
  try { return JSON.parse(fs.readFileSync(markFile(dataDir), "utf8")) || {}; } catch { return {}; }
}
function mark(dataDir, name, info) {
  const all = readMarks(dataDir);
  all[name] = info;
  fs.mkdirSync(path.dirname(markFile(dataDir)), { recursive: true });
  fs.writeFileSync(markFile(dataDir), JSON.stringify(all, null, 2));
}

// Ganzer Ablauf fuer die API: pushen, dann Webhook (falls eingerichtet).
async function uploadAndNotify(dataDir, name, { repoRoot, env } = {}) {
  let report = null;
  try { report = JSON.parse(fs.readFileSync(path.join(dataDir, "testlaeufe", String(name), "bericht.json"), "utf8")); } catch {}
  const published = await publishRun(dataDir, name, { repoRoot, summary: report && report.summary });
  const cfg = readConfig(dataDir, env);
  const payload = buildPayload({ repo: published.repo, published, report });
  let webhook = { configured: Boolean(cfg.url), ok: false };
  if (cfg.url) webhook = { configured: true, ...(await notify(cfg, payload)) };
  mark(dataDir, name, { at: new Date().toISOString(), commit: published.commit, webhook: webhook.ok });
  return { ...published, payload, webhook };
}

module.exports = {
  BRANCH, GitError, publishRun, readConfig, saveConfig, publicConfig, notify, webhookHeaders,
  buildPayload, uploadAndNotify, readMarks, repoSlug, hintFor,
};
