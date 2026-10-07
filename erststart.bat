@echo off
cd /d "%~dp0"
echo.
echo  Lies diese Datei, bevor du sie doppelklickst.
echo  erststart.bat startet nur den lokalen Server auf diesem Rechner.
echo  Sie laedt nichts herunter und oeffnet keinen Weg ins Netz.
echo  tunnel.bat ist der Weg nach draussen. Die hier nicht.
echo.
pause
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. LTS von https://nodejs.org installieren, dann neu starten.
  pause
  exit /b 1
)
if not exist data mkdir data
echo Node ist da. Die Glut startet im naechsten Fenster.
call start.bat
