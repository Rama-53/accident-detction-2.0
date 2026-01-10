# System Architecture & Data Flow

This document details the modules and data flow of the Accident Detection System 2.0.

```mermaid
graph TD
    %% Sources
    Source["Video Source<br>(CCTV / Webcam / File)"] -->|Raw Frames| Detector

    %% 1. Detector Node
    subgraph Detection Node [detector_publisher.py]
        Detector["Running YOLOv11"]
        Tracker["Norfair Tracker"]
        Physics["Physics Engine<br>(Deceleration, Angle, Speed)"]
        StreamServer["MJPEG Streamer<br>(Port 5001)"]
        
        Source --> Detector
        Detector --> Tracker
        Tracker --> Physics
        Physics -->|Anomaly Score| CrashCheck{Potential<br>Crash?}
        
        CrashCheck -->|Yes| Pub["ZMQ Publisher<br>(Port 5556)"]
        Detector --> StreamServer
    end

    %% 2. Subscriber Node
    subgraph Processing Node [classifier_subscriber.py]
        Sub["ZMQ Subscriber"]
        Buffer["Video Buffer<br>(Circular Deque)"]
        Classifier["Deep Learning Classifier<br>(Keras CNN)"]
        Recorder["Video Recorder"]
        
        Pub -->|JSON + B64 Frame| Sub
        Sub --> Buffer
        Sub -->|Trigger| Classifier
        
        Classifier -->|Confirmed| Recorder
        Buffer -->|Dump History| Recorder
        Recorder -->|Save MP4| Diskstorage["/accident_crops/videos"]
        
        Classifier -->|Confirmed| DB_Writer["MongoDB Writer"]
        Classifier -->|Confirmed| Notifier["Messaging Service"]
    end

    %% 3. Backend & Storage
    subgraph Backend Services
        DB[(MongoDB)]
        API["FastAPI Server<br>(Port 8000)"]
        
        DB_Writer --> DB
        Notifier -->|Email/WhatsApp| Responders["External Responders"]
        
        API <-->|Read/Write| DB
        API -->|Serve Media| Diskstorage
    end

    %% 4. Frontend
    subgraph Dashboard UI [React + Vite]
        UI["Main Dashboard"]
        
        StreamServer -.->|MJPEG Feed| UI
        API -->|JSON Data| UI
        UI -->|Config Updates| API
        UI -->|Manage Responders| API
    end
```

## Detailed Component Breakdown

### 1. Detector (`detector/detector.py`)
The heavy lifter. It doesn't just look for "cars", it looks for "behavior".
*   **Object Detection**: YOLOv11s identifies vehicles.
*   **Tracking**: Norfair assigns IDs to track vehicles across frames.
*   **Physics Engine**:
    *   **Deceleration**: Detects rapid speed drops (braking/impact).
    *   **Angle Change**: Detects sudden rotation or spin-outs.
    *   **Interaction**: Monitors proximity between high-stress objects.
*   **Output**: High-efficiency ZeroMQ messages containing physics data and frame snapshots.

### 2. Subscriber (`classifier_subscriber.py`)
The decision maker and archivist.
*   **Scene Verification**: Uses a custom Keras model to classify the *entire scene* as "Accident" or "Normal", filtering out YOLO false positives.
*   **Evidence Recorder**:
    *   Keeps a rolling buffer of the last ~5 seconds of video.
    *   When an accident is confirmed, it "dumps" this buffer and continues recording for another 5 seconds.
    *   Result: A continuous 10-second MP4 clip capturing the *cause* and *aftermath*.
*   **Data Aggregation**: Groups intermittent detections into single "Alert Events" to keep the database clean.

### 3. Backend API (`services/api_server.py`)
The system brain.
*   **Configuration Hub**: Manages camera settings (ROI, Location) and system flags (AI enabled/disabled).
*   **Responder Manager**: Handles the directory of emergency contacts (police/fire), supporting **Excel import/export** for bulk management.
*   **Media Server**: Proxies video streams and serves high-res snapshots and recorded videos to the frontend.

### 4. Dashboard (`dashboard/`)
The command center.
*   **Visuals**: Precision clock, sensor waveforms, and real-time live feeds.
*   **Controls**: Global system settings, camera-specific toggles, and responder address book.
*   **Playback**: Integrated video player for review of accident footage.
