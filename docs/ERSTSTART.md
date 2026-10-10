# Erststart

Lies das, bevor du eine `.bat` doppelklickst. Eine Batch-Datei ist ein Skript. Sie kann Programme starten. In diesem Repo starten `erststart.bat` und `start.bat` nur den lokalen Server. Sie laden nichts nach und schicken nichts weg. `tunnel.bat` öffnet einen Weg ins Netz. Die erst starten, wenn ein Spieler zu Hause mitspielen soll.

## Was du brauchst

- Windows 10 oder 11
- [Node.js LTS](https://nodejs.org) von der Seite, nicht aus einer zufälligen Quelle
- Einen Browser
- Für zu Hause zusätzlich [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)

`npm install` ist nicht nötig. Der Server hat keine Pakete.

## Reihenfolge

1. Öffne `erststart.bat` im Editor und lies sie.
2. Doppelklick erst danach. Das Fenster wartet auf eine Taste.
3. Im Browser `http://127.0.0.1:3478/` öffnen. Das ist der Technik-Tisch.
4. Ember ist die Glut. Spieler im selben WLAN nehmen die Adresse aus der Leiste.
5. Zu Hause: `tunnel.bat` in einem zweiten Fenster offen lassen und die Adresse mit `/player` schicken.

## Spielleiter-PIN

Beim ersten Start fragt `start.bat` im Fenster nach der Spielleiter-PIN (mindestens 4 Zeichen). Geschrieben wird sie von Node (`tools\slpin.js`) nach `data\sl.pin`, nicht von cmd. Steht dort noch ein Rest wie „ECHO ist ausgeschaltet (OFF).“ von einem älteren Stand, erkennt `start.bat` das beim nächsten Start und fragt neu. Leere Eingabe zählt nicht. Eine neue PIN gilt nach dem Neustart auch als SL-Schlüssel; offene SL-Seiten einmal neu laden.

PIN später ändern: `data\sl.pin` löschen und `start.bat` neu starten.

## Ember.bat gibt es nicht mehr

`Ember.bat` hat `start.bat` nur minimiert gestartet und Edge geöffnet. Minimiert sieht man die PIN-Frage beim ersten Start nicht, und der Browser der Wahl ist Brave. Deshalb: immer `start.bat` (oder `erststart.bat` beim allerersten Mal), Browser selbst öffnen. QuickEdit im Konsolenfenster ausschalten (Fenster → Eigenschaften), sonst hält ein Klick ins Fenster den Server an.

Daten liegen in `data/`. Die ist nicht im Repo. Ein Update zieht nur den Code.
