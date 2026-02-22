# Project Introduction: Accident Detection System 2.0

## 1. Executive Summary
The **Accident Detection System 2.0** is a production-grade, real-time computer vision solution designed to automatically detect traffic accidents and anomalies. By integrating state-of-the-art deep learning models with deterministic physics calculations, the system achieves high accuracy while minimizing false positives. It offers an end-to-end solution—from video ingestion and analysis to real-time alerting and evidence archiving—accessed via a modern, glassmorphism-styled React command center.

## 2. Motivation
Traffic accidents are a leading cause of mortality and property damage worldwide. Traditional monitoring relies heavily on human operators who cannot simultaneously monitor hundreds of camera feeds effectively. Delays in accident reporting directly impact emergency response times and survival rates. This project bridges that gap by providing a **24/7 automated observer** that:
- Instantly detects collisions and dangerous driving behaviors.
- filters out non-threatening events (false alarms).
- Automatically notifies emergency services with precise location data.
- Preserves forensic evidence (pre- and post-crash video) for analysis.

## 3. Solution Architecture
 The system employs a **Dual-Stream** architecture designed for both speed and precision:

### A. The "Eyes": Real-Time Detection
At the edge, a **YOLOv11** object detector coupled with a **Norfair** tracker identifies vehicles and monitors their trajectories. Uniquely, this layer incorporates a **Physics Engine** that calculates:
- **Deceleration Vectors**: Identifying sudden, crash-indicative stops.
- **Angular Velocity**: Detecting spin-outs and loss of control.
- **Relative Speed**: Monitoring closing distances between vehicles.

### B. The "Brain": Asynchronous Verification
Potential accidents trigger the verification layer. To ensure reliability, the system uses a **Hybrid Deep Learning Classifier**:
1.  **Primary Custom CNN**: A fast, lightweight model for immediate screening.
2.  **ResNet50 Verification**: A heavy-duty model that cross-references the event.
Only events confirmed by this multi-stage pipeline are flagged as alerts, ensuring an 89.80% verification accuracy.

### C. The Command Center
Operators interact with the system through a responsive **React + Vite Dashboard**. Key capabilities include:
- **Live Monitoring**: Low-latency MJPEG streaming of camera feeds.
- **Evidence Vault**: Instant playback of auto-recorded accident clips (5s before + 5s after impact).
- **Responder Management**: Integrated address book for Police, Fire, and Medical services with Excel import/export.
- **Dynamic Configuration**: Real-time adjustment of detection sensitivity and alert rules.

## 4. Key Technologies
*   **AI/ML**: YOLOv11, Norfair Tracking, ResNet50, TensorFlow/Keras.
*   **Backend**: Python, FastAPI, ZeroMQ (for sub-millisecond messaging), MongoDB.
*   **Frontend**: React, Vite, CSS Modules (Glassmorphism UI).
*   **Infrastructure**: Docker, Docker Compose (Microservices architecture).

## 5. Conclusion
Accident Detection System 2.0 represents a significant leap forward in automated traffic safety. By combining the raw speed of object detection with the nuance of physics and advanced classification, it provides a reliable, scalable tool for smart cities and traffic management centers.
