# Ember

**Ember** ist ein lokales Webtool für den Pen&Paper-Tisch (gebaut für *Daggerheart / Age of Umbra*).
Ein einziger Node.js-Prozess ohne Abhängigkeiten serviert den Spielleitungs-Tisch, die
Spieler-Ansicht im LAN und ein paar Solo-Werkzeuge. Nichts läuft in der Cloud — der SL-Rechner
ist der Server, die Daten liegen in `data/ember.json`.

## Voraussetzungen

- [Node.js](https://nodejs.org) (LTS, getestet mit Node 20 und 24)
- Ein Browser (Edge/Chrome wird von `Ember.bat` automatisch geöffnet)
- Keine `npm install`-Schritte nötig — das Projekt hat **null Abhängigkeiten**

## Erststart

Wer die `.bat` nicht kennt, liest zuerst `docs/ERSTSTART.md` und öffnet `erststart.bat` im Editor. Erst danach der Doppelklick. Die Datei wartet auf eine Taste und startet nur den lokalen Server.


### Windows (Doppelklick)

| Datei        | Was sie tut                                                        |
| ------------ | ------------------------------------------------------------------ |
| `Ember.bat`  | Prüft Node, startet den Server minimiert und öffnet die Spielleitung (`/ember`) |
| `start.bat`  | Startet den Server und hält das Fenster offen (Neustart-Schleife)   |
| `test.bat`   | Syntax-Check von `server.js` + komplette Testsuite                  |

### Überall sonst

```bash
npm start        # Server auf Port 3478
npm test         # Alle Tests
```

Umgebungsvariablen: `EMBER_PORT` (Standard `3478`), `EMBER_HOST` (Standard `0.0.0.0`).

Die Adressen stehen im Fenster und in der Titelleiste. Cloudflare-Pings gehen nach `data/tunnel.log` und schieben sie nicht mehr weg. Die Spielleitung ist `http://127.0.0.1:3478/ember`, nicht die Tunnel-Adresse.

## Die Seiten

| Pfad          | Zweck                                                            |
| ------------- | ---------------------------------------------------------------- |
| `/`            | Startseite am SL-Rechner: Kacheln und Leitstelle (Status, Spieler-QR, Adressen, Patchnotes). Die Kachel „Einstellungen“ schaltet die rechte Spalte um |
| `/ember`       | SL-Tisch: Session, Action Rolls, Events, Karte, Initiative      |
| `/player`      | Spieler-Ansicht: Namen antippen, Bogen, Würfe, Spotlight        |
| `/player?as=ID&tab=1` | Derselbe Bogen in einem eigenen Tab, ohne die anderen Tabs zu übernehmen |
| `/token`       | Pixel-Token-Atelier                                              |
| `/pixelstube`  | Pixelstube: Raster, Palette, Stift, Füllen, PNG                 |
| `/solo`        | Solo-Spiel: Dungeon-Lauf mit einem Helden (Werkstatt: `/solo/werkstatt`) |
| `/karten`      | Karten-Werkzeug (Marker-Karten speichern/laden)                   |
| `/bibliothek`  | Regel-PDFs aus `docs/bibliothek/`                                 |
| `/runner`      | Ereignis: Dye-Runner, vom SL in die Runde geworfen               |
| `/fallwerk`    | Ereignis: 3D-Physik                                              |
| `/pastellpfad` | Ereignis: First-Person-Labyrinth                                 |
| `/scharfschuss`| Ereignis: Turmverteidigung                                       |
| `/puls`        | Ereignis: Live-Umfrage                                           |
| `/heft`        | Heft: Notizen mit Markdown, Suche und lokaler Speicherung         |
| `/home`        | Wie `/`, ebenfalls nur am SL-Rechner                              |

Die Spieler-URLs zeigt der Server beim Start an (z. B. `http://192.168.0.151:3478/player`).
Am SL-Rechner öffnet **Tab** neben einem Bogen `/player?as=<id>&tab=1`. Der Sitz liegt dann nur in diesem Tab (`sessionStorage`), nicht im gemeinsamen `localStorage`. Ein normales `/player` merkt sich den Bogen weiter fürs Handy.
Spieler verbinden sich über das WLAN — der SL-Rechner muss Port 3478 in der
Windows-Firewall erlauben (beim ersten Start bestätigen).

## Leitstelle

Die rechte Spalte der Startseite zeigt Serverlaufzeit, Version, Tunnel, wer am
Tisch ist, Datenstand, den letzten Absturz, einen QR-Code für `/player` und die
Adressen mit Knopf zum Kopieren. Die Daten kommen von `/api/leitstelle`. Diese
Schnittstelle antwortet nur am SL-Rechner selbst, nie über den Tunnel. Die
Patchnotes stammen aus git oder, ohne git, aus `CHANGELOG.md`. Wie man ein
eigenes Modul ergänzt, steht in [`docs/MODULE.md`](docs/MODULE.md).

## Solo-Spiel (`/solo`)

Ein Held, ein kurzer Dungeon (sieben Räume, fünf davon auf dem Weg, zuletzt der
Glutwächter). Daggerheart-Regeln wie am Tisch: Duality-Wurf mit Hope- und
Fear-W12, Experiences kosten Hope, Schaden gegen Major/Severe, Armor fängt eine
Stufe ab, kurze Rast mit zwei Aktionen. Nach einem Sieg gibt es ein Level-Up.

- Steuerung nur mit Klicks (Wii-Zeiger), Tasten 1–9 optional
- Spielstand in `data/solo.json`, übersteht Neuladen und Neustart
- Regeln in `lib/dungeon.js`, API in `lib/solo-game.js`
- Bilder: Platzhalter in `public/solo/sprites/`, gleiche Dateinamen ersetzen (siehe `LIESMICH.md` dort)
- Die alte Übungsseite (Bots, Übungskarte, Level-Up für Kampagnen-Bögen) liegt unter `/solo/werkstatt`

## Projektstruktur

```
server.js            HTTP-Server + komplette REST-/SSE-API (kein Framework)
lib/
  store.js           Datenspeicher (data/ember.json, Migrationen, Encounters)
  dice.js            Duality-Wurf (Hope/Fear d12, Advantage, Experiences)
  initiative.js      Rundenreihenfolge, Gegenseite, Spotlight
  solo.js            Bots, Dungeon, Subklassen, Level-Ups
  compendium.js      SRD-Suche (compendium-data.json)
  catalog.js         Sablewood-Quickstart (vorgefertigte Bögen, Startkarte)
  auth.js            Lokal-/Tunnel-Pruefung, SL-Schluessel
  guard.js           Sperre gegen fremde Webseiten (CSRF)
  range.js           Range-Header fuer Video-Streaming
  spur.js            Punkte der Minispiele
  spark.js, lan.js, ids.js   Terminal-Deko, LAN-Adressen, IDs/PINs
public/              Statisches Frontend (Vanilla JS, kein Build-Schritt)
  index.html         SL-Tisch (gm.js, map.js, …)
  player.html        Spieler-Ansicht (player.js)
  js/, css/, maps/, icons/, data/
tools/tunnel.js      Cloudflare-Tunnel fuer Spieler von zu Hause
test/                node:test-Suiten (Logik + Server-Tests ueber HTTP)
data/                Laufzeitdaten (gitignored): ember.json, ember.json.bak, uploads/
                     anderer Ordner per Umgebungsvariable EMBER_DATA
docs/bibliothek/     PDFs für die Bibliotheksseite (index.json, maps/, errata.json)
docs/regeln/         Regel-PDFs (z. B. DH-SRD.pdf), ebenfalls in der Bibliothek
docs/ERSTSTART.md, docs/TESTLAUF.md   Ersteinrichtung, Checkliste Testlauf
.github/workflows/   CI: Syntax-Check + Tests bei push/PR
```

## Tests

```bash
npm test          # oder: test.bat
```

Abgedeckt sind die Kernlogik und ein echter Server-Start:

- `test/dice.test.js` — Duality-Ergebnisse, Critical, Advantage/Disadvantage, Experience-Kosten
- `test/initiative.test.js` — Seed, Runden, Gegenseite, Spotlight-Vorrücken, auto=aus
- `test/solo.test.js` — Bots, Dungeon, Level-Ups, Subklassen
- `test/store.test.js` — Fog-of-War-Standards, `patchById`, Encounter-/Bogen-Erzeugung
- `test/auth.test.js` — GM-Key-Logik (`isGm`, `recordGmKey`), Tunnel gilt nicht als lokal
- `test/range.test.js` — Range-Header für Video-Streaming (Suffix, 416 bei Unsinn)
- `test/guard.test.js` — Sperre gegen fremde Webseiten, Tunnel-Spieler bleiben erlaubt
- `test/lan.test.js` — beste LAN-Adresse zuerst, ohne WSL/Link-Local
- `test/data.test.js` — `EMBER_DATA`, Sicherung `ember.json.bak`
- `test/server.test.js` — startet `server.js` in einem Temp-Ordner und prüft die API über HTTP

Für Testläufe von Hand: [docs/TESTLAUF.md](docs/TESTLAUF.md) — Checkliste zum Ausdrucken.

## Daten & Betrieb

- Der gesamte Zustand liegt in `data/ember.json` (atomar über Temp-Datei + Rename geschrieben).
  Hochgeladene Bilder/Tokens landen in `data/uploads/`. Beides ist gitignored.
- Das Session-Log wird bei 500 Einträgen gekappt, Undo hält die letzten 15 Aktionen.
- **Update:** Im Zahnrad-Menü der SL-Seite („Jetzt prüfen & ziehen") macht der Server
  `git fetch` + `git pull --ff-only` und installiert bei geändertem `package.json` neu.
  Danach beendet er sich mit Exit-Code 42 — `start.bat` startet ihn automatisch neu.
  Neustart und Update sind nur vom SL-Rechner (localhost) erlaubt.
- **Presence:** SL und Spieler melden sich alle 4 s; Einträge älter als 15 s gelten als fort.
- **GM-Schlüssel:** Der SL-Rechner erzeugt beim ersten Presence-Ping einen `gmKey` (nur von
  localhost). Sobald der Schlüssel bekannt ist, müssen alle `as:"gm"`-Routen ihn mitsenden —
  Spieler im LAN können die SL-Routen dann nicht mehr aufrufen.
- **Spieler zu Hause:** `tunnel.bat` neben der Glut starten. Dafür [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) installieren. Die Adresse steht in der Leiste und endet auf `/player`. Eine feste Adresse kann als `DYE_PUBLIC_URL` gesetzt werden.


## Regeln

Die kompendierte SRD-Suche nutzt das Daggerheart SRD 2.0 (Darrington Press Community
Gaming License). Das Regel-PDF liegt unter `docs/regeln/DH-SRD.pdf`.

## Beitragen

Kleine Commits, Tests grün halten (`npm test`), dann pushen — die GitHub Action prüft
Syntax und Suite automatisch. Format: kein Linter eingerichtet; dem Stil der Nachbardatei
folgen (2 Spaces, `const`, Template-Strings).
