// Modul "status": alles Wichtige auf einen Blick (grosse Box).
Leitstelle.register({
  id: "status",
  title: "Status",
  area: "gross",
  mount(el, ctx) {
    this.list = ctx.el("dl", { class: "ls-status" });
    el.append(this.list);
  },
  update(s, ctx) {
    if (!this.list) return;
    if (ctx.offline || !s) {
      this.list.replaceChildren(ctx.el("dt", { class: "bad", text: "Server" }), ctx.el("dd", { text: "nicht erreichbar" }));
      return;
    }
    const v = ctx.version;
    const crash = s.crash;
    const recentCrash = crash && Date.now() - Date.parse(crash.at) < 24 * 3600 * 1000;
    const rows = [
      ["ok", "Server", `läuft seit ${ctx.duration(s.server.uptimeSec)} · Port ${s.server.port} · ${s.server.memoryMb} MB`],
      ["", "Version", v ? `${v.version}${v.source === "changelog" ? " (CHANGELOG)" : ""}` : "…"],
      [s.tunnel.up ? "ok" : "warn", "Tunnel", s.tunnel.up ? `an · Adresse ${ctx.ago(s.tunnel.since)}` : "aus · start.bat starten"],
      [s.people.gm ? "ok" : "", "Am Tisch", `${s.people.players} Spieler${s.people.names.length ? ` (${s.people.names.join(", ")})` : ""} · ${s.people.gm ? "SL da" : "kein SL"}`],
      ["", "Daten", `${ctx.bytes(s.data.size)} · gespeichert ${ctx.clock(s.data.savedAt)} · Sicherung ${s.data.backupAt ? ctx.clock(s.data.backupAt) : "keine"}`],
      [recentCrash ? "bad" : "ok", "Absturz", crash ? `${ctx.clock(crash.at)} · ${crash.kind}${crash.message ? ` · ${crash.message}` : ""}` : "keiner"],
      [s.lan.length ? "" : "warn", "LAN", s.lan.length ? s.lan.map((a) => a.address).join(", ") : "kein Netzwerk"],
      ["", "Node", `${s.server.node} · ${s.server.platform}`],
    ];
    this.list.replaceChildren(...rows.flatMap(([cls, k, val]) => [
      ctx.el("dt", { class: cls }, ctx.el("i", { class: "ls-dot" }), k),
      ctx.el("dd", { text: val, title: val }),
    ]));
  },
});
