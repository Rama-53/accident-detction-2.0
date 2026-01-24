@echo off
echo Starting Accident Detection System with WATCH MODE...
echo Ensure Docker Desktop is running!
echo.
echo Code changes will auto-sync without rebuilding!
echo Press Ctrl+C to stop.
echo.

docker-compose up --watch

pause
