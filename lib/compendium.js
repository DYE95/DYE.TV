const data = require("./compendium-data.json");

const KINDS = [
  { id: "regel", label: "Regeln" },
  { id: "wurf", label: "Würfe" },
  { id: "klasse", label: "Klassen" },
  { id: "subklasse", label: "Subklassen" },
  { id: "domain", label: "Domains" },
  { id: "herkunft", label: "Herkünfte" },
  { id: "community", label: "Communities" },
  { id: "waffe", label: "Waffen" },
  { id: "ruestung", label: "Rüstung" },
  { id: "umgebung", label: "Environments" },
  { id: "gegner", label: "Gegner" },
  { id: "frame", label: "Campaign Frames" },
];

const NAMES = {
  wurf: ["action rolls", "attack rolls", "damage rolls", "spellcast rolls", "reaction rolls", "group action rolls", "tag team rolls", "trait rolls", "special rolls", "hope", "fear", "hope & fear", "advantage & disadvantage"],
  klasse: ["bard", "assassin", "seraph", "guardian", "ranger", "rogue", "sorcerer", "warrior", "wizard", "druid", "witch", "warlock", "brawler"],
  herkunft: ["clank", "drakona", "dwarf", "elf", "faerie", "faun", "firbolg", "galapa", "giant", "goblin", "halfling", "human", "infernis", "katari", "orc", "ribbet", "simiah"],
  community: ["highborne", "loreborne", "orderborne", "ridgeborne", "seaborne", "slyborne", "underborne", "wanderborne", "wildborne"],
  gegner: ["adversary", "minion", "horde", "leader", "solo", "bruiser", "skulk", "standard", "ranged", "support"],
};

function kindOf(entry) {
  const name = entry.name.toLowerCase();
  if (name.includes("subclass")) return "subklasse";
  if (name.includes("domain")) return "domain";
  if (name.includes("weapon")) return "waffe";
  if (name.includes("armor")) return "ruestung";
  if (name.includes("environment")) return "umgebung";
  if (name.includes("campaign frame") || name.includes("witherwild")) return "frame";
  if (name.includes("ancestr")) return "herkunft";
  for (const [kind, names] of Object.entries(NAMES)) {
    if (names.some((n) => name === n || name.startsWith(n + " "))) return kind;
  }
  if (/adversary|minion|horde/.test(entry.text.slice(0, 140).toLowerCase())) return "gegner";
  return "regel";
}

function search(q, kind, scope) {
  const needle = String(q || "").trim().toLowerCase();
  const want = String(kind || "").trim().toLowerCase();
  const inName = String(scope || "") === "name";
  const entries = data.entries.filter((entry) => {
    if (want && kindOf(entry) !== want) return false;
    if (!needle) return true;
    const name = entry.name.toLowerCase();
    if (inName) return name.includes(needle);
    return name.includes(needle) || entry.text.toLowerCase().includes(needle);
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
    kinds: KINDS,
    entries,
  };
}

module.exports = { search, kindOf, KINDS };
