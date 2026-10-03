@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt.
  pause
  exit /b 1
)
node --check server.js
if errorlevel 1 (
  echo Syntaxfehler in server.js
  pause
  exit /b 1
)
node --test test/initiative.test.js test/dice.test.js test/solo.test.js test/store.test.js test/auth.test.js
if errorlevel 1 pause
