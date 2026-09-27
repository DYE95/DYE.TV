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
    hpMax: 6,
    armorScore: 0,
    armorMarked: 0,
    proficiency: 1,
    sheetPhotos: [],
    notes: "",
    portrait: "",
    weapons: [],
    armor: { name: "", thresholds: "", score: 0, feature: "" },
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
      features: [{ id: id("feat"), name: "Arcane Sense", text: "Du spuerst Magie in der Naehe." }],
    }
