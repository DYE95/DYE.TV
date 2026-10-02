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
    { name: "Executioners Guild", feature: "Ziele mit tödlicher Präzision treffen.", features: [
      { tier: "Foundation", name: "First Strike", text: "Der erste erfolgreiche Angriff einer Szene macht doppelten Schaden." },
      { tier: "Foundation", name: "Ambush", text: "Marked for Death nutzt d6 statt d4." },
      { tier: "Specialization", name: "Death Strike", text: "Bei Severe damage 1 Stress markieren, das Ziel markiert einen weiteren Hit Point." },
      { tier: "Specialization", name: "Scorpion's Poise", text: "+2 Evasion gegen ein Ziel, das du Marked for Death hast." },
      { tier: "Mastery", name: "True Strike", text: "Einmal pro Long Rest einen Fehlschlag mit 1 Hope zum Erfolg machen." },
      { tier: "Mastery", name: "Backstab", text: "Marked for Death nutzt d8 statt d6." },
    ]},
    { name: "Poisoners Guild", feature: "Ziele mit Afflictions schwächen.", features: [
      { tier: "Foundation", name: "Toxic Concoctions", text: "1 Stress für 1d4+1 Giftmarken. Ein Treffer kann eine Marke als Gift ausgeben." },
    ]},
  ],
  bard: [
    { name: "Troubadour", feature: "Musik, die Verbündete stärkt.", features: [
      { tier: "Specialization", name: "Maestro", text: "Rally-Lieder stärken die, die zuhören." },
    ]},
    { name: "Wordsmith", feature: "Wortspiel, das eine Menge fesselt.", features: [] },
  ],
  brawler: [
    { name: "Juggernaut", feature: "Gegner mit schweren Schlägen zerlegen.", features: [] },
    { name: "Martial Artist", feature: "Zwei Martial Stances aus Tier 1.", features: [
      { tier: "Foundation", name: "Martial Stances", text: "Zwei Stances aus Tier 1 wählen und auf dem Stance-Zettel führen." },
    ]},
  ],
  druid: [
    { name: "Warden of the Elements", feature: "Die Elemente der Wildnis verkörpern.", features: [] },
    { name: "Warden of Renewal", feature: "Magie, die die Gruppe heilt.", features: [
      { tier: "Foundation", name: "Beastform", text: "Beastform-Optionen stehen auf dem Bogen, Heilung über die Subclass." },
    ]},
  ],
  guardian: [
    { name: "Stalwart", feature: "Schwere Treffer einstecken und weiterkämpfen.", features: [] },
    { name: "Vengeance", feature: "Wer die Gruppe trifft, wird selbst getroffen.", features: [] },
  ],
  ranger: [
    { name: "Beastbound", feature: "Ein Tiergefährte an der Seite.", features: [
      { tier: "Foundation", name: "Companion", text: "Ein Tiergefährte mit eigenem Bogen. Schaden an ihm kann Stress sein." },
    ]},
    { name: "Wayfinder", feature: "Beute jagen und hart zuschlagen.", features: [] },
  ],
  rogue: [
    { name: "Nightwalker", feature: "Schatten nutzen, um sich zu bewegen.", features: [] },
    { name: "Syndicate", feature: "Kontakte an jedem Ort.", features: [] },
  ],
  seraph: [
    { name: "Divine Wielder", feature: "Das Feld mit einer legendären Waffe halten.", features: [] },
    { name: "Winged Sentinel", feature: "Splendor und Valor, Evasion 9, 7 HP.", features: [] },
  ],
  sorcerer: [
    { name: "Elemental Origin", feature: "Rohe Magie in eine Elementform legen.", features: [] },
    { name: "Primal Origin", feature: "Zauber weiter und stärker biegen.", features: [] },
  ],
  warlock: [
    { name: "Pact of the Endless", feature: "Stehen bleiben und dem Tod ausweichen.", features: [] },
    { name: "Pact of the Wrathful", feature: "Wer sich entgegenstellt, wird zerstört.", features: [
      { tier: "Foundation", name: "Deadly Vengeance", text: "Wenn du Hit Points markierst, Favor ausgeben und Patron Dice werfen. Ab 4 markiert der Angreifer einen Hit Point." },
    ]},
  ],
  warrior: [
    { name: "Call of the Brave", feature: "Die Kraft des Gegners als eigene nutzen.", features: [] },
    { name: "Call of the Slayer", feature: "Adversaries mit Wucht niederstrecken.", features: [
      { tier: "Foundation", name: "No Mercy", text: "3 Hope für +1 auf Angriffswürfe bis zur nächsten Rast." },
    ]},
  ],
  witch: [
    { name: "Hedge", feature: "Handwerk, das dich und die Gruppe stärkt.", features: [] },
    { name: "Moon", feature: "Himmelskraft, die Magie verstärkt.", features: [] },
  ],
  wizard: [
    { name: "School of Knowledge", feature: "Wissen als zusätzliche magische Wucht.", features: [
      { tier: "Mastery", name: "Have No Fear", text: "Der Extra-Schaden von Face Your Fear steigt auf 3d10." },
    ]},
    { name: "School of War", feature: "Gelernte Magie für Gewalt.", features: [
      { tier: "Mastery", name: "Thrive in Chaos", text: "Nach einem Treffer 1 Stress markieren, das Ziel markiert einen weiteren Hit Point." },
    ]},
  ],
};

function subclassesFor(className) {
  const key = String(className || "").toLowerCase();
  if (SUBCLASSES[key]) return SUBCLASSES[key].map((row) => ({ ...row }));
  return Object.values(SUBCLASSES).flat().map((row) => ({ ...row }));
}

function subclassRow(name) {
  return Object.values(SUBCLASSES).flat().find((s) => s.name === name);
}

function grantFeatures(character, names) {
  character.features = character.features || [];
  for (const feature of names) {
    if (!feature || character.features.some((f) => f.name === feature.name)) continue;
    character.features.push({ name: feature.name, text: feature.tier + ": " + feature.text });
  }
}

function applySubclass(character, name) {
  const picked = String(name || "").trim();
  if (!picked) return character;
  const row = subclassRow(picked);
  character.subclass = picked;
  character.features = character.features || [];
  if (row && !character.features.some((f) => f.name === picked)) {
    character.features.push({ name: picked, text: row.feature });
  }
  if (row) grantFeatures(character, (row.features || []).filter((f) => f.tier === "Foundation"));
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
  const row = subclassRow(character.subclass);
  if (row) grantFeatures(character, (row.features || []).filter((f) => f.tier === "Foundation"));
  if (row && character.level >= 5) {
    const spec = (row.features || []).filter((f) => f.tier === "Specialization");
    grantFeatures(character, spec);
    if (spec.length) gains.push(spec.map((f) => f.name).join(", "));
  }
  if (row && character.level >= 8) {
    const master = (row.features || []).filter((f) => f.tier === "Mastery");
    grantFeatures(character, master);
    if (master.length) gains.push(master.map((f) => f.name).join(", "));
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

