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
node --test test/initiative.test.js test/dice.test.js test/solo.test.js test/store.test.js test/auth.test.js test/range.test.js test/guard.test.js test/lan.test.js test/data.test.js test/server.test.js test/qr.test.js test/leitstelle.test.js test/dungeon.test.js test/testlauf.test.js test/testlauf-server.test.js
if errorlevel 1 pause
