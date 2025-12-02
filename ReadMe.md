# Accident Detection System 2.0

A real-time accident detection system featuring a YOLOv8-based detector, a ResNet18 classifier, and a modern React dashboard for live monitoring and alerts.

## Key Features
- **Real-Time Detection**: Uses YOLOv8 to detect vehicles and Norfair for tracking.
- **Accident Classification**: Verifies potential crashes using a custom ResNet18 CNN.
- **Smart Alerts**:
    - **Visual Feedback**: Bounding boxes turn **RED** upon crash detection.
    - **Filtering**: Requires 3 out of 5 frames to trigger an alert.
    - **Cooldown**: Prevents spam by enforcing a 10-frame cooldown between alerts.
- **Full Frame Snapshots**: Captures the entire scene (not just a crop) for better context.
- **Live Dashboard**: React-based UI with low-latency video streaming and instant alert notifications.

## Architecture
1.  **Detector (`detector_publisher.py`)**:
    - Reads video/webcam.
    - Detects crashes.
    - Publishes events via ZeroMQ (port 5556).
    - Serves an MJPEG stream with bounding boxes (port 5001).
2.  **Subscriber (`classifier_subscriber.py`)**:
    - Listens to ZeroMQ events.
    - Filters alerts (3/5 threshold).
    - Saves full-frame snapshots to `accident_crops/`.
    - Logs events to MongoDB.
3.  **API Server (`services/api_server.py`)**:
    - FastAPI backend (port 8000).
    - Serves data to the dashboard.
    - Proxies the detector's video stream.
4.  **Dashboard (`dashboard/`)**:
    - Vite + React frontend (port 5173).
    - Displays live feed, alerts, and snapshots.

## Installation

1.  **Python Dependencies**:
    ```bash
    python -m pip install -r requirements.txt
    ```
2.  **Node.js Dependencies** (for dashboard):
    ```bash
    cd dashboard
    npm install
    ```
3.  **MongoDB**:
    Ensure MongoDB is running locally on port 27017.
    ```bash
    # Docker example
    docker run -d --name mongo -p 27017:27017 -v mongo_data:/data/db mongo:6
    ```

## How to Run

For the full system, you need to run 4 separate terminals:

### 1. API Server (Backend)
```bash
python -m uvicorn services.api_server:app --reload --port 8000
```

### 2. Dashboard (Frontend)
```bash
cd dashboard
npm run dev
```
Access at: **http://localhost:5173**

### 3. Detector (Video Source)
```bash
# Run with video file (loops automatically)
python detector_publisher.py --video cctv_eg.mp4 --rate 0.033

# OR run with webcam
# python detector_publisher.py --video 0
```

### 4. Subscriber (Processing Logic)
```bash
python classifier_subscriber.py
```

## Configuration
- **Video Speed**: Adjust `--rate` in `detector_publisher.py` (e.g., `0.033` for ~30 FPS).
- **Alert Sensitivity**: Modified in `classifier_subscriber.py` (`CameraState` class).
- **Dashboard Config**: `dashboard/src/config.js` points to the backend URL.

## Troubleshooting
- **Stream Freeze**: If the video stops, the detector might have crashed. Restart it.
- **No Alerts**: Check if the subscriber is running and connected to MongoDB.
- **Wrong Stream**: Ensure "Detector Stream (with BBoxes)" is selected in the dashboard.