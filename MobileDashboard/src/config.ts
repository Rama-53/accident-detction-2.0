// src/config.ts
// Backend FastAPI server (see services/api_server.py).
// Default: http://localhost:8000

// For LAN access from mobile devices on the same Wi-Fi,
// set VITE_API_URL to your PC's IP, e.g.:
//   VITE_API_URL=http://192.168.1.5:8000
export const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
