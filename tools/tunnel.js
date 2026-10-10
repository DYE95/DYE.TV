const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = path.join(__dirname, "..");
const file = path.join(root, "data", "public-url.txt");
const logFile = path.join(root, "data", "tunnel.log");
const port = process.env.EMBER_PORT || process.env.PORT || "3478";
let told = false;

function paintTitle(url) {
  const home = url ? "  |  Zu Hause " + url + "/player" : "  |  Zu Hause wartet";
  process.title = "DYE.TV  Spielleiter http://127.0.0.1:" + port + "/ember" + home;
}

function writeUrl(url) {
  if (told) return;
  told = true;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, url.trim() + "\n");
  paintTitle(url.trim());
}

// Die Adresse vom letzten Start ist tot. Weg damit, sonst zeigt die Titelleiste sie an.
try { fs.unlinkSync(file); } catch {}

const bin = process.platform === "win32" ? "cloudflared.exe" : "cloudflared";
fs.mkdirSync(path.dirname(logFile), { recursive: true });
const log = fs.createWriteStream(logFile, { flags: "a" });
const child = spawn(bin, ["tunnel", "--protocol", "http2", "--url", `http://127.0.0.1:${port}`], { stdio: ["ignore", "pipe", "pipe"] });
let buf = "";
function take(chunk) {
  const text = chunk.toString();
  log.write(text);
  buf += text;
  if (buf.length > 8000) buf = buf.slice(-4000);
  const hit = buf.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (hit) writeUrl(hit[0]);
}
child.stdout.on("data", take);
child.stderr.on("data", take);
child.on("error", () => {
  console.log("cloudflared fehlt.");
  console.log("https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/");
  process.exit(1);
});
child.on("exit", (code) => process.exit(code || 0));
paintTitle("");
