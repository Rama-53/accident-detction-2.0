// src/components/SensorWaveform.jsx
import React from 'react';
import './SensorWaveform.css';

export function SensorWaveform() {
    // Render 15 bars for the wave animation
    const bars = Array.from({ length: 15 }, (_, i) => i);

    return (
        <div className="sensor-waveform" title="Sensor Activity">
            {bars.map(i => (
                <div key={i} className="wave-bar"></div>
            ))}
        </div>
    );
}

export default SensorWaveform;
