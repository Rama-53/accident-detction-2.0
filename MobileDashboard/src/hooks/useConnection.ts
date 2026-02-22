// src/hooks/useConnection.ts
// Connection status indicator - monitors API availability

import { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from '../config';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export function useConnection() {
    const [status, setStatus] = useState<ConnectionStatus>('connected');
    const [lastConnected, setLastConnected] = useState<number>(Date.now());
    const retryCount = useRef(0);

    useEffect(() => {
        let active = true;

        async function checkConnection() {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 3000);
                const res = await fetch(`${BACKEND_URL}/health`, { signal: controller.signal });
                clearTimeout(timeout);

                if (res.ok && active) {
                    if (status !== 'connected') {
                        setStatus('connected');
                        retryCount.current = 0;
                    }
                    setLastConnected(Date.now());
                }
            } catch {
                if (!active) return;
                retryCount.current++;
                if (retryCount.current <= 2) {
                    setStatus('reconnecting');
                } else {
                    setStatus('disconnected');
                }
            }
        }

        checkConnection();
        const interval = setInterval(checkConnection, 5000);
        return () => { active = false; clearInterval(interval); };
    }, [status]);

    return { status, lastConnected };
}
