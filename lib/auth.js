// lib/auth.js — SL-Schluessel für GM-Routen
const LOCAL = ["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"];

function isLocalAddress(remote) {
  return LOCAL.includes(String(remote || ""));
}

// Eine Anfrage gilt als SL, wenn sie as:"gm" setzt und — sobald ein
// Schluessel bekannt ist — den passenden gmKey mitbringt.
function isGm(state, body) {
  if (!body || body.as !== "gm") return false;
  if (!state || !state.settings) return false;
  const key = state.settings.gmKey;
  if (!key) return true;
  return typeof body.gmKey === "string" && body.gmKey.length > 0 && body.gmKey === key;
}

// Der Schluessel entsteht beim ersten GM-Presence-Ping vom SL-Rechner.
// Liefert true, wenn dadurch ein Schluessel gesetzt wurde.
function recordGmKey(state, body, remote) {
  if (!state || !body || body.role !== "gm" || typeof body.gmKey !== "string" || !body.gmKey) return false;
  if (state.settings && state.settings.gmKey) return false;
  if (!isLocalAddress(remote)) return false;
  state.settings.gmKey = body.gmKey;
  return true;
}

module.exports = { isGm, isLocalAddress, recordGmKey };
