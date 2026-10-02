const BOTS = [
  { id: "hound", name: "Ash Hound", difficulty: 12, stressMax: 3, attack: 1 },
  { id: "bramble", name: "Bramble", difficulty: 10, stressMax: 2, attack: 0 },
  { id: "wisp", name: "Lantern Wisp", difficulty: 13, stressMax: 2, attack: 2 },
  { id: "sentry", name: "Ash Sentry", difficulty: 14, stressMax: 4, attack: 1 },
];

const ROOM = ["Schwelle", "Krypta", "Brunnen", "Galerie", "Aschekammer", "Riss"];

function list() {
  return BOTS.map((b) => ({ ...b }));
}

function find(botId) {
  return BOTS.find((b) => b.id === botId) || BOTS[0];
}

function act(bot, evasion) {
  const hope = 1 + Math.floor(Math.random() * 12);
  const fear = 1 + Math.floor(Math.random() * 12);
  const total = hope + Number(bot.attack || 0);
  const target = Number(evasion || 10);
  const hit = total >= target;
  const name = bot.name || bot.label || "Bot";
  return {
    hope, fear, total, hit,
    text: name + " würfelt Hope " + hope + " · Fear " + fear + " +" + (bot.attack || 0) + " = " + total + " gegen " + target + " — " + (hit ? "trifft" : "verfehlt"),
  };
}

function generate(count) {
  const n = Math.max(3, Math.min(6, Number(count) || 4));
  const rooms = [];
  for (let i = 0; i < n; i += 1) {
    const bot = i % 2 === 0 ? find(BOTS[i % BOTS.length].id) : null;
    rooms.push({
      id: "room_" + i,
      name: ROOM[i % ROOM.length] + " " + (i + 1),
      x: 12 + (i % 3) * 28,
      y: 18 + Math.floor(i / 3) * 36,
      clear: false,
      bot: bot ? { ...bot } : null,
    });
  }
  return rooms;
}


const SUBCLASSES = {
  assassin: [
    { name: "Executioners Guild", feature: "Ziele mit tödlicher Präzision treffen." },
    { name: "Poisoners Guild", feature: "Ziele mit Afflictions schwächen." },
  ],
  bard: [
    { name: "Troubadour", feature: "Musik, die Verbündete stärkt." },
    { name: "Wordsmith", feature: "Wortspiel, das eine Menge fesselt." },
  ],
  brawler: [
    { name: "Juggernaut", feature: "Gegner mit schweren Schlägen zerlegen." },
    { name: "Martial Artist", feature: "Zwei Martial Stances aus Tier 1." },
  ],
  druid: [
    { name: "Warden of the Elements", feature: "Die Elemente der Wildnis verkörpern." },
    { name: "Warden of Renewal", feature: "Magie, die die Gruppe heilt." },
  ],
  guardian: [
    { name: "Stalwart", feature: "Schwere Treffer einstecken und weiterkämpfen." },
    { name: "Vengeance", feature: "Wer die Gruppe trifft, wird selbst getroffen." },
  ],
  ranger: [
    { name: "Beastbound", feature: "Ein Tiergefährte an der Seite." },
    { name: "Wayfinder", feature: "Beute jagen und hart zuschlagen." },
  ],
  rogue: [
    { name: "Nightwalker", feature: "Schatten nutzen, um sich zu bewegen." },
    { name: "Syndicate", feature: "Kontakte an jedem Ort." },
  ],
  seraph: [
    { name: "Divine Wielder", feature: "Das Feld mit einer legendären Waffe halten." },
    { name: "Winged Sentinel", feature: "Splendor und Valor, Evasion 9, 7 HP." },
  ],
  sorcerer: [
    { name: "Elemental Origin", feature: "Rohe Magie in eine Elementform legen." },
    { name: "Primal Origin", feature: "Zauber weiter und stärker biegen." },
  ],
  warlock: [
    { name: "Pact of the Endless", feature: "Stehen bleiben und dem Tod ausweichen." },
    { name: "Pact of the Wrathful", feature: "Wer sich entgegenstellt, wird zerstört." },
  ],
  warrior: [
    { name: "Call of the Brave", feature: "Die Kraft des Gegners als eigene nutzen." },
    { name: "Call of the Slayer", feature: "Adversaries mit Wucht niederstrecken." },
  ],
  witch: [
    { name: "Hedge", feature: "Handwerk, das dich und die Gruppe stärkt." },
    { name: "Moon", feature: "Himmelskraft, die Magie verstärkt." },
  ],
  wizard: [
    { name: "School of Knowledge", feature: "Wissen als zusätzliche magische Wucht." },
    { name: "School of War", feature: "Gelernte Magie für Gewalt." },
  ],
};

function subclassesFor(className) {
  const key = String(className || "").toLowerCase();
  if (SUBCLASSES[key]) return SUBCLASSES[key].map((row) => ({ ...row }));
  return Object.values(SUBCLASSES).flat().map((row) => ({ ...row }));
}

function applySubclass(character, name) {
  const picked = String(name || "").trim();
  if (!picked) return character;
  const row = Object.values(SUBCLASSES).flat().find((s) => s.name === picked);
  character.subclass = picked;
  character.features = character.features || [];
  if (row && !character.features.some((f) => f.name === picked)) {
    character.features.push({ name: picked, text: row.feature });
  }
  return character;
}

function tierOf(level) {
  const n = Number(level || 1);
  if (n >= 8) return 4;
  if (n >= 5) return 3;
  if (n >= 2) return 2;
  return 1;
}

function levelUp(character, choice) {
  choice = choice || {};
  const before = Number(character.level || 1);
  if (before >= 10) return { ok: false, text: character.name + " ist schon Level 10." };
  character.level = before + 1;
  character.hope = character.hopeMax || 6;
  character.experiences = character.experiences || [];
  const gains = ["Level " + character.level, "Tier " + tierOf(character.level), "Hope voll"];
  if ([2, 5, 8].includes(character.level)) {
    character.proficiency = Number(character.proficiency || 1) + 1;
    gains.push("Proficiency " + character.proficiency);
  }
  const name = String(choice.experience || "").trim();
  if (name) {
    character.experiences.push({ name, bonus: 2 });
    gains.push("Experience " + name + " +2");
  } else if (choice.upgrade) {
    const xp = character.experiences.find((e) => e.id === choice.upgrade || e.name === choice.upgrade);
    if (xp) {
      xp.bonus = Number(xp.bonus || 2) + 1;
      gains.push(xp.name + " +" + xp.bonus);
    }
  }
  if (choice.subclass) {
    applySubclass(character, choice.subclass);
    gains.push(character.subclass);
  }
  if (choice.note) gains.push(choice.note);
  return { ok: true, character, text: (character.name || "Bogen") + ": " + gains.join(", ") + "." };
}

module.exports = { list, find, act, generate, levelUp, tierOf, subclassesFor, applySubclass };

