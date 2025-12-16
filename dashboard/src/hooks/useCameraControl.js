// src/hooks/useCameraControl.js
// Manages video sources, camera configurations, and location autocomplete.

import { useState, useEffect, useRef, useCallback } from 'react';
import { BACKEND_URL } from '../config';

export function useCameraControl() {
    const [videoSources, setVideoSources] = useState([]);
    const [selectedVideoSource, setSelectedVideoSource] = useState('');
    const [videoSourceValues, setVideoSourceValues] = useState({});
    const [multiSourceIds, setMultiSourceIds] = useState([]);
    const [cameraMetaValues, setCameraMetaValues] = useState({});

    // Location Autocomplete
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionTimeout = useRef(null);

    // Fetch video sources
    useEffect(() => {
        async function fetchVideoSources() {
            try {
                const res = await fetch(`${BACKEND_URL}/video_sources`);
                const data = await res.json();
                setVideoSources(data);
                setCameraMetaValues((prev) => {
                    const next = { ...prev };
                    data.forEach((src) => {
                        if (!next[src.id]) {
                            next[src.id] = {
                                name: src.camera_name || '',
                                location: src.location || '',
                                detection_enabled: src.detection_enabled,
                            };
                        }
                    });
                    return next;
                });
                if (data.length > 0) {
                    const defaultOption = data.find((opt) => opt.is_default) || data[0];
                    setSelectedVideoSource((prev) => prev || defaultOption.id);
                    setMultiSourceIds((prev) => prev.length > 0 ? prev : [defaultOption.id]);
                }
            } catch (err) {
                console.error('Error fetching video sources:', err);
            }
        }
        fetchVideoSources();
        const id = setInterval(fetchVideoSources, 15000);
        return () => clearInterval(id);
    }, []);

    const getSourceMeta = useCallback((sourceId) => videoSources.find((src) => src.id === sourceId), [videoSources]);
    const getSourceValue = useCallback((sourceId) => (sourceId && videoSourceValues[sourceId]) || '', [videoSourceValues]);

    const sourceHasRequiredValue = useCallback((sourceId) => {
        const meta = getSourceMeta(sourceId);
        if (!meta) return false;
        if (!meta.requires_value) return true;
        return getSourceValue(sourceId).trim().length > 0;
    }, [getSourceMeta, getSourceValue]);

    const buildFeedUrl = useCallback((sourceId) => {
        if (!sourceId) return `${BACKEND_URL}/video_feed`;
        const meta = getSourceMeta(sourceId);
        const params = new URLSearchParams();
        params.set('source_id', sourceId);
        if (meta?.requires_value) {
            const val = getSourceValue(sourceId).trim();
            if (val) params.set('source_value', val);
        }
        const query = params.toString();
        return `${BACKEND_URL}/video_feed${query ? `?${query}` : ''}`;
    }, [getSourceMeta, getSourceValue]);

    const getCameraInfo = useCallback((sourceId) => {
        if (!sourceId) return { name: '', location: '', lat: null, lng: null, detection_enabled: false };
        const meta = getSourceMeta(sourceId) || {};
        const overrides = cameraMetaValues[sourceId] || {};
        return {
            name: overrides.name !== undefined ? overrides.name : (meta.camera_name || meta.label || ''),
            location: overrides.location !== undefined ? overrides.location : (meta.location || ''),
            lat: overrides.lat ?? meta.location_lat ?? null,
            lng: overrides.lng ?? meta.location_lng ?? null,
            detection_enabled: overrides.detection_enabled ?? meta.detection_enabled ?? false,
        };
    }, [getSourceMeta, cameraMetaValues]);

    const updateCameraMetaValue = useCallback((sourceId, field, value) => {
        if (!sourceId) return;

        // 1. Update local overrides
        setCameraMetaValues((prev) => ({
            ...prev,
            [sourceId]: { ...(prev[sourceId] || {}), [field]: value },
        }));

        // 2. Optimistically update videoSources so CameraWall sees the change immediately
        setVideoSources(prev => prev.map(src => {
            if (src.id === sourceId) {
                return { ...src, [field]: value };
            }
            return src;
        }));
    }, []);


    const saveCameraConfig = useCallback(async (sourceId, overrides = {}) => {
        if (!sourceId) return;
        const sourceObj = videoSources.find(s => s.id === sourceId);
        const cameraId = (sourceObj && sourceObj.camera_id) ? sourceObj.camera_id : sourceId;
        const meta = cameraMetaValues[sourceId] || {};
        const payload = {
            name: meta.name,
            location: meta.location,
            lat: overrides.lat !== undefined ? overrides.lat : meta.lat,
            lng: overrides.lng !== undefined ? overrides.lng : meta.lng,
            detection_enabled: overrides.detection_enabled !== undefined ? overrides.detection_enabled : (meta.detection_enabled ?? true),
        };

        try {
            // 1. Save config for intended camera
            await fetch(`${BACKEND_URL}/cameras/${encodeURIComponent(cameraId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            // 2. SYNC LOGIC: Check if this camera is currently running as the main detector (demo_cam_main)
            if (cameraId !== 'demo_cam_main') {
                try {
                    // Fetch fresh state of all cameras to get the ACTIVE detector config
                    const res = await fetch(`${BACKEND_URL}/video_sources`);
                    const sources = await res.json();
                    const demoCam = sources.find(s => s.id === 'demo_cam_main' || s.camera_id === 'demo_cam_main');

                    if (demoCam) {
                        // Robust Match: Check if the running detector has the SAME NAME or LOCATION as the camera we just updated.
                        // We sync these fields when switching, so they are reliable indicators of identity.
                        // Also check if type matches roughly (e.g. both files or both webcams) 

                        const namesMatch = demoCam.camera_name === payload.name;

                        // Fallback: if names are generic, check source if fixed
                        // But for "Custom video file", source is dynamic, so NAME is the best link.

                        if (namesMatch) {
                            await fetch(`${BACKEND_URL}/cameras/demo_cam_main`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ detection_enabled: payload.detection_enabled }),
                            });
                        }
                    }
                } catch (syncErr) {
                    console.error("Sync detection error:", syncErr);
                }
            }
        } catch (err) {
            console.error('Error saving camera config:', err);
        }
    }, [videoSources, cameraMetaValues]);

    const fetchSuggestions = useCallback(async (text) => {
        if (!text || text.length < 3) {
            setLocationSuggestions([]);
            return;
        }
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&addressdetails=1&limit=5`);
            const data = await res.json();
            setLocationSuggestions(data || []);
            setShowSuggestions(true);
        } catch (err) {
            console.error('Autocomplete error:', err);
        }
    }, []);

    const handleLocationChange = useCallback((sourceId, text) => {
        updateCameraMetaValue(sourceId, 'location', text);
        if (suggestionTimeout.current) clearTimeout(suggestionTimeout.current);
        suggestionTimeout.current = setTimeout(() => fetchSuggestions(text), 500);
    }, [updateCameraMetaValue, fetchSuggestions]);

    const selectSuggestion = useCallback((sourceId, s) => {
        const name = s.display_name;
        updateCameraMetaValue(sourceId, 'location', name);
        setShowSuggestions(false);
        const lat = parseFloat(s.lat);
        const lng = parseFloat(s.lon);
        updateCameraMetaValue(sourceId, 'lat', lat);
        updateCameraMetaValue(sourceId, 'lng', lng);
        saveCameraConfig(sourceId, { lat, lng, location: name });
    }, [updateCameraMetaValue, saveCameraConfig]);

    const switchDetectorSource = useCallback(async (sourceId, actualSource, onComplete) => {
        if (!actualSource) return;
        setSelectedVideoSource('');
        const DELAY = 2500;

        // Get latest info including local overrides (name, location, detection_enabled)
        const currentInfo = getCameraInfo(sourceId);

        const updatePayload = {
            video_source: String(actualSource),
            name: currentInfo.name,
            location: currentInfo.location,
            detection_enabled: currentInfo.detection_enabled
        };

        setTimeout(async () => {
            try {
                await fetch(`${BACKEND_URL}/cameras/demo_cam_main`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatePayload)
                });
                setSelectedVideoSource('detector_stream');
                if (onComplete) onComplete();
            } catch (err) {
                console.error(err);
                alert('Failed to switch source');
            }
        }, DELAY);
    }, [getCameraInfo]);

    return {
        videoSources,
        setVideoSources,
        selectedVideoSource,
        setSelectedVideoSource,
        videoSourceValues,
        setVideoSourceValues,
        multiSourceIds,
        setMultiSourceIds,
        cameraMetaValues,
        locationSuggestions,
        showSuggestions,
        setShowSuggestions,
        getSourceMeta,
        getSourceValue,
        sourceHasRequiredValue,
        buildFeedUrl,
        getCameraInfo,
        updateCameraMetaValue,
        saveCameraConfig,
        handleLocationChange,
        selectSuggestion,
        switchDetectorSource,
    };
}
