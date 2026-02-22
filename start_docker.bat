@echo off
echo Starting Accident Detection System (Docker)...
echo Ensure Docker Desktop is running!
echo.
echo   Desktop Dashboard: http://localhost:5173
echo   Mobile Dashboard:  http://localhost:3000
echo   API Server:        http://localhost:8000
echo.

REM Just start containers (uses cached images - FAST!)
docker-compose up

pause
