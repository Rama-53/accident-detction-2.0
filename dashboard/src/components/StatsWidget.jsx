// src/components/StatsWidget.jsx
// Dashboard statistics widget with animated counters

import { useState, useEffect } from 'react';
import { AlertTriangle, Camera, TrendingUp, Clock } from 'lucide-react';
import { useSystem } from '../context/SystemContext';
import './StatsWidget.css';

function AnimatedCounter({ value, duration = 1000 }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (value === displayValue) return;

        const startValue = displayValue;
        const startTime = Date.now();
        const endValue = value;

        const animate = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);

            // Easing function for smooth animation
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(startValue + (endValue - startValue) * easeOut);

            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration]);

    return <span className="stat-value">{displayValue}</span>;
}

export function StatsWidget() {
    const { events, cameras, status } = useSystem();

    // Calculate statistics
    const totalIncidents = events?.length || 0;
    const activeCameras = cameras?.filter(c => c.status === 'active' || c.connected)?.length || cameras?.length || 0;
    const totalCameras = cameras?.length || 0;

    // Calculate average confidence from events
    const avgConfidence = events && events.length > 0
        ? Math.round((events.reduce((sum, e) => sum + (e.confidence || 0.8), 0) / events.length) * 100)
        : 0;

    // Calculate incidents by severity
    const highSeverity = events?.filter(e => e.severity?.toLowerCase() === 'high')?.length || 0;
    const mediumSeverity = events?.filter(e => e.severity?.toLowerCase() === 'medium')?.length || 0;
    const lowSeverity = events?.filter(e => e.severity?.toLowerCase() === 'low')?.length || 0;

    const stats = [
        {
            icon: AlertTriangle,
            label: 'Total Incidents',
            value: totalIncidents,
            color: 'var(--neon-red)',
            bgColor: 'rgba(255, 51, 102, 0.15)'
        },
        {
            icon: Camera,
            label: 'Active Cameras',
            value: activeCameras,
            suffix: `/ ${totalCameras}`,
            color: 'var(--neon-cyan)',
            bgColor: 'rgba(0, 245, 255, 0.15)'
        },
        {
            icon: TrendingUp,
            label: 'Avg. Confidence',
            value: avgConfidence,
            suffix: '%',
            color: 'var(--neon-green)',
            bgColor: 'rgba(0, 255, 136, 0.15)'
        },
        {
            icon: Clock,
            label: 'High Severity',
            value: highSeverity,
            color: 'var(--neon-orange)',
            bgColor: 'rgba(255, 159, 10, 0.15)'
        }
    ];

    return (
        <div className="stats-widget">
            {stats.map((stat, index) => (
                <div
                    key={stat.label}
                    className="stat-card"
                    style={{
                        '--stat-color': stat.color,
                        '--stat-bg': stat.bgColor,
                        animationDelay: `${index * 0.1}s`
                    }}
                >
                    <div className="stat-icon">
                        <stat.icon size={20} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-number">
                            <AnimatedCounter value={stat.value} />
                            {stat.suffix && <span className="stat-suffix">{stat.suffix}</span>}
                        </div>
                        <div className="stat-label">{stat.label}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default StatsWidget;
