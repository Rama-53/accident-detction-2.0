// src/components/AlertsPage.jsx
import { AlertTriangle, MapPin } from 'lucide-react';
import { BACKEND_URL } from '../config';
import PremiumInput from './PremiumInput';
import { useSystem } from '../context/SystemContext';
import './AlertsPage.css';

export function AlertsPage() {
    const {
        events,
        cameras,
        selectedCamera,
        setSelectedCamera,
        filterStartTime,
        setFilterStartTime,
        filterEndTime,
        setFilterEndTime,
        setActiveEvent
    } = useSystem();

    return (
        <div className="glass-panel alerts-page-panel animate-slide-up">
            <div className="panel-header">
                <div className="panel-title">
                    <AlertTriangle size={18} />
                    <span>Alert History</span>
                </div>

                <div className="filters-bar">
                    <select
                        value={selectedCamera || 'all'}
                        onChange={e => setSelectedCamera(e.target.value)}
                        className="glass-input filter-select"
                    >
                        <option value="all">All Cameras</option>
                        {cameras.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div style={{ width: '200px' }}>
                        <PremiumInput
                            type="datetime-local"
                            value={filterStartTime}
                            onChange={e => setFilterStartTime(e.target.value)}
                            style={{ height: '40px' }}
                        />
                    </div>
                    <div style={{ width: '200px' }}>
                        <PremiumInput
                            type="datetime-local"
                            value={filterEndTime}
                            onChange={e => setFilterEndTime(e.target.value)}
                            style={{ height: '40px' }}
                        />
                    </div>
                    <button
                        className="btn-secondary btn-reset"
                        onClick={() => {
                            setFilterStartTime('');
                            setFilterEndTime('');
                            setSelectedCamera('all');
                        }}
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div className="full-event-list">
                {events.map(e => {
                    const dateObj = new Date(e.time * 1000);
                    const dateStr = dateObj.toLocaleDateString();
                    const timeStr = dateObj.toLocaleTimeString();

                    return (
                        <div key={e.id} className="full-event-card" onClick={() => setActiveEvent(e)}>
                            <div className="card-thumb-wrapper">
                                {e.snapshot_id ? (
                                    <img
                                        src={`${BACKEND_URL}/snapshot/${e.snapshot_id}`}
                                        className="card-thumb"
                                        alt="snapshot"
                                        onError={ev => ev.target.style.display = 'none'}
                                    />
                                ) : (
                                    <div className="no-thumb">No Image</div>
                                )}
                            </div>

                            <div className="card-details">
                                <div className="card-header">
                                    <span className="card-camera">{e.camera_name || e.camera_id}</span>
                                    <span className="severity-badge">{e.severity}</span>
                                </div>
                                <div className="card-location">
                                    <MapPin size={12} />
                                    {e.location || 'Unknown'}
                                </div>
                            </div>

                            <div className="card-time">
                                <div className="time-main">{timeStr}</div>
                                <div className="date-sub">{dateStr}</div>
                            </div>
                        </div>
                    );
                })}
                {events.length === 0 && (
                    <div className="empty-state">No alerts found matching filters.</div>
                )}
            </div>
        </div>
    );
}
