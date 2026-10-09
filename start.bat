@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte von https://nodejs.org die LTS-Version installieren.
  pause
  exit /b 1
)
if not exist data mkdir data
rem PIN ausserhalb einer Klammer abfragen, sonst ist die Variable beim Lesen noch leer.
if exist data\sl.pin goto pinda
set /p SL_PIN=Spielleiter-PIN, einmalig, bleibt liegen: 
>data\sl.pin echo(%SL_PIN%
:pinda
title DYE.TV  Spielleiter http://127.0.0.1:3478/ember
echo.
echo  Spielleiter   http://127.0.0.1:3478/ember
echo  Spieler       http://127.0.0.1:3478/player
echo  PIN           data\sl.pin
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
