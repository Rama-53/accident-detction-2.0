# Docker Setup

This project now supports **Docker** for containerized deployment, **Prometheus** for monitoring, and **CORS** for secure frontend-backend communication.

## Quick Start with Docker Compose

1.  **Build and Run**:
    ```bash
    docker-compose up --build
    ```
    This command will start:
    - **MongoDB** (Port 27017)
    - **API Server** (Port 8000)
    - **Detector** (Ports 5001, 5556)
    - **Classifier** (Internal)
    - **Dashboard** (Port 5173)
    - **Prometheus** (Port 9090)

2.  **Access the Services**:
    - **Dashboard**: [http://localhost:5173](http://localhost:5173)
    - **Prometheus Metrics**: [http://localhost:9090](http://localhost:9090)
    - **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
    - **Detector Stream**: [http://localhost:5001/stream.mjpg](http://localhost:5001/stream.mjpg)

## Configuration

- **Environment Variables**:
    - The `docker-compose.yml` file defines environment variables for services (e.g., `MONGO_URI`).
    - The Dashboard uses `VITE_API_URL` to find the backend.

- **Prometheus**:
    - Metrics are exposed at `http://localhost:8000/metrics`.
    - Configuration is in `prometheus.yml`.

- **CORS**:
    - The API server is configured to allow all origins (`*`) by default, enabling the dashboard to communicate with the backend from any host.
