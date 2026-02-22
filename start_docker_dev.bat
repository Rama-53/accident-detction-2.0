@echo off
echo Starting Accident Detection System with WATCH MODE...
echo Ensure Docker Desktop is running!
echo.
echo Code changes will auto-sync without rebuilding!
echo.
echo   Desktop Dashboard: http://localhost:5173
echo   Mobile Dashboard:  http://localhost:3000
echo   API Server:        http://localhost:8000
echo.
echo Press Ctrl+C to stop.
echo.

docker-compose up --watch

pause
