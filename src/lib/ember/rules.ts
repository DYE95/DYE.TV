export type TraitKey = "agility" | "strength" | "finesse" | "instinct" | "presence" | "knowledge";

export type Ink = "ember" | "hope" | "gold" | "fear" | "muted";

export type RollMode = "none" | "advantage" | "disadvantage";

export const TRAITS: { key: TraitKey; label: string }[] = [
  { key: "agility", label: "Gewandtheit" },
  { key: "strength", label: "Stärke" },
  { key: "finesse", label: "Finesse" },
  { key: "instinct", label: "Instinkt" },
  { key: "presence", label: "Präsenz" },
  { key: "knowledge", label: "Wissen" },
];

export const CLASSES = [
  { id: "Bard", label: "Barde" },
  { id: "Druid", label: "Druide" },
  { id: "Guardian", label: "Wächter" },
  { id: "Ranger", label: "Waldläufer" },
  { id: "Rogue", label: "Schurke" },
  { id: "Seraph", label: "Seraph" },
  { id: "Sorcerer", label: "Zauberer" },
  { id: "Warrior", label: "Krieger" },
  { id: "Wizard", label: "Magier" },
] as const;

export const FOES = [
  { id: "hound", name: "Ash Hound", difficulty: 12, hp: 4, attack: 1 },
  { id: "bramble", name: "Bramble", difficulty: 10, hp: 3, attack: 0 },
  { id: "thistle", name: "Thistlefolk Ambusher", difficulty: 12, hp: 3, attack: 2 },
  { id: "barnacle", name: "Barnacle", difficulty: 11, hp: 5, attack: 3 },
] as const;

export type RoomBot = { id: string; name: string; difficulty: number; attack: number };

export type SoloRoom = {
  id: string;
  name: string;
  clear: boolean;
  bot: RoomBot | null;
};

export type ActionRoll = {
  hopeDie: number;
  fearDie: number;
  advantageDie: number | null;
  mode: RollMode;
  total: number;
  hopeDelta: number;
  fearDelta: number;
  success: boolean;
  critical: boolean;
  withHope: boolean;
  label: string;
  spoken: string;
};

export function classLabel(id: string) {
  return CLASSES.find((c) => c.id === id)?.label || id || "ohne Klasse";
}

export function traitLabel(key: TraitKey) {
  return TRAITS.find((t) => t.key === key)?.label || key;
}

export function nid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Math.random().toString(36).slice(2, 4)}`;
}

export function fourPin() {
  return String(1000 + Math.floor(Math.random() * 9000));
}

export function nextCount(current: number, index: number, max: number) {
  const want = index + 1;
  const next = current === want ? index : want;
  return Math.max(0, Math.min(max, next));
}

export function rollDie(sides: number, rng: () => number = Math.random) {
  return 1 + Math.floor(rng() * sides);
}

export function resolveActionRoll(
  input: {
    hopeDie?: number;
    fearDie?: number;
    traitMod?: number;
    experiences?: { bonus: number }[];
    mode?: RollMode;
    advantageDie?: number;
    difficulty?: number;
  },
  rng: () => number = Math.random,
): ActionRoll {
  const hopeDie = input.hopeDie ?? rollDie(12, rng);
  const fearDie = input.fearDie ?? rollDie(12, rng);
  const traitMod = Number(input.traitMod || 0);
  const experiences = input.experiences || [];
  const expBonus = experiences.reduce((sum, exp) => sum + Number(exp.bonus || 0), 0);
  let adv = Number(input.advantageDie || 0);
  const mode: RollMode = input.mode || "none";
  if (!adv && mode === "advantage") adv = rollDie(6, rng);
  if (!adv && mode === "disadvantage") adv = rollDie(6, rng);
  const signedAdv = mode === "disadvantage" ? -adv : mode === "advantage" ? adv : 0;
  const total = hopeDie + fearDie + traitMod + expBonus + signedAdv;
  const critical = hopeDie === fearDie;
  const withHope = hopeDie > fearDie;
  const difficulty = Number(input.difficulty || 0);
  const success = !difficulty || total >= difficulty || critical;
  let hopeDelta = 0;
  let fearDelta = 0;
  if (critical || withHope) hopeDelta = 1;
  else fearDelta = 1;
  if (experiences.length) hopeDelta -= experiences.length;
  const label = critical
    ? "Kritischer Erfolg"
    : success
      ? withHope
        ? "Erfolg mit Hope"
        : "Erfolg mit Fear"
      : withHope
        ? "Fehlschlag mit Hope"
        : "Fehlschlag mit Fear";
  const traitStr = traitMod > 0 ? `+${traitMod}` : String(traitMod);
  const spoken = `Hope ${hopeDie} · Fear ${fearDie}${signedAdv ? ` · W6 ${signedAdv}` : ""} ${traitStr}${expBonus ? ` +XP ${expBonus}` : ""} = ${total}${difficulty ? ` gegen ${difficulty}` : ""} — ${label}`;
  return {
    hopeDie,
    fearDie,
    advantageDie: adv || null,
    mode,
    total,
    hopeDelta,
    fearDelta,
    success,
    critical,
    withHope,
    label,
    spoken,
  };
}

export function applyPools(
  pools: { hope: number; hopeMax?: number; fear: number; fearMax?: number },
  roll: { hopeDelta: number; fearDelta: number },
) {
  const hopeMax = pools.hopeMax == null ? 6 : Number(pools.hopeMax);
  const fearMax = pools.fearMax == null ? 12 : Number(pools.fearMax);
  const rawHope = Number(pools.hope || 0) + Number(roll.hopeDelta || 0);
  const rawFear = Number(pools.fear || 0) + Number(roll.fearDelta || 0);
  return {
    hope: Math.max(0, Math.min(hopeMax, rawHope)),
    fear: Math.max(0, Math.min(fearMax, rawFear)),
    unpaid: rawHope < 0 ? -rawHope : 0,
    clockTick: rawFear > fearMax ? 1 : 0,
  };
}

export function schwelleRooms(): SoloRoom[] {
  const specs: { name: string; foe: (typeof FOES)[number] | null }[] = [
    { name: "Schwelle 1", foe: FOES[0] },
    { name: "Krypta 2", foe: null },
    { name: "Brunnen 3", foe: FOES[2] },
    { name: "Galerie 4", foe: null },
  ];
  return specs.map((spec, index) => ({
    id: `room_${index}`,
    name: spec.name,
    clear: false,
    bot: spec.foe
      ? { id: spec.foe.id, name: spec.foe.name, difficulty: spec.foe.difficulty, attack: spec.foe.attack }
      : null,
  }));
}

export const ROOM_SPOTS = [
  { x: 24, y: 34 },
  { x: 62, y: 28 },
  { x: 38, y: 64 },
  { x: 74, y: 68 },
] as const;
