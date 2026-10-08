const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn } = require("node:child_process");
const path = require("node:path");

function get(port, urlPath) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: "127.0.0.1", port, path: urlPath }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
    }).on("error", reject);
  });
}

test("CSS und Skripte kommen als Datei, nicht als 500", async () => {
  const port = 3491;
  const child = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, EMBER_PORT: String(port), HOST: "127.0.0.1" },
    stdio: "ignore",
  });
  try {
    let up = false;
    for (let i = 0; i < 30 && !up; i += 1) {
      try { await get(port, "/api/state"); up = true; } catch { await new Promise((r) => setTimeout(r, 100)); }
    }
    assert.equal(up, true, "Server ist nicht hochgekommen");
    for (const urlPath of ["/css/ember.css", "/css/home-desk.css", "/js/gm.js", "/js/home-desk.js", "/pixelstube", "/api/sl-pin", "/ember", "/solo"]) {
      const res = await get(port, urlPath);
      assert.equal(res.status, 200, urlPath + " " + res.body.slice(0, 80));
      assert.equal(res.body.includes("method is not defined"), false, urlPath);
    }
    const start = await get(port, "/ember");
    assert.match(start.body, /Die Glut zünden/);
    assert.match(start.body, /Ans Feuer setzen/);
    assert.match(start.body, /Unter die Schwelle/);
    assert.match(start.body, /hearth.jpg/);
    assert.match(start.body, /view-menu/);
    assert.equal(start.body.includes("const topChip"), false);
    assert.match(start.body, /if \(!document.getElementById\("view-" \+ name\)\) name = "menu"/);
    const solo = await get(port, "/solo");
    assert.match(solo.body, /id="btnSchwelle"/);
    assert.match(solo.body, /Asche unter der Schwelle/);
  } finally {
    child.kill("SIGTERM");
  }
});
