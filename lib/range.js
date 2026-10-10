// lib/range.js — Range-Header lesen, ohne bei Unsinn abzustuerzen

// Liefert null (kein Range, ganze Datei), { start, end } oder { invalid: true } fuer 416.
function parseRange(header, size) {
  if (!header || typeof header !== "string") return null;
  const raw = header.trim();
  if (!/^bytes=/i.test(raw)) return null;
  if (!(size > 0)) return { invalid: true };
  const m = /^bytes=(\d*)-(\d*)$/i.exec(raw);
  if (!m || (!m[1] && !m[2])) return { invalid: true };
  if (!m[1]) {
    const suffix = Number(m[2]);
    if (!suffix) return { invalid: true };
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(m[1]);
  const end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) return { invalid: true };
  return { start, end };
}

module.exports = { parseRange };
