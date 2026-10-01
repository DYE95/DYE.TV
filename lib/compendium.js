const data = require("./compendium-data.json");

const KINDS = {
  regel: ["hope", "fear", "stress", "spotlight", "duality", "evasion", "armor", "experience", "rest", "tag team", "golden rule", "action roll"],
  klasse: ["bard", "assassin", "seraph", "guardian", "ranger", "rogue", "sorcerer", "warrior", "wizard", "druid", "witch"],
  herkunft: ["clank", "drakona", "dwarf", "elf", "faerie", "faun", "firbolg", "galapa", "giant", "goblin", "halfling", "human", "infernis", "katari", "orc", "ribbet", "simiah"],
  community: ["highborne", "loreborne", "orderborne", "ridgeborne", "seaborne", "slyborne", "underborne", "wanderborne", "wildborne"],
  gegner: ["adversary", "minion", "horde", "leader", "solo", "bruiser", "skulk", "standard", "ranged", "support"],
};

function kindOf(entry) {
  const name = entry.name.toLowerCase();
  for (const [kind, names] of Object.entries(KINDS)) {
    if (names.some((n) => name === n || name.startsWith(n + " "))) return kind;
  }
  if (/adversary|minion|horde/.test(entry.text.slice(0, 120).toLowerCase())) return "gegner";
  return "regel";
}

function search(q, kind) {
  const needle = String(q || "").trim().toLowerCase();
  const want = String(kind || "").trim().toLowerCase();
  const entries = data.entries.filter((entry) => {
    if (want && kindOf(entry) !== want) return false;
    if (!needle) return true;
    return entry.name.toLowerCase().includes(needle) || entry.text.toLowerCase().includes(needle);
  }).sort((a, b) => {
    const an = a.name.toLowerCase() === needle ? 0 : a.name.toLowerCase().includes(needle) ? 1 : 2;
    const bn = b.name.toLowerCase() === needle ? 0 : b.name.toLowerCase().includes(needle) ? 1 : 2;
    return an - bn;
  }).slice(0, 24).map((entry) => ({ ...entry, kind: kindOf(entry) }));
  return {
    attribution: data.attribution,
    source: data.source,
    count: data.entries.length,
    shown: entries.length,
    kinds: Object.keys(KINDS),
    entries,
  };
}

module.exports = { search, kindOf };
