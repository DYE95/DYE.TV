# Testlauf-Checkliste

Zum Ausdrucken. Abhaken, Zeiten notieren, Auffälliges unten eintragen.
Datum: ________ Version (`git log --oneline -1`): ________________

## Vorbereitung

- [ ] `node -v` zeigt eine LTS-Version (20 oder neuer): ______
- [ ] `git pull` im Ember-Ordner, keine Fehlermeldung
- [ ] Größe von `data\ember.json` notiert: ______ KB
- [ ] Alte Ember-Tabs und -Fenster in allen Browsern geschlossen
- [ ] Konsole: QuickEdit aus (Fenster → Eigenschaften) oder Start über `Ember.bat` (minimiert)
- [ ] Uhrzeit beim Start notiert: ______

## Start

- [ ] `start.bat`: Zeit bis `/ember` am PC lädt: ______ s
- [ ] Tunnel-Adresse erscheint in der Titelleiste nach ______ s (keine alte Adresse vom letzten Mal)
- [ ] `data\tunnel.log`: keine Zeilen „Failed to dial a quic connection“, Protokoll http2
- [ ] Erststart: `data\sl.pin` enthält die eingegebene PIN (nicht „ECHO ist ausgeschaltet“)

## PC-Seiten

- [ ] `/` Startseite lädt, Kacheln klickbar
- [ ] `/ember` Spielleitung lädt, Session starten geht
- [ ] `/token` Tokenatelier lädt
- [ ] `/pixelstube` zeichnen, PNG speichern, 5× schnell neu laden: kein Absturz
- [ ] Mediathek: Video abspielen, vor- und zurückspulen
- [ ] Mediathek: kleines Video (< 50 MB) hochladen, Prozentanzeige läuft
- [ ] Mediathek: großes Video (> 1 GB) am PC hochladen, danach abspielen und spulen
- [ ] `/heft` neue Notiz, löschen, „Rückgängig“; Editor füllt die ganze Höhe
- [ ] `/solo` ohne Bogen: Hinweis „Noch kein Bogen“, Knöpfe aus
- [ ] `/solo` mit Bogen: Solo öffnen, Bot setzen, Bot zieht, Meldungen oben sichtbar
- [ ] `/bibliothek` zeigt DH-SRD (öffnet als PDF) und die Karten
- [ ] `/karten` lädt
- [ ] Einstellungen (Startseite): Schrift/Kacheln ändern, bleibt nach Neuladen
- [ ] Ereignis-Seiten: `/runner`, `/fallwerk`, `/pastellpfad`, `/scharfschuss`, `/puls` laden

## Spieler lokal (LAN)

- [ ] `http://<PC-IP>:3478/player` am Handy/TV: Ladezeit ______ s
- [ ] Profil anlegen, mit PIN eintreten, Bogen wählen
- [ ] Würfeln, SL sieht den Wurf im Log

## Spieler von außen (Handy-Hotspot über Tunnel)

- [ ] Tunnel-Adresse `/player`: Ladezeit ______ s
- [ ] Profil + PIN eintreten
- [ ] Würfeln, SL sieht den Wurf nach ______ s
- [ ] Sitz-Punkt beim SL wird grün/grau, wenn der Spieler kommt/geht

## Mehrere gleichzeitig

- [ ] PC (`/ember`) + TV (`/player`) + Handy (`/player`) gleichzeitig offen
- [ ] Am PC 4+ Ember-Tabs offen: neue Seiten laden weiter, Würfe kommen an
- [ ] Ein Gerät lädt neu: die anderen laufen weiter

## Sicherheit (über die Tunnel-Adresse, nicht am PC)

- [ ] `<Tunnel>/api/sl-pin` → „Nur dieser Rechner.“ (keine PIN)
- [ ] `<Tunnel>/api/profiles` → „Nur dieser Rechner.“
- [ ] Neustart / Update von außen → abgelehnt

## Störfälle

- [ ] Seiten schnell hintereinander neu laden: Server läuft weiter
- [ ] Tunnel-Fenster schließen: PC-Seiten laufen weiter, Spieler von außen sehen Fehler
- [ ] Server neu starten (Knopf oder Strg+C und `start.bat`): Seiten verbinden sich wieder
- [ ] `data\crash.log` geprüft: leer / Einträge: ______

## Notizen

| Seite | Ergebnis | Zeit | Bemerkung |
|-------|----------|------|-----------|
|       |          |      |           |
|       |          |      |           |
|       |          |      |           |
|       |          |      |           |
|       |          |      |           |
