// src/hooks/useSystemData.js
// Centralizes fetching of system status, events, cameras, and snapshots.

import { useState, useEffect, useCallback, useRef } from 'react';
import { BACKEND_URL } from '../config';

export function useSystemData(selectedCamera, filterStartTime, filterEndTime) {
    const [status, setStatus] = useState('Unavailable');
    const [events, setEvents] = useState([]);
    const [cameras, setCameras] = useState([]);
    const [snapshots, setSnapshots] = useState([]);

    // Track when alerts were "cleared" - only show alerts newer than this timestamp
    const [clearedAtTimestamp, setClearedAtTimestamp] = useState(null);

    // Fetch backend status
    useEffect(() => {
        async function fetchStatus() {
            try {
                const res = await fetch(`${BACKEND_URL}/status`);
                const data = await res.json();
                setStatus(data.status || 'Unknown');
            } catch (err) {
                console.error('Error fetching status:', err);
                setStatus('Unavailable');
            }
        }
        fetchStatus();
        const id = setInterval(fetchStatus, 5000);
        return () => clearInterval(id);
    }, []);

    // Fetch events
    useEffect(() => {
        async function fetchEvents() {
            try {
                const params = new URLSearchParams();
                if (selectedCamera && selectedCamera !== 'all') {
                    params.append('camera_id', selectedCamera);
                }
                if (filterStartTime) {
                    const startTs = new Date(filterStartTime).getTime() / 1000;
                    if (!isNaN(startTs)) params.append('start_time', startTs);
                }
                if (filterEndTime) {
                    const endTs = new Date(filterEndTime).getTime() / 1000;
                    if (!isNaN(endTs)) params.append('end_time', endTs);
                }
                const res = await fetch(`${BACKEND_URL}/events?${params.toString()}`);
                const data = await res.json();

                // Filter out events older than the cleared timestamp
                if (clearedAtTimestamp) {
                    const filtered = data.filter(e => e.time > clearedAtTimestamp);
                    setEvents(filtered);
                } else {
                    setEvents(data);
                }
            } catch (err) {
                console.error('Error fetching events:', err);
            }
        }
        fetchEvents();
        const id = setInterval(fetchEvents, 500);
        return () => clearInterval(id);
    }, [selectedCamera, filterStartTime, filterEndTime, clearedAtTimestamp]);

    // Fetch available cameras
    useEffect(() => {
        async function fetchCameras() {
            try {
                const res = await fetch(`${BACKEND_URL}/cameras`);
                const data = await res.json();
                setCameras(data);
            } catch (err) {
                console.error('Error fetching cameras:', err);
            }
        }
        fetchCameras();
        const id = setInterval(fetchCameras, 10000);
        return () => clearInterval(id);
    }, []);

    // Fetch snapshots list
    useEffect(() => {
        async function fetchSnaps() {
            try {
                const res = await fetch(`${BACKEND_URL}/snapshots`);
                const data = await res.json();
                setSnapshots(data);
            } catch (err) {
                console.error('Error fetching snapshots:', err);
            }
        }
        fetchSnaps();
        const id = setInterval(fetchSnaps, 5000);
        return () => clearInterval(id);
    }, []);

    // Clear displayed alerts (sets timestamp filter, does NOT delete from DB)
    const clearDisplayedAlerts = useCallback(() => {
        console.log('[useSystemData] Clearing displayed alerts');
        setClearedAtTimestamp(Date.now() / 1000); // Current time in seconds
    }, []);

    // Actually delete all alerts from database
    const clearAllAlerts = useCallback(async () => {
        try {
            await fetch(`${BACKEND_URL}/accidents`, { method: 'DELETE' });
            setClearedAtTimestamp(null); // Reset filter since DB is empty
            setEvents([]);
        } catch (err) {
            console.error('Error clearing alerts:', err);
        }
    }, []);

    return { status, events, setEvents, cameras, snapshots, clearDisplayedAlerts, clearAllAlerts };
}

