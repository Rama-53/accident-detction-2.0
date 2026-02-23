// src/config.ts
// Backend FastAPI server (see services/api_server.py).
// Works with api_server in Docker: set VITE_API_URL to your API base (e.g. http://localhost:8000 or http://host.docker.internal:8000).

const getDynamicBackendUrl = (): string => {
    // Explicit override - use for Docker, production, or when API is on a different host
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
        return envUrl.replace(/\/$/, ''); // trim trailing slash
    }

    // Web browser: use same host as dashboard, API on port 8000
    // e.g. http://192.168.1.5:3000 -> API at http://192.168.1.5:8000
    if (typeof window !== 'undefined') {
        return `http://${window.location.hostname}:8000`;
    }

    return "http://localhost:8000";
};

export const BACKEND_URL = getDynamicBackendUrl();
