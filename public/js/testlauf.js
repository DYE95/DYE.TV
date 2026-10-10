// public/js/testlauf.js — Checkliste aus docs/TESTLAUF.md, Entwurf mit Bildern,
// Autosave, Ablegen nach data/testlaeufe/<Datum-Uhrzeit>/.
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const state = {
    checklist: { title: "Testlauf", sections: [], notesTitle: "Notizen" },
    draft: { tester: "", geraet: "", notizen: "", answers: {}, images: [] },
    runs: [],
    version: null,
    maxImage: 50 * 1024 * 1024,
    folder: "",
    dirty: false,
    saving: false,
    timer: 0,
  };

  const saveEl = $("saveState");
  const setSave = (t) => { saveEl.textContent = t; };

  async function api(path, opts = {}) {
    const res = await fetch(path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status });
    return data;
  }

  function gatherAnswers() {
    const answers = {};
    document.querySelectorAll(".tl-item").forEach((row) => {
      const id = row.dataset.id;
      const mark = row.dataset.mark || "";
      const note = (row.querySelector(".tl-note") || {}).value || "";
      if (mark || note.trim()) answers[id] = { mark, note: note.trim() };
    });
    return answers;
  }

  function payload() {
    return {
      tester: $("tester").value,
      geraet: $("geraet").value,
      notizen: $("notizen").value,
      answers: gatherAnswers(),
      images: state.draft.images.map((img) => ({
        id: img.id,
        caption: img.caption || "",
        itemId: img.itemId || "",
      })),
    };
  }

  async function flush() {
    if (!state.dirty || state.saving) return;
    state.saving = true;
    setSave("Speichert …");
    try {
      state.draft = await api("/api/testlauf/entwurf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      state.dirty = false;
      setSave("Gespeichert");
      updateSummary();
    } catch (err) {
      setSave("Fehler: " + (err.message || "Speichern"));
    } finally {
      state.saving = false;
      if (state.dirty) schedule();
    }
  }

  function schedule() {
    state.dirty = true;
    setSave("Änderungen …");
    clearTimeout(state.timer);
    state.timer = setTimeout(flush, 600);
  }

  function markButtons(row, mark) {
    row.dataset.mark = mark || "";
    row.classList.toggle("is-o", mark === "o");
    row.classList.toggle("is-x", mark === "x");
    row.classList.toggle("is-eigen", mark === "eigen");
    row.querySelectorAll("[data-mark]").forEach((btn) => {
      const m = btn.dataset.mark;
      btn.classList.toggle("on-o", m === "o" && mark === "o");
      btn.classList.toggle("on-x", m === "x" && mark === "x");
      btn.classList.toggle("on-eigen", m === "eigen" && mark === "eigen");
      btn.setAttribute("aria-pressed", mark === m ? "true" : "false");
    });
  }

  function itemOptionsHtml() {
    const opts = ['<option value="">— Punkt —</option>'];
    for (const sec of state.checklist.sections) {
      for (const it of sec.items) {
        opts.push(`<option value="${esc(it.id)}">${esc(sec.title)}: ${esc(it.text).slice(0, 80)}</option>`);
      }
    }
    return opts.join("");
  }

  function renderChecklist() {
    const root = $("checklist");
    const sections = state.checklist.sections || [];
    if (!sections.length) {
      root.innerHTML = state.checklist.missing
        ? "<p class='hint'>docs/TESTLAUF.md fehlt.</p>"
        : "<p class='hint'>Keine Punkte in der Checkliste.</p>";
      return;
    }
    root.innerHTML = sections.map((sec) => {
      const items = sec.items.map((it) => {
        const a = (state.draft.answers || {})[it.id] || {};
        return `<article class="tl-item" data-id="${esc(it.id)}" data-mark="${esc(a.mark || "")}">
          <p class="tl-text">${esc(it.text)}</p>
          <div class="tl-marks" role="group" aria-label="Ergebnis">
            <button type="button" data-mark="o" title="Ok">O</button>
            <button type="button" data-mark="x" title="Fehler">X</button>
            <button type="button" data-mark="eigen" title="Eigene Antwort">Eigen</button>
          </div>
          <input class="tl-note" type="text" maxlength="500" placeholder="Notiz / Zeit / Messwert"
            value="${esc(a.note || "")}" />
        </article>`;
      }).join("");
      return `<section class="tl-sec"><h2>${esc(sec.title)}</h2>${items}</section>`;
    }).join("");

    root.querySelectorAll(".tl-item").forEach((row) => {
      markButtons(row, row.dataset.mark);
      row.querySelectorAll("[data-mark]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const next = row.dataset.mark === btn.dataset.mark ? "" : btn.dataset.mark;
          markButtons(row, next);
          schedule();
        });
      });
      row.querySelector(".tl-note").addEventListener("input", schedule);
    });
    updateSummary();
  }

  function renderThumbs() {
    const box = $("thumbs");
    const images = state.draft.images || [];
    if (!images.length) { box.innerHTML = ""; return; }
    const opts = itemOptionsHtml();
    box.innerHTML = images.map((img) => {
      const src = `/api/testlauf/entwurf/bilder/${encodeURIComponent(img.file)}`;
      const kb = Math.max(1, Math.round((img.size || 0) / 1024));
      return `<figure class="tl-thumb" data-id="${esc(img.id)}">
        <img src="${esc(src)}" alt="${esc(img.name || "Bild")}" loading="lazy" />
        <input type="text" class="tl-cap" maxlength="300" placeholder="Bildunterschrift" value="${esc(img.caption || "")}" />
        <select class="tl-link">${opts}</select>
        <div class="tl-thumb-act">
          <span class="meta">${esc(img.name || img.file)} · ${kb} KB</span>
          <button class="btn tiny ghost tl-del" type="button">Löschen</button>
        </div>
      </figure>`;
    }).join("");
    box.querySelectorAll(".tl-thumb").forEach((fig) => {
      const id = fig.dataset.id;
      const img = state.draft.images.find((i) => i.id === id);
      const link = fig.querySelector(".tl-link");
      if (img && img.itemId) link.value = img.itemId;
      fig.querySelector(".tl-cap").addEventListener("input", (e) => {
        if (img) img.caption = e.target.value;
        schedule();
      });
      link.addEventListener("change", () => {
        if (img) img.itemId = link.value;
        schedule();
      });
      fig.querySelector(".tl-del").addEventListener("click", async () => {
        try {
          await api(`/api/testlauf/bild/${encodeURIComponent(id)}`, { method: "DELETE" });
          state.draft.images = state.draft.images.filter((i) => i.id !== id);
          renderThumbs();
          updateSummary();
          setSave("Bild entfernt");
        } catch (err) {
          setSave("Fehler: " + err.message);
        }
      });
    });
  }

  function renderRuns() {
    const box = $("runs");
    if (!state.runs.length) {
      box.innerHTML = "<p class='hint'>Noch keine abgelegten Läufe.</p>";
      return;
    }
    box.innerHTML = state.runs.map((r) => {
      const s = r.summary || {};
      const when = r.createdAt ? new Date(r.createdAt).toLocaleString("de-DE") : r.name;
      return `<button type="button" class="tl-run" data-name="${esc(r.name)}">
        <div class="name">${esc(r.name)}</div>
        <div class="meta">${esc(when)} · ${s.done || 0}/${s.total || 0} · X ${s.fehler || 0} · ${r.images || 0} Bilder</div>
      </button>`;
    }).join("");
    box.querySelectorAll(".tl-run").forEach((btn) => {
      btn.addEventListener("click", () => openRun(btn.dataset.name, btn));
    });
  }

  async function openRun(name, btn) {
    try {
      const data = await api(`/api/testlauf/lauf/${encodeURIComponent(name)}`);
      $("runView").hidden = false;
      $("runName").textContent = name;
      $("runMd").textContent = data.md || "";
      document.querySelectorAll(".tl-run").forEach((b) => b.classList.toggle("active", b === btn));
    } catch (err) {
      setSave("Fehler: " + err.message);
    }
  }

  function updateSummary() {
    let total = 0, done = 0, ok = 0, fehler = 0, eigen = 0;
    for (const sec of state.checklist.sections || []) {
      for (const it of sec.items) {
        total += 1;
        const mark = (document.querySelector(`.tl-item[data-id="${CSS.escape(it.id)}"]`) || {}).dataset?.mark
          || ((state.draft.answers || {})[it.id] || {}).mark || "";
        if (mark === "o") { ok += 1; done += 1; }
        else if (mark === "x") { fehler += 1; done += 1; }
        else if (mark === "eigen") { eigen += 1; done += 1; }
      }
    }
    $("summaryHint").textContent =
      `${done} von ${total} erledigt · O ${ok} · X ${fehler} · Eigen ${eigen} · ${(state.draft.images || []).length} Bilder`;
  }

  async function uploadFiles(files) {
    for (const file of files) {
      if (!file.type.startsWith("image/") && !/\.(jpe?g|png|gif|webp|avif|bmp|heic|heif)$/i.test(file.name)) {
        setSave("Übersprungen: " + file.name);
        continue;
      }
      if (file.size > state.maxImage) {
        setSave(`Zu groß: ${file.name}`);
        continue;
      }
      setSave("Lädt " + file.name + " …");
      const q = new URLSearchParams({ name: file.name, type: file.type || "" });
      try {
        const img = await api(`/api/testlauf/bild?${q}`, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream", "X-File-Type": file.type || "" },
          body: file,
        });
        state.draft.images.push(img);
        renderThumbs();
        updateSummary();
        setSave("Bild gespeichert");
      } catch (err) {
        setSave("Fehler: " + err.message);
      }
    }
  }

  async function ablegen() {
    await flush();
    if (!confirm("Bericht jetzt nach data/testlaeufe ablegen? Der Entwurf wird geleert.")) return;
    try {
      setSave("Legt ab …");
      const out = await api("/api/testlauf/ablegen", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      state.draft = { tester: "", geraet: "", notizen: "", answers: {}, images: [] };
      $("tester").value = "";
      $("geraet").value = "";
      $("notizen").value = "";
      renderChecklist();
      renderThumbs();
      const fresh = await api("/api/testlauf");
      state.runs = fresh.runs || [];
      renderRuns();
      setSave(`Abgelegt: ${out.name}`);
      alert(`Gespeichert als ${out.name}\nOrdner: data/testlaeufe/${out.name}`);
    } catch (err) {
      setSave("Fehler: " + err.message);
    }
  }

  async function neu() {
    if (!confirm("Entwurf verwerfen und neu starten? Nicht abgelegte Antworten und Bilder gehen verloren.")) return;
    try {
      state.draft = await api("/api/testlauf/neu", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      $("tester").value = state.draft.tester || "";
      $("geraet").value = state.draft.geraet || "";
      $("notizen").value = state.draft.notizen || "";
      renderChecklist();
      renderThumbs();
      setSave("Neuer Entwurf");
    } catch (err) {
      setSave("Fehler: " + err.message);
    }
  }

  function wire() {
    ["tester", "geraet", "notizen"].forEach((id) => $(id).addEventListener("input", schedule));
    $("btnAblegen").addEventListener("click", ablegen);
    $("btnAblegenFoot").addEventListener("click", ablegen);
    $("btnNeu").addEventListener("click", neu);
    $("btnCloseRun").addEventListener("click", () => {
      $("runView").hidden = true;
      document.querySelectorAll(".tl-run").forEach((b) => b.classList.remove("active"));
    });

    const drop = $("drop");
    const input = $("fileInput");
    $("btnPick").addEventListener("click", (e) => { e.stopPropagation(); input.click(); });
    drop.addEventListener("click", () => input.click());
    drop.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); }
    });
    input.addEventListener("change", () => {
      uploadFiles([...input.files]);
      input.value = "";
    });
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => {
      e.preventDefault(); drop.classList.add("drag");
    }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => {
      e.preventDefault(); drop.classList.remove("drag");
    }));
    drop.addEventListener("drop", (e) => uploadFiles([...e.dataTransfer.files]));

    window.addEventListener("beforeunload", (e) => {
      if (!state.dirty) return;
      e.preventDefault();
      e.returnValue = "";
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }

  async function boot() {
    wire();
    try {
      const data = await api("/api/testlauf");
      state.checklist = data.checklist || state.checklist;
      state.draft = data.draft || state.draft;
      state.runs = data.runs || [];
      state.version = data.version;
      state.maxImage = data.maxImage || state.maxImage;
      state.folder = data.folder || "";
      $("notesTitle").textContent = state.checklist.notesTitle || "Notizen";
      $("tester").value = state.draft.tester || "";
      $("geraet").value = state.draft.geraet || "";
      $("notizen").value = state.draft.notizen || "";
      if (state.version && state.version.version) {
        $("versionChip").textContent = state.version.version;
      }
      $("folderHint").textContent = "Berichte landen in data/testlaeufe/ (nur dieser Rechner).";
      renderChecklist();
      renderThumbs();
      renderRuns();
      setSave("Bereit");
    } catch (err) {
      $("checklist").innerHTML = `<p class="hint">Testlauf nicht erreichbar: ${esc(err.message)}. Nur am SL-Rechner, nicht über den Tunnel.</p>`;
      setSave("Fehler");
    }
  }

  boot();
})();
