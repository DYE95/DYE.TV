import { i as __toESM } from "../_runtime.mjs";
import { q as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Plus, l as Eye, r as Trash2, u as EyeOff } from "../_libs/lucide-react.mjs";
import { a as Field, c as classLabel, d as traitLabel, f as useEmber, i as FOES, l as fieldClass, n as CLASSES, o as Pips, s as TRAITS, t as ActionButton, u as nextCount } from "./chrome-BUjypF2g.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/roster-DqYGg-RG.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var RING = {
	ember: "border-ember text-gold",
	hope: "border-hope text-gold",
	gold: "border-gold text-bg",
	fear: "border-fear text-gold",
	muted: "border-muted text-muted"
};
var FILL = {
	ember: "bg-ember/25",
	hope: "bg-hope/20",
	gold: "bg-gold/30",
	fear: "bg-fear/20",
	muted: "bg-elevated"
};
function Board({ viewer }) {
	const tokens = useEmber((s) => s.tokens);
	const fog = useEmber((s) => s.fog);
	const fogOn = useEmber((s) => s.fogOn);
	const initiative = useEmber((s) => s.initiative);
	const seatId = useEmber((s) => s.seatId);
	const moveToken = useEmber((s) => s.moveToken);
	const patchToken = useEmber((s) => s.patchToken);
	const removeToken = useEmber((s) => s.removeToken);
	const addToken = useEmber((s) => s.addToken);
	const addFog = useEmber((s) => s.addFog);
	const removeFog = useEmber((s) => s.removeFog);
	const setFogOn = useEmber((s) => s.setFogOn);
	const stepInitiative = useEmber((s) => s.stepInitiative);
	const seedInitiative = useEmber((s) => s.seedInitiative);
	const boardRef = (0, import_react.useRef)(null);
	const [tool, setTool] = (0, import_react.useState)("move");
	const [foeId, setFoeId] = (0, import_react.useState)(FOES[0].id);
	const [selected, setSelected] = (0, import_react.useState)(null);
	const drag = (0, import_react.useRef)(null);
	const fogDrag = (0, import_react.useRef)(null);
	const [draftFog, setDraftFog] = (0, import_react.useState)(null);
	const gm = viewer === "gm";
	const visible = tokens.filter((token) => gm || !token.hidden);
	const current = initiative.on ? initiative.order[initiative.index] : null;
	const picked = tokens.find((token) => token.id === selected) || null;
	function point(event) {
		const rect = boardRef.current?.getBoundingClientRect();
		if (!rect) return {
			x: 50,
			y: 50
		};
		return {
			x: (event.clientX - rect.left) / rect.width * 100,
			y: (event.clientY - rect.top) / rect.height * 100
		};
	}
	function canDrag(token) {
		if (gm) return tool === "move";
		return token.characterId != null && token.characterId === seatId;
	}
	function onTokenDown(event, token) {
		event.stopPropagation();
		setSelected(token.id);
		if (!canDrag(token)) return;
		drag.current = {
			id: token.id,
			pointer: event.pointerId
		};
		event.currentTarget.setPointerCapture(event.pointerId);
	}
	function onTokenMove(event) {
		if (!drag.current || drag.current.pointer !== event.pointerId) return;
		const at = point(event);
		moveToken(drag.current.id, at.x, at.y);
	}
	function onTokenUp() {
		drag.current = null;
	}
	function onBoardDown(event) {
		if (event.target.closest("[data-token]")) return;
		const at = point(event);
		if (!gm) return;
		if (tool === "place") {
			const foe = FOES.find((entry) => entry.id === foeId) || FOES[0];
			addToken({
				label: foe.name,
				kind: "foe",
				x: at.x,
				y: at.y,
				hpMax: foe.hp,
				ink: "fear"
			});
			return;
		}
		if (tool === "fog") {
			fogDrag.current = at;
			setDraftFog({
				x: at.x,
				y: at.y,
				w: 0,
				h: 0
			});
			event.currentTarget.setPointerCapture(event.pointerId);
		} else setSelected(null);
	}
	function onBoardMove(event) {
		if (!fogDrag.current) return;
		const at = point(event);
		const x = Math.min(fogDrag.current.x, at.x);
		const y = Math.min(fogDrag.current.y, at.y);
		setDraftFog({
			x,
			y,
			w: Math.abs(at.x - fogDrag.current.x),
			h: Math.abs(at.y - fogDrag.current.y)
		});
	}
	function onBoardUp() {
		if (draftFog && draftFog.w > 3 && draftFog.h > 3) addFog(draftFog);
		fogDrag.current = null;
		setDraftFog(null);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full min-h-0 w-full flex-col",
		children: [
			gm ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2",
				children: [
					[
						["move", "Schieben"],
						["fog", "Nebel"],
						["place", "Gegner"]
					].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setTool(id),
						className: `min-h-11 rounded-lg border px-3 text-sm ${tool === id ? "border-ember text-gold" : "border-line text-muted"}`,
						children: label
					}, id)),
					tool === "place" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						"aria-label": "Gegner",
						value: foeId,
						onChange: (event) => setFoeId(event.target.value),
						className: "min-h-11 rounded-lg border border-line bg-elevated px-2 text-sm",
						children: FOES.map((foe) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: foe.id,
							children: foe.name
						}, foe.id))
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setFogOn(!fogOn),
						className: "ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm text-muted",
						children: [fogOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-4" }), fogOn ? "Nebel an" : "Nebel aus"]
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: boardRef,
				className: "ember-map relative min-h-0 flex-1",
				onPointerDown: onBoardDown,
				onPointerMove: onBoardMove,
				onPointerUp: onBoardUp,
				onPointerCancel: onBoardUp,
				children: [
					(fogOn || gm) && fog.map((rect) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "Nebel entfernen",
						disabled: !gm || tool !== "fog",
						onClick: () => removeFog(rect.id),
						className: "absolute border border-line bg-bg/80",
						style: {
							left: `${rect.x}%`,
							top: `${rect.y}%`,
							width: `${rect.w}%`,
							height: `${rect.h}%`
						}
					}, rect.id)),
					draftFog ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "pointer-events-none absolute border border-hope bg-bg/70",
						style: {
							left: `${draftFog.x}%`,
							top: `${draftFog.y}%`,
							width: `${draftFog.w}%`,
							height: `${draftFog.h}%`
						}
					}) : null,
					visible.map((token) => {
						const down = token.kind === "foe" && token.hpMax > 0 && token.hp >= token.hpMax;
						const lit = current?.tokenId === token.id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							"data-token": "1",
							"aria-label": token.label,
							onPointerDown: (event) => onTokenDown(event, token),
							onPointerMove: onTokenMove,
							onPointerUp: onTokenUp,
							className: `absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 shadow-lg ${RING[token.ink]} ${FILL[token.ink]} ${token.kind === "mark" ? "size-8" : "size-12"} ${token.hidden ? "opacity-45" : ""} ${lit ? "ring-2 ring-hope" : ""} ${down ? "opacity-50" : ""}`,
							style: {
								left: `${token.x}%`,
								top: `${token.y}%`
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `font-serif text-sm leading-none ${down ? "line-through" : ""}`,
								children: token.label.slice(0, 1)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "pointer-events-none absolute top-full mt-1 max-w-24 truncate text-[11px] text-fg",
								children: token.label
							})]
						}, token.id);
					}),
					current ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "pointer-events-none absolute top-3 left-3 rounded-lg border border-line bg-surface/90 px-3 py-2 font-serif text-sm text-gold",
						children: [
							"Runde ",
							initiative.round,
							" — ",
							current.label
						]
					}) : null
				]
			}),
			gm && picked ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex shrink-0 flex-wrap items-center gap-2 border-t border-line bg-surface px-3 py-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "min-w-0 flex-1 truncate font-serif text-gold",
						children: picked.label
					}),
					picked.kind === "foe" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ActionButton, {
						onClick: () => patchToken(picked.id, { hp: Math.min(picked.hpMax, picked.hp + 1) }),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }),
							" Treffer ",
							picked.hp,
							"/",
							picked.hpMax
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, {
						onClick: () => patchToken(picked.id, { hidden: !picked.hidden }),
						children: picked.hidden ? "Zeigen" : "Verbergen"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, {
						onClick: () => {
							removeToken(picked.id);
							setSelected(null);
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
					})
				]
			}) : null,
			gm ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex shrink-0 gap-2 border-t border-line bg-bg px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, {
					tone: "primary",
					onClick: () => initiative.order.length ? stepInitiative(1) : seedInitiative(),
					children: initiative.order.length ? "Nächste" : "Reihenfolge"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, {
					onClick: () => stepInitiative(-1),
					disabled: !initiative.order.length,
					children: "Zurück"
				})]
			}) : null
		]
	});
}
function RollPanel({ characterId }) {
	const characters = useEmber((s) => s.characters);
	const lastRoll = useEmber((s) => s.lastRoll);
	const rollFor = useEmber((s) => s.rollFor);
	const undoRoll = useEmber((s) => s.undoRoll);
	const [picked, setPicked] = (0, import_react.useState)(characterId || characters[0]?.id || "");
	const locked = characterId !== void 0;
	const who = locked ? characterId : picked || null;
	const pc = characters.find((character) => character.id === who);
	const [trait, setTrait] = (0, import_react.useState)("agility");
	const [mode, setMode] = (0, import_react.useState)("none");
	const [difficulty, setDifficulty] = (0, import_react.useState)(12);
	const [spent, setSpent] = (0, import_react.useState)([]);
	const [spin, setSpin] = (0, import_react.useState)(false);
	function toggleExp(id) {
		setSpent((current) => current.includes(id) ? current.filter((exp) => exp !== id) : [...current, id]);
	}
	function throwDice() {
		if (spin) return;
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		setSpin(true);
		window.setTimeout(() => {
			rollFor(who, {
				trait,
				mode,
				difficulty: Number(difficulty) || 0,
				experienceIds: spent
			});
			setSpin(false);
		}, reduce ? 0 : 520);
	}
	const show = !spin && lastRoll && (!locked || lastRoll.characterId === who) ? lastRoll : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4",
		children: [
			!locked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Bogen",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					className: fieldClass,
					value: who || "",
					onChange: (event) => setPicked(event.target.value),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "",
						children: "Ohne Bogen"
					}), characters.map((character) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: character.id,
						children: character.name
					}, character.id))]
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-serif text-xl text-gold",
				children: pc?.name || "Kein Sitz"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-1.5 text-xs tracking-[0.14em] text-muted uppercase",
				children: "Eigenschaft"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-2",
				children: TRAITS.map((entry) => {
					const mod = pc ? pc.traits[entry.key] : 0;
					const on = trait === entry.key;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setTrait(entry.key),
						className: `flex min-h-11 items-center justify-between rounded-lg border px-3 text-left text-sm ${on ? "border-ember text-gold" : "border-line text-fg"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: entry.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-serif",
							children: mod > 0 ? `+${mod}` : mod
						})]
					}, entry.key);
				})
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-3 gap-2",
				children: [
					["none", "Glatt"],
					["advantage", "Vorteil"],
					["disadvantage", "Nachteil"]
				].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setMode(id),
					className: `min-h-11 rounded-lg border px-2 text-sm ${mode === id ? "border-ember text-gold" : "border-line text-muted"}`,
					children: label
				}, id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Schwierigkeit",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: fieldClass,
					inputMode: "numeric",
					value: difficulty,
					onChange: (event) => setDifficulty(Number(event.target.value.replace(/[^\d]/g, "")) || 0)
				})
			}),
			pc && pc.experiences.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-1.5 text-xs tracking-[0.14em] text-muted uppercase",
				children: "Erfahrungen · jede kostet Hope"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-2",
				children: pc.experiences.map((exp) => {
					const on = spent.includes(exp.id);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => toggleExp(exp.id),
						className: `min-h-11 rounded-full border px-3 text-sm ${on ? "border-hope text-hope" : "border-line text-muted"}`,
						children: [
							exp.name,
							" +",
							exp.bonus
						]
					}, exp.id);
				})
			})] }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, {
				tone: "primary",
				onClick: throwDice,
				disabled: spin || locked && !pc,
				children: spin ? "Die Glut dreht …" : "Duality werfen"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3",
				"aria-live": "polite",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Die, {
					kind: "hope",
					label: "Hope",
					value: spin ? null : show?.roll.hopeDie ?? null,
					spinning: spin
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Die, {
					kind: "fear",
					label: "Fear",
					value: spin ? null : show?.roll.fearDie ?? null,
					spinning: spin
				})]
			}),
			show ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `rounded-xl border p-3 ${show.roll.success ? "border-hope" : "border-fear"} ${show.undone ? "opacity-60" : ""}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-serif text-lg text-gold",
						children: show.undone ? "Zurückgenommen" : show.roll.label
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-fg",
						children: show.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: show.roll.spoken
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-xs text-muted",
						children: [
							traitLabel(trait),
							" · Summe ",
							show.roll.total
						]
					}),
					!show.undone ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, {
							onClick: undoRoll,
							children: "Wurf zurücknehmen"
						})
					}) : null
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Hope und Fear, zwei W12. Gleichstand ist kritisch."
			})
		]
	});
}
function Die({ kind, label, value, spinning }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border ${kind === "hope" ? "border-hope" : "border-ember"} ${spinning ? "motion-safe:animate-pulse" : ""}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-xs tracking-[0.16em] text-muted uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: `font-serif text-4xl ${kind === "hope" ? "text-hope" : "text-ember"}`,
			children: value ?? "·"
		})]
	});
}
function Roster() {
	const characters = useEmber((s) => s.characters);
	const addCharacter = useEmber((s) => s.addCharacter);
	const removeCharacter = useEmber((s) => s.removeCharacter);
	const [name, setName] = (0, import_react.useState)("");
	const [klass, setKlass] = (0, import_react.useState)("Rogue");
	const [open, setOpen] = (0, import_react.useState)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "grid gap-3 rounded-xl border border-line bg-surface p-3",
				onSubmit: (event) => {
					event.preventDefault();
					const id = addCharacter({
						name,
						klass
					});
					setName("");
					setOpen(id);
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Neuer Bogen",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: fieldClass,
							value: name,
							placeholder: "Name",
							onChange: (event) => setName(event.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Klasse",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: fieldClass,
							value: klass,
							onChange: (event) => setKlass(event.target.value),
							children: CLASSES.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: entry.id,
								children: entry.label
							}, entry.id))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, {
						type: "submit",
						tone: "primary",
						children: "An den Tisch"
					})
				]
			}),
			characters.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Noch niemand. Ein Name reicht."
			}) : null,
			characters.map((character) => {
				const shown = open === character.id;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "rounded-xl border border-line bg-surface",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "flex min-h-14 w-full items-center justify-between gap-3 px-3 text-left",
						onClick: () => setOpen(shown ? null : character.id),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block font-serif text-lg text-gold",
							children: character.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-xs text-muted",
							children: [
								classLabel(character.klass),
								" · Stufe ",
								character.level,
								" · PIN ",
								character.pin
							]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm text-muted",
							children: shown ? "Zu" : "Auf"
						})]
					}), shown ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 border-t border-line p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetEditor, { id: character.id }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ActionButton, {
							onClick: () => {
								if (window.confirm(`${character.name} vom Tisch nehmen?`)) removeCharacter(character.id);
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" }), " Bogen weg"]
						})]
					}) : null]
				}, character.id);
			})
		]
	});
}
function SheetEditor({ id, player = false }) {
	const character = useEmber((s) => s.characters.find((entry) => entry.id === id));
	const patchCharacter = useEmber((s) => s.patchCharacter);
	const setTrait = useEmber((s) => s.setTrait);
	const setPool = useEmber((s) => s.setPool);
	const addExperience = useEmber((s) => s.addExperience);
	const removeExperience = useEmber((s) => s.removeExperience);
	const [expName, setExpName] = (0, import_react.useState)("");
	if (!character) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "Der Bogen ist weg."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4",
		children: [
			!player ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Name",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: fieldClass,
						value: character.name,
						onChange: (event) => patchCharacter(id, { name: event.target.value })
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Herkunft",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: fieldClass,
						value: character.ancestry,
						onChange: (event) => patchCharacter(id, { ancestry: event.target.value })
					})
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					classLabel(character.klass),
					character.ancestry ? ` · ${character.ancestry}` : "",
					" · Ausweichen ",
					character.evasion,
					" · PIN ",
					character.pin
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pips, {
				label: "Hope",
				tone: "hope",
				count: character.hope,
				max: character.hopeMax,
				onPick: (index) => setPool(id, "hope", nextCount(character.hope, index, character.hopeMax))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pips, {
				label: "Stress",
				tone: "stress",
				count: character.stress,
				max: character.stressMax,
				onPick: (index) => setPool(id, "stress", nextCount(character.stress, index, character.stressMax))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pips, {
				label: "Rüstung",
				tone: "armor",
				count: character.armor,
				max: character.armorMax,
				onPick: (index) => setPool(id, "armor", nextCount(character.armor, index, character.armorMax))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pips, {
				label: "Schaden",
				tone: "fear",
				count: character.hp,
				max: character.hpMax,
				onPick: (index) => setPool(id, "hp", nextCount(character.hp, index, character.hpMax))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-1.5 text-xs tracking-[0.14em] text-muted uppercase",
				children: "Eigenschaften"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-2 sm:grid-cols-2",
				children: TRAITS.map((trait) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex min-h-11 items-center justify-between gap-2 rounded-lg border border-line px-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm",
						children: trait.label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "grid size-11 place-items-center rounded-md border border-line",
								"aria-label": `${trait.label} senken`,
								onClick: () => setTrait(id, trait.key, character.traits[trait.key] - 1),
								children: "−"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "w-6 text-center font-serif text-gold",
								children: character.traits[trait.key] > 0 ? `+${character.traits[trait.key]}` : character.traits[trait.key]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "grid size-11 place-items-center rounded-md border border-line",
								"aria-label": `${trait.label} heben`,
								onClick: () => setTrait(id, trait.key, character.traits[trait.key] + 1),
								children: "+"
							})
						]
					})]
				}, trait.key))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-1.5 text-xs tracking-[0.14em] text-muted uppercase",
					children: "Erfahrungen"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "grid gap-2",
					children: character.experiences.map((exp) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex min-h-11 items-center justify-between gap-2 rounded-lg border border-line px-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							exp.name,
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-hope",
								children: ["+", exp.bonus]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "text-sm text-muted",
							onClick: () => removeExperience(id, exp.id),
							children: "Weg"
						})]
					}, exp.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "mt-2 flex gap-2",
					onSubmit: (event) => {
						event.preventDefault();
						if (!expName.trim()) return;
						addExperience(id, expName, 2);
						setExpName("");
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: fieldClass,
						value: expName,
						placeholder: "Neue Erfahrung",
						onChange: (event) => setExpName(event.target.value)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, {
						type: "submit",
						children: "+2"
					})]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Notizen",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					className: `${fieldClass} min-h-24 py-2`,
					value: character.notes,
					onChange: (event) => patchCharacter(id, { notes: event.target.value })
				})
			})
		]
	});
}
//#endregion
export { SheetEditor as i, RollPanel as n, Roster as r, Board as t };
