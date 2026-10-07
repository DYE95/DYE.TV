const GAMES = [
  { id: "runner", title: "Leitungsparcours", href: "/runner", blurb: "Halten, bis die Leitung reißt." },
  { id: "fallwerk", title: "Fallwerk", href: "/fallwerk", blurb: "Stapeln, bevor es kippt." },
  { id: "pastell", title: "Pastellpfad", href: "/pastellpfad", blurb: "Ein Weg, ein Kristall." },
  { id: "scharf", title: "Scharfschuss", href: "/scharfschuss", blurb: "Die Welle halten." },
  { id: "puls", title: "Puls", href: "/puls", blurb: "Eine Stimme, ein Balken." },
];

function list() {
  return GAMES.map((g) => ({ ...g }));
}

function get(id) {
  return GAMES.find((g) => g.id === id) || null;
}

function settle(state, session) {
  const event = session && session.spur;
  if (!event) return false;
  const heroes = (state.characters || []).filter((c) => c.campaignId === session.campaignId);
  const due = event.endsAt && Date.now() >= Number(event.endsAt);
  const allIn = heroes.length > 0 && heroes.every((c) => (event.scores || []).some((s) => s.characterId === c.id));
  if (!due && !allIn) return false;
  const nums = (event.scores || []).map((s) => ({ ...s, n: Number(s.score) })).filter((s) => Number.isFinite(s.n));
  const best = nums.length ? Math.max(...nums.map((s) => s.n)) : null;
  const winners = best == null ? [] : nums.filter((s) => s.n === best);
  const camp = (state.campaigns || []).find((c) => c.id === session.campaignId);
  let line = event.title + " ist vorbei.";
  if (event.payout === "hope" && winners.length) {
    for (const w of winners) {
      const pc = (state.characters || []).find((c) => c.id === w.characterId);
      if (!pc) continue;
      pc.hope = Math.min(pc.hopeMax || 6, Number(pc.hope || 0) + 1);
    }
    line += " Hope an " + winners.map((w) => w.name).join(", ") + ".";
  } else if (event.payout === "fear" && camp) {
    camp.gmFear = Math.min(camp.fearMax || 12, Number(camp.gmFear || 0) + 1);
    line += " Fear an den Tisch.";
  } else if (event.payout === "hope") {
    line += " Niemand hält.";
  }
  event.result = line;
  session.spur = null;
  return line;
}

function grade(ask, choice) {
  const options = ask && ask.options || [];
  const hit = options.find((o) => o.id === choice);
  return { score: hit && hit.right ? 1 : 0, label: hit ? hit.label : "keine Stimme" };
}

const CAP = { fallwerk: 64, pastell: 8, puls: 1, runner: 5000, scharf: 2000 };

function capScore(game, score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return 0;
  const max = CAP[game] == null ? 5000 : CAP[game];
  return Math.max(0, Math.min(max, Math.round(n)));
}

module.exports = { list, get, settle, grade, capScore };
