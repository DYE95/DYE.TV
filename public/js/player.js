const $ = (sel) => document.querySelector(sel);
let state = { characters: [], sessions: [], active: {}, media: [] };
let meId = localStorage.getItem("ember.characterId") || "";
let guest = localStorage.getItem("ember.guest") === "1";

function me() { return (state.characters || []).find((c) => c.id === meId); }

function sit(id, asGuest) {
  meId = id || "";
  guest = Boolean(asGuest);
  if (meId) localStorage.setItem("ember.characterId", meId);
  else localStorage.removeItem("ember.characterId");
  localStorage.setItem("ember.guest", guest ? "1" : "0");
  render();
}

function applyState(next) {
  state = next;
  if (meId && !state.characters.some((c) => c.id === meId)) meId = "";
  const typing = document.activeElement && ["question", "hopeDie", "fearDie", "compQ", "playLogQ"].includes(document.activeElement.id);
  if (!typing) render();
  else {
    const pc = me();
    renderMap($("#mapStage"), state, {
      viewer: pc ? pc.id : "guest",
      actor: "player",
      characterId: pc ? pc.id : null,
      canMove: (t) => pc && t.characterId === pc.id,
    });
  }
}
startStateFeed(applyState);

function renderClips() {
  const box = $("#playVideoBox");
  const list = $("#playClips");
  const video = $("#playVideo");
  if (video && typeof attachVideoDeck === "function") attachVideoDeck(video);
  if (!box || !list) return;
  const media = state.media || [];
  if (!media.length) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  list.innerHTML = "";
  media.forEach((clip) => {
    const b = document.createElement("button");
    b.className = "card";
    b.textContent = clip.name;
    b.addEventListener("click", () => {
      video.src = "/uploads/" + clip.file;
      video.play().catch(() => {});
    });
    list.appendChild(b);
  });
}

function renderGate() {
  const list = $("#seatList");
  if (!list) return;
  list.innerHTML = "";
  const chars = state.characters || [];
  if (!chars.length) {
    list.innerHTML = "<p class='hint'>Noch keine Bögen. Trotzdem Gast, Tokenatelier und Video gehen.</p>";
    return;
  }
  chars.forEach((c) => {
    const b = document.createElement("button");
    b.className = "card";
    b.innerHTML = `<div class="name">${c.name}</div><div class="meta">${c.class || "—"} · Hope ${c.hope}</div>`;
    b.addEventListener("click", () => sit(c.id, false));
    list.appendChild(b);
  });
}

function render() {
  const pc = me();
  const open = Boolean(pc || guest);
  document.body.classList.toggle("narrating", Boolean(
    (state.sessions || []).find((s) => s.id === state.active?.sessionId)?.narrating
  ));
  if (!open) {
    $("#gate").classList.remove("hidden");
    $("#sheet").classList.add("hidden");
    $("#playActions").classList.add("hidden");
    $("#mapStage")?.classList.add("hidden");
    $("#playVideoBox")?.classList.add("hidden");
    $("#who").textContent = "offen";
    renderGate();
    return;
  }
  $("#gate").classList.add("hidden");
  $("#mapStage")?.classList.remove("hidden");
  $("#playActions").classList.toggle("hidden", !pc);
  $("#sheet").classList.toggle("hidden", !pc);
  $("#who").textContent = pc ? pc.name : "Gast";
  const sesTurn = (state.sessions || []).find((s) => s.id === state.active?.sessionId);
  const init = sesTurn?.initiative;
  const whoTurn = init?.on && init.order?.length ? init.order[init.index] : null;
  const chip = $("#turnChip");
  if (chip) chip.textContent = whoTurn ? "R" + init.round + " " + whoTurn.label : "keine Reihenfolge";
  const mapKey = (sesTurn?.map?.tokens || []).map((t) => t.id + ":" + t.x + ":" + t.y + ":" + (t.rev || 0)).join("|") + "|" + (sesTurn?.map?.fow?.on ? "1" : "0");
  if ($("#mapStage") && mapKey !== $("#mapStage").dataset.key) {
    $("#mapStage").dataset.key = mapKey;
    renderMap($("#mapStage"), state, {
      viewer: pc ? pc.id : "guest",
      actor: "player",
      characterId: pc ? pc.id : null,
      canMove: (token) => pc && token.characterId === pc.id,
    });
  }
  renderClips();
  if (!pc) {
    $("#sheet").innerHTML = "<p class='hint'>Gast: Karte und Video. Bogen über „Anderen Bogen“.</p>";
    return;
  }
  const fmt = (n) => { const v = Number(n || 0); return (v >= 0 ? "+" : "") + v; };
  const traits = ["agility","strength","finesse","instinct","presence","knowledge"]
    .map((t) => `<div class="stat"><span>${t}</span><b>${fmt(pc.traits?.[t])}</b></div>`).join("");
  $("#sheet").innerHTML = `
    <p class="hint">${pc.class || ""} · Lv ${pc.level}</p>
    <h1 style="font-size:24px;margin:0 0 10px;">${pc.name}</h1>
    <div class="stat-grid">${traits}</div>
    <div class="mark-row" data-mark="hope"></div>
    <div class="mark-row" data-mark="stress"></div>
    <div class="mark-row" data-mark="hp"></div>`;
  const marks = { hope: ["Hope", pc.hope, pc.hopeMax], stress: ["Stress", pc.stressMarked, pc.stressMax], hp: ["HP", pc.hpMarked, pc.hpMax] };
  document.querySelectorAll(".mark-row").forEach((row) => {
    const key = row.dataset.mark;
    const [label, val, max] = marks[key];
    row.innerHTML = `<span>${label}</span>`;
    for (let i = 1; i <= (max || 6); i += 1) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pip" + (i <= val ? " on" : "");
      b.addEventListener("click", () => fetch("/api/characters/" + pc.id, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(key === "hope" ? { hope: i === val ? i - 1 : i } : key === "stress" ? { stressMarked: i === val ? i - 1 : i } : { hpMarked: i === val ? i - 1 : i }),
      }));
      row.appendChild(b);
    }
  });
  const hands = $("#handouts");
  if (hands) {
    const list = sesTurn?.handouts || [];
    hands.classList.toggle("hidden", !list.length);
    hands.innerHTML = list.map((h) => `<div class="card"><div class="name">${h.title}</div><div class="meta">${h.text}</div></div>`).join("");
  }
  const playLog = $("#playLog");
  if (playLog) {
    const q = ($("#playLogQ")?.value || "").toLowerCase();
    const kind = $("#playLogKind")?.value || "";
    const rows = (sesTurn?.log || []).filter((e) => (e.kind === "roll" || e.kind === "note") && (!kind || e.kind === kind) && (!q || (e.text + e.author).toLowerCase().includes(q))).slice(-8);
    playLog.classList.toggle("hidden", !rows.length);
    playLog.innerHTML = rows.map((e) => `<div class="log-item ${e.kind}"><div class="who">${e.author}</div><div class="txt">${e.text}</div></div>`).join("");
  }
  const actions = ["— Aktion —",
    ...["Agility","Strength","Finesse","Instinct","Presence","Knowledge"].map((t) => `Action Roll · ${t}`),
    ...(pc.experiences || []).map((e) => `Experience · ${e.name}`),
    "Frage stellen", "Help an Ally"];
  const pick = $("#actionPick");
  const prev = pick.value;
  pick.innerHTML = actions.map((a) => `<option>${a}</option>`).join("");
  if (actions.includes(prev)) pick.value = prev;
}

$("#btnGuest")?.addEventListener("click", () => sit("", true));
$("#btnLeaveSeat")?.addEventListener("click", () => sit("", false));
$("#btnSpotlight")?.addEventListener("click", async () => {
  if (!meId) return;
  const btn = $("#btnSpotlight");
  btn.disabled = true;
  const out = $("#rollOut");
  try {
    const res = await fetch("/api/session/spotlight", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        characterId: meId,
        action: ($("#actionPick")?.value || "").startsWith("—") ? "" : $("#actionPick").value,
        question: $("#question").value.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    const note = data.error || (res.ok ? "Spotlight ist beim Tisch." : "Nicht angekommen.");
    if (out) out.textContent = note;
    if ($("#tableNote")) $("#tableNote").textContent = note;
    if (res.ok) $("#question").value = "";
  } catch (err) {
    if (out) out.textContent = "Keine Verbindung.";
    if ($("#tableNote")) $("#tableNote").textContent = "Keine Verbindung.";
  }
  btn.disabled = false;
});
async function playerRoll(table) {
  const pc = me();
  if (!pc) return;
  const action = $("#actionPick").value || "";
  const trait = ["agility","strength","finesse","instinct","presence","knowledge"].find((t) => action.toLowerCase().includes(t));
  const payload = { characterId: pc.id, trait, traitMod: trait ? Number(pc.traits?.[trait] || 0) : 0, difficulty: 0 };
  if (table) {
    payload.hopeDie = Number($("#hopeDie").value);
    payload.fearDie = Number($("#fearDie").value);
  }
  const res = await fetch("/api/roll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json();
  if ($("#rollOut")) $("#rollOut").textContent = data.roll?.spoken || data.error || "";
}
$("#btnRoll")?.addEventListener("click", () => playerRoll(false));
$("#btnTableRoll")?.addEventListener("click", () => playerRoll(true));
$("#btnHarm")?.addEventListener("click", () => {
  if (!meId) return;
  fetch("/api/session/harm", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ characterId: meId, amount: Number($("#harmAmount").value || 1) }),
  });
});
$("#btnPing")?.addEventListener("click", () => {
  const pc = me();
  const ses = (state.sessions || []).find((s) => s.id === state.active?.sessionId);
  const token = (ses?.map?.tokens || []).find((t) => t.characterId === pc?.id);
  fetch("/api/session/ping", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x: token?.x ?? 50, y: token?.y ?? 50, name: pc?.name || "Gast" }),
  });
});
async function loadCompendium() {
  const q = $("#compQ")?.value || "";
  const kind = $("#compKind")?.value || "";
  const scope = $("#compScope")?.value || "";
  const res = await fetch("/api/compendium?q=" + encodeURIComponent(q) + "&kind=" + encodeURIComponent(kind) + "&scope=" + encodeURIComponent(scope));
  const data = await res.json();
  const sel = $("#compKind");
  if (sel && sel.options.length < 2 && data.kinds) {
    data.kinds.forEach((k) => {
      const o = document.createElement("option");
      o.value = k.id; o.textContent = k.label;
      sel.appendChild(o);
    });
  }
  const box = $("#compList");
  if (!box) return;
  box.innerHTML = (data.entries || []).map((e) => `<div class="card"><div class="name">${e.name}</div><div class="meta">${e.kind} · ${e.text}</div></div>`).join("") || "<p class='hint'>Nichts dazu.</p>";
}
$("#compQ")?.addEventListener("input", loadCompendium);
$("#compKind")?.addEventListener("change", loadCompendium);
$("#compScope")?.addEventListener("change", loadCompendium);
$("#playLogQ")?.addEventListener("input", render);
$("#playLogKind")?.addEventListener("change", render);

setInterval(() => {
  const pc = me();
  fetch("/api/presence", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: pc ? "seat_" + pc.id : "guest",
      role: "player",
      name: pc ? pc.name : "Gast",
      characterId: pc ? pc.id : null,
      status: "online",
    }),
  }).catch(() => {});
}, 4000);
