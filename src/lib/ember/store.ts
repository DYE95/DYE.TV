import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  applyPools,
  fourPin,
  nid,
  resolveActionRoll,
  ROOM_SPOTS,
  schwelleRooms,
  type ActionRoll,
  type Ink,
  type RollMode,
  type SoloRoom,
  type TraitKey,
} from "./rules";

export type Experience = { id: string; name: string; bonus: number };

export type Character = {
  id: string;
  name: string;
  pronouns: string;
  ancestry: string;
  klass: string;
  level: number;
  proficiency: number;
  traits: Record<TraitKey, number>;
  experiences: Experience[];
  hope: number;
  hopeMax: number;
  stress: number;
  stressMax: number;
  hp: number;
  hpMax: number;
  evasion: number;
  armor: number;
  armorMax: number;
  notes: string;
  ink: Ink;
  pin: string;
};

export type TokenKind = "pc" | "foe" | "mark";

export type Token = {
  id: string;
  label: string;
  kind: TokenKind;
  characterId: string | null;
  x: number;
  y: number;
  hp: number;
  hpMax: number;
  hidden: boolean;
  ink: Ink;
};

export type FogRect = { id: string; x: number; y: number; w: number; h: number };

export type InitRow = {
  id: string;
  label: string;
  kind: "pc" | "foe" | "gm";
  characterId: string | null;
  tokenId: string | null;
};

export type Initiative = { on: boolean; auto: boolean; round: number; index: number; order: InitRow[] };

export type LogLine = { id: string; text: string; kind: "roll" | "note" | "system" };

export type LastRoll = {
  roll: ActionRoll;
  characterId: string | null;
  name: string;
  hopeBefore: number;
  fearBefore: number;
  stressBefore: number;
  clockBefore: number;
  undone: boolean;
};

export type EmberData = {
  campaign: { name: string; frame: string; fear: number; fearMax: number; clock: number; notes: string };
  characters: Character[];
  tokens: Token[];
  fog: FogRect[];
  fogOn: boolean;
  initiative: Initiative;
  log: LogLine[];
  hands: string[];
  solo: { laid: boolean; rooms: SoloRoom[] };
  seatId: string | null;
  lastRoll: LastRoll | null;
};

const INKS: Ink[] = ["ember", "hope", "gold", "fear"];

function blankTraits(agility = 0): Record<TraitKey, number> {
  return { agility, strength: 0, finesse: 0, instinct: 0, presence: 0, knowledge: 0 };
}

function fresh(): EmberData {
  return {
    campaign: { name: "Die Glut", frame: "Age of Umbra", fear: 0, fearMax: 12, clock: 0, notes: "" },
    characters: [],
    tokens: [],
    fog: [],
    fogOn: false,
    initiative: { on: false, auto: true, round: 1, index: 0, order: [] },
    log: [],
    hands: [],
    solo: { laid: false, rooms: [] },
    seatId: null,
    lastRoll: null,
  };
}

function pushLog(log: LogLine[], text: string, kind: LogLine["kind"]): LogLine[] {
  return [{ id: nid("log"), text, kind }, ...log].slice(0, 80);
}

function makeCharacter(partial: { name: string; klass: string; ancestry?: string; ink?: Ink; agility?: number; hope?: number }): Character {
  return {
    id: nid("pc"),
    name: partial.name.trim() || "Unbenannt",
    pronouns: "",
    ancestry: partial.ancestry?.trim() || "",
    klass: partial.klass || "Rogue",
    level: 1,
    proficiency: 1,
    traits: blankTraits(partial.agility ?? 1),
    experiences: [],
    hope: partial.hope ?? 2,
    hopeMax: 6,
    stress: 0,
    stressMax: 6,
    hp: 0,
    hpMax: 6,
    evasion: 10,
    armor: 0,
    armorMax: 3,
    notes: "",
    ink: partial.ink || "ember",
    pin: fourPin(),
  };
}

export function seedOrder(tokens: Token[]): InitRow[] {
  const order: InitRow[] = [];
  tokens
    .filter((token) => token.kind === "pc")
    .forEach((token) =>
      order.push({ id: nid("ini"), label: token.label, kind: "pc", characterId: token.characterId, tokenId: token.id }),
    );
  tokens
    .filter((token) => token.kind === "foe")
    .forEach((token) =>
      order.push({ id: nid("ini"), label: token.label, kind: "foe", characterId: null, tokenId: token.id }),
    );
  order.push({ id: nid("ini"), label: "SL", kind: "gm", characterId: null, tokenId: null });
  return order;
}

type Actions = {
  setCampaignName: (name: string) => void;
  setNotes: (notes: string) => void;
  setFear: (fear: number) => void;
  addCharacter: (partial: { name: string; klass: string; ancestry?: string }) => string;
  patchCharacter: (id: string, patch: Partial<Omit<Character, "id" | "traits" | "experiences">>) => void;
  setTrait: (id: string, key: TraitKey, value: number) => void;
  setPool: (id: string, key: "hope" | "stress" | "hp" | "armor", value: number) => void;
  addExperience: (id: string, name: string, bonus: number) => void;
  removeExperience: (id: string, expId: string) => void;
  removeCharacter: (id: string) => void;
  sit: (id: string | null) => void;
  addToken: (partial: { label: string; kind: TokenKind; x?: number; y?: number; hpMax?: number; ink?: Ink; hidden?: boolean }) => void;
  moveToken: (id: string, x: number, y: number) => void;
  patchToken: (id: string, patch: Partial<Omit<Token, "id">>) => void;
  removeToken: (id: string) => void;
  addFog: (fog: Omit<FogRect, "id">) => void;
  removeFog: (id: string) => void;
  setFogOn: (on: boolean) => void;
  seedInitiative: () => void;
  stepInitiative: (dir: 1 | -1) => void;
  focusRow: (id: string) => void;
  toggleAuto: () => void;
  rollFor: (
    characterId: string | null,
    opts: { trait: TraitKey; mode: RollMode; difficulty: number; experienceIds: string[] },
  ) => void;
  undoRoll: () => void;
  note: (text: string) => void;
  raiseHand: (characterId: string) => void;
  giveLight: (characterId: string) => void;
  laySchwelle: () => { ok: boolean; reason: string };
  clearRoom: (roomId: string) => { text: string; success: boolean } | null;
  resetTable: () => void;
};

const memoryStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useEmber = create<EmberData & Actions>()(
  persist(
    (set, get) => ({
      ...fresh(),
      setCampaignName: (name) => set((s) => ({ campaign: { ...s.campaign, name: name.slice(0, 80) } })),
      setNotes: (notes) => set((s) => ({ campaign: { ...s.campaign, notes: notes.slice(0, 4000) } })),
      setFear: (fear) =>
        set((s) => ({ campaign: { ...s.campaign, fear: Math.max(0, Math.min(s.campaign.fearMax, fear)) } })),
      addCharacter: (partial) => {
        const ink = INKS[get().characters.length % INKS.length];
        const character = makeCharacter({ ...partial, ink });
        const spot = get().tokens.filter((token) => token.kind === "pc").length;
        const token: Token = {
          id: nid("tok"),
          label: character.name,
          kind: "pc",
          characterId: character.id,
          x: 16 + (spot % 5) * 14,
          y: 78,
          hp: 0,
          hpMax: character.hpMax,
          hidden: false,
          ink,
        };
        set((s) => ({
          characters: [...s.characters, character],
          tokens: [...s.tokens, token],
          log: pushLog(s.log, `${character.name} setzt sich. PIN ${character.pin}.`, "system"),
        }));
        return character.id;
      },
      patchCharacter: (id, patch) =>
        set((s) => ({
          characters: s.characters.map((character) => (character.id === id ? { ...character, ...patch } : character)),
          tokens: patch.name
            ? s.tokens.map((token) => (token.characterId === id ? { ...token, label: patch.name || token.label } : token))
            : s.tokens,
          initiative: patch.name
            ? {
                ...s.initiative,
                order: s.initiative.order.map((row) =>
                  row.characterId === id ? { ...row, label: patch.name || row.label } : row,
                ),
              }
            : s.initiative,
        })),
      setTrait: (id, key, value) =>
        set((s) => ({
          characters: s.characters.map((character) =>
            character.id === id
              ? { ...character, traits: { ...character.traits, [key]: Math.max(-1, Math.min(5, value)) } }
              : character,
          ),
        })),
      setPool: (id, key, value) =>
        set((s) => ({
          characters: s.characters.map((character) => {
            if (character.id !== id) return character;
            const max =
              key === "hope" ? character.hopeMax : key === "stress" ? character.stressMax : key === "hp" ? character.hpMax : character.armorMax;
            return { ...character, [key]: Math.max(0, Math.min(max, value)) };
          }),
          tokens:
            key === "hp"
              ? s.tokens.map((token) => (token.characterId === id ? { ...token, hp: Math.max(0, value) } : token))
              : s.tokens,
        })),
      addExperience: (id, name, bonus) =>
        set((s) => ({
          characters: s.characters.map((character) =>
            character.id === id
              ? {
                  ...character,
                  experiences: [
                    ...character.experiences,
                    { id: nid("xp"), name: name.trim() || "Erfahrung", bonus: Math.max(1, Math.min(5, bonus || 2)) },
                  ],
                }
              : character,
          ),
        })),
      removeExperience: (id, expId) =>
        set((s) => ({
          characters: s.characters.map((character) =>
            character.id === id
              ? { ...character, experiences: character.experiences.filter((exp) => exp.id !== expId) }
              : character,
          ),
        })),
      removeCharacter: (id) =>
        set((s) => ({
          characters: s.characters.filter((character) => character.id !== id),
          tokens: s.tokens.filter((token) => token.characterId !== id),
          hands: s.hands.filter((hand) => hand !== id),
          seatId: s.seatId === id ? null : s.seatId,
          initiative: {
            ...s.initiative,
            order: s.initiative.order.filter((row) => row.characterId !== id),
          },
        })),
      sit: (id) => set({ seatId: id }),
      addToken: (partial) => {
        const token: Token = {
          id: nid("tok"),
          label: partial.label.trim() || "Figur",
          kind: partial.kind,
          characterId: null,
          x: partial.x ?? 50,
          y: partial.y ?? 46,
          hp: 0,
          hpMax: partial.hpMax ?? (partial.kind === "foe" ? 4 : 1),
          hidden: Boolean(partial.hidden),
          ink: partial.ink ?? (partial.kind === "foe" ? "fear" : partial.kind === "pc" ? "hope" : "muted"),
        };
        set((s) => ({
          tokens: [...s.tokens, token],
          log: pushLog(s.log, `${token.label} steht auf der Karte.`, "system"),
        }));
      },
      moveToken: (id, x, y) =>
        set((s) => ({
          tokens: s.tokens.map((token) =>
            token.id === id ? { ...token, x: Math.max(3, Math.min(97, x)), y: Math.max(4, Math.min(96, y)) } : token,
          ),
        })),
      patchToken: (id, patch) =>
        set((s) => ({
          tokens: s.tokens.map((token) => (token.id === id ? { ...token, ...patch } : token)),
        })),
      removeToken: (id) => set((s) => ({ tokens: s.tokens.filter((token) => token.id !== id) })),
      addFog: (fog) => set((s) => ({ fog: [...s.fog, { ...fog, id: nid("fog") }], fogOn: true })),
      removeFog: (id) => set((s) => ({ fog: s.fog.filter((fog) => fog.id !== id) })),
      setFogOn: (on) => set({ fogOn: on }),
      seedInitiative: () =>
        set((s) => ({
          initiative: { on: true, auto: s.initiative.auto, round: 1, index: 0, order: seedOrder(s.tokens) },
          log: pushLog(s.log, "Reihenfolge liegt. Runde 1.", "system"),
        })),
      stepInitiative: (dir) =>
        set((s) => {
          if (!s.initiative.order.length) return {};
          let index = s.initiative.index + dir;
          let round = s.initiative.round;
          if (index >= s.initiative.order.length) {
            index = 0;
            round += 1;
          }
          if (index < 0) {
            index = s.initiative.order.length - 1;
            round = Math.max(1, round - 1);
          }
          const who = s.initiative.order[index];
          return {
            initiative: { ...s.initiative, on: true, index, round },
            log: pushLog(s.log, `Runde ${round} — ${who?.label || "Jemand"} ist dran.`, "system"),
          };
        }),
      focusRow: (id) =>
        set((s) => {
          const index = s.initiative.order.findIndex((row) => row.id === id);
          if (index < 0) return {};
          return { initiative: { ...s.initiative, on: true, index } };
        }),
      toggleAuto: () => set((s) => ({ initiative: { ...s.initiative, auto: !s.initiative.auto } })),
      rollFor: (characterId, opts) => {
        const s = get();
        const pc = characterId ? s.characters.find((character) => character.id === characterId) : undefined;
        const spent = pc ? pc.experiences.filter((exp) => opts.experienceIds.includes(exp.id)) : [];
        const roll = resolveActionRoll({
          traitMod: pc ? pc.traits[opts.trait] : 0,
          experiences: spent,
          mode: opts.mode,
          difficulty: opts.difficulty,
        });
        const pools = applyPools(
          { hope: pc?.hope ?? 0, hopeMax: pc?.hopeMax, fear: s.campaign.fear, fearMax: s.campaign.fearMax },
          roll,
        );
        const stress = pc ? Math.min(pc.stressMax, pc.stress + pools.unpaid) : 0;
        let initiative = s.initiative;
        if (pc && initiative.on && initiative.auto && initiative.order.length) {
          const row = initiative.order[initiative.index];
          if (row && row.kind === "pc" && row.characterId === pc.id) {
            let index = initiative.index + 1;
            let round = initiative.round;
            if (index >= initiative.order.length) {
              index = 0;
              round += 1;
            }
            initiative = { ...initiative, index, round };
          }
        }
        const who = pc?.name || "Der Tisch";
        const extra = [
          pools.clockTick ? "Die Uhr schlägt." : "",
          pools.unpaid ? `Hope reichte nicht, Stress +${pools.unpaid}.` : "",
        ]
          .filter(Boolean)
          .join(" ");
        set({
          characters: s.characters.map((character) =>
            character.id === pc?.id ? { ...character, hope: pools.hope, stress } : character,
          ),
          campaign: { ...s.campaign, fear: pools.fear, clock: s.campaign.clock + pools.clockTick },
          initiative,
          lastRoll: {
            roll,
            characterId: pc?.id ?? null,
            name: who,
            hopeBefore: pc?.hope ?? 0,
            fearBefore: s.campaign.fear,
            stressBefore: pc?.stress ?? 0,
            clockBefore: s.campaign.clock,
            undone: false,
          },
          log: pushLog(s.log, `${who}: ${roll.spoken}${extra ? ` ${extra}` : ""}`, "roll"),
        });
      },
      undoRoll: () => {
        const s = get();
        const last = s.lastRoll;
        if (!last || last.undone) return;
        set({
          characters: s.characters.map((character) =>
            character.id === last.characterId
              ? { ...character, hope: last.hopeBefore, stress: last.stressBefore }
              : character,
          ),
          campaign: { ...s.campaign, fear: last.fearBefore, clock: last.clockBefore },
          lastRoll: { ...last, undone: true },
          log: pushLog(s.log, "Wurf zurückgenommen.", "system"),
        });
      },
      note: (text) => {
        const line = text.trim();
        if (!line) return;
        set((s) => ({ log: pushLog(s.log, line, "note") }));
      },
      raiseHand: (characterId) =>
        set((s) => {
          const up = s.hands.includes(characterId);
          const name = s.characters.find((character) => character.id === characterId)?.name || "Jemand";
          return {
            hands: up ? s.hands.filter((id) => id !== characterId) : [...s.hands, characterId],
            log: pushLog(s.log, up ? `${name} nimmt die Hand runter.` : `${name} will das Licht.`, "system"),
          };
        }),
      giveLight: (characterId) =>
        set((s) => {
          const name = s.characters.find((character) => character.id === characterId)?.name || "Jemand";
          let order = s.initiative.order.length ? s.initiative.order.slice() : seedOrder(s.tokens);
          let index = order.findIndex((row) => row.characterId === characterId);
          if (index < 0) {
            const row: InitRow = { id: nid("ini"), label: name, kind: "pc", characterId, tokenId: null };
            const gmAt = order.findIndex((entry) => entry.kind === "gm");
            if (gmAt >= 0) order.splice(gmAt, 0, row);
            else order.push(row);
            index = order.findIndex((entry) => entry.characterId === characterId);
          }
          return {
            initiative: { ...s.initiative, on: true, order, index },
            hands: s.hands.filter((id) => id !== characterId),
            log: pushLog(s.log, `${name} hat das Licht.`, "system"),
          };
        }),
      laySchwelle: () => {
        const s = get();
        if (s.solo.laid) return { ok: false, reason: "Liegt schon. Die Schwelle bleibt, wo sie ist." };
        if (s.characters.length > 0 && s.campaign.name !== "Asche unter der Schwelle") {
          return { ok: false, reason: "Offene Session bleibt liegen. Leer den Tisch, wenn die Schwelle drankommen soll." };
        }
        const rooms = schwelleRooms();
        const ira = makeCharacter({ name: "Ira", klass: "Rogue", ancestry: "Unter der Schwelle", ink: "ember", agility: 2, hope: 2 });
        const tokens: Token[] = [
          {
            id: nid("tok"),
            label: "Ira",
            kind: "pc",
            characterId: ira.id,
            x: 18,
            y: 80,
            hp: 0,
            hpMax: ira.hpMax,
            hidden: false,
            ink: "ember",
          },
          ...rooms.map((room, index) => ({
            id: nid("tok"),
            label: room.bot ? room.bot.name : room.name,
            kind: (room.bot ? "foe" : "mark") as TokenKind,
            characterId: null,
            x: ROOM_SPOTS[index].x,
            y: ROOM_SPOTS[index].y,
            hp: 0,
            hpMax: room.bot ? 4 : 1,
            hidden: false,
            ink: (room.bot ? "fear" : "muted") as Ink,
          })),
        ];
        set({
          campaign: {
            name: "Asche unter der Schwelle",
            frame: "Age of Umbra",
            fear: 2,
            fearMax: 12,
            clock: 0,
            notes: "Vier Räume. Schwelle, Krypta, Brunnen, Galerie. Zwei bleiben dunkel.",
          },
          characters: [ira],
          tokens,
          fog: [],
          fogOn: false,
          initiative: { on: false, auto: true, round: 1, index: 0, order: [] },
          hands: [],
          solo: { laid: true, rooms },
          seatId: ira.id,
          lastRoll: null,
          log: pushLog([], "Asche unter der Schwelle liegt. Ira wartet an der Tür.", "system"),
        });
        return { ok: true, reason: "Vier Räume. Zwei Gegner. Ira sitzt." };
      },
      clearRoom: (roomId) => {
        const s = get();
        const room = s.solo.rooms.find((entry) => entry.id === roomId);
        const pc = s.characters.find((character) => character.id === s.seatId) || s.characters[0];
        if (!room || room.clear || !pc) return null;
        const difficulty = room.bot?.difficulty ?? 10;
        const roll = resolveActionRoll({ traitMod: pc.traits.agility, mode: "none", difficulty });
        const pools = applyPools(
          { hope: pc.hope, hopeMax: pc.hopeMax, fear: s.campaign.fear, fearMax: s.campaign.fearMax },
          roll,
        );
        const rooms = s.solo.rooms.map((entry) =>
          entry.id === roomId && roll.success ? { ...entry, clear: true } : entry,
        );
        const allClear = rooms.every((entry) => entry.clear);
        let characters = s.characters.map((character) =>
          character.id === pc.id ? { ...character, hope: pools.hope, stress: Math.min(character.stressMax, character.stress + pools.unpaid) } : character,
        );
        let banner = roll.success ? "Geräumt." : "Bleibt dunkel.";
        if (allClear) {
          characters = characters.map((character) => {
            if (character.id !== pc.id) return character;
            const level = Math.min(10, character.level + 1);
            const proficiency = [2, 5, 8].includes(level) ? character.proficiency + 1 : character.proficiency;
            return { ...character, level, proficiency };
          });
          banner = "Alle Räume leer. Level +1.";
        }
        const text = `${room.name}: ${roll.spoken} — ${banner}`;
        set({
          characters,
          campaign: { ...s.campaign, fear: pools.fear, clock: s.campaign.clock + pools.clockTick },
          solo: { laid: true, rooms },
          tokens: s.tokens.map((token) =>
            room.bot && roll.success && token.label === room.bot.name ? { ...token, hp: token.hpMax } : token,
          ),
          lastRoll: {
            roll,
            characterId: pc.id,
            name: pc.name,
            hopeBefore: pc.hope,
            fearBefore: s.campaign.fear,
            stressBefore: pc.stress,
            clockBefore: s.campaign.clock,
            undone: false,
          },
          log: pushLog(s.log, text, "roll"),
        });
        return { text, success: roll.success };
      },
      resetTable: () => set(fresh()),
    }),
    {
      name: "ember.table.v1",
      skipHydration: true,
      storage: createJSONStorage(() => (typeof window === "undefined" ? memoryStorage : localStorage)),
      version: 1,
    },
  ),
);
