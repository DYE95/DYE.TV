# Testlauf hochladen und Legion Bescheid geben

Auf `/testlauf` (nur am SL-Rechner) gibt es neben „Alles ablegen“ den Knopf
**„Hochladen & Legion Bescheid geben“**. Er erscheint auch nach dem Ablegen
und in der Ansicht eines früheren Laufs.

## Was passiert

1. Der Lauf wird abgelegt, falls das noch nicht passiert ist:
   `data/testlaeufe/JJJJ-MM-TT_HH-MM/` mit `bericht.md`, `bericht.json` und `bilder/`.
2. Ember kopiert den Ordner auf den Zweig **`testlaeufe`** nach
   `testlaeufe/JJJJ-MM-TT_HH-MM/`, macht einen Commit und schiebt ihn mit
   `git push origin testlaeufe` hoch.
   - Gearbeitet wird in einem eigenen git-Worktree unter `data/.testlauf-worktree`.
     Dein Ember-Ordner, offene Änderungen und der aktuelle Zweig bleiben unberührt.
   - Beim ersten Mal entsteht `testlaeufe` als leerer (verwaister) Zweig ohne
     Ember-Code, falls es ihn weder lokal noch auf GitHub gibt. Sonst holt
     Ember erst `origin/testlaeufe` und spult vor.
   - Autor ist `user.name`/`user.email` aus der git-Einstellung, sonst
     DYE95 (noreply). Der Commit trägt eine `Signed-off-by`-Zeile.
3. Danach geht ein Webhook an Legion (falls eingerichtet).

## Zugangsdaten für GitHub

Ember fragt nie nach einem Passwort. Wenn der Upload „Keine gültigen
GitHub-Zugangsdaten“ meldet:

1. Konsole im Ember-Ordner öffnen.
2. `git push` oder `git fetch` ausführen und im Fenster des Git Credential
   Managers bei GitHub anmelden.
3. Auf `/testlauf` erneut „Hochladen & Legion Bescheid geben“ tippen.

Bei Fehlern zeigt die Seite den Schritt (`fetch`, `worktree`, `commit`,
`push` …), einen Hinweis und die git-Ausgabe zum Aufklappen.
Klemmt der Worktree, kann `data/.testlauf-worktree` gelöscht werden. Ember
legt ihn beim nächsten Upload neu an (danach einmal `git worktree prune`).

## Legion-Webhook einrichten

Am einfachsten im Kasten **„Legion-Verbindung“** auf `/testlauf`:
Adresse, Schlüssel und Header-Name eintragen, „Speichern“. Das landet in
`data/legion-webhook.json` (nicht in git):

```json
{ "url": "https://legion.example/hooks/testlauf", "key": "…", "header": "Authorization" }
```

Ohne Datei gelten die Umgebungsvariablen `LEGION_WEBHOOK_URL`,
`LEGION_WEBHOOK_KEY` und `LEGION_WEBHOOK_HEADER`.

- Der Schlüssel geht immer als `X-Webhook-Key: <Schlüssel>` mit.
- Dazu kommt der eingestellte Header: bei `Authorization` (Standard) als
  `Authorization: Bearer <Schlüssel>`, bei jedem anderen Namen roh,
  z. B. `X-Legion-Key: <Schlüssel>`.
- Der Browser bekommt den Schlüssel nie zurück, nur „gesetzt“.

Ohne Webhook wird trotzdem hochgeladen. Die Seite meldet dann
„Hochgeladen – Legion-Webhook nicht eingerichtet“.

### Inhalt des Webhooks (POST, JSON)

```json
{
  "repo": "DYE95/DYE.TV",
  "branch": "testlaeufe",
  "folder": "testlaeufe/2026-10-10_11-19/",
  "commit": "cb7f8ca…",
  "summary": { "done": 16, "total": 41, "fehler": 2, "eigen": 1, "bilder": 4 },
  "version": "v0.4.0-8-g4c4d383",
  "name": "2026-10-10_11-19",
  "url": "https://github.com/DYE95/DYE.TV/tree/testlaeufe/testlaeufe/2026-10-10_11-19/"
}
```

`name` und `url` sind Zugaben. Antwortet der Webhook nicht mit 2xx, bleibt
der Upload gültig und die Seite zeigt den Fehler.

## Sicherheit

Alle Testlauf-Schnittstellen antworten nur am SL-Rechner selbst (über den
Tunnel oder im WLAN: 403) und sind gegen fremde Webseiten geschützt (CSRF).
git läuft ohne Shell, mit festen Argumenten und Zeitlimit.
