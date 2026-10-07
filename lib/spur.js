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

module.exports = { list, get };
