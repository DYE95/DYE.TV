import { x as require_jsx_runtime, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as Flame, d as DoorOpen, t as UserRound } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-C0kbsp4_.js
var import_jsx_runtime = require_jsx_runtime();
var DOORS = [
	{
		to: "/tisch",
		title: "Die Glut zünden",
		hint: "Spielleitung",
		icon: Flame
	},
	{
		to: "/sitz",
		title: "Ans Feuer setzen",
		hint: "Eigener Sitz",
		icon: UserRound
	},
	{
		to: "/solo",
		title: "Unter die Schwelle",
		hint: "Solo, vier Räume",
		icon: DoorOpen
	}
];
function Start() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "ember-start grid min-h-dvh bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "flex items-center justify-center px-4 py-8 md:px-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full max-w-md rounded-2xl border border-line bg-surface px-5 py-7 shadow-2xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ember-sigil mx-auto mb-4 size-3.5 rounded-full bg-ember" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-center font-serif text-4xl text-gold",
							children: "Ember"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 mb-6 text-center text-xs tracking-[0.18em] text-muted uppercase",
							children: "Die Glut am Rand der Umbra"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
							className: "grid gap-2",
							"aria-label": "Eingänge",
							children: DOORS.map((door) => {
								const Icon = door.icon;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: door.to,
									className: "flex min-h-14 items-center gap-3 rounded-xl border border-line bg-elevated px-3 py-2 text-left hover:border-ember",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-5 shrink-0 text-ember" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block font-serif text-lg text-gold",
											children: door.title
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block text-sm text-muted",
											children: door.hint
										})]
									})]
								}, door.to);
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-5 text-sm text-muted",
							children: "Drei Eingänge, auch nach dem Neuladen. Der Tisch bleibt in diesem Browser."
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("figure", {
				className: "relative hidden min-h-64 overflow-hidden md:block",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: "/ember/hearth.jpg",
					alt: "Lagerfeuer am Rand der Umbra",
					className: "absolute inset-0 h-full w-full object-cover"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("figure", {
				className: "relative order-first aspect-video overflow-hidden md:hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: "/ember/hearth.jpg",
					alt: "",
					className: "absolute inset-0 h-full w-full object-cover"
				})
			})
		]
	});
}
//#endregion
export { Start as component };
