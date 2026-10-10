const $ = (s) => document.querySelector(s);
let state = {};
let pins = [];

async function api(path, body, method) {
  const res = await fetch(path, {
    method: method || (body ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Fehler");
  return data;
}

function paint() {
  const grid = $("#grid");
  grid.querySelectorAll(".pin").forEach((n) => n.remove());
  pins.forEach((p) => {
    const el = document.createElement("div");
    el.className = "pin";
    el.textContent = p.label;
    el.style.cssText = "position:absolute;left:" + p.x + "%;top:" + p.y + "%;transform:translate(-50%,-50%);color:#e9c46a;font-size:12px;";
    grid.appendChild(el);
  });
}

async function refresh() {
  state = await api("/api/state");
  const pcs = state.characters || [];
  const sel = $("#pc");
  const current = sel.value;
  sel.innerHTML = pcs.map((c) => `<option value="${c.id}">${c.name} · Lv ${c.level || 1}</option>`).join("") || "<option value=''>Kein Bogen</option>";
  if (current) sel.value = current;
  const pc = pcs.find((c) => c.id === sel.value);
  $("#who").textContent = pc ? pc.name + (pc.subclass ? " · " + pc.subclass : "") : "kein Bogen";
  $("#soloEmpty").classList.toggle("hidden", pcs.length > 0);
  NEEDS_PC.forEach((id) => { const b = $("#" + id); if (b) b.disabled = !pcs.length; });
  fillSubs(pc);
  if (pc) {
    api("/api/solo/subclasses?class=" + encodeURIComponent(pc.class || "")).then((data) => {
      window.emberSubs = data.subclasses || [];
      fillSubs(pc);
    }).catch(() => {});
  }
  const maps = await api("/api/maps");
  $("#maps").innerHTML = (maps.maps || []).map((m) => `<button class="btn tiny" data-map="${m.id}">${m.name}</button>`).join("");
  $("#maps").querySelectorAll("[data-map]").forEach((b) => b.addEventListener("click", () => api("/api/maps/load", { id: b.dataset.map }).then(note)));
}

// Ohne Bogen geht hier nichts. Die Knoepfe sind dann aus, statt still zu scheitern.
const NEEDS_PC = ["btnSubclass", "btnStart", "btnLevel", "btnLevelGo", "btnBot", "btnAct", "btnDungeon"];

// SL-Schluessel wie auf /ember: am SL-Rechner kommt er aus data/sl.pin.
async function gmBody(body) {
  let key = localStorage.getItem("ember.gmKey") || "";
  if (!key) {
    const row = await fetch("/api/sl-pin").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (row && row.pin) {
      key = row.pin;
      localStorage.setItem("ember.gmKey", key);
    }
  }
  return { ...body, as: "gm", gmKey: key };
}

function note(text) {
  const log = $("#log");
  const line = document.createElement("div");
  line.className = "log-item note";
  line.textContent = typeof text === "string" ? text : (text.text || text.spoken || JSON.stringify(text));
  log.prepend(line);
  while (log.children.length > 6) log.lastElementChild.remove();
}

function run(fn) {
  fn().catch((err) => note(err.message || "Fehler"));
}

$("#grid").addEventListener("pointerdown", (ev) => {
  const box = $("#grid").getBoundingClientRect();
  const x = Math.round(((ev.clientX - box.left) / box.width) * 100);
  const y = Math.round(((ev.clientY - box.top) / box.height) * 100);
  const label = prompt("Pin?", "Mark") || "Mark";
  pins.push({ label, x, y });
  paint();
});

function fillSubs(pc) {
  const names = window.emberSubs || [];
  const options = names.map((n) => `<option value="${n.name || n}">${n.name || n}${n.feature ? " — " + n.feature : ""}</option>`).join("");
  const current = pc?.subclass || "";
  for (const id of ["subPick", "levelSub"]) {
    const sel = $("#" + id);
    if (!sel) continue;
    sel.innerHTML = `<option value="">${id === "levelSub" ? "behalten" : "—"}</option>` + options;
    if (current) sel.value = current;
  }
}
$("#pc")?.addEventListener("change", () => fillSubs((state.characters || []).find((c) => c.id === $("#pc").value)));
$("#btnSubclass").addEventListener("click", () => run(async () => {
  const res = await api("/api/solo/subclass", { characterId: $("#pc").value, subclass: $("#subPick").value });
  note(res.text);
  await refresh();
}));
$("#btnLevel").addEventListener("click", () => {
  const pc = (state.characters || []).find((c) => c.id === $("#pc").value);
  const box = $("#levelBox");
  if (!pc) return note("Erst einen Bogen wählen.");
  if (!box) return;
  const next = Math.min(10, Number(pc.level || 1) + 1);
  const prof = [2, 5, 8].includes(next) ? " Proficiency +1." : "";
  $("#levelPreview").textContent = pc.name + " wird Level " + next + "." + prof;
  $("#levelUpgrade").innerHTML = `<option value="">—</option>` + (pc.experiences || []).map((e) => `<option value="${e.id || e.name}">${e.name} +${e.bonus}</option>`).join("");
  box.classList.toggle("hidden");
});
$("#btnLevelGo").addEventListener("click", () => run(async () => {
  const res = await api("/api/solo/level", {
    characterId: $("#pc").value,
    experience: $("#levelXp").value,
    upgrade: $("#levelUpgrade").value,
    note: $("#levelNote").value,
    subclass: $("#levelSub").value,
    party: $("#levelParty").checked,
  });
  note(res.text);
  $("#levelOut").textContent = res.text;
  $("#levelBox").classList.add("hidden");
  await refresh();
}));
$("#btnStart").addEventListener("click", () => run(async () => {
  const res = await api("/api/solo/start", { characterId: $("#pc").value });
  note(res.text);
}));
$("#btnBot").addEventListener("click", () => run(async () => {
  const res = await api("/api/solo/bot", { botId: $("#bot").value });
  note(res.text);
}));
$("#btnAct").addEventListener("click", () => run(async () => {
  const res = await api("/api/solo/act", { characterId: $("#pc").value });
  note(res.text);
}));
$("#btnSaveMap").addEventListener("click", () => run(async () => {
  const res = await api("/api/maps", { name: $("#mapName").value, tokens: pins });
  note(`Karte ${res.name}`);
  pins = [];
  paint();
  await refresh();
}));
const loadSchwelle = () => run(async () => {
  await api("/api/campaigns/import-schwelle", await gmBody({}));
  note("Asche unter der Schwelle liegt bereit.");
  await refresh();
});
$("#btnSchwelle")?.addEventListener("click", loadSchwelle);
$("#btnSchwelleEmpty")?.addEventListener("click", loadSchwelle);
$("#btnDungeon").addEventListener("click", () => run(async () => {
  const res = await api("/api/dungeon", { characterId: $("#pc").value });
  const box = $("#rooms");
  box.innerHTML = "";
  (res.rooms || []).forEach((room, i) => {
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = (room.clear ? "leer · " : (i + 1) + " · ") + room.name + (room.bot ? " · " + room.bot.name : " · Durchgang");
    b.addEventListener("click", () => run(async () => {
      const out = await api("/api/dungeon/room", { roomId: room.id, characterId: $("#pc").value });
      b.textContent = out.text;
      note(out.text);
      if (out.leveled) refresh();
    }));
    box.appendChild(b);
  });
  note(res.text);
}));

run(async () => {
  const data = await api("/api/solo/subclasses");
  window.emberSubs = data.subclasses || [];
  fillSubs((state.characters || []).find((c) => c.id === $("#pc").value));
});
run(async () => {
  const data = await api("/api/solo/bots");
  $("#bot").innerHTML = (data.bots || []).map((b) => `<option value="${b.id}">${b.name} · Diff ${b.difficulty}</option>`).join("");
});
run(refresh);
