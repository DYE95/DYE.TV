const test = require("node:test");
const assert = require("node:assert/strict");
const { addresses } = require("../lib/lan");

test("WLAN-Adresse vor WSL und ohne Link-Local", () => {
  const list = addresses({
    "vEthernet (WSL)": [{ family: "IPv4", address: "172.20.16.1", internal: false }],
    Loopback: [{ family: "IPv4", address: "127.0.0.1", internal: true }],
    Ethernet: [{ family: "IPv4", address: "169.254.12.3", internal: false }],
    WLAN: [
      { family: "IPv6", address: "fe80::1", internal: false },
      { family: "IPv4", address: "192.168.178.23", internal: false },
    ],
  });
  assert.deepEqual(list.map((r) => r.address), ["192.168.178.23", "172.20.16.1"]);
});

test("ohne Netzwerk eine leere Liste", () => {
  assert.deepEqual(addresses({}), []);
});
