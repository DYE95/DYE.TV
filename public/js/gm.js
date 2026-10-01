const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let state = { campaigns: [], characters: [], sessions: [], active: {}, lan: {} };
let selectedCampaignId = null;
let selectedCharacterId = null;

function applyState(next) {
  state = next;
  if (!selectedCampaignId) selectedCampaignId = state.active.campaignId;
  if (!selectedCharacterId) {
    const first = charsOf(activeCampaignId())[0];
    selectedCharacterId = first ? first.id : null;
  }
  render();
}
startStateFeed(applyState);
if (location.hash.replace("#", "")) emberGo(location.hash.replace("#", ""));
window.addEventListener("hashchange", () => {
  const name = location.hash.replace("#", "");
  if (name) emberGo(name);
});

function activeCampaignId() { return state.active?.campaignId || selectedCampaignId; }
function activeSession() { return (state.sessions || []).find((s) => s.id === state.active?.sessionId) || null; }
function campaignById(id) { return (state.campaigns || []).find((c) => c.id === id); }
function charsOf(campaignId) { return (state.characters || []).filter((c) => !campaignId || c.campaignId === campaignId); }
function currentEncounter() {
  const ses = activeSession();
  if (!ses) return null;
  return (ses.encounters || []).find((e) => e.id === ses.activeEncounterId) || (ses.encounters || [])[0] || null;
}

async function api(url, body, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Fehler");
  return data;
}

function pips(count, marked, kind, onClick) {
  const wrap = document.createElement("div");
  wrap.className = "pips";
  for (let i = 0; i < count; i += 1) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `pip ${kind}${i < marked ? " on" : ""}`;
    b.addEventListener("click", () => onClick(i < marked ? i : i + 1));
    wrap.appendChild(b);
  }
  return wrap;
}

function renderLan() {
  const urls = (state.lan?.addresses || []).map((a) => `http://${a.address}:${state.lan.port}/player`);
  $("#lanChip").textContent = urls[0] ? `Tisch: ${urls[0]}` : "LAN …";
}

function renderHud() {
  const ses = activeSession();
  const q = ses?.spotlightQueue || [];
  const box = $("#hudQueue");
  if (!box) return;
  if (!q.length) {
    box.innerHTML = `<p class="hint">${ses?.narrating ? "Die Umbra lauscht. Noch keine Hand." : "Noch niemand hebt die Hand."}</p>`;
    return;
  }
  box.innerHTML = "";
  q.forEach((item) => {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `<div class="name">${item.name}</div><div class="meta">${item.action || "Want Spotlight"}<br>${item.question || ""}</div>`;
    const ok = document.createElement("button");
    ok.className = "btn tiny primary";
    ok.textContent = "Gib ihnen das Licht";
    ok.addEventListener("click", () => api(`/api/session/spotlight/${item.id}/resolve`, { accept: true }));
    const no = document.createElement("button");
    no.className = "btn tiny ghost";
    no.textContent = "Später";
    no.addEventListener("click", () => api(`/api/session/spotlight/${item.id}/resolve`, { accept: false }));
    el.appendChild(ok); el.appendChild(no);
    box.appendChild(el);
  });
}

async function playEvent() {
  const ses = activeSession();
  if (!ses) { alert("Erst die Glut entfachen (Session öffnen)."); return; }
  let enc = currentEncounter();
  if (!enc) {
    const name = prompt("Name des Events?", "Der Boden gibt nach");
    if (!name) return;
    enc = await api("/api/session/encounter", { as: "gm", name });
  }
  await api("/api/session/encounter/status", { as: "gm", status: "live" });
  emberGo("encounter");
}

function renderCampaigns() {
  const list = $("#campaignList");
  if (!list) return;
  list.innerHTML = "";
  (state.campaigns || []).forEach((c) => {
    const b = document.createElement("button");
    b.className = `card${c.id === selectedCampaignId ? " active" : ""}`;
    b.innerHTML = `<div class="name">${c.name}</div><div class="meta">${c.frame || "kein Frame"} · Fear ${c.gmFear}/${c.fearMax}</div>`;
    b.addEventListener("click", () => { selectedCampaignId = c.id; fillCampaignForm(c); renderCampaigns(); });
    list.appendChild(b);
  });
  const current = campaignById(selectedCampaignId) || state.campaigns[0];
  const busy = document.activeElement && $("#campaignForm")?.contains(document.activeElement);
  if (current && !busy) fillCampaignForm(current);
  const view = $("#campaignView");
  const active = campaignById(activeCampaignId());
  if (view) {
    view.innerHTML = active
      ? `<p class="name" style="font-size:28px">${active.name}</p><p class="hint">${active.frame || "kein Frame"}</p><p>${(active.notes || "").replace(/</g, "&lt;")}</p>`
      : `<p class="hint">Noch keine Kampagne.</p>`;
  }
}
function fillCampaignForm(c) {
  selectedCampaignId = c.id;
  const form = $("#campaignForm");
  if (!form) return;
  form.name.value = c.name || "";
  form.frame.value = c.frame || "";
  form.notes.value = c.notes || "";
}

function renderCharacters() {
  const list = $("#characterList");
  if (!list) return;
  list.innerHTML = "";
  charsOf(activeCampaignId()).forEach((c) => {
    const b = document.createElement("button");
    b.className = `card${c.id === selectedCharacterId ? " active" : ""}`;
    b.innerHTML = `<div class="name">${c.name}</div><div class="meta">${c.class || "—"} · PIN ${c.playerPin}</div>`;
    b.addEventListener("click", () => { selectedCharacterId = c.id; fillCharacterForm(c); renderCharacters(); renderCharacterSheet(); });
    list.appendChild(b);
  });
  const current = charsOf(activeCampaignId()).find((c) => c.id === selectedCharacterId) || charsOf(activeCampaignId())[0];
  if (current) { selectedCharacterId = current.id; fillCharacterForm(current); }
  renderCharacterSheet();
}
function fillCharacterForm(c) {
  const form = $("#characterForm");
  if (!form) return;
  form.name.value = c.name || "";
  if (form.pronouns) form.pronouns.value = c.pronouns || "";
  form.ancestry.value = c.ancestry || "";
  form.community.value = c.community || "";
  form.level.value = c.level || 1;
  form.class.value = c.class || "";
  form.subclass.value = c.subclass || "";
  ["agility","strength","finesse","instinct","presence","knowledge"].forEach((t) => { form[t].value = c.traits?.[t] ?? 0; });
  form.hope.value = c.hope ?? 2;
  form.stressMarked.value = c.stressMarked ?? 0;
  form.hpMarked.value = c.hpMarked ?? 0;
  form.stressMax.value = c.stressMax ?? 6;
  form.hpMax.value = c.hpMax ?? 6;
  form.evasion.value = c.evasion ?? 10;
  form.major.value = c.major ?? 7;
  form.severe.value = c.severe ?? 14;
  form.proficiency.value = c.proficiency ?? 1;
  form.experiencesText.value = (c.experiences || []).map((e) => `${e.name} | ${e.bonus}`).join("\n");
  form.featuresText.value = (c.features || []).map((f) => `${f.name} — ${f.text || ""}`).join("\n");
  if (form.notes) form.notes.value = c.notes || "";
  if ($("#playerPin")) $("#playerPin").textContent = c.playerPin || "—";
  if ($("#photoBox")) $("#photoBox").innerHTML = (c.sheetPhotos || []).map((p) => `<img src="/uploads/${p.file}" alt="" />`).join("");
  const frame = $("#tokenFrame");
  if (frame) frame.src = "/token?embed=1&char=" + encodeURIComponent(c.id);
}
function renderCharacterSheet() {
  const c = (state.characters || []).find((x) => x.id === selectedCharacterId);
  const root = $("#characterView");
  if (!root) return;
  if (!c) { root.innerHTML = "<p class='hint'>Kein Bogen.</p>"; return; }
  root.innerHTML = `<div class="menu-card" style="width:min(720px,96%);margin:20px auto;text-align:left;">
    <h1>${c.name}</h1>
    <p class="hint">${c.class || ""} · PIN ${c.playerPin}</p>
    <div class="stat-grid">${["agility","strength","finesse","instinct","presence","knowledge"].map((t) =>
      `<div class="stat"><span>${t}</span><b>${c.traits?.[t] >= 0 ? "+" : ""}${c.traits?.[t] ?? 0}</b></div>`).join("")}</div>
    <p>Hope ${c.hope}/${c.hopeMax} · Stress ${c.stressMarked}/${c.stressMax} · HP ${c.hpMarked}/${c.hpMax}</p>
  </div>`;
}

function renderEncounter() {
  const ses = activeSession();
  const enc = currentEncounter();
  if ($("#encMeta")) $("#encMeta").textContent = !ses ? "Erst die Glut entfachen." : enc ? enc.name + " · " + enc.status : "Kein Event bereit.";
  const list = $("#encList");
  if (list) {
    list.innerHTML = "";
    (ses?.encounters || []).forEach((e) => {
      const b = document.createElement("button");
      b.className = "card" + (enc && e.id === enc.id ? " active" : "");
      b.innerHTML = `<div class="name">${e.name}</div><div class="meta">${e.status} · Snares ${(e.traps||[]).length} · Thresholds ${(e.zones||[]).length}</div>`;
      b.addEventListener("click", () => api("/api/session/encounter/select", { as: "gm", id: e.id }));
      list.appendChild(b);
    });
  }
  if ($("#encAlerts")) {
    $("#encAlerts").innerHTML = (enc?.alerts || []).map((a) =>
      `<div class="card"><div class="name">${a.kind}</div><div class="meta">${a.text}</div></div>`
    ).join("") || "<p class='hint'>Die Dunkelheit hält noch still.</p>";
  }
  renderMap($("#mapStage"), state, { viewer: "gm", actor: "gm", canMove: () => true });
  if ($("#btnFow")) $("#btnFow").textContent = ses?.map?.fow?.on ? "Umbra: AN" : "Umbra: AUS";
  const tone = { ready: "liegt im Dunkeln bereit", live: "läuft — der Boden hat nachgegeben", ended: "ist verloschen" };
  if ($("#sessionEncName")) $("#sessionEncName").textContent = enc ? enc.name : "Kein Event bereit";
  if ($("#sessionEncStatus")) $("#sessionEncStatus").textContent = enc
    ? tone[enc.status] || enc.status
    : "Unter Events eine Karte bereitlegen. Dann, mitten in der Geschichte: Play Event.";
  const init = ses?.initiative;
  const who = init?.on && init.order?.length ? init.order[init.index] : null;
  if ($("#sessionTurn")) $("#sessionTurn").textContent = who ? "Initiative · Runde " + init.round + " · " + who.label : "";
  const meta = $("#initMeta");
  const list = $("#initList");
  if (meta) meta.textContent = who
    ? "Runde " + init.round + " · " + who.label + " ist dran." + (init.auto === false ? " Ablauf von Hand." : " Wurf gibt weiter.")
    : "Noch keine Reihenfolge. Play Event setzt sie aus den Tokens.";
  if (list) {
    list.innerHTML = "";
    (init?.order || []).forEach((row, i) => {
      const el = document.createElement("div");
      el.className = "card init-row" + (i === init.index && init.on ? " current" : "");
      const label = document.createElement("span");
      label.className = "grow";
      label.textContent = (i + 1) + " " + row.label;
      const up = document.createElement("button");
      up.type = "button"; up.className = "btn tiny"; up.textContent = "↑";
      up.addEventListener("click", () => api("/api/session/initiative", { as: "gm", action: "up", id: row.id }));
      const down = document.createElement("button");
      down.type = "button"; down.className = "btn tiny"; down.textContent = "↓";
      down.addEventListener("click", () => api("/api/session/initiative", { as: "gm", action: "down", id: row.id }));
      const go = document.createElement("button");
      go.type = "button"; go.className = "btn tiny"; go.textContent = "dran";
      go.addEventListener("click", () => api("/api/session/initiative", { as: "gm", action: "set", id: row.id }));
      el.appendChild(label); el.appendChild(up); el.appendChild(down); el.appendChild(go);
      list.appendChild(el);
    });
    if (!init?.order?.length) list.innerHTML = "<p class='hint'>Tokens auf die Karte, dann Aus Tokens.</p>";
  }
}

function renderSession() {
  const camp = campaignById(activeCampaignId());
  const ses = activeSession();
  if ($("#sessionMeta")) $("#sessionMeta").textContent = camp ? `${camp.name}${ses ? " · Glut offen" : ""}` : "Keine Kampagne.";
  if ($("#btnNarrate")) {
    $("#btnNarrate").textContent = ses?.narrating ? "Die Stimme senken" : "Speak the Dark";
    $("#btnNarrate").disabled = !ses;
  }
  if ($("#btnEndSession")) $("#btnEndSession").disabled = !ses;
  document.body.classList.toggle("narrating", Boolean(ses?.narrating));
  const fearBox = $("#fearPips");
  if (fearBox) {
    fearBox.innerHTML = "";
    if (camp) fearBox.appendChild(pips(camp.fearMax || 12, camp.gmFear || 0, "fear", (n) => api(`/api/campaigns/${camp.id}/fear`, { gmFear: n })));
  }
  const players = $("#sessionPlayers");
  if (players) {
    players.innerHTML = "";
    charsOf(activeCampaignId()).forEach((c) => {
      const seat = (state.presence || []).find((p) => p.characterId === c.id);
      const queued = (ses?.spotlightQueue || []).some((q) => q.characterId === c.id);
      const spot = ses?.activeSpotlight && ses.activeSpotlight.characterId === c.id;
      const code = spot ? "spotlight" : queued ? "queued" : (seat?.status || "");
      const el = document.createElement("div");
      el.className = "card";
      el.innerHTML = `<div class="name">${c.name}</div><div class="status"><span class="dot ${code}"></span>${statusLabel(code)}</div>`;
      players.appendChild(el);
    });
  }
  const log = $("#sessionLog");
  if (log) {
    log.innerHTML = "";
    (ses?.log || []).forEach((entry) => {
      const el = document.createElement("div");
      el.className = `log-item ${entry.kind}`;
      el.innerHTML = `<div class="who">${entry.author}</div><div class="txt">${entry.text}</div>`;
      log.appendChild(el);
    });
    log.scrollTop = log.scrollHeight;
  }
  const sel = $("#rollCharacter");
  if (sel) {
    const current = sel.value;
    sel.innerHTML = charsOf(activeCampaignId()).map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    if (current) sel.value = current;
    fillExperiences();
  }
  renderEncounter();
  renderHud();
}

function fillExperiences() {
  const pc = (state.characters || []).find((c) => c.id === $("#rollCharacter")?.value);
  const box = $("#rollExperience");
  if (!box) return;
  box.innerHTML = `<option value="">—</option>` + (pc?.experiences || []).map((e) => `<option value="${e.id}">${e.name} +${e.bonus}</option>`).join("");
}

function parseExperiences(text) {
  return String(text || "").split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const [name, bonus] = line.split("|").map((s) => s.trim());
    return { id: "xp_" + Math.random().toString(16).slice(2), name, bonus: Number(bonus || 2) };
  });
}
function parseFeatures(text) {
  return String(text || "").split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const [name, ...rest] = line.split("—");
    return { id: "feat_" + Math.random().toString(16).slice(2), name: name.trim(), text: rest.join("—").trim() };
  });
}

async function sendRoll(source) {
  const characterId = $("#rollCharacter").value;
  const pc = (state.characters || []).find((c) => c.id === characterId);
  const trait = $("#rollTrait").value;
  const expId = $("#rollExperience").value;
  const payload = {
    characterId, source, difficulty: Number($("#rollDifficulty").value || 0), trait,
    traitMod: trait && pc ? Number(pc.traits[trait] || 0) : 0,
    experiences: expId && pc ? pc.experiences.filter((e) => e.id === expId) : [],
    mode: $("#rollMode").value,
  };
  if (source === "table") {
    payload.hopeDie = Number($("#tableHope").value);
    payload.fearDie = Number($("#tableFear").value);
  }
  const result = await api("/api/roll", payload);
  $("#lastRoll").textContent = result.roll.spoken;
}

function render() {
  try {
    renderLan();
    renderCampaigns();
    renderCharacters();
    renderSession();
  } catch (err) {
    const box = $("#emberError");
    if (box) { box.hidden = false; box.textContent = err.message; }
  }
}

$("#btnStartSession")?.addEventListener("click", () => api("/api/session/start", { campaignId: activeCampaignId() }));
$("#btnEndSession")?.addEventListener("click", () => api("/api/session/end", {}));
$("#btnNarrate")?.addEventListener("click", () => {
  const ses = activeSession();
  if (!ses) return;
  api("/api/session/narrate", { narrating: !ses.narrating });
});
$("#btnLog")?.addEventListener("click", () => {
  const text = $("#logText").value.trim();
  if (!text) return;
  api("/api/session/log", { text, author: "SL" });
  $("#logText").value = "";
});
$("#btnDigitalRoll")?.addEventListener("click", () => sendRoll("digital"));
$("#btnTableRoll")?.addEventListener("click", () => sendRoll("table"));
$("#btnPlayEvent")?.addEventListener("click", playEvent);
$("#btnPlayEvent2")?.addEventListener("click", playEvent);
$("#btnInitNext")?.addEventListener("click", () => api("/api/session/initiative", { as: "gm", action: "next" }));
$("#btnInitPrev")?.addEventListener("click", () => api("/api/session/initiative", { as: "gm", action: "prev" }));
$("#btnInitSide")?.addEventListener("click", () => api("/api/session/initiative", { as: "gm", action: "side" }));
$("#btnInitSeed")?.addEventListener("click", () => api("/api/session/initiative", { as: "gm", action: "seed" }));
document.addEventListener("keydown", (ev) => {
  if (ev.target && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return;
  if (ev.key === "n" || ev.key === "N") {
    ev.preventDefault();
    api("/api/session/initiative", { as: "gm", action: ev.shiftKey ? "prev" : "next" });
  }
});
$("#btnNewEnc")?.addEventListener("click", async () => {
  const name = prompt("Name des Events?", "Der Boden gibt nach");
  if (!name) return;
  await api("/api/session/encounter", { as: "gm", name });
});
$("#btnEncEnd")?.addEventListener("click", () => api("/api/session/encounter/status", { as: "gm", status: "ended" }));
$$("[data-tool]").forEach((btn) => {
  btn.addEventListener("click", () => {
    MapKit.tool = btn.getAttribute("data-tool");
    MapKit.zoneStart = null;
    $$("[data-tool]").forEach((b) => b.classList.toggle("on", b === btn));
  });
});
$("#btnAddFoe")?.addEventListener("click", () => {
  const label = prompt("Foe?", "Ambusher");
  if (label) api("/api/session/map/token", { as: "gm", kind: "foe", label, color: "#6a040f", x: 55, y: 40 });
});
$("#btnAddPin")?.addEventListener("click", () => {
  const label = prompt("Pin?", "Die Kiste");
  if (label) api("/api/session/map/token", { as: "gm", kind: "marker", label, color: "#e9c46a", x: 48, y: 48 });
});
$("#btnFow")?.addEventListener("click", () => api("/api/session/map/fow", { as: "gm", on: !activeSession()?.map?.fow?.on }));
$("#btnFowClear")?.addEventListener("click", () => api("/api/session/map/fow", { as: "gm", clear: true, on: true }));
$("#mapImage")?.addEventListener("change", (ev) => {
  const file = ev.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const data = String(reader.result).split(",")[1] || "";
    const ext = /\.png$/i.test(file.name) ? "png" : "jpg";
    api("/api/session/map/image", { as: "gm", data, ext });
  };
  reader.readAsDataURL(file);
});
$("#btnNewCampaign")?.addEventListener("click", async () => {
  const name = prompt("Name?", "Neue Glut");
  if (!name) return;
  const c = await api("/api/campaigns", { name, frame: "Age of Umbra" });
  selectedCampaignId = c.id;
});
$("#campaignForm")?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!selectedCampaignId) return;
  const form = ev.target;
  await api(`/api/campaigns/${selectedCampaignId}`, { name: form.name.value, frame: form.frame.value, notes: form.notes.value }, "PATCH");
  await api("/api/active-campaign", { campaignId: selectedCampaignId });
});
$("#btnUseCampaign")?.addEventListener("click", () => selectedCampaignId && api("/api/active-campaign", { campaignId: selectedCampaignId }));
$("#btnQuickstart")?.addEventListener("click", async () => {
  const res = await api("/api/quickstart/sablewood", {});
  selectedCampaignId = res.campaignId;
});
$("#btnNewCharacter")?.addEventListener("click", async () => {
  const name = prompt("Name?", "Neu");
  if (!name) return;
  const c = await api("/api/characters", { name, campaignId: activeCampaignId() });
  selectedCharacterId = c.id;
});
$("#characterForm")?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!selectedCharacterId) return;
  const form = ev.target;
  await api(`/api/characters/${selectedCharacterId}`, {
    name: form.name.value, pronouns: form.pronouns.value, ancestry: form.ancestry.value,
    community: form.community.value, level: Number(form.level.value || 1),
    class: form.class.value, subclass: form.subclass.value,
    traits: {
      agility: Number(form.agility.value||0), strength: Number(form.strength.value||0),
      finesse: Number(form.finesse.value||0), instinct: Number(form.instinct.value||0),
      presence: Number(form.presence.value||0), knowledge: Number(form.knowledge.value||0),
    },
    hope: Number(form.hope.value||0), stressMarked: Number(form.stressMarked.value||0),
    hpMarked: Number(form.hpMarked.value||0), stressMax: Number(form.stressMax.value||6),
    hpMax: Number(form.hpMax.value||6), evasion: Number(form.evasion.value||10),
    major: Number(form.major.value||7), severe: Number(form.severe.value||14),
    proficiency: Number(form.proficiency.value||1),
    experiences: parseExperiences(form.experiencesText.value),
    features: parseFeatures(form.featuresText.value),
    notes: form.notes.value,
  }, "PATCH");
});
window.addEventListener("message", async (ev) => {
  const msg = ev.data;
  if (!msg || msg.type !== "ember-token") return;
  const id = msg.charId || selectedCharacterId;
  if (!id) return alert("Erst einen Bogen wählen.");
  await api(`/api/characters/${id}/portrait`, { data: msg.data, color: msg.color });
});
$("#photoInput")?.addEventListener("change", async (ev) => {
  const files = [...(ev.target.files || [])];
  if (!files.length || !selectedCharacterId) return;
  const photos = await Promise.all(files.map((file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, data: String(reader.result).split(",")[1] || "" });
    reader.readAsDataURL(file);
  })));
  await api(`/api/characters/${selectedCharacterId}/photos`, { photos });
});
$("#rollCharacter")?.addEventListener("change", fillExperiences);

const gmSeat = localStorage.getItem("ember.gmKey") || ("gm_" + Math.random().toString(16).slice(2));
localStorage.setItem("ember.gmKey", gmSeat);
setInterval(() => {
  fetch("/api/presence", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: gmSeat, role: "gm", name: "SL", status: activeSession()?.narrating ? "narrating" : "online" }),
  }).catch(() => {});
}, 4000);
