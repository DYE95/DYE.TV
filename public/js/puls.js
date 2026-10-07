const MAX_OPTIONS = 6;
const LETTERS = "ABCDEF";
const KEY = "dye.puls.v1";
const EXAMPLES = [
  { question: "Wohin geht das Team-Essen?", options: ["Pizza", "Sushi", "Burger", "Döner"] },
  { question: "Welcher Tag wird Homeoffice?", options: ["Montag", "Mittwoch", "Freitag"] },
  { question: "Wohin führt die nächste Szene?", options: ["Kampf", "Gespräch", "Erkundung", "Rast"] },
];

let shown = {};
let state = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw.question === "string" && Array.isArray(raw.draft)) {
      return {
        question: raw.question,
        draft: raw.draft.map(String).slice(0, MAX_OPTIONS),
        poll: raw.poll && Array.isArray(raw.poll.options) ? raw.poll : null,
        confirm: null,
      };
    }
  } catch {}
  return { question: "", draft: ["", ""], poll: null, confirm: null };
}

function save() {
  localStorage.setItem(KEY, JSON.stringify({
    question: state.question,
    draft: state.draft,
    poll: state.poll,
  }));
}

function percentages(counts) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (!total) return counts.map(() => 0);
  const exact = counts.map((count) => (count * 100) / total);
  const base = exact.map((value) => Math.floor(value));
  let left = 100 - base.reduce((sum, value) => sum + value, 0);
  const rank = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value), votes: counts[index] || 0 }))
    .sort((a, b) => b.frac - a.frac || b.votes - a.votes || a.index - b.index);
  for (let step = 0; step < left; step += 1) base[rank[step].index] += 1;
  return base;
}

function voteWord(count) {
  return count === 1 ? "Stimme" : "Stimmen";
}

function draftIssue() {
  if (!state.question.trim()) return "Zuerst eine Frage formulieren.";
  const filled = state.draft.map((option) => option.trim()).filter(Boolean);
  if (filled.length < 2) return "Mindestens zwei Optionen ausfüllen.";
  const unique = new Set(filled.map((option) => option.toLocaleLowerCase("de")));
  if (unique.size !== filled.length) return "Optionen müssen sich unterscheiden.";
  return null;
}

function esc(text) {
  return String(text).replace(/[&<>"]/g, (ch) => ({
    "&": "&" + "amp;",
    "<": "&" + "lt;",
    ">": "&" + "gt;",
    '"': "&" + "quot;",
  }[ch]));
}

function render() {
  const stage = document.getElementById("stage");
  const totalEl = document.getElementById("pulsTotal");
  if (!state.poll) {
    totalEl.textContent = "";
    stage.innerHTML = composeHtml();
    bindCompose();
    return;
  }
  const total = state.poll.options.reduce((sum, option) => sum + option.votes, 0);
  totalEl.textContent = total + " " + voteWord(total);
  stage.innerHTML = liveHtml(total);
  bindLive();
  requestAnimationFrame(() => {
    document.querySelectorAll("[data-bar]").forEach((el) => {
      el.style.transform = "scaleX(" + (Number(el.dataset.share) / 100) + ")";
      shown[el.dataset.bar] = Number(el.dataset.share);
    });
  });
}

function composeHtml() {
  const issue = draftIssue();
  const rows = state.draft.map((option, index) => `
    <div class="puls-row">
      <input class="puls-field" data-option="${index}" maxlength="60" value="${esc(option)}" placeholder="${index === 0 ? "Erste Option" : index === 1 ? "Zweite Option" : "Option " + (index + 1)}" aria-label="Option ${LETTERS[index]}" />
      <button class="btn puls-icon" type="button" data-remove="${index}" ${state.draft.length <= 2 ? "disabled" : ""} aria-label="Option ${index + 1} entfernen">×</button>
    </div>`).join("");
  const examples = EXAMPLES.map((example, index) => `
    <button class="btn puls-example" type="button" data-example="${index}">
      <b>${esc(example.question)}</b>
      <span class="hint">${esc(example.options.join(" · "))}</span>
    </button>`).join("");
  return `
    <p class="puls-kicker">Neue Abstimmung</p>
    <h1>Was wird entschieden?</h1>
    <p class="puls-lead hint">Eine Frage, mehrere Optionen. Jede Person stimmt einmal ab — die Balken wachsen sofort mit.</p>
    <form id="pulsForm">
      <div class="puls-step"><h2><span>01</span>Frage</h2></div>
      <textarea class="puls-field" id="pulsQuestion" maxlength="140" placeholder="z. B. Wohin geht das Team-Essen?">${esc(state.question)}</textarea>
      <div class="puls-step"><h2><span>02</span>Optionen</h2><span class="hint">${state.draft.length} von ${MAX_OPTIONS}</span></div>
      ${rows}
      <button class="btn puls-wide" type="button" id="pulsAdd" ${state.draft.length >= MAX_OPTIONS ? "disabled" : ""}>Option hinzufügen</button>
      <div class="puls-step"><h2><span>03</span>Start</h2></div>
      <button class="btn primary puls-wide" type="submit" ${issue ? "disabled" : ""}>Umfrage starten</button>
      <p class="hint" aria-live="polite">${esc(issue || "Bereit. Danach ist jede Stimme einzeln gesperrt.")}</p>
    </form>
    <div class="puls-step"><h2>Beispiel</h2></div>
    <div class="puls-stack">${examples}</div>`;
}

function liveHtml(total) {
  const poll = state.poll;
  const counts = poll.options.map((option) => option.votes);
  const shares = percentages(counts);
  const leaderVotes = Math.max(...counts);
  const leaderCount = counts.filter((count) => count === leaderVotes).length;
  const choice = poll.options.find((option) => option.id === poll.choiceId);
  const locked = Boolean(poll.choiceId);
  let status = "Wähle eine Option. Danach ist diese Stimme gesperrt.";
  if (locked && choice) status = "„" + choice.label + "“ ist gewählt. " + total + " " + voteWord(total) + " insgesamt.";
  else if (total > 0) status = "Nächste Person: eine Option wählen. Die bisherige Wahl bleibt sichtbar.";
  const options = poll.options.map((option, index) => {
    const selected = option.id === poll.choiceId;
    const dataState = selected ? "selected" : locked ? "locked" : "open";
    const share = shares[index];
    const from = shown[option.id] == null ? 0 : shown[option.id];
    const leading = total > 0 && leaderCount === 1 && option.votes === leaderVotes && !selected;
    return `
      <button class="puls-choice" type="button" data-vote="${esc(option.id)}" data-state="${dataState}" ${locked ? "disabled" : ""} aria-pressed="${selected ? "true" : "false"}">
        <span class="puls-choice-top">
          <span class="puls-mark" aria-hidden="true">${selected ? "✓" : LETTERS[index]}</span>
          <span class="puls-choice-body">
            <span class="puls-choice-head"><strong>${esc(option.label)}</strong><span class="puls-pct">${share}%</span></span>
            <span class="puls-track" aria-hidden="true"><span class="puls-fill" data-bar="${esc(option.id)}" data-share="${share}" style="transform:scaleX(${from / 100})"></span></span>
            <span class="puls-meta"><span>${option.votes} ${voteWord(option.votes)}</span>${selected ? "<span class=\"on\">Ausgewählt</span>" : ""}${leading ? "<span class=\"puls-leads\">führt</span>" : ""}</span>
          </span>
        </span>
      </button>`;
  }).join("");
  let actions = "";
  if (state.confirm === "reset") {
    actions = `<div class="card puls-stack"><p>Alle Stimmen löschen und die Frage behalten?</p><button class="btn primary puls-wide" type="button" id="pulsYesReset">Ja, zurücksetzen</button><button class="btn puls-wide" type="button" id="pulsCancel">Abbrechen</button></div>`;
  } else if (state.confirm === "fresh") {
    actions = `<div class="card puls-stack"><p>Diese Umfrage schließen und neu beginnen?</p><button class="btn primary puls-wide" type="button" id="pulsYesFresh">Ja, neue Umfrage</button><button class="btn puls-wide" type="button" id="pulsCancel">Abbrechen</button></div>`;
  } else {
    actions = `<div class="puls-stack">
      ${locked ? "<button class=\"btn primary puls-wide\" type=\"button\" id=\"pulsNext\">Nächste Person</button>" : ""}
      <button class="btn puls-wide" type="button" id="pulsReset" ${total === 0 ? "disabled" : ""}>Zurücksetzen</button>
      <button class="btn ghost puls-wide" type="button" id="pulsFresh">Neue Umfrage</button>
    </div>`;
  }
  return `
    <p class="puls-kicker">Laufende Umfrage</p>
    <h1>${esc(poll.question)}</h1>
    <div class="puls-tally"><div><b>${total}</b><span class="hint">${voteWord(total)}</span></div><span class="puls-live">Live</span></div>
    <p class="hint" aria-live="polite">${esc(status)}</p>
    <div class="puls-stack" role="group" aria-label="Antwortmöglichkeiten">${options}</div>
    ${actions}`;
}

function bindCompose() {
  const form = document.getElementById("pulsForm");
  document.getElementById("pulsQuestion").addEventListener("input", (ev) => {
    state.question = ev.target.value;
    save();
    refreshStart();
  });
  document.querySelectorAll("[data-option]").forEach((input) => {
    input.addEventListener("input", () => {
      state.draft[Number(input.dataset.option)] = input.value;
      save();
      refreshStart();
    });
  });
  document.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.draft.length <= 2) return;
      state.draft.splice(Number(button.dataset.remove), 1);
      save();
      render();
    });
  });
  document.getElementById("pulsAdd").addEventListener("click", () => {
    if (state.draft.length >= MAX_OPTIONS) return;
    state.draft.push("");
    save();
    render();
  });
  document.querySelectorAll("[data-example]").forEach((button) => {
    button.addEventListener("click", () => {
      const example = EXAMPLES[Number(button.dataset.example)];
      state.question = example.question;
      state.draft = example.options.slice();
      save();
      render();
    });
  });
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (draftIssue()) return;
    const labels = state.draft.map((option) => option.trim()).filter(Boolean);
    state.question = state.question.trim();
    state.draft = labels;
    state.poll = {
      question: state.question,
      choiceId: null,
      options: labels.map((label, index) => ({ id: "o" + Date.now().toString(36) + index, label, votes: 0 })),
    };
    state.confirm = null;
    shown = {};
    save();
    render();
  });
}

function refreshStart() {
  const issue = draftIssue();
  const button = document.querySelector("#pulsForm button[type=submit]");
  const note = document.querySelector("#pulsForm .hint");
  if (button) button.disabled = Boolean(issue);
  if (note) note.textContent = issue || "Bereit. Danach ist jede Stimme einzeln gesperrt.";
}

function bindLive() {
  document.querySelectorAll("[data-vote]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.poll || state.poll.choiceId) return;
      const id = button.dataset.vote;
      const option = state.poll.options.find((item) => item.id === id);
      if (!option) return;
      option.votes += 1;
      state.poll.choiceId = id;
      state.confirm = null;
      save();
      render();
    });
  });
  const next = document.getElementById("pulsNext");
  if (next) next.addEventListener("click", () => {
    state.poll.choiceId = null;
    state.confirm = null;
    save();
    render();
  });
  const reset = document.getElementById("pulsReset");
  if (reset) reset.addEventListener("click", () => {
    state.confirm = "reset";
    render();
  });
  const fresh = document.getElementById("pulsFresh");
  if (fresh) fresh.addEventListener("click", () => {
    const total = state.poll.options.reduce((sum, option) => sum + option.votes, 0);
    if (!total) return freshPoll();
    state.confirm = "fresh";
    render();
  });
  const yesReset = document.getElementById("pulsYesReset");
  if (yesReset) yesReset.addEventListener("click", () => {
    state.poll.options.forEach((option) => { option.votes = 0; });
    state.poll.choiceId = null;
    state.confirm = null;
    save();
    render();
  });
  const yesFresh = document.getElementById("pulsYesFresh");
  if (yesFresh) yesFresh.addEventListener("click", freshPoll);
  const cancel = document.getElementById("pulsCancel");
  if (cancel) cancel.addEventListener("click", () => {
    state.confirm = null;
    render();
  });
}

function freshPoll() {
  if (state.poll) {
    state.question = state.poll.question;
    state.draft = state.poll.options.map((option) => option.label);
  }
  state.poll = null;
  state.confirm = null;
  shown = {};
  save();
  render();
}

render();
