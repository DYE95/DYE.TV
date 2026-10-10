@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte von https://nodejs.org die LTS-Version installieren.
  pause
  exit /b 1
)
if not exist data mkdir data
rem Die PIN fragt und schreibt Node, nicht cmd: "set /p" plus "echo" hat frueher
rem "ECHO ist ausgeschaltet" in data\sl.pin hinterlassen. tools\slpin.js erkennt
rem solche Reste und fragt dann neu.
node tools\slpin.js
title DYE.TV  Spielleiter http://127.0.0.1:3478/ember
echo.
echo  Spielleiter   http://127.0.0.1:3478/ember
echo  Spieler       http://127.0.0.1:3478/player
echo  Zu Hause      steht in der Titelleiste, sobald der Tunnel da ist
echo.
start /b node tools\tunnel.js
:emberloop
node server.js
if errorlevel 42 (
  echo Neustart ...
  timeout /t 1 /nobreak >nul
  goto emberloop
)
echo Server beendet.
pause
