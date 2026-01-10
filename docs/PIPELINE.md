# Data Processing Pipeline

The journey of a video frame from camera to alert.

```mermaid
graph TD
    %% Step 1
    Input(("📹 Video Input")) --> Resize["Pre-process (640px)"]
    
    %% Step 2: Detection
    subgraph Detector Loop
        Resize --> YOLO["🤖 YOLOv11 Inference"]
        YOLO --> Norfair["🎯 Norfair Tracker"]
        Norfair --> Physics["🧮 Physics Engine"]
        
        Physics --> Anomaly{Anomaly Score > 25?}
        Anomaly -- Yes --> CrashCheck{Proximity Check?}
        Anomaly -- No --> Stream["Stream MJPEG"]
        
        CrashCheck -- Yes --> ZMQ["⚡ Publish Event"]
        CrashCheck -- No --> Stream
    end

    %% Step 3: Analysis
    subgraph Subscriber Loop
        ZMQ --> Buffer["⏳ Update Video Buffer"]
        ZMQ --> Classify["🧠 Keras Classifier<br>(Scene Analysis)"]
        
        Classify --> IsCrash{Is Accident?}
        IsCrash -- Yes --> Record["🎥 Dump Buffer +<br>Start Recording"]
        IsCrash -- No --> Discard["Ignore"]
    end
    
    %% Step 4: Action
    subgraph Action
        Record --> SaveFile["💾 Save MP4 Video"]
        SaveFile --> DB["💽 MongoDB Insert"]
        DB --> Notify["📲 Notify Responders<br>(Email/WhatsApp)"]
    end
```

## Key Pipeline Concepts

1.  **Physics-First Detection**: We don't wait for a visual "crunch". We detect the *kinetic energy* changes (sudden deceleration) that precede or accompany a crash.
2.  **Temporal Consistency**: A crash isn't a single frame. The system uses a sliding window (history buffer) to ensure a crash persists before alerting.
3.  **Contextual Recording**: By buffering 5 seconds of video *before* the trigger, we capture the "cause" of the accident, not just the aftermath.
