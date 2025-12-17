// src/components/ScannerOverlay.jsx
import React from 'react';
import './ScannerOverlay.css';

/**
 * ScannerOverlay Component
 * Renders a sci-fi style scanning overlay for video feeds.
 * Should be placed inside a relative container.
 * 
 * @param {boolean} active - Whether the scanner is active
 */
export function ScannerOverlay({ active = true }) {
    if (!active) return null;

    return (
        <div className="scanner-overlay">
            <div className="scanner-grid"></div>

            <div className="scanner-corners">
                <div className="scanner-corners-bottom"></div>
            </div>

            <div className="scan-line"></div>

            <div className="scanner-status">
                <div>SCENE ANALYSIS // ACTIVE</div>
                <div>
                    <span className="status-dot"></span> LIVE FEED
                </div>
            </div>
        </div>
    );
}

export default ScannerOverlay;
