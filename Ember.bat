@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte die LTS-Version von https://nodejs.org installieren.
  pause
  exit /b 1
)
start "Ember" /min cmd /c start.bat
timeout /t 2 /nobreak >nul
set URL=http://127.0.0.1:3478/
set EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe
if not exist "%EDGE%" set EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe
if exist "%EDGE%" (
  start "" "%EDGE%" --app=%URL%
) else (
  start "" "%URL%"
)
