// src/components/Gallery.jsx
import { useState } from 'react';
import { Images, Grid3x3, Grid2x2, LayoutGrid } from 'lucide-react';
import { BACKEND_URL } from '../config';
import PremiumInput from './PremiumInput';
import { ImageLightbox } from './ImageLightbox';
import { useSystem } from '../context/SystemContext';
import './Gallery.css';

const GRID_SIZES = [
    { value: 'small', label: 'Small', icon: Grid3x3 },
    { value: 'medium', label: 'Medium', icon: Grid2x2 },
    { value: 'large', label: 'Large', icon: LayoutGrid },
];

export function Gallery() {
    const {
        events,
        cameras,
        selectedCamera,
        setSelectedCamera,
        filterStartTime,
        setFilterStartTime,
        filterEndTime,
        setFilterEndTime,
    } = useSystem();

    const [lightboxEvent, setLightboxEvent] = useState(null);
    const [gridSize, setGridSize] = useState('medium');

    const filteredEvents = events.filter(e => e.snapshot_id);

    return (
        <>
            <div className="glass-panel gallery-panel animate-slide-up">
                <div className="panel-header">
                    <div className="panel-title">
                        <Images size={18} />
                        <span>Snapshot Gallery</span>
                        <span className="event-count">{filteredEvents.length} images</span>
                    </div>

                    <div className="filters-bar">
                        <div className="grid-size-selector">
                            {GRID_SIZES.map(size => {
                                const Icon = size.icon;
                                return (
                                    <button
                                        key={size.value}
                                        className={`grid-size-btn ${gridSize === size.value ? 'active' : ''}`}
                                        onClick={() => setGridSize(size.value)}
                                        title={size.label}
                                    >
                                        <Icon size={16} />
                                    </button>
                                );
                            })}
                        </div>

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

                <div className={`gallery-grid grid-${gridSize}`}>
                    {filteredEvents.map((e, index) => (
                        <div
                            key={e.id}
                            className="gallery-item"
                            onClick={() => setLightboxEvent(e)}
                            style={{ animationDelay: `${Math.min(index, 20) * 0.02}s` }}
                        >
                            <img
                                src={`${BACKEND_URL}/snapshot/${e.snapshot_id}`}
                                alt="snapshot"
                                loading="lazy"
                                onError={ev => ev.target.classList.add('error')}
                            />
                            <div className="item-overlay">
                                <div className="overlay-top">
                                    <span className={`severity-pill severity-${(e.severity || 'medium').toLowerCase()}`}>
                                        {e.severity || 'Medium'}
                                    </span>
                                </div>
                                <div className="overlay-bottom">
                                    <span className="item-camera">{e.camera_name || e.camera_id}</span>
                                    <span className="item-time">
                                        {new Date(e.time * 1000).toLocaleString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredEvents.length === 0 && (
                        <div className="empty-state">
                            <Images size={48} opacity={0.3} />
                            <p>No snapshots found matching filters.</p>
                        </div>
                    )}
                </div>
            </div>

            {lightboxEvent && (
                <ImageLightbox
                    event={lightboxEvent}
                    events={filteredEvents}
                    onClose={() => setLightboxEvent(null)}
                    onNavigate={setLightboxEvent}
                />
            )}
        </>
    );
}
