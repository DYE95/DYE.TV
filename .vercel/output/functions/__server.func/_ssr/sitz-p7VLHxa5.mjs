import { i as __toESM } from "../_runtime.mjs";
import { q as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { f as Dices, i as ScrollText, o as Map, s as Hand } from "../_libs/lucide-react.mjs";
import { a as Field, c as classLabel, f as useEmber, l as fieldClass, p as useHydrated, r as EmberHeader, t as ActionButton } from "./chrome-BUjypF2g.mjs";
import { i as SheetEditor, n as RollPanel, t as Board } from "./roster-DqYGg-RG.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/sitz-p7VLHxa5.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Sitz() {
	const ready = useHydrated();
	const characters = useEmber((s) => s.characters);
	const seatId = useEmber((s) => s.seatId);
	const sit = useEmber((s) => s.sit);
	const hands = useEmber((s) => s.hands);
	const raiseHand = useEmber((s) => s.raiseHand);
	const [tab, setTab] = (0, import_react.useState)("bogen");
	const [pick, setPick] = (0, import_react.useState)(null);
	const [pin, setPin] = (0, import_react.useState)("");
	const [err, setErr] = (0, import_react.useState)("");
	if (!ready) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmberHeader, {
			title: "Sitz",
			eyebrow: "Spieler"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "p-6 text-muted",
			children: "Der Sitz wird gelesen …"
		})]
	});
	const seated = characters.find((character) => character.id === seatId) || null;
	const chosen = characters.find((character) => character.id === pick) || null;
	function claim(event) {
		event.preventDefault();
		if (!chosen) return;
		if (pin.trim() !== chosen.pin) {
			setErr("Die Glut kennt die Zahl nicht.");
			return;
		}
		sit(chosen.id);
		setErr("");
		setPin("");
	}
	if (!seated) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmberHeader, {
			title: "Ans Feuer",
			eyebrow: "Spieler"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto grid max-w-lg gap-3 p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Tippe deinen Namen. Die PIN steht auf dem Bogen am SL-Tisch."
				}),
				characters.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "rounded-xl border border-line bg-surface p-4 text-sm text-muted",
					children: "Noch kein Bogen. Die Spielleitung legt einen an, oder du gehst unter die Schwelle."
				}) : null,
				characters.map((character) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => {
						setPick(character.id);
						setErr("");
						setPin("");
					},
					className: `min-h-14 rounded-xl border px-3 text-left ${pick === character.id ? "border-ember" : "border-line"} bg-surface`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block font-serif text-lg text-gold",
						children: character.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm text-muted",
						children: classLabel(character.klass)
					})]
				}, character.id)),
				chosen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "grid gap-3",
					onSubmit: claim,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: `PIN für ${chosen.name}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: fieldClass,
								inputMode: "numeric",
								autoComplete: "off",
								value: pin,
								onChange: (event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))
							})
						}),
						err ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-fear",
							children: err
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, {
							type: "submit",
							tone: "primary",
							children: "Setzen"
						})
					]
				}) : null
			]
		})]
	});
	const raised = hands.includes(seated.id);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh flex-col bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmberHeader, {
				title: seated.name,
				eyebrow: "Sitz"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-h-0 flex-1 overflow-y-auto",
				children: tab === "karte" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-full min-h-80",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Board, { viewer: "player" })
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto grid max-w-lg gap-4 p-4 pb-8",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ActionButton, {
							tone: raised ? "primary" : "ghost",
							onClick: () => raiseHand(seated.id),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hand, { className: "size-4" }), raised ? "Hand sinkt" : "Licht wollen"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, {
							tone: "quiet",
							onClick: () => sit(null),
							children: "Aufstehen"
						})]
					}), tab === "wurf" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RollPanel, { characterId: seated.id }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetEditor, {
						id: seated.id,
						player: true
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "grid shrink-0 grid-cols-3 border-t border-line bg-surface",
				"aria-label": "Sitz",
				children: [
					[
						"bogen",
						"Bogen",
						ScrollText
					],
					[
						"wurf",
						"Wurf",
						Dices
					],
					[
						"karte",
						"Karte",
						Map
					]
				].map(([id, label, Icon]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setTab(id),
					className: `flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${tab === id ? "text-gold" : "text-muted"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4" }), label]
				}, id))
			})
		]
	});
}
//#endregion
export { Sitz as component };
