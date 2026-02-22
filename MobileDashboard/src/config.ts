// src/config.ts
// Backend FastAPI server (see services/api_server.py).

const getDynamicBackendUrl = () => {
    // If explicitly provided via env (e.g., in production) and it's not the default localhost
    if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== "http://localhost:8000") {
        return import.meta.env.VITE_API_URL;
    }

    // Web browser context: Auto-detect the IP the user accessed the dashboard from.
    // E.g., if mobile user visits http://192.168.1.5:3000, API is at http://192.168.1.5:8000
    if (typeof window !== 'undefined') {
        return `http://${window.location.hostname}:8000`;
    }

    // Fallback
    return "http://localhost:8000";
};

export const BACKEND_URL = getDynamicBackendUrl();
