import { i as __toESM } from "../_runtime.mjs";
import { q as require_react, x as require_jsx_runtime, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { f as useEmber, p as useHydrated, r as EmberHeader, t as ActionButton } from "./chrome-BUjypF2g.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/solo-CXrBW7G_.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Solo() {
	const ready = useHydrated();
	const solo = useEmber((s) => s.solo);
	const characters = useEmber((s) => s.characters);
	const laySchwelle = useEmber((s) => s.laySchwelle);
	const clearRoom = useEmber((s) => s.clearRoom);
	const [message, setMessage] = (0, import_react.useState)("");
	const hero = characters.find((character) => character.name === "Ira") || characters[0];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmberHeader, {
			title: "Solo",
			eyebrow: "Keine Runde"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto grid max-w-lg gap-4 p-4 pb-16",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "rounded-2xl border border-line bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-serif text-3xl text-gold",
							children: "Üben"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "Nicht der Spielabend. Ein Bogen, vier Räume, kein Publikum."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, {
								tone: "primary",
								disabled: !ready,
								onClick: () => {
									const result = laySchwelle();
									setMessage(result.reason);
								},
								children: "Asche unter der Schwelle"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm text-muted",
							children: ready ? message || "Der Knopf legt die Kampagne einmal. Eine offene Session bleibt liegen." : "Der Tisch wird gelesen. Der Knopf bleibt."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "grid gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-serif text-xl text-gold",
							children: "Räume"
						}),
						!ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Räume kommen gleich."
						}) : null,
						ready && !solo.laid ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Noch nichts gelegt. Die Schwelle wartet auf den Knopf."
						}) : null,
						ready && solo.rooms.map((room, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							disabled: room.clear,
							onClick: () => {
								const result = clearRoom(room.id);
								if (result) setMessage(result.text);
							},
							className: "min-h-14 rounded-xl border border-line bg-elevated px-3 py-2 text-left disabled:opacity-70",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "block font-serif text-lg text-gold",
								children: [room.clear ? "Leer · " : `${index + 1} · `, room.name]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-sm text-muted",
								children: [room.bot ? `${room.bot.name} · ${room.bot.difficulty}` : "Durchgang · 10", hero ? ` · ${hero.name} Gewandtheit ${hero.traits.agility >= 0 ? "+" : ""}${hero.traits.agility}` : ""]
							})]
						}, room.id)),
						ready && solo.laid && solo.rooms.every((room) => room.clear) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-hope",
							children: "Alle Räume leer. Die Stufe sitzt auf dem Bogen."
						}) : null
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-3 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/tisch",
						className: "text-gold underline decoration-line underline-offset-4",
						children: "An den Tisch"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/sitz",
						className: "text-gold underline decoration-line underline-offset-4",
						children: "Zum Sitz"
					})]
				})
			]
		})]
	});
}
//#endregion
export { Solo as component };
