# Leitstelle: Module

Die Leitstelle ist die rechte Spalte der Startseite `/`. Sie besteht aus Boxen,
und jede Box zeigt ein Modul. Ein Modul ist eine kleine Datei unter
`public/js/leitstelle/`. Es gibt keinen Build und keine Abhängigkeiten, nur
klassische `<script>`-Dateien.

## Boxen (Slots)

```
+-----------------+---------+
|                 | klein   |
|  gross          +---------+
|                 | quadrat |
+-----------------+---------+
|  mitte                    |
+---------------------------+
|  breit                    |
+---------------------------+
```

Standardbelegung: `gross: "status"`, `klein: "kurz"`, `quadrat: "qr"`,
`mitte: "adressen"`, `breit: "notizen"`.

## Ein neues Modul

1. Lege die Datei `public/js/leitstelle/wetter.js` an:

```js
Leitstelle.register({
  id: "wetter",              // eindeutig, steht im Layout
  title: "Wetter am Tisch",  // Überschrift der Box ("" = keine)
  area: "mitte",             // Vorschlag, welcher Box es gehört
  mount(el, ctx) {           // einmal pro Aufbau: DOM anlegen
    this.out = ctx.el("p", { text: "…" });
    el.append(this.out);
  },
  update(state, ctx) {       // alle ~5 s mit frischen Daten
    this.out.textContent = `${state.people.players} Spieler seit ${ctx.duration(state.server.uptimeSec)}`;
  },
});
```

2. Binde sie in `public/home.html` nach `leitstelle/registry.js` und vor
   `Leitstelle.start(...)` ein:
   `<script src="/js/leitstelle/wetter.js"></script>`
3. Lege sie in eine Box, in der Browser-Konsole auf dem SL-Rechner:
   `Leitstelle.setLayout({ mitte: "wetter" })`.
   Mit `Leitstelle.resetLayout()` kommt der Standard zurück.

Das Layout liegt in `localStorage` unter `ember.leitstelle.layout.v1`.
Jede Box bekommt eine eigene Instanz, `this` gehört also nur dieser Box.
Ein Fehler in `mount` oder `update` legt nur diese eine Box lahm.

## Helfer (`ctx`)

| Helfer | Wofür |
| --- | --- |
| `ctx.el(tag, attrs, ...kinder)` | Element bauen (`class`, `text`, `onclick` …) |
| `ctx.duration(sek)` | „5 min“, „3 h 12 min“ |
| `ctx.ago(iso)` | „vor 5 min“ |
| `ctx.clock(iso)` | Uhrzeit, an anderen Tagen mit Datum |
| `ctx.bytes(n)` | „1.2 MB“ |
| `ctx.copy(text)` | In die Zwischenablage, auf http mit Ersatzweg; gibt `true/false` |
| `ctx.version` | Antwort von `/api/leitstelle/version` |
| `ctx.restart(meldung)` | Server neu starten, danach lädt die Seite neu |
| `ctx.offline` | `true`, wenn der Server nicht antwortet |

## Daten

`GET /api/leitstelle` antwortet **nur am SL-Rechner selbst** (403 über den
Tunnel oder im WLAN):

- `server`: `startedAt`, `uptimeSec`, `node`, `platform`, `port`, `memoryMb`
- `tunnel`: `up`, `url`, `since`, `ageSec`
- `people`: `players`, `gm`, `names`
- `data`: `size`, `savedAt`, `backupAt`
- `code`: `restartNeeded`, `changed`, `startedHead`, `currentHead`, `since` (neuer Code seit dem Start?)
- `crash`: letzter Eintrag aus `data/crash.log` (`at`, `kind`, `message`) oder `null`
- `urls`: `tunnel`, `lan`, `gm`, `player`
- `lan`: Liste der LAN-Adressen

`GET /api/leitstelle/version` liefert `{ version, source, notes[] }`, entweder
aus git oder, ohne git, aus `CHANGELOG.md`. Der Server hält das 60 s im Cache.

Braucht ein Modul neue Daten, ergänze sie in `lib/leitstelle.js` (`status()`)
und in `test/leitstelle.test.js`.
