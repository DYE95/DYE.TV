@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte von https://nodejs.org die LTS-Version installieren.
  pause
  exit /b 1
)
echo Ember startet. Fenster offen lassen.
echo Im Browser: http://127.0.0.1:3478/
node server.js
pause
