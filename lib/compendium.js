const data = require("./compendium-data.json");

function search(q) {
  const needle = String(q || "").trim().toLowerCase();
  const entries = data.entries.filter((entry) => {
    if (!needle) return true;
    return entry.name.toLowerCase().includes(needle) || entry.text.toLowerCase().includes(needle);
  }).sort((a, b) => {
    const an = a.name.toLowerCase() === needle ? 0 : a.name.toLowerCase().includes(needle) ? 1 : 2;
    const bn = b.name.toLowerCase() === needle ? 0 : b.name.toLowerCase().includes(needle) ? 1 : 2;
    return an - bn;
  }).slice(0, 24);
  return { attribution: data.attribution, source: data.source, count: data.entries.length, entries };
}

module.exports = { search, entries: data.entries.slice(0, 24), attribution: data.attribution };
