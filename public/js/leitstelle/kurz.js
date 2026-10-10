// Modul "kurz": eine Zeile Zusammenfassung plus Umschalter zu den Einstellungen.
Leitstelle.register({
  id: "kurz",
  title: "",
  area: "klein",
  mount(el, ctx) {
    this.pill = ctx.el("div", { class: "ls-pill", role: "status" }, ctx.el("i", { class: "ls-dot" }), ctx.el("span", { text: "Prüfe …" }));
    const toggle = ctx.el("button", {
      class: "ls-btn ls-round", type: "button", title: "Einstellungen", "aria-label": "Einstellungen",
      onclick: () => window.dispatchEvent(new CustomEvent("ember:panel-mode", { detail: "settings" })),
    }, "⚙");
    el.append(this.pill, toggle);
  },
  update(s, ctx) {
    if (!this.pill) return;
    let cls = "ok";
    let text = "Alles bereit";
    if (ctx.offline || !s) { cls = "bad"; text = "Server weg"; }
    else if (s.crash && Date.now() - Date.parse(s.crash.at) < 3600 * 1000) { cls = "bad"; text = `Absturz ${ctx.ago(s.crash.at)}`; }
    else if (!s.tunnel.up) { cls = "warn"; text = "Tunnel aus"; }
    else if (s.people.players) text = `${s.people.players} am Tisch`;
    this.pill.className = `ls-pill ${cls}`;
    this.pill.lastChild.textContent = text;
  },
});
