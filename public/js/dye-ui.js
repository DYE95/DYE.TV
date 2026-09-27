const KEY = "dye.leitungsparcours.v1";
const $ = (id) => document.getElementById(id);
const engine = new Dye.Engine();

function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw) return { tokens: Dye.defaultTokens(), highscore: 0, mode: "eintipp", idle: false };
    return {
      tokens: Dye.sanitizeTokens(raw.tokens),
      highscore: Number(raw.highscore) || 0,
      mode: raw.mode === "manuell" ? "manuell" : "eintipp",
      idle: raw.idle === true,
    };
  } catch {
    return { tokens: Dye.defaultTokens(), highscore: 0, mode: "eintipp", idle: false };
  }
}

let save = loadSave();
engine.tokens = save.tokens;
engine.mode = save.mode;
engine.idle = save.idle;
engine.highscore = save.highscore;

function persist() {
  localStorage.setItem(KEY, JSON.stringify({
    version: 1,
    tokens: save.tokens,
    highscore: save.highscore,
    mode: save.mode,
    idle: save.idle,
    shake: true,
    muted: Dye.sfx.muted,
  }));
}

const canvas = $("runCanvas");
const stage = $("stage");
const ctx = canvas.getContext("2d");
let hold = false;
let lastHud = "";

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.floor(stage.clientWidth * dpr));
  canvas.height = Math.max(1, Math.floor(stage.clientHeight * dpr));
}
new ResizeObserver(resize).observe(stage);
resize();

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000 || 0);
  last = now;
  engine.tokens = save.tokens;
  engine.mode = save.mode;
  engine.idle = save.idle;
  engine.highscore = save.highscore;
  engine.paused = hold;
  engine.step(dt);
  Dye.drawFrame(ctx, stage.clientWidth, stage.clientHeight, Math.min(2, window.devicePixelRatio || 1), engine.drawState());
  paintHud(engine.hud());
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function paintHud(hud) {
  const sig = hud.phase + "|" + hud.score + "|" + hud.hint + "|" + hold;
  $("hudScore").textContent = Dye.formatInt(hud.score);
  $("hudCombo").textContent = "×" + hud.combo;
  $("hudMeters").textContent = Dye.formatInt(hud.meters) + " m";
  $("hudHint").textContent = hud.hint;
  $("hudPlay").classList.toggle("hidden", hud.phase !== "play" && hud.phase !== "crash");
  $("hudHint").classList.toggle("hidden", hud.phase !== "play" || hold);
  $("cardReady").classList.toggle("hidden", hud.phase !== "ready");
  $("cardPause").classList.toggle("hidden", !(hold && hud.phase === "play"));
  $("cardOver").classList.toggle("hidden", hud.phase !== "over");
  $("playBar").classList.toggle("hidden", hud.phase !== "play" || hold);
  $("recordLine").textContent = "Rekord " + Dye.formatInt(save.highscore);
  $("btnPrimary").textContent = hud.hintDodge === "slide" ? "Rutschen" : "Springen";
  $("btnSlide").classList.toggle("hidden", save.mode !== "manuell");
  if (save.mode === "manuell") $("btnPrimary").textContent = "Sprung";
  if (hud.phase === "over" && hud.last && sig !== lastHud) {
    lastHud = sig;
    if (hud.last.isRecord) {
      save.highscore = hud.last.score;
      persist();
    }
    $("overStats").textContent =
      Dye.formatInt(hud.last.score) + " Punkte · " +
      Dye.formatInt(hud.last.meters) + " m · Combo ×" + hud.last.combo +
      (hud.last.tainted ? " · Leerlauf" : hud.last.isRecord ? " · neuer Rekord" : "");
  }
}

function start() {
  Dye.sfx.unlock();
  hold = false;
  engine.primary();
}

$("btnStart").addEventListener("click", start);
$("btnRestart").addEventListener("click", start);
$("btnResume").addEventListener("click", () => { hold = false; });
$("btnPause").addEventListener("click", () => { hold = true; });
$("btnPrimary").addEventListener("click", () => { Dye.sfx.unlock(); engine.primary(); });
$("btnSlide").addEventListener("click", () => { Dye.sfx.unlock(); engine.secondary(); });
document.querySelectorAll("[name=mode]").forEach((el) => {
  el.addEventListener("change", () => {
    save.mode = el.value;
    engine.mode = save.mode;
    persist();
  });
});
$("idle").addEventListener("change", () => {
  save.idle = $("idle").checked;
  engine.idle = save.idle;
  persist();
});
$("idle").checked = save.idle;
document.querySelector(`[name=mode][value=${save.mode}]`).checked = true;

window.addEventListener("keydown", (ev) => {
  const tag = ev.target && ev.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (ev.repeat) return;
  if (ev.code === "Space" || ev.code === "ArrowUp" || ev.code === "KeyW") {
    ev.preventDefault();
    Dye.sfx.unlock();
    if (hold) { hold = false; return; }
    engine.primary();
  } else if (ev.code === "ArrowDown" || ev.code === "KeyS") {
    ev.preventDefault();
    Dye.sfx.unlock();
    engine.secondary();
  } else if (ev.code === "KeyR" && engine.phase === "over") {
    start();
  } else if (ev.code === "Escape" && engine.phase === "play") {
    hold = !hold;
  }
});

let ptr = null;
stage.addEventListener("pointerdown", (ev) => {
  if (ev.button !== 0) return;
  if (ev.target.closest("button, input, label")) return;
  ptr = { x: ev.clientX, y: ev.clientY, t: performance.now() };
});
stage.addEventListener("pointerup", (ev) => {
  if (!ptr) return;
  const dy = ev.clientY - ptr.y;
  const dx = ev.clientX - ptr.x;
  const dt = performance.now() - ptr.t;
  ptr = null;
  if (ev.target.closest("button, input, label")) return;
  Dye.sfx.unlock();
  if (engine.phase === "ready") { engine.primary(); return; }
  if (hold) return;
  if (dt < 520 && dy > 44 && dy > Math.abs(dx) * 1.2) engine.secondary();
  else if (dt < 360 && Math.hypot(dx, dy) < 28) engine.primary();
});

function renderTokens() {
  const box = $("tokenList");
  box.innerHTML = "";
  save.tokens.forEach((t) => {
    const row = document.createElement("label");
    row.className = "token-row";
    row.innerHTML = `<input type="checkbox" ${t.enabled || t.kind === "player" ? "checked" : ""} ${t.kind === "player" ? "disabled" : ""}/> <span class="swatch" style="background:${Dye.swatchHex(t.fill)}"></span> ${t.name} <span class="hint">${t.kind}</span>`;
    const boxEl = row.querySelector("input");
    boxEl.addEventListener("change", () => {
      t.enabled = boxEl.checked;
      persist();
    });
    box.appendChild(row);
  });
}
$("btnResetTokens").addEventListener("click", () => {
  save.tokens = Dye.defaultTokens();
  persist();
  renderTokens();
});
renderTokens();

$("tabRun").addEventListener("click", () => {
  $("deskRun").classList.remove("hidden");
  $("deskEdit").classList.add("hidden");
  $("tabRun").classList.remove("ghost");
  $("tabEdit").classList.add("ghost");
});
$("tabEdit").addEventListener("click", () => {
  hold = true;
  $("deskRun").classList.add("hidden");
  $("deskEdit").classList.remove("hidden");
  $("tabEdit").classList.remove("ghost");
  $("tabRun").classList.add("ghost");
  renderTokens();
});
