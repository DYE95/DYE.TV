// Spielleiter-PIN in data/sl.pin.
// Die Datei schreibt nur noch Node (tools/slpin.js), nie mehr cmd.exe:
// alte start.bat-Staende haben bei leerer Variable "ECHO ist ausgeschaltet (OFF)."
// hineingeschrieben. Solche Reste gelten hier als "keine PIN".
const fs = require("fs");
const path = require("path");

const MIN = 4;
const MAX = 64;
// Ausgabe von "echo" ohne Text, in den Sprachen, die cmd.exe kennt.
const ECHO_JUNK = /^ECHO\s+(ist|is|est|está|esta|è|staat|jest)\b/i;

function clean(raw) {
  return String(raw == null ? "" : raw).replace(/^\uFEFF/, "").trim();
}

// Grund, warum eine PIN nicht taugt, oder "" wenn sie passt.
function problem(raw) {
  const pin = clean(raw);
  if (!pin) return "leer";
  if (ECHO_JUNK.test(pin)) return "cmd-Rest („" + pin + "“)";
  if (/[\r\n]/.test(pin)) return "mehrzeilig";
  if (pin.length < MIN) return "kürzer als " + MIN + " Zeichen";
  if (pin.length > MAX) return "länger als " + MAX + " Zeichen";
  return "";
}

function isJunk(raw) {
  return ECHO_JUNK.test(clean(raw));
}

function file(dataDir) {
  return path.join(dataDir, "sl.pin");
}

// Liefert { pin, state } mit state "ok" | "fehlt" | "kaputt" und ggf. why.
function inspect(dataDir) {
  let raw;
  try { raw = fs.readFileSync(file(dataDir), "utf8"); } catch { return { pin: "", state: "fehlt" }; }
  const why = problem(raw);
  if (why) return { pin: "", state: "kaputt", why, raw: clean(raw).slice(0, 80) };
  return { pin: clean(raw), state: "ok" };
}

// Nur eine gueltige PIN, sonst "".
function read(dataDir) {
  return inspect(dataDir).pin;
}

function write(dataDir, raw) {
  const why = problem(raw);
  if (why) throw new Error("PIN " + why + ".");
  fs.mkdirSync(dataDir, { recursive: true });
  const target = file(dataDir);
  const tmp = target + ".tmp";
  fs.writeFileSync(tmp, clean(raw) + "\r\n", "utf8");
  fs.renameSync(tmp, target);
  return clean(raw);
}

// Beim Serverstart: sl.pin ist die Quelle fuer den SL-Schluessel.
// Gibt zurueck, was geaendert wurde ("pin" | "junk-weg" | "").
function syncGmKey(state, dataDir) {
  if (!state || !state.settings) return "";
  const pin = read(dataDir);
  if (pin && state.settings.gmKey !== pin) {
    state.settings.gmKey = pin;
    return "pin";
  }
  // Ein frueher aus sl.pin uebernommener cmd-Rest darf kein Schluessel bleiben.
  if (!pin && isJunk(state.settings.gmKey)) {
    delete state.settings.gmKey;
    return "junk-weg";
  }
  return "";
}

module.exports = { MIN, MAX, clean, problem, isJunk, inspect, read, write, syncGmKey, file };
