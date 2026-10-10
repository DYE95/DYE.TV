# Testlauf 10.10.2026, 16:00 Uhr

- Datum: 10.10.2026, 16:00 Uhr
- Tester: –
- Gerät: –
- Ember-Version: v0.4.0-10-g5498d77 (git)

## Zusammenfassung

- 41 von 41 erledigt, 0 offen
- O (ok): 7 · X (Fehler): 0 · Eigen: 34
- Zeit gemessen: 23:28 (an 39 von 41 Punkten)
- Bilder: 0

## Vorbereitung (00:28)

- [Eigen] `node -v` zeigt eine LTS-Version (20 oder neuer): ______ — Notiz: Das kann raus. Klappte sofort wieder.
- [Eigen] `git pull` im Ember-Ordner, keine Fehlermeldung · ⏱ 00:03 — Notiz: kann auch raus. Weil ich immer Mit der Erstlung einer Virtuellen Instanz beginne.
- [Eigen] Größe von `data\ember.json` notiert: ______ KB · ⏱ 00:07 — Notiz: kann man hier simpler weise einen button einrichten der zum prüfen eine befehlskette nutzt um selbständig in dem moment zu schauen?
- [Eigen] Alte Ember-Tabs und -Fenster in allen Browsern geschlossen · ⏱ 00:08 — Notiz: kann auch raus. wie oben erwähnmt. Ich starte immer clean rein.
- [Eigen] Konsole: QuickEdit aus (Fenster → Eigenschaften) · ⏱ 00:05 — Notiz: klappt auch jedes mal iun der neuen instanz. kann auch aus der checkliste.
- [Eigen] Uhrzeit beim Start notiert: ______ · ⏱ 00:05 — Notiz: würde sinvoller sein als manueller timer wenn ich in dieses menü reingehe und die basis steht: Aktualiesiertes Repo into "start.bat" into "Pin Wahl des Tages" into kleine Animation zum Hochfahren into Browser und Öffnen"

## Start (15:08)

- [Eigen] `start.bat`: Zeit bis `/ember` am PC lädt: ______ s · ⏱ 08:22 — Notiz: kann man eine art Dummy erzeugen und somit denn prozess virtuell tracken. hier bei muss der 2the Server es schaffen in eine bestimmte datei hier im testlauf zu editiren. das wäre auch die möglich keit quasi "veränderung der datei = Timer Stop = eintragen als X. Run
- [Eigen] Tunnel-Adresse erscheint in der Titelleiste nach ______ s (keine alte Adresse vom letzten Mal) · ⏱ 03:29 — Notiz: Lassen wir mal die title sauber mit "DYE.TV = (ON/OFF)" so zeigt es auch simple per alt+tab was phase ist. hilft mir mit Mehr Personen Tests in der zukunpft.
- [Eigen] `data\tunnel.log`: keine Zeilen „Failed to dial a quic connection“, Protokoll http2 · ⏱ 02:22 — Notiz: ich klinge wie ein idiot aber wäre auch local automatisierbar vielleicht? also wenn es oben klappt dann ja hier auch aber ich habe keinen plan.
- [Eigen] Erststart: `start.bat` fragt die PIN, `data\sl.pin` enthält sie (ein alter Rest „ECHO ist ausgeschaltet“ wird erkannt und neu abgefragt) · ⏱ 00:55 — Notiz: Mach einfach ( "Wähle dein "KEY of the Day": ) hat beim kurzen live edit sofort geklappt.

## PC-Seiten (06:39)

- [O] `/` Startseite lädt, Kacheln klickbar · ⏱ 01:59
- [Eigen] `/ember` Spielleitung lädt, Session starten geht · ⏱ 00:08 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.
- [O] `/token` Tokenatelier lädt · ⏱ 00:01
- [O] `/pixelstube` zeichnen, PNG speichern, 5× schnell neu laden: kein Absturz · ⏱ 01:26
- [Eigen] Mediathek: Video abspielen, vor- und zurückspulen · ⏱ 01:00 — Notiz: Wir sollten irgendwie über Dynamische Checklisten Punkte nachdenken. Sowas wie "letzter commit gibt Nächsten Testlauf"
- [Eigen] Mediathek: kleines Video (< 50 MB) hochladen, Prozentanzeige läuft · ⏱ 00:24 — Notiz: Könnte Raus. Aber wenn wir es irgend wann wieder einbinden muss ess auch kontroliert werden.
- [Eigen] Mediathek: großes Video (> 1 GB) am PC hochladen, danach abspielen und spulen · ⏱ 00:01 — Notiz: Same as above.
- [O] `/heft` neue Notiz, löschen, „Rückgängig“; Editor füllt die ganze Höhe · ⏱ 01:19
- [Eigen] `/solo` ohne Bogen: Hinweis „Noch kein Bogen“, Knöpfe aus · ⏱ 00:04 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.
- [Eigen] `/solo` mit Bogen: Solo öffnen, Bot setzen, Bot zieht, Meldungen oben sichtbar · ⏱ 00:03 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.
- [O] `/bibliothek` zeigt DH-SRD (öffnet als PDF) und die Karten · ⏱ 00:03
- [O] `/karten` lädt · ⏱ 00:03
- [O] Einstellungen (Startseite): Schrift/Kacheln ändern, bleibt nach Neuladen · ⏱ 00:02
- [Eigen] Ereignis-Seiten über die Kachel „Ereignisse“ (oder `/ember` → Ereignisse): Leitungsparcours, Fallwerk, Pastellpfad, Scharfschuss, Puls laden · ⏱ 00:06 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.

## Spieler lokal (LAN) (00:08)

- [Eigen] `http://<PC-IP>:3478/player` am Handy/TV: Ladezeit ______ s · ⏱ 00:05 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.
- [Eigen] Profil anlegen, mit PIN eintreten, Bogen wählen · ⏱ 00:02 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.
- [Eigen] Würfeln, SL sieht den Wurf im Log · ⏱ 00:02 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.

## Spieler von außen (Handy-Hotspot über Tunnel) (00:22)

- [Eigen] Tunnel-Adresse `/player`: Ladezeit ______ s · ⏱ 00:19 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.
- [Eigen] Profil + PIN eintreten · ⏱ 00:02 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.
- [Eigen] Würfeln, SL sieht den Wurf nach ______ s · ⏱ 00:01 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.
- [Eigen] Sitz-Punkt beim SL wird grün/grau, wenn der Spieler kommt/geht — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.

## Mehrere gleichzeitig (00:17)

- [Eigen] PC (`/ember`) + TV (`/player`) + Handy (`/player`) gleichzeitig offen · ⏱ 00:10 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.
- [Eigen] Am PC 4+ Ember-Tabs offen: neue Seiten laden weiter, Würfe kommen an · ⏱ 00:02 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.
- [Eigen] Ein Gerät lädt neu: die anderen laufen weiter · ⏱ 00:05 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.

## Sicherheit (über die Tunnel-Adresse, nicht am PC) (00:18)

- [Eigen] `<Tunnel>/api/sl-pin` → „Nur dieser Rechner.“ (keine PIN) · ⏱ 00:16 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.
- [Eigen] `<Tunnel>/api/profiles` → „Nur dieser Rechner.“ · ⏱ 00:01 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.
- [Eigen] Neustart / Update von außen → abgelehnt · ⏱ 00:01 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.

## Störfälle (00:09)

- [Eigen] Seiten schnell hintereinander neu laden: Server läuft weiter · ⏱ 00:05 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.
- [Eigen] Tunnel-Fenster schließen: PC-Seiten laufen weiter, Spieler von außen sehen Fehler · ⏱ 00:01 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.
- [Eigen] Server neu starten (Knopf oder Strg+C und `start.bat`): Seiten verbinden sich wieder · ⏱ 00:01 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.
- [Eigen] `data\crash.log` geprüft: leer / Einträge: ______ · ⏱ 00:01 — Notiz: -NULL Teste ich jetzt nicht viel zu viele änderungen sonst glaube ich. icxh komme sonst nicht hinter her.
