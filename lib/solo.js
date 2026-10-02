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
  return {
    hope, fear, total, hit,
    text: bot.name + " würfelt Hope " + hope + " · Fear " + fear + " +" + (bot.attack || 0) + " = " + total + " gegen " + target + " — " + (hit ? "trifft" : "verfehlt"),
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

module.exports = { list, find, act, generate };
