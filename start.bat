@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte von https://nodejs.org die LTS-Version installieren.
  pause
  exit /b 1
)
title Ember  SL http://127.0.0.1:3478/ember
echo.
echo  ------------------------------------------------
echo   SPIELLEITUNG   http://127.0.0.1:3478/ember
echo   HOME           http://127.0.0.1:3478/
echo   SPIELER        http://127.0.0.1:3478/player
echo   ZU HAUSE       kommt einmal, sobald der Tunnel steht
echo   Pings          data\tunnel.log  (nicht hier)
echo  ------------------------------------------------
echo  Fenster offen lassen. Die Titelleiste behaelt die Adressen.
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
