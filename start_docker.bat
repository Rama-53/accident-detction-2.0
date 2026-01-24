@echo off
echo Starting Accident Detection System (Docker)...
echo Ensure Docker Desktop is running!

REM Just start containers (uses cached images - FAST!)
docker-compose up

pause
