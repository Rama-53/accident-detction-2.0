# Project Documentation

## 4. Hardware and Software Required for Project

### **Hardware Requirements**
| Component | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **Processor (CPU)** | Intel Core i5 (8th Gen) / AMD Ryzen 5 | Intel Core i7 / AMD Ryzen 7 (or higher) |
| **Memory (RAM)** | 8 GB | 16 GB |
| **Graphics (GPU)** | Not required (CPU only mode) | NVIDIA GPU with CUDA support (e.g., GTX 1660, RTX 3060) for real-time 42 FPS processing |
| **Storage** | 10 GB Free Space (SSD preferred) | 20 GB Free Space (NVMe SSD) for saving HD video clips and database records |
| **Camera/Video Source**| Pre-recorded `.mp4` file or standard WebCam | IP Camera (RTSP stream) or High-Res WebCam |

### **Software Requirements**
| Software | Version | Purpose |
| :--- | :--- | :--- |
| **Operating System** | Windows 10/11, Ubuntu 20.04+, macOS | Base system environment |
| **Python** | 3.9 - 3.11 | Core programming language for AI detection & backend services |
| **Node.js** | v16 or higher | Required to run the React dashboard frontend |
| **MongoDB** | 6.0 or higher | Database for storing accident logs, events, and responder contacts |
| **Docker** *(Optional)* | Latest | For containerized deployment using `docker-compose` |

---

## 5. Software Packages for Installation

Below is the categorized list of all software packages and dependencies required for the project installation.

### **Containerization & Deployment (Docker)**
If using the recommended Docker deployment, the following are required:
*   **Docker Engine**: To build and run isolated containers.
*   **Docker Compose**: To orchestrate the multi-container system via `docker-compose.yml`.
*   **Prometheus Image**: For tracking system performance (`prom/prometheus`).
*   **MongoDB Image**: For the database (`mongo:latest`).

### **Backend & AI Engine (Python)**
Installed via `pip install -r requirements.txt`:
*   **Computer Vision & AI:**
    *   `ultralytics`: For YOLOv11 vehicle detection.
    *   `tensorflow` / `keras`: For the Deep Learning ResNet50 Classifier model.
    *   `opencv-python`: For video frame processing and streaming.
    *   `norfair`: For high-speed vehicle tracking (Physics Engine).
    *   `easyocr`: For automatic license plate recognition (ALPR).
*   **Web Server & API:**
    *   `fastapi`: For creating the backend REST API.
    *   `uvicorn`: ASGI server for running FastAPI.
    *   `python-multipart`: For handling file uploads in the API.
*   **Data & Infrastructure:**
    *   `pymongo`: Official driver to connect Python with MongoDB.
    *   `pyzmq`: ZeroMQ messaging for sub-millisecond inter-process communication.
    *   `pandas` & `openpyxl`: For processing Excel sheets (e.g., Emergency Responders data).
    *   `prometheus-client`: For tracking system metrics.

### **Detailed Deep-Scan of Requirements (Including Training & Subfolders)**

By scanning every subfolder, the following exhaustive dependency list maps exact packages to their system components, including scripts used for model training, evaluation, and visualization.

#### **1. AI Classification & Training (`classifier/`)**
*   `tensorflow` & `keras` (v3.4.1+): Core frameworks for loading and running the `resnet50_phase2_best.keras` model.
*   `torch` (PyTorch): Used as the GPU-accelerated backend for Keras on Windows (`os.environ["KERAS_BACKEND"] = "torch"`) and for legacy `.pth` models (`my_model.pth`).
*   `pillow`: Used extensively for standardizing image arrays prior to classification.
*   `numpy`: Array manipulation for CNN inputs.

#### **2. Real-Time Detection (`detector/`)**
*   `ultralytics`: Loads and runs the `yolo11n.pt` and `license_plate_detector.pt` object detection models.
*   `norfair`: Calculates physics (Euclidean distance, velocity) to track bounding boxes over time.
*   `opencv-python-headless`: Decoding video streams (RTSP/MP4) into frame arrays for YOLO processing.

#### **3. Backend Services & Communications (`services/`, `utils/`, Root Scripts)**
*   `fastapi`, `uvicorn`, `python-multipart`: Serving the REST API.
*   `pymongo`: Writing accident metadata to MongoDB.
*   `pyzmq`: ZeroMQ sub-millisecond Pub/Sub messaging between the detector (publisher) and classifier (subscriber).
*   `python-dotenv`: Loading `.env` secrets.
*   `requests`: Webhooks and internal API calls.
*   `easyocr`: Extracting text from license plate crops.

#### **4. Analysis, Benchmarking & Training Scripts (`scripts/`)**
*   `matplotlib`: Used in scripts like `generate_performance_plots.py` and `generate_ieee_plots.py` to create the visual graphs found in the repository.
*   `pandas` & `openpyxl`: Parsing Excel responder lists and manipulating evaluation results.
*   `tqdm`: CLI progress bars for batch evaluation loops.

#### **5. Main React Dashboard (`dashboard/`)**
*   `react`, `react-dom` (v19.2): UI foundation.
*   `vite`: Build tool.
*   `leaflet`, `react-leaflet`: For rendering the interactive map components.
*   `recharts`: For rendering line/bar charts in analytics views.
*   `lucide-react`, `react-icons`: UI Icons.
*   `framer-motion`: Page transitions.
*   `jspdf`, `jspdf-autotable`, `file-saver`: For exporting accident reports to PDF.

#### **6. Mobile Dashboard (`MobileDashboard/`)**
*   `react`, `react-dom` (v19.0): Mobile UI.
*   `tailwindcss` (v4), `@tailwindcss/vite`: Utility CSS framework.
*   `react-router-dom`: SPA Navigation.
*   `clsx`, `tailwind-merge`: Utility string compilation.
*   `motion`: Animation library.
*   `leaflet`, `react-leaflet`: Mobile map components.

---

## 6. Project Installation Video (Guide / Script)

Since screen recordings must be done on your local machine to demonstrate your exact setup, follow this step-by-step guide to record your **Project Installation Video**. We recommend using **OBS Studio** or **Windows Game Bar** (Win + G) to record your screen.

### **Recording Script / Steps to Show:**

1.  **Introduction (0:00 - 0:15)**
    *   *Action:* Open your terminal and show the project folder `accident-detction-2.0`.
    *   *Voiceover:* "Hello, this is the installation demonstration for the Hybrid Accident Detection System."
2.  **Prerequisites Check (0:15 - 0:30)**
    *   *Action:* Type `python --version` and `node -v` in the terminal to prove the base software is installed.
    *   *Action:* Show the MongoDB Compass application running to prove the database is active.
3.  **Starting the System via Docker Compose (0:30 - 1:15)**
    *   *Action:* In the terminal at the root of the project, type `docker-compose up --build`.
    *   *Voiceover:* "We use Docker Compose to containerize and orchestrate our entire application. By running `docker-compose up`, Docker automatically pulls the MongoDB and Prometheus images, and builds the isolated environments for our React Dashboard, FastAPI Server, and AI Core Engine."
    *   *Action:* Wait for the terminal logs to show that all 6 services (mongo, ai_core, api, dashboard, mobile_dashboard, prometheus) are running successfully.
4.  **Verifying the Services (1:15 - 1:45)**
    *   *Action:* Open Docker Desktop to visually show the 6 running containers inside the `accident-detction-2.0` stack.
    *   *Voiceover:* "As you can see in Docker Desktop, all of our microservices are running smoothly in isolated containers, communicating securely over the internal Docker network."
5.  **Conclusion (1:45 - 2:00)**
    *   *Action:* Open your web browser and go to `http://localhost:5173` to show the React Dashboard successfully connected to the containerized backend.
    *   *Voiceover:* "The system is fully deployed and operational. The frontend, backend, and AI pipeline are now synchronized."

### **ALTERNATIVE: Docker Installation Video Script**
If you want to show off the containerized setup (highly recommended for a cleaner presentation):

1.  **Introduction (0:00 - 0:15)**
    *   *Action:* Show the project root and the `docker-compose.yml` file in an IDE.
    *   *Voiceover:* "Hello, this is the installation demonstration for the Hybrid Accident Detection System. We utilize Docker for containerized microservice deployment."
2.  **Starting the System (0:15 - 1:00)**
    *   *Action:* In the terminal, type `docker-compose up --build`.
    *   *Voiceover:* "By running docker-compose up, the system automatically builds the images for our React dashboards, FastAPI backend, and AI core engine, and spins them up alongside MongoDB and Prometheus."
3.  **Verifying Containers (1:00 - 1:20)**
    *   *Action:* Open Docker Desktop to show the 6 green running containers.
    *   *Voiceover:* "As you can see, all 6 microservices are successfully running in isolated environments on our internal Docker network."
4.  **Conclusion (1:20 - 1:30)**
    *   *Action:* Go to `http://localhost:5173` in your browser.
    *   *Voiceover:* "The system is now fully deployed and ready for use."

---

## 7. Project Explanation Video (Guide / Script)

This video should focus on how the project works, its architecture, and demonstrating a live accident detection event.

### **Recording Script / Steps to Show:**

1.  **Project Overview & Architecture (0:00 - 0:45)**
    *   *Action:* Show the `SYSTEM_DIAGRAM.md` or a slide containing the project architecture.
    *   *Voiceover:* "Our system uses a hybrid approach. The fast-path uses YOLOv11 and Norfair tracking to process videos at 42 FPS. If it detects an anomaly using physics like deceleration, it sends the frame to our ResNet50 Classifier for secondary verification."
2.  **Demonstrating the Dashboard UI (0:45 - 1:30)**
    *   *Action:* Open the browser to the live React Dashboard. Click through the 'Live Feed', 'Map', and 'Analytics' tabs.
    *   *Voiceover:* "Here is the Command Center. Operators can view multiple camera feeds. The Map tab shows where our cameras are located, and Analytics provides historical data on detected incidents."
3.  **Live Detection Demonstration (1:30 - 2:30)**
    *   *Action:* Ensure the backend is running `detector_publisher.py` with `cctv_eg.mp4`. Show the Live Feed tab on the dashboard.
    *   *Voiceover:* "Let's watch the live feed. The system is tracking vehicles in real-time." 
    *   *Action:* Wait for the accident event in the video.
    *   *Voiceover:* "An accident just occurred. The physics engine detected a sudden anomaly. The ResNet50 classifier verified it, and immediately an alert popped up on our dashboard."
4.  **Reviewing Evidence & Responders (2:30 - 3:15)**
    *   *Action:* Click on the generated 'Alert' to open the evidence. Show the generated Video Clip and the snapshot.
    *   *Voiceover:* "The system automatically recorded 5 seconds before and after the crash to preserve evidence. It also extracted the license plate."
    *   *Action:* Navigate to the Responders tab.
    *   *Voiceover:* "Finally, the system uses this data to automatically notify the nearest emergency responders listed in our database."
5.  **Conclusion (3:15 - 3:30)**
    *   *Voiceover:* "This ensures a fast, accurate, and automated response to road accidents. Thank you for watching."
