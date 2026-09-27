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
  const typing = document.activeElement && document.activeElement.id === "question";
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
  renderMap($("#mapStage"), state, {
    viewer: pc ? pc.id : "guest",
    actor: "player",
    characterId: pc ? pc.id : null,
    canMove: (token) => pc && token.characterId === pc.id,
  });
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
    <div class="stat-grid" style="margin-top:8px;">
      <div class="stat"><span>Hope</span><b>${pc.hope}/${pc.hopeMax}</b></div>
      <div class="stat"><span>Stress</span><b>${pc.stressMarked}/${pc.stressMax}</b></div>
      <div class="stat"><span>HP</span><b>${pc.hpMarked}/${pc.hpMax}</b></div>
    </div>`;
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
  await fetch("/api/session/spotlight", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      characterId: meId,
      action: $("#actionPick").value.startsWith("—") ? "" : $("#actionPick").value,
      question: $("#question").value.trim(),
    }),
  });
  $("#question").value = "";
});

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
