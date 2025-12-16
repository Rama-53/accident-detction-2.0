// src/hooks/useSystemData.js
// Centralizes fetching of system status, events, cameras, and snapshots.

import { useState, useEffect, useCallback } from 'react';
import { BACKEND_URL } from '../config';

export function useSystemData(selectedCamera, filterStartTime, filterEndTime) {
    const [status, setStatus] = useState('Unavailable');
    const [events, setEvents] = useState([]);
    const [cameras, setCameras] = useState([]);
    const [snapshots, setSnapshots] = useState([]);

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
                setEvents(data);
            } catch (err) {
                console.error('Error fetching events:', err);
            }
        }
        fetchEvents();
        const id = setInterval(fetchEvents, 500);
        return () => clearInterval(id);
    }, [selectedCamera, filterStartTime, filterEndTime]);

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

    const clearAllAlerts = useCallback(async () => {
        try {
            await fetch(`${BACKEND_URL}/accidents`, { method: 'DELETE' });
            setEvents([]);
        } catch (err) {
            console.error('Error clearing alerts:', err);
        }
    }, []);

    return { status, events, setEvents, cameras, snapshots, clearAllAlerts };
}
