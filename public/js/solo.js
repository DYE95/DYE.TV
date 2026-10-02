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
  $("#who").textContent = pc ? pc.name : "kein Bogen";
  const maps = await api("/api/maps");
  $("#maps").innerHTML = (maps.maps || []).map((m) => `<button class="btn tiny" data-map="${m.id}">${m.name}</button>`).join("");
  $("#maps").querySelectorAll("[data-map]").forEach((b) => b.addEventListener("click", () => api("/api/maps/load", { id: b.dataset.map }).then(note)));
}

function note(text) {
  const log = $("#log");
  const line = document.createElement("div");
  line.className = "log-item note";
  line.textContent = typeof text === "string" ? text : (text.text || text.spoken || JSON.stringify(text));
  log.prepend(line);
}

$("#grid").addEventListener("pointerdown", (ev) => {
  const box = $("#grid").getBoundingClientRect();
  const x = Math.round(((ev.clientX - box.left) / box.width) * 100);
  const y = Math.round(((ev.clientY - box.top) / box.height) * 100);
  const label = prompt("Pin?", "Mark") || "Mark";
  pins.push({ label, x, y });
  paint();
});

$("#btnStart").addEventListener("click", async () => {
  const res = await api("/api/solo/start", { characterId: $("#pc").value });
  note(res.text);
});
$("#btnBot").addEventListener("click", async () => {
  const res = await api("/api/solo/bot", { botId: $("#bot").value });
  note(res.text);
});
$("#btnAct").addEventListener("click", async () => {
  const res = await api("/api/solo/act", { characterId: $("#pc").value });
  note(res.text);
});
$("#btnSaveMap").addEventListener("click", async () => {
  const res = await api("/api/maps", { name: $("#mapName").value, tokens: pins });
  note("Karte " + res.name);
  pins = [];
  paint();
  refresh();
});
$("#btnDungeon").addEventListener("click", async () => {
  const res = await api("/api/dungeon", { characterId: $("#pc").value });
  const box = $("#rooms");
  box.innerHTML = "";
  (res.rooms || []).forEach((room) => {
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = room.name + (room.bot ? " · " + room.bot.name : " · leer");
    b.addEventListener("click", async () => {
      const out = await api("/api/dungeon/room", { roomId: room.id, characterId: $("#pc").value });
      b.textContent = out.text;
      note(out.text);
      if (out.leveled) refresh();
    });
    box.appendChild(b);
  });
  note(res.text);
});

api("/api/solo/bots").then((data) => {
  $("#bot").innerHTML = (data.bots || []).map((b) => `<option value="${b.id}">${b.name} · Diff ${b.difficulty}</option>`).join("");
});
refresh();
