@echo off
echo ============================================
echo      DIAGNOSTIC - LISTING PROCESSES
echo ============================================
echo.

echo Checking for specific Window Titles...
"C:\Windows\System32\tasklist.exe" /V /FI "WINDOWTITLE eq Backend API*"
"C:\Windows\System32\tasklist.exe" /V /FI "WINDOWTITLE eq Subscriber*"
"C:\Windows\System32\tasklist.exe" /V /FI "WINDOWTITLE eq Detector*"
"C:\Windows\System32\tasklist.exe" /V /FI "WINDOWTITLE eq Dashboard*"

echo.
echo Checking for Python/Node processes...
"C:\Windows\System32\tasklist.exe" /V /FI "IMAGENAME eq python.exe"
"C:\Windows\System32\tasklist.exe" /V /FI "IMAGENAME eq node.exe"
"C:\Windows\System32\tasklist.exe" /V /FI "IMAGENAME eq uvicorn.exe"

echo.
echo ============================================
echo DONE. If lists are empty, processes are not found.
echo ============================================
pause
