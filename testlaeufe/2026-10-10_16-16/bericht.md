# Testlauf 10.10.2026, 16:16 Uhr

- Datum: 10.10.2026, 16:16 Uhr
- Tester: –
- Gerät: –
- Ember-Version: v0.4.0-10-g5498d77 (git)

## Zusammenfassung

- 0 von 41 erledigt, 41 offen
- O (ok): 0 · X (Fehler): 0 · Eigen: 0
- Bilder: 0

## Vorbereitung

- [ ] `node -v` zeigt eine LTS-Version (20 oder neuer): ______
- [ ] `git pull` im Ember-Ordner, keine Fehlermeldung
- [ ] Größe von `data\ember.json` notiert: ______ KB
- [ ] Alte Ember-Tabs und -Fenster in allen Browsern geschlossen
- [ ] Konsole: QuickEdit aus (Fenster → Eigenschaften)
- [ ] Uhrzeit beim Start notiert: ______

## Start

- [ ] `start.bat`: Zeit bis `/ember` am PC lädt: ______ s
- [ ] Tunnel-Adresse erscheint in der Titelleiste nach ______ s (keine alte Adresse vom letzten Mal)
- [ ] `data\tunnel.log`: keine Zeilen „Failed to dial a quic connection“, Protokoll http2
- [ ] Erststart: `start.bat` fragt die PIN, `data\sl.pin` enthält sie (ein alter Rest „ECHO ist ausgeschaltet“ wird erkannt und neu abgefragt)

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
- [ ] Ereignis-Seiten über die Kachel „Ereignisse“ (oder `/ember` → Ereignisse): Leitungsparcours, Fallwerk, Pastellpfad, Scharfschuss, Puls laden

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

NUR WEBHOOK VERSUCH
