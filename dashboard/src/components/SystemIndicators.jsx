// src/components/SystemIndicators.jsx
import React, { useState, useEffect } from 'react';
import { Video, VideoOff } from 'lucide-react';
import { BACKEND_URL } from '../config';
import './SystemIndicators.css';

export function SystemIndicators() {
    const [videoRecordingEnabled, setVideoRecordingEnabled] = useState(true);

    // Fetch video recording status from system config
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/system/config`);
                if (res.ok) {
                    const data = await res.json();
                    setVideoRecordingEnabled(data.video_recording_enabled ?? true);
                }
            } catch (err) {
                console.error('Failed to fetch system config:', err);
            }
        };

        fetchConfig();
        // Poll every 5 seconds to keep status updated
        const interval = setInterval(fetchConfig, 5000);
        return () => clearInterval(interval);
    }, []);

    const indicators = [
        { label: 'PUB', status: 'active' }, // Publisher
        { label: 'ZMQ', status: 'active' }, // ZeroMQ
        { label: 'CLF', status: 'active' }, // Classifier
        { label: 'API', status: 'active' }, // Backend API
    ];

    return (
        <div className="system-indicators">
            {indicators.map((ind) => (
                <div key={ind.label} className={`indicator-badge ${ind.status}`}>
                    <span className="indicator-dot"></span>
                    {ind.label}
                </div>
            ))}
            {/* Video Recording Status */}
            <div
                className={`indicator-badge ${videoRecordingEnabled ? 'recording' : 'inactive'}`}
                title={videoRecordingEnabled ? 'Video Recording: ENABLED' : 'Video Recording: DISABLED'}
            >
                {videoRecordingEnabled ? (
                    <>
                        <Video size={12} style={{ marginRight: '4px' }} />
                        <span className="indicator-dot recording-pulse"></span>
                        REC
                    </>
                ) : (
                    <>
                        <VideoOff size={12} style={{ marginRight: '4px' }} />
                        <span className="indicator-dot"></span>
                        REC
                    </>
                )}
            </div>
        </div>
    );
}

export default SystemIndicators;
