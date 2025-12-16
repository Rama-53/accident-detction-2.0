// src/components/EventModal.jsx
import { X, MapPin, Calendar, Clock, Camera } from 'lucide-react';
import { BACKEND_URL } from '../config';
import './EventModal.css';

export function EventModal({ event, onClose }) {
    if (!event) return null;

    const dateObj = new Date(event.time * 1000);

    return (
        <div className="modal-overlay animate-fade-in" onClick={onClose}>
            <div className="modal-content glass-panel animate-scale-in" onClick={e => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="modal-header">
                    <div className={`severity-badge-lg ${event.severity?.toLowerCase() || 'high'}`}>
                        {event.severity || 'HIGH SEVERITY'}
                    </div>
                    <h2>{event.type || 'Accident Detected'}</h2>
                </div>

                <div className="modal-body">
                    <div className="modal-media">
                        {event.snapshot_id ? (
                            <img
                                src={`${BACKEND_URL}/snapshot/${event.snapshot_id}`}
                                alt="Event Snapshot"
                                className="modal-snapshot"
                            />
                        ) : (
                            <div className="modal-no-media">
                                <span>No Snapshot Available</span>
                            </div>
                        )}

                        {event.video_clip_url && (
                            <div className="modal-video-link">
                                <a href={event.video_clip_url} target="_blank" rel="noreferrer">
                                    View Video Clip
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="modal-details">
                        <div className="detail-row">
                            <div className="detail-icon"><Camera size={16} /></div>
                            <div className="detail-info">
                                <label>Camera Source</label>
                                <span>{event.camera_name || event.camera_id}</span>
                            </div>
                        </div>

                        <div className="detail-row">
                            <div className="detail-icon"><MapPin size={16} /></div>
                            <div className="detail-info">
                                <label>Location</label>
                                <span>{event.location || 'Unknown Location'}</span>
                            </div>
                        </div>

                        <div className="detail-row">
                            <div className="detail-icon"><Calendar size={16} /></div>
                            <div className="detail-info">
                                <label>Date</label>
                                <span>{dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                        </div>

                        <div className="detail-row">
                            <div className="detail-icon"><Clock size={16} /></div>
                            <div className="detail-info">
                                <label>Time</label>
                                <span>{dateObj.toLocaleTimeString()}</span>
                            </div>
                        </div>

                        {event.description && (
                            <div className="detail-description">
                                <label>Description</label>
                                <p>{event.description}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Map Embed if location available */}
                {(event.lat || event.location) && (
                    <div className="modal-map">
                        <iframe
                            width="100%"
                            height="200"
                            frameBorder="0"
                            style={{ border: 0, borderRadius: 12, opacity: 0.8 }}
                            src={`https://www.google.com/maps?q=${event.lat ? `${event.lat},${event.lng}` : encodeURIComponent(event.location)}&z=15&output=embed`}
                            allowFullScreen
                        ></iframe>
                    </div>
                )}

            </div>
        </div>
    );
}
