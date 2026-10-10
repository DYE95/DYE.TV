const test = require("node:test");
const assert = require("node:assert/strict");
const { crossSiteBlocked } = require("../lib/guard");

test("GET wird nie blockiert", () => {
  assert.equal(crossSiteBlocked("GET", { "sec-fetch-site": "cross-site", origin: "https://boese.example" }), false);
});

test("eigene Seite darf posten", () => {
  assert.equal(crossSiteBlocked("POST", { "sec-fetch-site": "same-origin", host: "localhost:3478" }), false);
  assert.equal(crossSiteBlocked("POST", { origin: "http://192.168.0.5:3478", host: "192.168.0.5:3478" }), false);
});

test("Tunnel-Spieler ohne Sec-Fetch-Site, Origin = Tunnel-URL", () => {
  const headers = { origin: "https://abc-def.trycloudflare.com", host: "localhost:3478" };
  assert.equal(crossSiteBlocked("POST", headers, ["https://abc-def.trycloudflare.com"]), false);
  assert.equal(crossSiteBlocked("POST", headers), true);
});

test("fremde Seite wird blockiert", () => {
  assert.equal(crossSiteBlocked("POST", { "sec-fetch-site": "cross-site", origin: "https://boese.example", host: "localhost:3478" }), true);
  assert.equal(crossSiteBlocked("POST", { origin: "https://boese.example", host: "localhost:3478" }), true);
  assert.equal(crossSiteBlocked("POST", { origin: "null", host: "localhost:3478" }), true);
});

test("Skripte ohne Browser-Header gehen durch", () => {
  assert.equal(crossSiteBlocked("POST", { host: "localhost:3478" }), false);
});
