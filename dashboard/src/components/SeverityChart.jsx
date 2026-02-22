import { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { useSystem } from '../context/SystemContext';
import './SeverityChart.css';

export function SeverityChart() {
  const { events } = useSystem();

  const data = useMemo(() => {
    if (!events || events.length === 0) return [];

    const counts = { high: 0, medium: 0, low: 0 };

    events.forEach(e => {
      const severity = (e.severity || 'medium').toLowerCase();
      if (counts[severity] !== undefined) {
        counts[severity]++;
      }
    });

    const activeData = [
      { name: 'High', value: counts.high, color: '#ef4444' },
      { name: 'Medium', value: counts.medium, color: '#f59e0b' },
      { name: 'Low', value: counts.low, color: '#10b981' }
    ].filter(item => item.value > 0);

    return activeData;
  }, [events]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      return (
        <div className="tooltip-custom" style={{
          background: 'rgba(0, 0, 0, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(4px)',
          padding: '8px 12px',
          borderRadius: '6px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}>
          <div style={{ color: entry.payload.color, fontWeight: 600, fontSize: '14px' }}>
            {entry.name}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px' }}>
            {entry.value} incidents
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel severity-chart-panel">
      <div className="panel-header">
        <div className="panel-title">
          <AlertTriangle size={18} />
          <span>Severity Distribution</span>
        </div>
      </div>

      <div className="chart-container" style={{ width: '100%', height: 'calc(100% - 40px)', minHeight: '200px', position: 'relative' }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="no-data-placemat" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'rgba(255,255,255,0.3)',
            gap: '10px'
          }}>
            <AlertTriangle size={32} strokeWidth={1.5} />
            <span style={{ fontSize: '14px' }}>No active incidents</span>
          </div>
        )}
      </div>
    </div>
  );
}
