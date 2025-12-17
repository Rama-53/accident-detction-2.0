// src/components/SystemIndicators.jsx
import React from 'react';
import './SystemIndicators.css';

export function SystemIndicators() {
    // In a real app, these props would come from a system health context
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
        </div>
    );
}

export default SystemIndicators;
