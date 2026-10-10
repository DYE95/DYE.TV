#!/usr/bin/env node
// Spielleiter-PIN pruefen und bei Bedarf abfragen. Aufruf aus start.bat:
//   node tools\slpin.js
// - PIN in data\sl.pin passt: kurze Zeile, fertig.
// - fehlt oder kaputt (z. B. "ECHO ist ausgeschaltet"): fragt nach und schreibt sie.
// - kein Eingabefenster (Doppelklick minimiert, Pipe): schreibt nichts, Server laeuft trotzdem.
// Beendet sich immer mit 0, damit start.bat weiterlaeuft.
const path = require("path");
const readline = require("readline");
const slpin = require("../lib/slpin");

const dataDir = process.env.EMBER_DATA ? path.resolve(process.env.EMBER_DATA) : path.join(__dirname, "..", "data");

// Zeilenweise lesen, auch wenn die Eingabe schneller kommt als die Frage
// (Pipe in Tests). null heisst: Eingabe ist zu (Strg+Z, Pipe leer).
function lineReader(input) {
  const rl = readline.createInterface({ input, terminal: false });
  const lines = [];
  const waiting = [];
  let closed = false;
  rl.on("line", (line) => (waiting.length ? waiting.shift()(line) : lines.push(line)));
  rl.on("close", () => { closed = true; while (waiting.length) waiting.shift()(null); });
  return {
    next(question) {
      process.stdout.write(question);
      if (lines.length) return Promise.resolve(lines.shift());
      if (closed) return Promise.resolve(null);
      return new Promise((resolve) => waiting.push(resolve));
    },
    close: () => rl.close(),
  };
}

async function main() {
  const now = slpin.inspect(dataDir);
  if (now.state === "ok") {
    console.log("  PIN           liegt in data\\sl.pin");
    return;
  }
  if (now.state === "kaputt") console.log("  data\\sl.pin ist unbrauchbar: " + now.why + ". Bitte neu setzen.");
  const interactive = process.stdin.isTTY || process.env.EMBER_PIN_FORCE_PROMPT === "1";
  if (!interactive) {
    console.log("  Keine PIN gesetzt. Beim nächsten Start im sichtbaren Fenster fragen.");
    return;
  }
  const rl = lineReader(process.stdin);
  try {
    for (let i = 0; i < 3; i += 1) {
      const answer = await rl.next("  Spielleiter-PIN (mind. " + slpin.MIN + " Zeichen), bleibt liegen: ");
      if (answer === null) { process.stdout.write("\n"); break; }
      if (!process.stdin.isTTY) process.stdout.write("\n");
      const why = slpin.problem(answer);
      if (!why) {
        slpin.write(dataDir, answer);
        console.log("  PIN gespeichert in data\\sl.pin");
        return;
      }
      console.log("  Nicht gespeichert: PIN " + why + ".");
    }
    console.log("  Ohne PIN weiter. Beim nächsten Start wird wieder gefragt.");
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.log("  PIN-Prüfung fehlgeschlagen: " + err.message);
}).finally(() => process.exit(0));
