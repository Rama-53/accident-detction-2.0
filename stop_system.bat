@echo off
setlocal
color 0C
echo ==================================================
echo      STOPPING ACCIDENT DETECTION SYSTEM
echo ==================================================
echo.
echo This will force close ALL Python and Node.js processes.
echo.

:: Define absolute path to Taskkill to bypass PATH issues
set "TK=C:\Windows\System32\taskkill.exe"

:: Check if taskkill exists
if not exist "%TK%" (
    echo [ERROR] taskkill.exe not found at %TK%
    echo Please fix your Windows System32 path.
    pause
    exit /b
)

echo Closing Backend (Window Title: Backend API)...
"%TK%" /F /FI "WINDOWTITLE eq Backend API*" /T

echo Closing Subscriber (Window Title: Subscriber)...
"%TK%" /F /FI "WINDOWTITLE eq Subscriber*" /T

echo Closing Detector (Window Title: Detector)...
"%TK%" /F /FI "WINDOWTITLE eq Detector*" /T

echo Closing Dashboard (Window Title: Dashboard)...
"%TK%" /F /FI "WINDOWTITLE eq Dashboard*" /T

echo.
echo Cleaning up any remaining processes...
"%TK%" /F /IM python.exe /T 2>nul
"%TK%" /F /IM node.exe /T 2>nul
"%TK%" /F /IM uvicorn.exe /T 2>nul

echo.
echo ==================================================
echo               SYSTEM STOPPED
echo ==================================================
pause
endlocal
