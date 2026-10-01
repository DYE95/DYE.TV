@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt.
  pause
  exit /b 1
)
node --test test/initiative.test.js test/dice.test.js
if errorlevel 1 pause
