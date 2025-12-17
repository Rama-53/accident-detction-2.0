// src/components/SystemStatus.jsx
import React, { useState, useEffect } from 'react';
import './SystemStatus.css';

export function SystemStatus() {
    // Simulated random data for "technical" feel
    const [fps, setFps] = useState(60);
    const [net, setNet] = useState(12);

    useEffect(() => {
        const interval = setInterval(() => {
            setFps(Math.floor(58 + Math.random() * 5));
            setNet(Math.floor(10 + Math.random() * 20));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="system-status-widget">
            <div className="sys-online">
                <div className="sys-dot"></div>
                SYSTEM ONLINE
            </div>

            <div className="status-divider"></div>

            <div className="status-item">
                <span className="status-label">FRAMES</span>
                <span className="status-value">{fps} FPS</span>
            </div>

            <div className="status-divider"></div>

            <div className="status-item">
                <span className="status-label">NET IO</span>
                <span className="status-value">{net} MB/s</span>
            </div>

            <div className="status-divider"></div>

            <div className="activity-bars">
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
            </div>
        </div>
    );
}

export default SystemStatus;
