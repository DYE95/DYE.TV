@echo off
cd /d "%~dp0"
echo start.bat oeffnet Glut und Tunnel schon zusammen.
echo Diese Datei nur, wenn der Server schon laeuft.
node tools\tunnel.js
pause
