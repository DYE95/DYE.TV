function armorScore(character) {
  return Number(character.armorScore || character.armor?.score || 0);
}

function applyHit(character, raw) {
  let dmg = Math.max(0, Number(raw) || 0);
  const score = armorScore(character);
  const marked = Number(character.armorMarked || 0);
  let soaked = 0;
  if (dmg > 0 && marked < score) {
    character.armorMarked = marked + 1;
    soaked = 1;
    dmg = Math.max(0, dmg - 1);
  }
  character.hpMarked = Math.min(Number(character.hpMax || 6), Number(character.hpMarked || 0) + dmg);
  const hp = Number(character.hpMarked || 0);
  const major = Number(character.major || 7);
  const severe = Number(character.severe || 14);
  let mark = "";
  if (hp >= severe) mark = "severe";
  else if (hp >= major) mark = "major";
  if (mark) character.lastThreshold = mark;
  const down = hp >= Number(character.hpMax || 6);
  return { dmg, soaked, mark, down, hp };
}

function ownedExperiences(character, asked) {
  const have = new Map((character.experiences || []).map((e) => [String(e.name || ""), e]));
  return (asked || []).filter((e) => e && have.has(String(e.name || ""))).map((e) => have.get(String(e.name || "")));
}

function levelRow(level) {
  const n = Math.max(1, Math.min(10, Number(level) || 1));
  return {
    level: n,
    proficiency: n >= 8 ? 3 : n >= 5 ? 2 : 1,
    experienceBonus: n >= 5 ? 3 : 2,
    domainSlots: n >= 8 ? 4 : n >= 5 ? 3 : 2,
  };
}

module.exports = { applyHit, ownedExperiences, levelRow, armorScore };
