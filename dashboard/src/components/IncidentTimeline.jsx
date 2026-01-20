// src/components/IncidentTimeline.jsx
import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import { useSystem } from '../context/SystemContext';
import './IncidentTimeline.css';

const TIMEFRAME_OPTIONS = [
    { value: '24h', label: '24 Hours', hours: 24 },
    { value: '7d', label: '7 Days', hours: 168 },
    { value: '30d', label: '30 Days', hours: 720 },
];

export function IncidentTimeline() {
    const { events } = useSystem();
    const [timeframe, setTimeframe] = useState('24h');

    const chartData = useMemo(() => {
        const selectedTimeframe = TIMEFRAME_OPTIONS.find(t => t.value === timeframe);
        const hoursAgo = selectedTimeframe.hours;
        const now = Date.now() / 1000;
        const startTime = now - (hoursAgo * 3600);

        // Filter events within timeframe
        const filteredEvents = events.filter(e => e.time >= startTime);

        // Determine interval based on timeframe
        let intervalSeconds;
        let formatTime;
        if (timeframe === '24h') {
            intervalSeconds = 3600; // 1 hour
            formatTime = (timestamp) => new Date(timestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (timeframe === '7d') {
            intervalSeconds = 3600 * 6; // 6 hours
            formatTime = (timestamp) => new Date(timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });
        } else {
            intervalSeconds = 3600 * 24; // 1 day
            formatTime = (timestamp) => new Date(timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        // Create time buckets
        const buckets = {};
        for (let t = startTime; t <= now; t += intervalSeconds) {
            const key = Math.floor(t / intervalSeconds) * intervalSeconds;
            buckets[key] = { time: key, high: 0, medium: 0, low: 0, total: 0, label: formatTime(key) };
        }

        // Distribute events into buckets
        filteredEvents.forEach(event => {
            const bucketKey = Math.floor(event.time / intervalSeconds) * intervalSeconds;
            if (buckets[bucketKey]) {
                const severity = (event.severity || 'medium').toLowerCase();
                buckets[bucketKey][severity] = (buckets[bucketKey][severity] || 0) + 1;
                buckets[bucketKey].total += 1;
            }
        });

        return Object.values(buckets).sort((a, b) => a.time - b.time);
    }, [events, timeframe]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const total = payload.reduce((sum, entry) => sum + entry.value, 0);
            return (
                <div className="timeline-tooltip">
                    <div className="tooltip-label">{label}</div>
                    <div className="tooltip-content">
                        <div className="tooltip-row">
                            <span className="tooltip-dot" style={{ background: '#ef4444' }}></span>
                            <span>High: {payload.find(p => p.dataKey === 'high')?.value || 0}</span>
                        </div>
                        <div className="tooltip-row">
                            <span className="tooltip-dot" style={{ background: '#f59e0b' }}></span>
                            <span>Medium: {payload.find(p => p.dataKey === 'medium')?.value || 0}</span>
                        </div>
                        <div className="tooltip-row">
                            <span className="tooltip-dot" style={{ background: '#10b981' }}></span>
                            <span>Low: {payload.find(p => p.dataKey === 'low')?.value || 0}</span>
                        </div>
                        <div className="tooltip-total">Total: {total}</div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass-panel incident-timeline-panel">
            <div className="panel-header">
                <div className="panel-title">
                    <TrendingUp size={18} />
                    <span>Incident Timeline</span>
                </div>
                <div className="timeframe-selector">
                    {TIMEFRAME_OPTIONS.map(option => (
                        <button
                            key={option.value}
                            className={`timeframe-btn ${timeframe === option.value ? 'active' : ''}`}
                            onClick={() => setTimeframe(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="label"
                            stroke="rgba(255,255,255,0.5)"
                            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                            tickLine={false}
                        />
                        <YAxis
                            stroke="rgba(255,255,255,0.5)"
                            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                            tickLine={false}
                            allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ paddingTop: '10px' }}
                            iconType="circle"
                            formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>{value.charAt(0).toUpperCase() + value.slice(1)}</span>}
                        />
                        <Area
                            type="monotone"
                            dataKey="high"
                            stackId="1"
                            stroke="#ef4444"
                            fill="url(#colorHigh)"
                            strokeWidth={2}
                            name="high"
                        />
                        <Area
                            type="monotone"
                            dataKey="medium"
                            stackId="1"
                            stroke="#f59e0b"
                            fill="url(#colorMedium)"
                            strokeWidth={2}
                            name="medium"
                        />
                        <Area
                            type="monotone"
                            dataKey="low"
                            stackId="1"
                            stroke="#10b981"
                            fill="url(#colorLow)"
                            strokeWidth={2}
                            name="low"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
