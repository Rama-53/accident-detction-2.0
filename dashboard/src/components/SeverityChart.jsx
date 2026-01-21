// src/components/SeverityChart.jsx
import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { useSystem } from '../context/SystemContext';
import './SeverityChart.css';

const SEVERITY_COLORS = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981',
};

const SEVERITY_LABELS = {
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority',
};

export function SeverityChart() {
    const { events } = useSystem();

    const chartData = useMemo(() => {
        const counts = { high: 0, medium: 0, low: 0 };

        events.forEach(event => {
            const severity = (event.severity || 'medium').toLowerCase();
            if (counts.hasOwnProperty(severity)) {
                counts[severity]++;
            }
        });

        return Object.entries(counts)
            .map(([name, value]) => ({
                name: SEVERITY_LABELS[name],
                value,
                severity: name,
                color: SEVERITY_COLORS[name]
            }))
            .filter(item => item.value > 0);
    }, [events]);

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
            return (
                <div className="severity-tooltip">
                    <div className="tooltip-header" style={{ color: data.color }}>
                        {data.name}
                    </div>
                    <div className="tooltip-stats">
                        <div className="tooltip-count">{data.value} incidents</div>
                        <div className="tooltip-percentage">{percentage}%</div>
                    </div>
                </div>
            );
        }
        return null;
    };

    const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        if (percent < 0.05) return null; // Don't show label for very small segments

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                className="chart-label"
                style={{ fontSize: '14px', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="glass-panel severity-chart-panel">
            <div className="panel-header">
                <div className="panel-title">
                    <PieChartIcon size={18} />
                    <span>Severity Distribution</span>
                </div>
                <div className="total-badge">
                    {total} Total
                </div>
            </div>

            <div className="chart-container">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={CustomLabel}
                                outerRadius={100}
                                innerRadius={60}
                                fill="#8884d8"
                                dataKey="value"
                                animationBegin={0}
                                animationDuration={800}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        stroke="rgba(0,0,0,0.5)"
                                        strokeWidth={2}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                formatter={(value, entry) => (
                                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                                        {value} ({entry.payload.value})
                                    </span>
                                )}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="empty-chart">
                        <PieChartIcon size={48} opacity={0.3} />
                        <p>No incident data available</p>
                    </div>
                )}
            </div>

            <div className="severity-stats">
                {chartData.map(item => {
                    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                    return (
                        <div key={item.severity} className="stat-row">
                            <div className="stat-indicator" style={{ background: item.color }}></div>
                            <div className="stat-info">
                                <span className="stat-label">{item.name}</span>
                                <span className="stat-value">{item.value}</span>
                            </div>
                            <div className="stat-bar-container">
                                <div
                                    className="stat-bar"
                                    style={{
                                        width: `${percentage}%`,
                                        background: item.color
                                    }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
