// Modul "notizen": Version und Patchnotes (git oder CHANGELOG.md).
Leitstelle.register({
  id: "notizen",
  title: "Version und Patchnotes",
  area: "breit",
  mount(el, ctx) {
    this.head = ctx.el("p", { class: "ls-version", text: "…" });
    this.list = ctx.el("ol", { class: "ls-notes" });
    el.append(this.head, this.list);
  },
  update(s, ctx) {
    const v = ctx.version;
    if (!this.list || !v || v === this.shown) return;
    this.shown = v;
    this.head.textContent = v.source === "git"
      ? `${v.version} · aus git`
      : v.source === "changelog" ? `${v.version} · aus CHANGELOG.md` : "Keine Versionsdaten";
    this.list.replaceChildren(...v.notes.map((n) => ctx.el("li", {},
      n.sha ? ctx.el("code", { text: n.sha }) : n.section ? ctx.el("code", { text: n.section }) : null,
      ctx.el("span", { text: n.subject }),
      n.date ? ctx.el("time", { text: ctx.clock(n.date) }) : null)));
  },
});
