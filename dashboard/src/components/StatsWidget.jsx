// src/components/StatsWidget.jsx
// Dashboard statistics widget with animated counters, trends, and sparklines

import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Camera, TrendingUp, Clock, ArrowUp, ArrowDown, Minus } from 'lucide-react';
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

function MiniSparkline({ data, color }) {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = 100 - ((value - min) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg className="mini-sparkline" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.6"
            />
        </svg>
    );
}

function TrendIndicator({ current, previous }) {
    if (previous === 0 || current === previous) {
        return (
            <div className="trend-indicator neutral">
                <Minus size={14} />
                <span>0%</span>
            </div>
        );
    }

    const change = ((current - previous) / previous) * 100;
    const isPositive = change > 0;
    const Icon = isPositive ? ArrowUp : ArrowDown;

    return (
        <div className={`trend-indicator ${isPositive ? 'up' : 'down'}`}>
            <Icon size={14} />
            <span>{Math.abs(change).toFixed(1)}%</span>
        </div>
    );
}

export function StatsWidget() {
    const { events, cameras } = useSystem();

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

    // Calculate 24h sparkline data for incidents
    const sparklineData = useMemo(() => {
        const now = Date.now() / 1000;
        const hourAgo24 = now - (24 * 3600);
        const hourlyBuckets = Array(24).fill(0);

        events?.forEach(event => {
            if (event.time >= hourAgo24) {
                const hourIndex = Math.floor((event.time - hourAgo24) / 3600);
                if (hourIndex >= 0 && hourIndex < 24) {
                    hourlyBuckets[hourIndex]++;
                }
            }
        });

        return hourlyBuckets;
    }, [events]);

    // Calculate trends (compare last 24h to previous 24h)
    const trends = useMemo(() => {
        const now = Date.now() / 1000;
        const last24h = now - (24 * 3600);
        const last48h = now - (48 * 3600);

        const recentEvents = events?.filter(e => e.time >= last24h).length || 0;
        const previousEvents = events?.filter(e => e.time >= last48h && e.time < last24h).length || 0;

        return {
            incidents: { current: recentEvents, previous: previousEvents },
            cameras: { current: activeCameras, previous: activeCameras },
            confidence: { current: avgConfidence, previous: avgConfidence },
            highSeverity: {
                current: events?.filter(e => e.time >= last24h && e.severity?.toLowerCase() === 'high').length || 0,
                previous: events?.filter(e => e.time >= last48h && e.time < last24h && e.severity?.toLowerCase() === 'high').length || 0
            }
        };
    }, [events, activeCameras, avgConfidence]);

    const stats = [
        {
            icon: AlertTriangle,
            label: 'Total Incidents',
            value: totalIncidents,
            trend: trends.incidents,
            color: '#ef4444',
            bgColor: 'rgba(239, 68, 68, 0.15)',
            sparkline: sparklineData
        },
        {
            icon: Camera,
            label: 'Active Cameras',
            value: activeCameras,
            suffix: `/ ${totalCameras}`,
            trend: trends.cameras,
            color: '#06b6d4',
            bgColor: 'rgba(6, 182, 212, 0.15)'
        },
        {
            icon: TrendingUp,
            label: 'Avg. Confidence',
            value: avgConfidence,
            suffix: '%',
            trend: trends.confidence,
            color: '#10b981',
            bgColor: 'rgba(16, 185, 129, 0.15)'
        },
        {
            icon: Clock,
            label: 'High Severity (24h)',
            value: trends.highSeverity.current,
            trend: trends.highSeverity,
            color: '#f59e0b',
            bgColor: 'rgba(245, 158, 11, 0.15)'
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
                    <div className="stat-header">
                        <div className="stat-icon">
                            <stat.icon size={20} />
                        </div>
                        <TrendIndicator current={stat.trend.current} previous={stat.trend.previous} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-number">
                            <AnimatedCounter value={stat.value} />
                            {stat.suffix && <span className="stat-suffix">{stat.suffix}</span>}
                        </div>
                        <div className="stat-label">{stat.label}</div>
                    </div>
                    {stat.sparkline && (
                        <div className="stat-sparkline-container">
                            <MiniSparkline data={stat.sparkline} color={stat.color} />
                        </div>
                    )}
                    <div className="stat-glow"></div>
                </div>
            ))}
        </div>
    );
}

export default StatsWidget;
