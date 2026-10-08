@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte von https://nodejs.org die LTS-Version installieren.
  pause
  exit /b 1
)
if not exist data mkdir data
if not exist data\sl.pin (
  set /p SL_PIN=Spielleiter-PIN, einmalig, bleibt liegen:
  echo %SL_PIN%> data\sl.pin
)
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
  echo Neustart nach Update ...
  timeout /t 1 /nobreak >nul
  goto emberloop
)
echo Server beendet.
pause
