// lib/ids.js — IDs und Spieler-PINs aus dem Zufall des Betriebssystems
const { randomBytes, randomInt } = require("crypto");

// prefix_ + 14 Hex-Zeichen Zufall + 4 Hex-Zeichen Zeit, z. B. pc_3f9a0c1e7b2d4a1b2c
function id(prefix) {
  return `${prefix}_${randomBytes(7).toString("hex")}${Date.now().toString(16).slice(-4)}`;
}

// Vierstellige PIN, 1000 bis 9999. Nicht aus Math.random, damit sie nicht erratbar ist.
function pin() {
  return String(randomInt(1000, 10000));
}

module.exports = { id, pin };
