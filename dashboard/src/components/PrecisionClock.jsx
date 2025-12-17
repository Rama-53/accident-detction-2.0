// src/components/PrecisionClock.jsx
import React, { useState, useEffect } from 'react';
import './PrecisionClock.css';

export function PrecisionClock() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 50); // High precision update
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const formatMs = (date) => {
        return date.getMilliseconds().toString().padStart(3, '0');
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).toUpperCase() + " | SECTOR 01";
    };

    return (
        <div className="precision-clock">
            <div className="clock-time">
                {formatTime(time)}
                <span className="clock-ms">.{formatMs(time)}</span>
            </div>
            <div className="clock-date">
                {formatDate(time)}
            </div>
        </div>
    );
}

export default PrecisionClock;
