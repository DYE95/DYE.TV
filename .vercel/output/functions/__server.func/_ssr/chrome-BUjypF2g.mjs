import { i as __toESM } from "../_runtime.mjs";
import { q as require_react, x as require_jsx_runtime, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as Flame } from "../_libs/lucide-react.mjs";
import { n as persist, r as create, t as createJSONStorage } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/chrome-BUjypF2g.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var TRAITS = [
	{
		key: "agility",
		label: "Gewandtheit"
	},
	{
		key: "strength",
		label: "Stärke"
	},
	{
		key: "finesse",
		label: "Finesse"
	},
	{
		key: "instinct",
		label: "Instinkt"
	},
	{
		key: "presence",
		label: "Präsenz"
	},
	{
		key: "knowledge",
		label: "Wissen"
	}
];
var CLASSES = [
	{
		id: "Bard",
		label: "Barde"
	},
	{
		id: "Druid",
		label: "Druide"
	},
	{
		id: "Guardian",
		label: "Wächter"
	},
	{
		id: "Ranger",
		label: "Waldläufer"
	},
	{
		id: "Rogue",
		label: "Schurke"
	},
	{
		id: "Seraph",
		label: "Seraph"
	},
	{
		id: "Sorcerer",
		label: "Zauberer"
	},
	{
		id: "Warrior",
		label: "Krieger"
	},
	{
		id: "Wizard",
		label: "Magier"
	}
];
var FOES = [
	{
		id: "hound",
		name: "Ash Hound",
		difficulty: 12,
		hp: 4,
		attack: 1
	},
	{
		id: "bramble",
		name: "Bramble",
		difficulty: 10,
		hp: 3,
		attack: 0
	},
	{
		id: "thistle",
		name: "Thistlefolk Ambusher",
		difficulty: 12,
		hp: 3,
		attack: 2
	},
	{
		id: "barnacle",
		name: "Barnacle",
		difficulty: 11,
		hp: 5,
		attack: 3
	}
];
function classLabel(id) {
	return CLASSES.find((c) => c.id === id)?.label || id || "ohne Klasse";
}
function traitLabel(key) {
	return TRAITS.find((t) => t.key === key)?.label || key;
}
function nid(prefix) {
	return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Math.random().toString(36).slice(2, 4)}`;
}
function fourPin() {
	return String(1e3 + Math.floor(Math.random() * 9e3));
}
function nextCount(current, index, max) {
	const want = index + 1;
	return Math.max(0, Math.min(max, current === want ? index : want));
}
function rollDie(sides, rng = Math.random) {
	return 1 + Math.floor(rng() * sides);
}
function resolveActionRoll(input, rng = Math.random) {
	const hopeDie = input.hopeDie ?? rollDie(12, rng);
	const fearDie = input.fearDie ?? rollDie(12, rng);
	const traitMod = Number(input.traitMod || 0);
	const experiences = input.experiences || [];
	const expBonus = experiences.reduce((sum, exp) => sum + Number(exp.bonus || 0), 0);
	let adv = Number(input.advantageDie || 0);
	const mode = input.mode || "none";
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
	const label = critical ? "Kritischer Erfolg" : success ? withHope ? "Erfolg mit Hope" : "Erfolg mit Fear" : withHope ? "Fehlschlag mit Hope" : "Fehlschlag mit Fear";
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
		spoken
	};
}
function applyPools(pools, roll) {
	const hopeMax = pools.hopeMax == null ? 6 : Number(pools.hopeMax);
	const fearMax = pools.fearMax == null ? 12 : Number(pools.fearMax);
	const rawHope = Number(pools.hope || 0) + Number(roll.hopeDelta || 0);
	const rawFear = Number(pools.fear || 0) + Number(roll.fearDelta || 0);
	return {
		hope: Math.max(0, Math.min(hopeMax, rawHope)),
		fear: Math.max(0, Math.min(fearMax, rawFear)),
		unpaid: rawHope < 0 ? -rawHope : 0,
		clockTick: rawFear > fearMax ? 1 : 0
	};
}
function schwelleRooms() {
	return [
		{
			name: "Schwelle 1",
			foe: FOES[0]
		},
		{
			name: "Krypta 2",
			foe: null
		},
		{
			name: "Brunnen 3",
			foe: FOES[2]
		},
		{
			name: "Galerie 4",
			foe: null
		}
	].map((spec, index) => ({
		id: `room_${index}`,
		name: spec.name,
		clear: false,
		bot: spec.foe ? {
			id: spec.foe.id,
			name: spec.foe.name,
			difficulty: spec.foe.difficulty,
			attack: spec.foe.attack
		} : null
	}));
}
var ROOM_SPOTS = [
	{
		x: 24,
		y: 34
	},
	{
		x: 62,
		y: 28
	},
	{
		x: 38,
		y: 64
	},
	{
		x: 74,
		y: 68
	}
];
var INKS = [
	"ember",
	"hope",
	"gold",
	"fear"
];
function blankTraits(agility = 0) {
	return {
		agility,
		strength: 0,
		finesse: 0,
		instinct: 0,
		presence: 0,
		knowledge: 0
	};
}
function fresh() {
	return {
		campaign: {
			name: "Die Glut",
			frame: "Age of Umbra",
			fear: 0,
			fearMax: 12,
			clock: 0,
			notes: ""
		},
		characters: [],
		tokens: [],
		fog: [],
		fogOn: false,
		initiative: {
			on: false,
			auto: true,
			round: 1,
			index: 0,
			order: []
		},
		log: [],
		hands: [],
		solo: {
			laid: false,
			rooms: []
		},
		seatId: null,
		lastRoll: null
	};
}
function pushLog(log, text, kind) {
	return [{
		id: nid("log"),
		text,
		kind
	}, ...log].slice(0, 80);
}
function makeCharacter(partial) {
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
		pin: fourPin()
	};
}
function seedOrder(tokens) {
	const order = [];
	tokens.filter((token) => token.kind === "pc").forEach((token) => order.push({
		id: nid("ini"),
		label: token.label,
		kind: "pc",
		characterId: token.characterId,
		tokenId: token.id
	}));
	tokens.filter((token) => token.kind === "foe").forEach((token) => order.push({
		id: nid("ini"),
		label: token.label,
		kind: "foe",
		characterId: null,
		tokenId: token.id
	}));
	order.push({
		id: nid("ini"),
		label: "SL",
		kind: "gm",
		characterId: null,
		tokenId: null
	});
	return order;
}
var memoryStorage = {
	getItem: () => null,
	setItem: () => {},
	removeItem: () => {}
};
var useEmber = create()(persist((set, get) => ({
	...fresh(),
	setCampaignName: (name) => set((s) => ({ campaign: {
		...s.campaign,
		name: name.slice(0, 80)
	} })),
	setNotes: (notes) => set((s) => ({ campaign: {
		...s.campaign,
		notes: notes.slice(0, 4e3)
	} })),
	setFear: (fear) => set((s) => ({ campaign: {
		...s.campaign,
		fear: Math.max(0, Math.min(s.campaign.fearMax, fear))
	} })),
	addCharacter: (partial) => {
		const ink = INKS[get().characters.length % INKS.length];
		const character = makeCharacter({
			...partial,
			ink
		});
		const spot = get().tokens.filter((token) => token.kind === "pc").length;
		const token = {
			id: nid("tok"),
			label: character.name,
			kind: "pc",
			characterId: character.id,
			x: 16 + spot % 5 * 14,
			y: 78,
			hp: 0,
			hpMax: character.hpMax,
			hidden: false,
			ink
		};
		set((s) => ({
			characters: [...s.characters, character],
			tokens: [...s.tokens, token],
			log: pushLog(s.log, `${character.name} setzt sich. PIN ${character.pin}.`, "system")
		}));
		return character.id;
	},
	patchCharacter: (id, patch) => set((s) => ({
		characters: s.characters.map((character) => character.id === id ? {
			...character,
			...patch
		} : character),
		tokens: patch.name ? s.tokens.map((token) => token.characterId === id ? {
			...token,
			label: patch.name || token.label
		} : token) : s.tokens,
		initiative: patch.name ? {
			...s.initiative,
			order: s.initiative.order.map((row) => row.characterId === id ? {
				...row,
				label: patch.name || row.label
			} : row)
		} : s.initiative
	})),
	setTrait: (id, key, value) => set((s) => ({ characters: s.characters.map((character) => character.id === id ? {
		...character,
		traits: {
			...character.traits,
			[key]: Math.max(-1, Math.min(5, value))
		}
	} : character) })),
	setPool: (id, key, value) => set((s) => ({
		characters: s.characters.map((character) => {
			if (character.id !== id) return character;
			const max = key === "hope" ? character.hopeMax : key === "stress" ? character.stressMax : key === "hp" ? character.hpMax : character.armorMax;
			return {
				...character,
				[key]: Math.max(0, Math.min(max, value))
			};
		}),
		tokens: key === "hp" ? s.tokens.map((token) => token.characterId === id ? {
			...token,
			hp: Math.max(0, value)
		} : token) : s.tokens
	})),
	addExperience: (id, name, bonus) => set((s) => ({ characters: s.characters.map((character) => character.id === id ? {
		...character,
		experiences: [...character.experiences, {
			id: nid("xp"),
			name: name.trim() || "Erfahrung",
			bonus: Math.max(1, Math.min(5, bonus || 2))
		}]
	} : character) })),
	removeExperience: (id, expId) => set((s) => ({ characters: s.characters.map((character) => character.id === id ? {
		...character,
		experiences: character.experiences.filter((exp) => exp.id !== expId)
	} : character) })),
	removeCharacter: (id) => set((s) => ({
		characters: s.characters.filter((character) => character.id !== id),
		tokens: s.tokens.filter((token) => token.characterId !== id),
		hands: s.hands.filter((hand) => hand !== id),
		seatId: s.seatId === id ? null : s.seatId,
		initiative: {
			...s.initiative,
			order: s.initiative.order.filter((row) => row.characterId !== id)
		}
	})),
	sit: (id) => set({ seatId: id }),
	addToken: (partial) => {
		const token = {
			id: nid("tok"),
			label: partial.label.trim() || "Figur",
			kind: partial.kind,
			characterId: null,
			x: partial.x ?? 50,
			y: partial.y ?? 46,
			hp: 0,
			hpMax: partial.hpMax ?? (partial.kind === "foe" ? 4 : 1),
			hidden: Boolean(partial.hidden),
			ink: partial.ink ?? (partial.kind === "foe" ? "fear" : partial.kind === "pc" ? "hope" : "muted")
		};
		set((s) => ({
			tokens: [...s.tokens, token],
			log: pushLog(s.log, `${token.label} steht auf der Karte.`, "system")
		}));
	},
	moveToken: (id, x, y) => set((s) => ({ tokens: s.tokens.map((token) => token.id === id ? {
		...token,
		x: Math.max(3, Math.min(97, x)),
		y: Math.max(4, Math.min(96, y))
	} : token) })),
	patchToken: (id, patch) => set((s) => ({ tokens: s.tokens.map((token) => token.id === id ? {
		...token,
		...patch
	} : token) })),
	removeToken: (id) => set((s) => ({ tokens: s.tokens.filter((token) => token.id !== id) })),
	addFog: (fog) => set((s) => ({
		fog: [...s.fog, {
			...fog,
			id: nid("fog")
		}],
		fogOn: true
	})),
	removeFog: (id) => set((s) => ({ fog: s.fog.filter((fog) => fog.id !== id) })),
	setFogOn: (on) => set({ fogOn: on }),
	seedInitiative: () => set((s) => ({
		initiative: {
			on: true,
			auto: s.initiative.auto,
			round: 1,
			index: 0,
			order: seedOrder(s.tokens)
		},
		log: pushLog(s.log, "Reihenfolge liegt. Runde 1.", "system")
	})),
	stepInitiative: (dir) => set((s) => {
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
			initiative: {
				...s.initiative,
				on: true,
				index,
				round
			},
			log: pushLog(s.log, `Runde ${round} — ${who?.label || "Jemand"} ist dran.`, "system")
		};
	}),
	focusRow: (id) => set((s) => {
		const index = s.initiative.order.findIndex((row) => row.id === id);
		if (index < 0) return {};
		return { initiative: {
			...s.initiative,
			on: true,
			index
		} };
	}),
	toggleAuto: () => set((s) => ({ initiative: {
		...s.initiative,
		auto: !s.initiative.auto
	} })),
	rollFor: (characterId, opts) => {
		const s = get();
		const pc = characterId ? s.characters.find((character) => character.id === characterId) : void 0;
		const spent = pc ? pc.experiences.filter((exp) => opts.experienceIds.includes(exp.id)) : [];
		const roll = resolveActionRoll({
			traitMod: pc ? pc.traits[opts.trait] : 0,
			experiences: spent,
			mode: opts.mode,
			difficulty: opts.difficulty
		});
		const pools = applyPools({
			hope: pc?.hope ?? 0,
			hopeMax: pc?.hopeMax,
			fear: s.campaign.fear,
			fearMax: s.campaign.fearMax
		}, roll);
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
				initiative = {
					...initiative,
					index,
					round
				};
			}
		}
		const who = pc?.name || "Der Tisch";
		const extra = [pools.clockTick ? "Die Uhr schlägt." : "", pools.unpaid ? `Hope reichte nicht, Stress +${pools.unpaid}.` : ""].filter(Boolean).join(" ");
		set({
			characters: s.characters.map((character) => character.id === pc?.id ? {
				...character,
				hope: pools.hope,
				stress
			} : character),
			campaign: {
				...s.campaign,
				fear: pools.fear,
				clock: s.campaign.clock + pools.clockTick
			},
			initiative,
			lastRoll: {
				roll,
				characterId: pc?.id ?? null,
				name: who,
				hopeBefore: pc?.hope ?? 0,
				fearBefore: s.campaign.fear,
				stressBefore: pc?.stress ?? 0,
				clockBefore: s.campaign.clock,
				undone: false
			},
			log: pushLog(s.log, `${who}: ${roll.spoken}${extra ? ` ${extra}` : ""}`, "roll")
		});
	},
	undoRoll: () => {
		const s = get();
		const last = s.lastRoll;
		if (!last || last.undone) return;
		set({
			characters: s.characters.map((character) => character.id === last.characterId ? {
				...character,
				hope: last.hopeBefore,
				stress: last.stressBefore
			} : character),
			campaign: {
				...s.campaign,
				fear: last.fearBefore,
				clock: last.clockBefore
			},
			lastRoll: {
				...last,
				undone: true
			},
			log: pushLog(s.log, "Wurf zurückgenommen.", "system")
		});
	},
	note: (text) => {
		const line = text.trim();
		if (!line) return;
		set((s) => ({ log: pushLog(s.log, line, "note") }));
	},
	raiseHand: (characterId) => set((s) => {
		const up = s.hands.includes(characterId);
		const name = s.characters.find((character) => character.id === characterId)?.name || "Jemand";
		return {
			hands: up ? s.hands.filter((id) => id !== characterId) : [...s.hands, characterId],
			log: pushLog(s.log, up ? `${name} nimmt die Hand runter.` : `${name} will das Licht.`, "system")
		};
	}),
	giveLight: (characterId) => set((s) => {
		const name = s.characters.find((character) => character.id === characterId)?.name || "Jemand";
		let order = s.initiative.order.length ? s.initiative.order.slice() : seedOrder(s.tokens);
		let index = order.findIndex((row) => row.characterId === characterId);
		if (index < 0) {
			const row = {
				id: nid("ini"),
				label: name,
				kind: "pc",
				characterId,
				tokenId: null
			};
			const gmAt = order.findIndex((entry) => entry.kind === "gm");
			if (gmAt >= 0) order.splice(gmAt, 0, row);
			else order.push(row);
			index = order.findIndex((entry) => entry.characterId === characterId);
		}
		return {
			initiative: {
				...s.initiative,
				on: true,
				order,
				index
			},
			hands: s.hands.filter((id) => id !== characterId),
			log: pushLog(s.log, `${name} hat das Licht.`, "system")
		};
	}),
	laySchwelle: () => {
		const s = get();
		if (s.solo.laid) return {
			ok: false,
			reason: "Liegt schon. Die Schwelle bleibt, wo sie ist."
		};
		if (s.characters.length > 0 && s.campaign.name !== "Asche unter der Schwelle") return {
			ok: false,
			reason: "Offene Session bleibt liegen. Leer den Tisch, wenn die Schwelle drankommen soll."
		};
		const rooms = schwelleRooms();
		const ira = makeCharacter({
			name: "Ira",
			klass: "Rogue",
			ancestry: "Unter der Schwelle",
			ink: "ember",
			agility: 2,
			hope: 2
		});
		const tokens = [{
			id: nid("tok"),
			label: "Ira",
			kind: "pc",
			characterId: ira.id,
			x: 18,
			y: 80,
			hp: 0,
			hpMax: ira.hpMax,
			hidden: false,
			ink: "ember"
		}, ...rooms.map((room, index) => ({
			id: nid("tok"),
			label: room.bot ? room.bot.name : room.name,
			kind: room.bot ? "foe" : "mark",
			characterId: null,
			x: ROOM_SPOTS[index].x,
			y: ROOM_SPOTS[index].y,
			hp: 0,
			hpMax: room.bot ? 4 : 1,
			hidden: false,
			ink: room.bot ? "fear" : "muted"
		}))];
		set({
			campaign: {
				name: "Asche unter der Schwelle",
				frame: "Age of Umbra",
				fear: 2,
				fearMax: 12,
				clock: 0,
				notes: "Vier Räume. Schwelle, Krypta, Brunnen, Galerie. Zwei bleiben dunkel."
			},
			characters: [ira],
			tokens,
			fog: [],
			fogOn: false,
			initiative: {
				on: false,
				auto: true,
				round: 1,
				index: 0,
				order: []
			},
			hands: [],
			solo: {
				laid: true,
				rooms
			},
			seatId: ira.id,
			lastRoll: null,
			log: pushLog([], "Asche unter der Schwelle liegt. Ira wartet an der Tür.", "system")
		});
		return {
			ok: true,
			reason: "Vier Räume. Zwei Gegner. Ira sitzt."
		};
	},
	clearRoom: (roomId) => {
		const s = get();
		const room = s.solo.rooms.find((entry) => entry.id === roomId);
		const pc = s.characters.find((character) => character.id === s.seatId) || s.characters[0];
		if (!room || room.clear || !pc) return null;
		const difficulty = room.bot?.difficulty ?? 10;
		const roll = resolveActionRoll({
			traitMod: pc.traits.agility,
			mode: "none",
			difficulty
		});
		const pools = applyPools({
			hope: pc.hope,
			hopeMax: pc.hopeMax,
			fear: s.campaign.fear,
			fearMax: s.campaign.fearMax
		}, roll);
		const rooms = s.solo.rooms.map((entry) => entry.id === roomId && roll.success ? {
			...entry,
			clear: true
		} : entry);
		const allClear = rooms.every((entry) => entry.clear);
		let characters = s.characters.map((character) => character.id === pc.id ? {
			...character,
			hope: pools.hope,
			stress: Math.min(character.stressMax, character.stress + pools.unpaid)
		} : character);
		let banner = roll.success ? "Geräumt." : "Bleibt dunkel.";
		if (allClear) {
			characters = characters.map((character) => {
				if (character.id !== pc.id) return character;
				const level = Math.min(10, character.level + 1);
				const proficiency = [
					2,
					5,
					8
				].includes(level) ? character.proficiency + 1 : character.proficiency;
				return {
					...character,
					level,
					proficiency
				};
			});
			banner = "Alle Räume leer. Level +1.";
		}
		const text = `${room.name}: ${roll.spoken} — ${banner}`;
		set({
			characters,
			campaign: {
				...s.campaign,
				fear: pools.fear,
				clock: s.campaign.clock + pools.clockTick
			},
			solo: {
				laid: true,
				rooms
			},
			tokens: s.tokens.map((token) => room.bot && roll.success && token.label === room.bot.name ? {
				...token,
				hp: token.hpMax
			} : token),
			lastRoll: {
				roll,
				characterId: pc.id,
				name: pc.name,
				hopeBefore: pc.hope,
				fearBefore: s.campaign.fear,
				stressBefore: pc.stress,
				clockBefore: s.campaign.clock,
				undone: false
			},
			log: pushLog(s.log, text, "roll")
		});
		return {
			text,
			success: roll.success
		};
	},
	resetTable: () => set(fresh())
}), {
	name: "ember.table.v1",
	skipHydration: true,
	storage: createJSONStorage(() => typeof window === "undefined" ? memoryStorage : localStorage),
	version: 1
}));
function useHydrated() {
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const unsub = useEmber.persist.onFinishHydration(() => setReady(true));
		if (useEmber.persist.hasHydrated()) setReady(true);
		else useEmber.persist.rehydrate();
		return unsub;
	}, []);
	return ready;
}
function EmberHeader({ title, eyebrow = "Ember" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "flex h-14 shrink-0 items-center gap-3 border-b-2 border-ember bg-surface px-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/",
			"aria-label": "Zum Start",
			className: "grid size-11 place-items-center rounded-full border border-line bg-elevated text-ember",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "size-5" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "truncate font-serif text-lg leading-tight text-gold",
				children: title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "truncate text-xs tracking-[0.18em] text-muted uppercase",
				children: eyebrow
			})]
		})]
	});
}
var PIP_ON = {
	hope: "border-hope bg-hope",
	fear: "border-ember bg-ember",
	stress: "border-ember bg-ember",
	armor: "border-gold bg-gold"
};
function Pips({ count, max, tone, label, onPick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-1.5 flex items-baseline justify-between gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-xs tracking-[0.14em] text-muted uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "font-serif text-sm text-gold",
			children: [
				count,
				"/",
				max
			]
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex flex-wrap gap-1.5",
		children: Array.from({ length: max }, (_, index) => {
			const on = index < count;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: !onPick,
				"aria-label": `${label} ${index + 1}`,
				"aria-pressed": on,
				onClick: () => onPick?.(index),
				className: `size-11 rounded-md border ${on ? PIP_ON[tone] : "border-line bg-elevated"}`
			}, index);
		})
	})] });
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mb-1 block text-xs tracking-[0.14em] text-muted uppercase",
			children: label
		}), children]
	});
}
var fieldClass = "min-h-11 w-full rounded-lg border border-line bg-elevated px-3 text-fg outline-none focus:border-ember";
function ActionButton({ children, onClick, tone = "ghost", type = "button", disabled }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type,
		disabled,
		onClick,
		className: `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm ${tone === "primary" ? "border-ember bg-elevated text-gold" : tone === "quiet" ? "border-transparent bg-transparent text-muted" : "border-line bg-surface text-fg"}`,
		children
	});
}
//#endregion
export { Field as a, classLabel as c, traitLabel as d, useEmber as f, FOES as i, fieldClass as l, CLASSES as n, Pips as o, useHydrated as p, EmberHeader as r, TRAITS as s, ActionButton as t, nextCount as u };
