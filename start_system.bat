@echo off
echo Starting Accident Detection System...

:: 1. Backend API
start "Backend API" cmd /k "call .venv\Scripts\activate && uvicorn services.api_server:app --reload --port 8000"

:: 2. Subscriber (ASYNC VERSION - 40 FPS)
start "EMAIL & ALERTS LOG" cmd /k "color 0A && call .venv\Scripts\activate && python classifier_subscriber_async.py"

:: 3. Detector (Default Camera)
start "Detector" cmd /k "call .venv\Scripts\activate && python detector_publisher.py --video cctv_eg.mp4"

:: 4. Dashboard
start "Dashboard" cmd /k "cd dashboard && npm run dev"

:: 5. Open Browser
echo Waiting for services to initialize...
timeout /t 10
start http://localhost:5173

echo System Started!
pause
