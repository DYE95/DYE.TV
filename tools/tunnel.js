const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = path.join(__dirname, "..");
const file = path.join(root, "data", "public-url.txt");
const port = process.env.PORT || "3478";

function writeUrl(url) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, url.trim() + "\n");
  console.log("");
  console.log("  Spieler zu Hause: " + url.trim() + "/player");
  console.log("");
}

const bin = process.platform === "win32" ? "cloudflared.exe" : "cloudflared";
const child = spawn(bin, ["tunnel", "--url", "http://127.0.0.1:" + port], { stdio: ["ignore", "pipe", "pipe"] });
let buf = "";
function take(chunk) {
  buf += chunk.toString();
  const hit = buf.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (hit) writeUrl(hit[0]);
}
child.stdout.on("data", take);
child.stderr.on("data", take);
child.on("error", () => {
  console.log("cloudflared fehlt.");
  console.log("https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/");
  console.log("Fenster offen lassen, Ember in einem zweiten Fenster starten.");
  process.exit(1);
});
child.on("exit", (code) => process.exit(code || 0));
