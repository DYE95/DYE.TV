# Ember / DYE.TV

Lokales Pen-and-Paper-Werkzeug (Daggerheart / Age of Umbra). Ein Node-Prozess, keine Abhängigkeiten, Zustand in `data/ember.json`.

## Für Agenten

- Kleine Commits, `npm test` grün, Stil der Nachbardatei: 2 Spaces, `const`, Template-Strings.
- Commits brauchen eine Sign-off-Zeile: `Signed-off-by: DYE95 <182445851+DYE95@users.noreply.github.com>`.
- Spieler-Sitz: normales `/player` nutzt `localStorage` (Handy bleibt sitzen). `/player?as=<characterId>&tab=1` nutzt nur `sessionStorage`, damit mehrere Bögen im selben Browser nebeneinander sitzen können.
- SL-Routen mit `as: "gm"` brauchen `gmKey`. Nicht vom Spieler-Tab aus aufrufen.
- Nichts in die Cloud schieben. Releases sind lokale Windows-Starts plus GitHub-Tag, kein Hosting.
- Rechner bleibt beim Spielleiter. Nicht aus der Hand geben. Profile und SL-PIN sind nur von localhost auslesbar.
