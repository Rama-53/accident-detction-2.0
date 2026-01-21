// src/components/ImageLightbox.jsx
import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, MapPin, Camera as CameraIcon, Clock } from 'lucide-react';
import { BACKEND_URL } from '../config';
import './ImageLightbox.css';

export function ImageLightbox({ event, onClose, events, onNavigate }) {
    const [zoom, setZoom] = useState(1);
    const currentIndex = events.findIndex(e => e.id === event.id);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft' && currentIndex > 0) handlePrevious();
            if (e.key === 'ArrowRight' && currentIndex < events.length - 1) handleNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, events.length]);

    const handlePrevious = () => {
        if (currentIndex > 0) {
            onNavigate(events[currentIndex - 1]);
            setZoom(1);
        }
    };

    const handleNext = () => {
        if (currentIndex < events.length - 1) {
            onNavigate(events[currentIndex + 1]);
            setZoom(1);
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = `${BACKEND_URL}/snapshot/${event.snapshot_id}`;
        link.download = `accident_${event.id}_${event.time}.jpg`;
        link.click();
    };

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

    const dateObj = new Date(event.time * 1000);
    const dateStr = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="lightbox-overlay" onClick={onClose}>
            <div className="lightbox-container" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="lightbox-header">
                    <div className="lightbox-title">
                        <span className={`severity-badge severity-${(event.severity || 'medium').toLowerCase()}`}>
                            {event.severity || 'Medium'}
                        </span>
                        <span className="image-counter">
                            {currentIndex + 1} / {events.length}
                        </span>
                    </div>
                    <div className="lightbox-controls">
                        <button onClick={handleZoomOut} className="control-btn" title="Zoom Out">
                            <ZoomOut size={18} />
                        </button>
                        <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                        <button onClick={handleZoomIn} className="control-btn" title="Zoom In">
                            <ZoomIn size={18} />
                        </button>
                        <button onClick={handleDownload} className="control-btn" title="Download">
                            <Download size={18} />
                        </button>
                        <button onClick={onClose} className="control-btn close-btn" title="Close">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Image Container */}
                <div className="lightbox-content">
                    {/* Navigation */}
                    {currentIndex > 0 && (
                        <button className="nav-btn nav-prev" onClick={handlePrevious}>
                            <ChevronLeft size={32} />
                        </button>
                    )}

                    <div className="image-wrapper">
                        <img
                            src={`${BACKEND_URL}/snapshot/${event.snapshot_id}`}
                            alt="Accident snapshot"
                            style={{ transform: `scale(${zoom})` }}
                            className="lightbox-image"
                        />
                    </div>

                    {currentIndex < events.length - 1 && (
                        <button className="nav-btn nav-next" onClick={handleNext}>
                            <ChevronRight size={32} />
                        </button>
                    )}
                </div>

                {/* Metadata Sidebar */}
                <div className="lightbox-sidebar">
                    <div className="sidebar-section">
                        <h3>Event Details</h3>
                        <div className="metadata-grid">
                            <div className="metadata-item">
                                <CameraIcon size={16} />
                                <div>
                                    <div className="metadata-label">Camera</div>
                                    <div className="metadata-value">{event.camera_name || event.camera_id}</div>
                                </div>
                            </div>
                            <div className="metadata-item">
                                <MapPin size={16} />
                                <div>
                                    <div className="metadata-label">Location</div>
                                    <div className="metadata-value">{event.location || 'Unknown'}</div>
                                </div>
                            </div>
                            <div className="metadata-item">
                                <Clock size={16} />
                                <div>
                                    <div className="metadata-label">Date & Time</div>
                                    <div className="metadata-value">{dateStr}</div>
                                    <div className="metadata-value-sub">{timeStr}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {event.confidence && (
                        <div className="sidebar-section">
                            <h3>AI Analysis</h3>
                            <div className="confidence-bar">
                                <div className="confidence-label">
                                    <span>Confidence</span>
                                    <span>{Math.round(event.confidence * 100)}%</span>
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${event.confidence * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {event.vehicles_count && (
                        <div className="sidebar-section">
                            <h3>Detection Info</h3>
                            <div className="info-stats">
                                <div className="info-stat">
                                    <span className="info-label">Vehicles</span>
                                    <span className="info-value">{event.vehicles_count}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
