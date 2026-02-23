// src/hooks/useConnection.ts
// Connection status indicator - monitors API availability

import { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from '../config';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

const HEALTH_ENDPOINTS = ['/health', '/status'];

async function ping(baseUrl: string): Promise<boolean> {
    for (const path of HEALTH_ENDPOINTS) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(`${baseUrl}${path}`, {
                signal: controller.signal,
                mode: 'cors',
            });
            clearTimeout(timeout);
            if (res.ok) return true;
        } catch {
            // try next endpoint
        }
    }
    return false;
}

export function useConnection() {
    const [status, setStatus] = useState<ConnectionStatus>('connected');
    const [lastConnected, setLastConnected] = useState<number>(Date.now());
    const retryCount = useRef(0);

    useEffect(() => {
        let active = true;

        async function checkConnection() {
            const ok = await ping(BACKEND_URL);
            if (!active) return;

            if (ok) {
                setStatus('connected');
                setLastConnected(Date.now());
                retryCount.current = 0;
            } else {
                retryCount.current++;
                setStatus(retryCount.current <= 5 ? 'reconnecting' : 'disconnected');
            }
        }

        checkConnection();
        const interval = setInterval(checkConnection, 5000);
        return () => { active = false; clearInterval(interval); };
    }, []);

    return { status, lastConnected };
}
