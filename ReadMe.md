# Accident Detection System 2.0

A production-grade real-time accident detection system featuring a hybrid **YOLOv11 + Norfair** detector, a **Physics Engine** for anomaly detection, and a **Deep Learning Classifier** verification layer. It includes a comprehensive React dashboard for live monitoring, video playback, and emergency responder management.

## Key Features

### 🧠 Advanced Detection & Verification
- **Async Hybrid AI**: Two-stage processing architecture:
  - **Fast Path (24ms, 42 FPS)**: Primary Custom CNN (16-32-16 Filter Architecture) for 100% Recall screening.
  - **Accurate Path (161ms, async)**: Dual-model hybrid verification (Primary + ResNet50 w/ Custom Head) for precision filtering.
- **Physics Engine**: Calculates **deceleration**, **angle changes**, and **relative speed** to detect non-collision accidents (e.g., sudden stops, spin-outs).
- **Smart Verification**: Background thread verifies alerts with 89.80% accuracy without blocking real-time detection.
- **Video Recording**: Automatically captures and saves video clips of accidents, including **pre-crash buffer** (5s before) and **post-crash footage** (5s after), ensuring the entire context is preserved.
- **Smart Filtering**: Uses a temporal voting system (≥7/10 frames) and cooldown logic to prevent alert spamming.

### 🖥️ Modern Command Center
- **Live Dashboard**: A high-performance **React + Vite** frontend (Glassmorphism design) with low-latency MJPEG streaming.
- **Interactive Map**: Visualizes camera locations and accident hotspots.
- **Responders Manager**: Manage emergency contacts (Police, Ambulance, Fire) with **Excel Import/Export** capabilities.
- **System Config**: Real-time control over detection settings, email/WhatsApp alerts, and camera naming/locations directly from the UI.
- **Evidence Vault**: View full-resolution snapshots and play back recorded accident videos.

### 🔌 Connectivity
- **Multi-Source Support**: Seamlessly stream from **Webcams**, **IP Cameras (RTSP)**, **DroidCam**, or **Video Files**.
- **Real-Time Alerts**: ZeroMQ messaging architecture for sub-millisecond internal communication.
- **Emergency Notifications**: Integrated messaging service for Email and WhatsApp alerts (configurable).

## Architecture

1.  **Detector (`detector_publisher.py`)**:
    - The "Eyes". Reads video, tracks vehicles (Norfair), runs Physics checks, and serves the live visual stream.
    - Publishes candidate events via ZeroMQ.
    
2.  **Subscriber (`classifier_subscriber_async.py`)**:
    - The "Brain". Dual-threaded async processing:
      - **Main Thread**: Fast primary CNN classification (24ms) for temporal voting and immediate alerts
      - **Background Thread**: Hybrid verification (Primary + ResNet50) for priority mapping
    - Triggers **Video Recording** (dumps buffer to MP4).
    - Saves evidence to MongoDB with verification status and priority.
    - Notifies emergency responders with sector-based targeting.

3.  **Backend API (`services/api_server.py`)**:
    - FastAPI server managing the system configuration, camera metadata, and accident history.
    - Handles Excel imports for responders and serves video/image evidence.

4.  **Frontend (`dashboard/`)**:
    - Modern React UI for operators to monitor the system, view analytics, and manage settings.

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

## How to Run

Run these components in separate terminals:

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
# Run with default video
python detector_publisher.py --video cctv_eg.mp4 

# OR with webcam
# python detector_publisher.py --video 0
```

### 4. Subscriber (Processing Logic)
```bash
python classifier_subscriber_async.py
```

## System Requirements
- Python 3.9+
- Node.js 16+
- MongoDB 6+
- CUDA-capable GPU (Recommended for real-time performance)