@echo off
echo Rebuilding Accident Detection System...
echo This will rebuild ALL containers from scratch.
echo.

docker-compose build

echo.
echo Build complete! Now run start_docker.bat to start.
pause
