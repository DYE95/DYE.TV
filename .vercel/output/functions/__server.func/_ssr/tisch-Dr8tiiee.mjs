import { i as __toESM } from "../_runtime.mjs";
import { q as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as Flame, f as Dices, i as ScrollText, o as Map } from "../_libs/lucide-react.mjs";
import { a as Field, f as useEmber, l as fieldClass, o as Pips, p as useHydrated, r as EmberHeader, t as ActionButton, u as nextCount } from "./chrome-BUjypF2g.mjs";
import { n as RollPanel, r as Roster, t as Board } from "./roster-DqYGg-RG.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/tisch-Dr8tiiee.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Tisch() {
	const ready = useHydrated();
	const [tab, setTab] = (0, import_react.useState)("glut");
	const name = useEmber((s) => s.campaign.name);
	if (!ready) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh flex-col bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmberHeader, {
			title: "Die Glut",
			eyebrow: "Spielleitung"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "p-6 text-muted",
			children: "Die Glut wird gelesen …"
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh flex-col bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmberHeader, {
				title: name || "Die Glut",
				eyebrow: "Spielleitung"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
					className: `${tab === "karte" ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col md:flex`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Board, { viewer: "gm" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: `${tab === "karte" ? "hidden" : "block"} min-h-0 w-full overflow-y-auto md:block md:w-96 md:shrink-0 md:border-l md:border-line`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sticky top-0 z-10 hidden gap-2 border-b border-line bg-surface p-2 md:flex",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SideTab, {
								on: tab === "glut" || tab === "karte",
								onClick: () => setTab("glut"),
								children: "Glut"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SideTab, {
								on: tab === "bogen",
								onClick: () => setTab("bogen"),
								children: "Bögen"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SideTab, {
								on: tab === "wurf",
								onClick: () => setTab("wurf"),
								children: "Wurf"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "p-4 pb-8",
						children: tab === "bogen" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Roster, {}) : tab === "wurf" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RollPanel, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Glut, {})
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "grid shrink-0 grid-cols-4 border-t border-line bg-surface md:hidden",
				"aria-label": "Tisch",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabButton, {
						tab: "glut",
						current: tab,
						setTab,
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "size-4" }),
						label: "Glut"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabButton, {
						tab: "karte",
						current: tab,
						setTab,
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Map, { className: "size-4" }),
						label: "Karte"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabButton, {
						tab: "bogen",
						current: tab,
						setTab,
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollText, { className: "size-4" }),
						label: "Bögen"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabButton, {
						tab: "wurf",
						current: tab,
						setTab,
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dices, { className: "size-4" }),
						label: "Wurf"
					})
				]
			})
		]
	});
}
function SideTab({ on, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		className: `min-h-11 flex-1 rounded-lg border text-sm ${on ? "border-ember text-gold" : "border-line text-muted"}`,
		children
	});
}
function TabButton({ tab, current, setTab, icon, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: () => setTab(tab),
		className: `flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${current === tab ? "text-gold" : "text-muted"}`,
		children: [icon, label]
	});
}
function Glut() {
	const campaign = useEmber((s) => s.campaign);
	const initiative = useEmber((s) => s.initiative);
	const hands = useEmber((s) => s.hands);
	const characters = useEmber((s) => s.characters);
	const log = useEmber((s) => s.log);
	const setCampaignName = useEmber((s) => s.setCampaignName);
	const setNotes = useEmber((s) => s.setNotes);
	const setFear = useEmber((s) => s.setFear);
	const seedInitiative = useEmber((s) => s.seedInitiative);
	const stepInitiative = useEmber((s) => s.stepInitiative);
	const focusRow = useEmber((s) => s.focusRow);
	const toggleAuto = useEmber((s) => s.toggleAuto);
	const giveLight = useEmber((s) => s.giveLight);
	const note = useEmber((s) => s.note);
	const resetTable = useEmber((s) => s.resetTable);
	const [line, setLine] = (0, import_react.useState)("");
	const who = initiative.on ? initiative.order[initiative.index] : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Kampagne",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: fieldClass,
					value: campaign.name,
					onChange: (event) => setCampaignName(event.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: campaign.frame
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pips, {
				label: "Fear",
				tone: "fear",
				count: campaign.fear,
				max: campaign.fearMax,
				onPick: (index) => setFear(nextCount(campaign.fear, index, campaign.fearMax))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					"Uhr ",
					campaign.clock,
					". Sie schlägt, wenn Fear überläuft."
				]
			}),
			hands.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs tracking-[0.14em] text-muted uppercase",
					children: "Hände"
				}), hands.map((id) => {
					const character = characters.find((entry) => entry.id === id);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ActionButton, {
						tone: "primary",
						onClick: () => giveLight(id),
						children: [character?.name || "Jemand", " will das Licht"]
					}, id);
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Noch niemand hebt die Hand."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-baseline justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs tracking-[0.14em] text-muted uppercase",
							children: "Reihenfolge"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "text-sm text-muted",
							onClick: toggleAuto,
							children: initiative.auto ? "Auto an" : "Auto aus"
						})]
					}),
					who ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-serif text-gold",
						children: [
							"Runde ",
							initiative.round,
							" — ",
							who.label,
							" ist dran."
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, {
								tone: "primary",
								onClick: seedInitiative,
								children: "Neu legen"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, {
								onClick: () => stepInitiative(-1),
								disabled: !initiative.order.length,
								children: "Zurück"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, {
								onClick: () => stepInitiative(1),
								disabled: !initiative.order.length,
								children: "Weiter"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "grid gap-1",
						children: initiative.order.map((row, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => focusRow(row.id),
							className: `flex min-h-11 w-full items-center justify-between rounded-lg border px-3 text-left text-sm ${index === initiative.index && initiative.on ? "border-ember text-gold" : "border-line"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: row.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs text-muted",
								children: row.kind === "pc" ? "Sitz" : row.kind === "foe" ? "Gegner" : "SL"
							})]
						}) }, row.id))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex gap-2",
				onSubmit: (event) => {
					event.preventDefault();
					note(line);
					setLine("");
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: fieldClass,
					value: line,
					placeholder: "Ins Log",
					onChange: (event) => setLine(event.target.value)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, {
					type: "submit",
					children: "Notieren"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid max-h-64 gap-2 overflow-y-auto",
				children: [log.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Das Log ist noch still."
				}) : null, log.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: `text-sm ${entry.kind === "roll" ? "text-fg" : "text-muted"}`,
					children: entry.text
				}, entry.id))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Notizen zur Runde",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					className: `${fieldClass} min-h-24 py-2`,
					value: campaign.notes,
					onChange: (event) => setNotes(event.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, {
				tone: "quiet",
				onClick: () => {
					if (window.confirm("Den Tisch in diesem Browser leeren? Bögen, Karte und die Schwelle gehen mit.")) resetTable();
				},
				children: "Tisch leeren"
			})
		]
	});
}
//#endregion
export { Tisch as component };
