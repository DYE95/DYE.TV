// lib/auth.js — SL-Schluessel für GM-Routen
const LOCAL = ["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"];

const PROXY_HEADERS = ["cf-connecting-ip", "cf-ray", "x-forwarded-for", "x-real-ip"];

function isLocalAddress(remote) {
  return LOCAL.includes(String(remote || ""));
}

// cloudflared spricht den Server ueber 127.0.0.1 an. Ohne Blick auf die
// Proxy-Header waere jeder Besucher des Tunnels "dieser Rechner".
function viaProxy(req) {
  const headers = (req && req.headers) || {};
  return PROXY_HEADERS.some((name) => headers[name] != null && headers[name] !== "");
}

// Adresse fuer alle Lokal-Pruefungen: "tunnel", sobald ein Proxy davorsteht.
function requestAddress(req) {
  if (viaProxy(req)) return "tunnel";
  return (req && req.socket && req.socket.remoteAddress) || "";
}

function isLocalRequest(req) {
  return isLocalAddress(requestAddress(req));
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

module.exports = { isGm, isLocalAddress, isLocalRequest, requestAddress, recordGmKey, viaProxy };
