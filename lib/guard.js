// lib/guard.js — Schutz gegen fremde Webseiten (CSRF)
// Eine beliebige Seite im Browser des SL koennte sonst per Formular oder
// fetch(text/plain) an http://localhost:3478/api/... posten, z. B. /api/update.
// Spieler ueber Tunnel oder LAN rufen die API immer von derselben Seite auf
// (Sec-Fetch-Site: same-origin), die bleiben unberuehrt.

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

function hostOf(value) {
  if (!value) return "";
  try {
    return new URL(String(value).includes("://") ? String(value) : `http://${value}`).host.toLowerCase();
  } catch {
    return "";
  }
}

// Liefert true, wenn die Anfrage von einer fremden Seite kommt.
// extraOrigins: weitere eigene Adressen, z. B. die Tunnel-URL.
function crossSiteBlocked(method, headers, extraOrigins = []) {
  if (SAFE_METHODS.includes(String(method || "").toUpperCase())) return false;
  const h = headers || {};
  const site = String(h["sec-fetch-site"] || "").toLowerCase();
  if (site === "same-origin" || site === "none") return false;
  const origin = h.origin;
  if (!site && !origin) return false; // curl, Skripte, sehr alte Browser
  if (!origin || origin === "null") return true;
  const own = [h.host, h["x-forwarded-host"], ...extraOrigins].map(hostOf).filter(Boolean);
  return !own.includes(hostOf(origin));
}

module.exports = { crossSiteBlocked, hostOf };
