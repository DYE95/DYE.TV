// lib/lan.js — Adressen dieses Rechners im Heimnetz
const os = require("os");

// Virtuelle Adapter (WSL, Hyper-V, VirtualBox, VMware, Docker) liefern
// Adressen, die vom Handy oder TV aus nicht erreichbar sind.
const VIRTUAL = /(vethernet|wsl|hyper-v|virtualbox|vmware|vbox|docker|br-|veth|loopback)/i;

function rank(row) {
  const a = row.address;
  let score = 0;
  if (a.startsWith("192.168.")) score = 0;
  else if (a.startsWith("10.")) score = 1;
  else if (/^172\.(1[6-9]|2\d|3[01])\./.test(a)) score = 2;
  else score = 3;
  if (VIRTUAL.test(row.name)) score += 10;
  return score;
}

// Beste Adresse zuerst; Link-Local (169.254.x, kein DHCP) faellt weg.
function addresses(ifs = os.networkInterfaces()) {
  const out = [];
  for (const name of Object.keys(ifs || {})) {
    for (const row of ifs[name] || []) {
      const v4 = row.family === "IPv4" || row.family === 4;
      if (!v4 || row.internal || String(row.address).startsWith("169.254.")) continue;
      out.push({ name, address: row.address });
    }
  }
  return out.sort((x, y) => rank(x) - rank(y));
}

module.exports = { addresses };
