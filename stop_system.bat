@echo off
color 0C
echo ==================================================
echo      STOPPING ACCIDENT DETECTION SYSTEM
echo ==================================================
echo.
echo This will force close ALL Python and Node.js processes.
echo Please ensure you don't have other important Python scripts running.
echo.
pause

echo Closing Backend...
taskkill /FI "WINDOWTITLE eq Backend API" /F /T
taskkill /FI "WINDOWTITLE eq Backend API*" /F /T

echo Closing Subscriber...
taskkill /FI "WINDOWTITLE eq Subscriber" /F /T
taskkill /FI "WINDOWTITLE eq Subscriber*" /F /T

echo Closing Detector...
taskkill /FI "WINDOWTITLE eq Detector" /F /T
taskkill /FI "WINDOWTITLE eq Detector*" /F /T

echo Closing Dashboard Terminals...
taskkill /FI "WINDOWTITLE eq Dashboard" /F /T
taskkill /FI "WINDOWTITLE eq Dashboard*" /F /T

echo Force killing any remaining engines (Taskkill)...
taskkill /F /IM python.exe /T
taskkill /F /IM node.exe /T
taskkill /F /IM uvicorn.exe /T

echo Force killing via PowerShell (Backup)...
powershell -Command "Get-Process node, python, uvicorn -ErrorAction SilentlyContinue | Stop-Process -Force"

echo.
echo If you see "Access Denied", please Right-Click this file and "Run as Administrator".
echo.


echo ==================================================
echo               SYSTEM STOPPED
echo ==================================================
pause
