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
echo  Adressen stehen in der Titelleiste. Pings: data\tunnel.log
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
