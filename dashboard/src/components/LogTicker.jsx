// src/components/LogTicker.jsx
import React, { useState, useEffect } from 'react';
import './LogTicker.css';

const LOG_MESSAGES = [
    "SYSTEM: KERNEL INTEGRITY CHECK PASSED",
    "NET: HANDSHAKE ESTABLISHED [PORT 8080]",
    "AI: LOADING TENSORFLOW WEIGHTS...",
    "CAM_01: STREAM BUFFER OPTIMIZED",
    "DB: MONGODB CONNECTION FLUSHED",
    "DETECTOR: YOLOv8 MODEL ACTIVE",
    "SECURITY: ENCRYPTION PROTOCOL [TLS 1.3]",
    "SYSTEM: MEMORY USAGE NOMINAL",
    "SYNC: CLOUD UPLINK SYNCHRONIZED",
    "ANALYSIS: BATCH PROCESS COMPLETED"
];

export function LogTicker() {
    const [currentLog, setCurrentLog] = useState(LOG_MESSAGES[0]);
    const [time, setTime] = useState(new Date().toLocaleTimeString());

    useEffect(() => {
        const interval = setInterval(() => {
            const randomMsg = LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)];
            setCurrentLog(randomMsg);
            setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
        }, 3000); // Update every 3 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="log-ticker-container">
            <div className="log-ticker-content">
                <span className="log-prefix">[{time}]</span>
                <span className="log-message" key={time}>{currentLog}</span>
            </div>
        </div>
    );
}

export default LogTicker;
