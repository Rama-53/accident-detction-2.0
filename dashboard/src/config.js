// src/config.js
// Backend FastAPI server (see services/api_server.py).
// By default we run it on port 8000:
//   uvicorn services.api_server:app --reload --port 8000

// If you access the dashboard only from the SAME PC:
export const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// If you open the dashboard from other devices on Wi-Fi,
// change it to your PC's IP, e.g.:
// export const BACKEND_URL = "http://192.168.1.5:8000";
