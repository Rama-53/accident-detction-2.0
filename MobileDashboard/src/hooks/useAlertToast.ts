// src/hooks/useAlertToast.ts
// Real-time alert notification toasts that poll for new events

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchEvents, type Event } from '../services/api';

export interface Toast {
    id: string;
    event: Event;
    timestamp: number;
}

export function useAlertToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const seenIds = useRef<Set<string>>(new Set());
    const isFirstFetch = useRef(true);

    // Poll for new events
    useEffect(() => {
        let active = true;

        async function poll() {
            try {
                const events = await fetchEvents(undefined, 5);
                if (!active) return;

                // On first fetch, just record the IDs without toasting
                if (isFirstFetch.current) {
                    events.forEach(e => seenIds.current.add(e.id));
                    isFirstFetch.current = false;
                    return;
                }

                // Check for new events
                const newEvents = events.filter(e => !seenIds.current.has(e.id));
                newEvents.forEach(e => {
                    seenIds.current.add(e.id);
                    const toast: Toast = {
                        id: e.id,
                        event: e,
                        timestamp: Date.now(),
                    };
                    setToasts(prev => [toast, ...prev].slice(0, 5)); // Keep max 5 toasts

                    // Play alert sound for high severity
                    if (e.severity === 'high') {
                        playAlertSound();
                    }
                });
            } catch {
                // Silently fail — connection hook handles visibility
            }
        }

        poll();
        const interval = setInterval(poll, 3000);
        return () => { active = false; clearInterval(interval); };
    }, []);

    // Auto-dismiss toasts after 8 seconds
    useEffect(() => {
        if (toasts.length === 0) return;
        const timer = setTimeout(() => {
            setToasts(prev => prev.filter(t => Date.now() - t.timestamp < 8000));
        }, 1000);
        return () => clearTimeout(timer);
    }, [toasts]);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, dismissToast };
}

function playAlertSound() {
    try {
        const vol = parseInt(localStorage.getItem('ads_alert_volume') || '85') / 1000;
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    } catch {
        // Audio not available
    }
}
