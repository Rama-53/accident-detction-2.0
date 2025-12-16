// src/components/AlertsList.jsx
import { Bell } from 'lucide-react';
import { BACKEND_URL } from '../config';
import './AlertsList.css';

export function AlertsList({ events, setActiveEvent, clearAllAlerts }) {
    return (
        <div className="glass-panel alerts-panel">
            <div className="panel-header">
                <div className="panel-title">
                    <Bell size={18} />
                    <span>Recent Alerts</span>
                    {events.length > 0 && (
                        <span className="alert-count">{events.length}</span>
                    )}
                </div>
                <button
                    className="btn-clear"
                    onClick={() => {
                        if (confirm('Clear all alerts?')) {
                            clearAllAlerts();
                        }
                    }}
                >
                    Clear
                </button>
            </div>

            <div className="event-list">
                {events.length === 0 && (
                    <div className="no-alerts">
                        <Bell size={32} />
                        <span>No recent alerts</span>
                    </div>
                )}
                {events.map(e => (
                    <div key={e.id} className="event-card" onClick={() => setActiveEvent(e)}>
                        {e.snapshot_id && (
                            <img
                                src={`${BACKEND_URL}/snapshot/${e.snapshot_id}`}
                                className="event-thumb"
                                alt="thumb"
                                onError={ev => ev.target.style.display = 'none'}
                            />
                        )}
                        <div className="event-details">
                            <div className="event-type">{e.type || 'Accident'}</div>
                            <div className="event-time">{new Date(e.time * 1000).toLocaleString()}</div>
                            <div className="event-meta">
                                <span className="severity-badge">{e.severity}</span>
                                <span className="camera-id">{e.camera_name || e.camera_id}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
