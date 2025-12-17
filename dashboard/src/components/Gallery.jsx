// src/components/Gallery.jsx
import { Images } from 'lucide-react';
import { BACKEND_URL } from '../config';
import PremiumInput from './PremiumInput';
import './Gallery.css';

export function Gallery({
    events,
    cameras,
    selectedCamera,
    setSelectedCamera,
    filterStartTime,
    setFilterStartTime,
    filterEndTime,
    setFilterEndTime,
}) {
    const filteredEvents = events.filter(e => e.snapshot_id);

    return (
        <div className="glass-panel gallery-panel animate-slide-up">
            <div className="panel-header">
                <div className="panel-title">
                    <Images size={18} />
                    <span>Snapshot Gallery</span>
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

            <div className="gallery-grid">
                {filteredEvents.map(e => (
                    <div
                        key={e.id}
                        className="gallery-item"
                        onClick={() => window.open(`${BACKEND_URL}/snapshot/${e.snapshot_id}`, '_blank')}
                    >
                        <img
                            src={`${BACKEND_URL}/snapshot/${e.snapshot_id}`}
                            alt="snapshot"
                            loading="lazy"
                        />
                        <div className="item-overlay">
                            <span className="item-camera">{e.camera_name || e.camera_id}</span>
                            <span className="item-time">{new Date(e.time * 1000).toLocaleTimeString()}</span>
                        </div>
                    </div>
                ))}
                {filteredEvents.length === 0 && (
                    <div className="empty-state">No snapshots found matching filters.</div>
                )}
            </div>
        </div>
    );
}
