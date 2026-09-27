const { id, pin } = require("./ids");

function pc(data) {
  return {
    id: id("pc"),
    playerPin: pin(),
    hope: 2,
    hopeMax: 6,
    stressMarked: 0,
    stressMax: 6,
    hpMarked: 0,
    armorMarked: 0,
    proficiency: 1,
    sheetPhotos: [],
    notes: "",
    createdAt: new Date().toISOString(),
    color: data.color || "#e85d04",
    ...data,
  };
}

function sablewoodPregens() {
  return [
    pc({
      name: "Marlowe Fairwind",
      pronouns: "she/her",
      ancestry: "Elf",
      community: "Loreborne",
      class: "Sorcerer",
      subclass: "Primal Origin",
      level: 1,
      color: "#7b2cbf",
      traits: { agility: 0, strength: -1, finesse: 1, instinct: 2, presence: 1, knowledge: 0 },
      experiences: [{ id: id("xp"), name: "Royal Mage", bonus: 2 }, { id: id("xp"), name: "Not On My Watch", bonus: 2 }],
      hpMax: 6, major: 7, severe: 14, evasion: 10,
      features: [{ id: id("feat"), name: "Arcane Sense", text: "Du spürst Magie in der Nähe." }],
    }),
    pc({
      name: "Barnacle",
      pronouns: "he/him",
      ancestry: "Ribbet",
      community: "Underborne",
      class: "Rogue",
      subclass: "Nightwalker",
      level: 1,
      color: "#2d6a4f",
      traits: { agility: 1, strength: -1, finesse: 2, instinct: 1, presence: 0, knowledge: 0 },
      experiences: [{ id: id("xp"), name: "No Lock Too Proud", bonus: 2 }],
      hpMax: 6, major: 6, severe: 12, evasion: 12,
      features: [{ id: id("feat"), name: "Cloaked", text: "Im Schatten schwerer zu sehen." }],
    }),
    pc({
      name: "Garrick Reed",
      pronouns: "he/him",
      ancestry: "Human",
      community: "Highborne",
      class: "Warrior",
      subclass: "Call of the Brave",
      level: 1,
      color: "#1d3557",
      traits: { agility: 1, strength: 2, finesse: 0, instinct: 0, presence: 1, knowledge: -1 },
      experiences: [{ id: id("xp"), name: "Kill 'em with Kindness", bonus: 2 }],
      hpMax: 7, major: 8, severe: 15, evasion: 9,
      features: [{ id: id("feat"), name: "No Mercy", text: "Ein extra Impuls im Nahkampf." }],
    }),
    pc({
      name: "Khari Nix",
      pronouns: "she/her",
      ancestry: "Giant",
      community: "Ridgeborne",
      class: "Guardian",
      subclass: "Stalwart",
      level: 1,
      color: "#9c6644",
      traits: { agility: 0, strength: 2, finesse: -1, instinct: 1, presence: 1, knowledge: 0 },
      experiences: [{ id: id("xp"), name: "Born with an Axe", bonus: 2 }],
      hpMax: 8, major: 9, severe: 18, evasion: 8,
      features: [{ id: id("feat"), name: "Unstoppable", text: "Du hältst die Linie." }],
    }),
    pc({
      name: "Varian Soto",
      pronouns: "they/them",
      ancestry: "Katari",
      community: "Wildborne",
      class: "Ranger",
      subclass: "Wayfinder",
      level: 1,
      color: "#52796f",
      traits: { agility: 2, strength: 0, finesse: 1, instinct: 1, presence: -1, knowledge: 0 },
      experiences: [{ id: id("xp"), name: "Shoot First", bonus: 2 }],
      hpMax: 6, major: 7, severe: 14, evasion: 11,
      features: [{ id: id("feat"), name: "Hold Them Off", text: "Fernkampf hält Distanz." }],
    }),
  ];
}

function defaultMap(heroes) {
  const tokens = (heroes || []).map((c, i) => ({
    id: id("tok"),
    kind: "pc",
    characterId: c.id,
    label: c.name.split(" ")[0],
    color: c.color || "#e85d04",
    x: 18 + i * 8,
    y: 68,
  }));
  tokens.push(
    { id: id("tok"), kind: "foe", label: "Ambusher 1", color: "#6a040f", x: 62, y: 38 },
    { id: id("tok"), kind: "foe", label: "Ambusher 2", color: "#6a040f", x: 70, y: 46 },
    { id: id("tok"), kind: "foe", label: "Ambusher 3", color: "#6a040f", x: 78, y: 40 },
    { id: id("tok"), kind: "foe", label: "Thief", color: "#3c096c", x: 22, y: 28 }
  );
  return { image: "", tokens, fow: { on: false, radius: 16, persist: false, gmSeesAll: true, explored: [] } };
}

module.exports = { sablewoodPregens, defaultMap };
