# Testlauf-Checkliste

Drei Geräte: Laptop (SL, `start.bat`), 4K-TV mit Zeiger-Fernbedienung, Handy eines Freundes über mobile Daten.
Abhaken, Zeiten notieren, Auffälliges unten eintragen.
Datum: ________ Version (`git log --oneline -1`): ________________

## Start am Laptop

- [ ] `start.bat` gestartet, `http://127.0.0.1:3478/ember` lädt am Laptop nach ______ s.
- [ ] Die Titelleiste des Konsolenfensters zeigt nach ______ s eine neue Adresse `https://….trycloudflare.com/player`.
- [ ] Die Startseite `/` zeigt in der Leitstelle beim Tunnel „an“ und unter dem Spieler-QR „Spieler über den Tunnel“.
- [ ] In `/ember` die Session gestartet, die Karte ist am Laptop zu sehen.

## Handy des Freundes (mobile Daten)

- [ ] Am Handy ist WLAN aus, es läuft nur über mobile Daten.
- [ ] Der Freund scannt den Spieler-QR auf der Startseite (oder bekommt die Tunnel-Adresse aus „Adressen zum Kopieren“ per Messenger) und `/player` lädt nach ______ s.
- [ ] Am Handy ein Profil mit Name und PIN angelegt, Meldung „sitzt“ erscheint.
- [ ] Am Laptop in `/ember` unter Einstellungen den Bogen dem Profil gemerkt, nach „Eintreten“ am Handy ist der Bogen wählbar.
- [ ] Am Handy hochkant: Ready, Want Spotlight, Frage und Würfeln sind sichtbar und nicht von der Karte verdeckt.
- [ ] Beim Tippen ins Feld „Frage“ zoomt das Handy nicht in die Seite hinein.

## TV (4K)

- [ ] Am TV `http://<Laptop-IP>:3478/player` geöffnet und „Als Gast (Karte + Video)“ gewählt, die Karte ist zu sehen.
- [ ] Die Schrift am TV ist vom Sofa aus lesbar (sonst Browser-Zoom am TV notieren: ______ %).
- [ ] Mit dem Zeiger der Fernbedienung lassen sich Knöpfe ohne Fehlklick treffen.

## Live zwischen allen drei

- [ ] Am Laptop ein Token verschoben: TV und Handy zeigen die neue Stelle nach ______ s.
- [ ] Am Handy das eigene Token verschoben: Laptop und TV zeigen die neue Stelle.
- [ ] Am Handy einen Hope-Punkt angetippt: der Laptop zeigt den neuen Wert.
- [ ] Der Sitz-Punkt des Freundes ist am Laptop grün, solange `/player` am Handy offen ist.

## Würfeln

- [ ] Am Handy „Würfeln“ getippt: das Ergebnis steht am Handy und nach ______ s im Log am Laptop.
- [ ] Am Handy „Echte Würfel“ mit Hope- und Fear-Wert getippt: der Laptop zeigt genau diese Werte.
- [ ] Am Handy zweimal schnell auf „Würfeln“ getippt: im Log steht nur ein Wurf.
- [ ] Am Handy „Want Spotlight“ mit einer Frage getippt: der Laptop zeigt die Frage.

## Karte und Medien

- [ ] Am Laptop unter „Boden“ eine andere Karte gewählt: TV und Handy zeigen sie.
- [ ] Am Laptop mit dem Werkzeug „Ping“ auf die Karte getippt: der Ping erscheint am TV und am Handy.
- [ ] Ein kurzes Video in der Mediathek hochgeladen: es steht am TV und am Handy in der Videoliste.
- [ ] Das Video am TV abgespielt, vor- und zurückgespult, der Ton kommt.
- [ ] Das Video am Handy über mobile Daten gestartet, es läuft nach ______ s.

## Handy gesperrt und zurück

- [ ] Handy 1 Minute gesperrt, währenddessen am Laptop ein Token bewegt: nach dem Entsperren zeigt `/player` die neue Stelle ohne Neuladen.
- [ ] Nach dem Entsperren sitzt der Freund noch an seinem Bogen, ohne neu einzutreten.
- [ ] Der Hinweis „Verbindung weg, verbinde neu …“ ist nach dem Entsperren nach ______ s wieder weg.
- [ ] Handy 10 s in den Flugmodus und zurück: `/player` verbindet sich selbst wieder und Würfeln geht.

## Abschluss

- [ ] `data\crash.log` geprüft: leer / Einträge: ______
- [ ] Auf `/testlauf` im Kasten „Legion-Verbindung“ steht „Schlüssel gesetzt, Header Authorization“.
- [ ] „Hochladen & Legion Bescheid geben“ getippt: die Seite meldet „Hochgeladen“ und „Legion hat Bescheid bekommen.“

## Notizen

| Seite | Ergebnis | Zeit | Bemerkung |
|-------|----------|------|-----------|
|       |          |      |           |
|       |          |      |           |
|       |          |      |           |
|       |          |      |           |
|       |          |      |           |
