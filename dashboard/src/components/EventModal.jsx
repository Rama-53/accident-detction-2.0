import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Maximize2, ChevronLeft, ChevronRight, Shield, MapPin, Video, Calendar, Clock } from 'lucide-react';
import './EventModal.css';

export function EventModal({ event, onClose }) {
    const [activeSlide, setActiveSlide] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    // Combine main snapshot and crops into a gallery
    const galleryItems = [
        { type: 'main', url: `http://localhost:8000/snapshot/${event.id}?crop_idx=0` },
        ...(event.snapshots || [])
            .filter(snap => snap.idx > 0) // Skip index 0 as it's the main image
            .map(snap => ({
                type: 'crop',
                url: `http://localhost:8000/snapshot/${event.id}?crop_idx=${snap.idx}`,
                label: snap.label
            }))
    ];

    const currentItem = galleryItems[activeSlide];

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (isLightboxOpen) setIsLightboxOpen(false);
                else onClose();
            }
            if (e.key === 'ArrowLeft') {
                setActiveSlide(prev => prev === 0 ? galleryItems.length - 1 : prev - 1);
            }
            if (e.key === 'ArrowRight') {
                setActiveSlide(prev => prev === galleryItems.length - 1 ? 0 : prev + 1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isLightboxOpen, galleryItems.length]);

    const nextSlide = (e) => {
        e.stopPropagation();
        setActiveSlide(prev => (prev === galleryItems.length - 1 ? 0 : prev + 1));
    };

    const prevSlide = (e) => {
        e.stopPropagation();
        setActiveSlide(prev => (prev === 0 ? galleryItems.length - 1 : prev - 1));
    };

    if (!event) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content-split" onClick={e => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>
                    <X size={20} />
                </button>

                {/* LEFT PANEL: MEDIA & MAP */}
                <div className="modal-left-panel">
                    <div className="carousel-wrapper">
                        {galleryItems.length > 0 ? (
                            <div className="carousel-container" onClick={() => setIsLightboxOpen(true)}>
                                <div className="image-stage">
                                    <img
                                        src={currentItem.url}
                                        alt="Event Evidence"
                                        className="carousel-image"
                                    />
                                </div>

                                <div className="carousel-overlay">
                                    <span className="carousel-label">
                                        {currentItem.type === 'main' ? 'MAIN SCENE' : `DETECTED: ${currentItem.label}`}
                                    </span>
                                    <span className="carousel-counter">
                                        {activeSlide + 1} / {galleryItems.length}
                                    </span>
                                </div>

                                {/* Navigation */}
                                {galleryItems.length > 1 && (
                                    <>
                                        <button className="carousel-nav prev" onClick={prevSlide}>
                                            <ChevronLeft size={24} />
                                        </button>
                                        <button className="carousel-nav next" onClick={nextSlide}>
                                            <ChevronRight size={24} />
                                        </button>
                                        <div className="carousel-indicators">
                                            {galleryItems.map((_, idx) => (
                                                <button
                                                    key={idx}
                                                    className={`indicator-dot ${idx === activeSlide ? 'active' : ''}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveSlide(idx);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}

                                <button className="carousel-expand-btn" onClick={(e) => {
                                    e.stopPropagation();
                                    setIsLightboxOpen(true);
                                }}>
                                    <Maximize2 size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="modal-no-media">No images available</div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL: DETAILS */}
                <div className="modal-right-panel">
                    <div className="details-header">
                        <div className="header-meta">
                            <span className={`severity-badge-lg ${event.severity || 'high'}`}>
                                {event.severity || 'HIGH'}
                            </span>
                            <span className="event-id">#{event.id?.slice(-6)}</span>
                        </div>
                        <h2 className="event-title">{event.title || event.type?.replace(/_/g, ' ') || 'Alert Details'}</h2>
                    </div>

                    <div className="details-scroll-content">
                        {/* Primary Info Grid */}
                        <div className="info-grid">
                            <div className="info-item">
                                <div className="info-icon"><Video size={16} /></div>
                                <div className="info-content">
                                    <label>Camera Source</label>
                                    <span>{event.camera_name || event.camera_id?.replace(/_/g, ' ') || 'Unknown'}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <div className="info-icon"><MapPin size={16} /></div>
                                <div className="info-content">
                                    <label>Location</label>
                                    <span>{event.location || 'Unknown Location'}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <div className="info-icon"><Calendar size={16} /></div>
                                <div className="info-content">
                                    <label>Date</label>
                                    <span>{new Date(event.time * 1000).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <div className="info-icon"><Clock size={16} /></div>
                                <div className="info-content">
                                    <label>Time</label>
                                    <span>{new Date(event.time * 1000).toLocaleTimeString()}</span>
                                </div>
                            </div>
                            <div className="info-item">
                                <div className="info-icon"><Shield size={16} /></div>
                                <div className="info-content">
                                    <label>Sector ID</label>
                                    <span className={event.sector_id ? 'highlight-text' : ''}>
                                        {event.sector_id || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {event.description && (
                            <div className="description-section">
                                <h3>Description</h3>
                                <p>{event.description}</p>
                            </div>
                        )}

                        {/* Map Section */}
                        {(event.location_lat || event.location) && (
                            <div className="mini-map-section">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    style={{ border: 0 }}
                                    src={`https://www.google.com/maps?q=${event.location_lat ? `${event.location_lat},${event.location_lng}` : encodeURIComponent(event.location)}&z=15&output=embed`}
                                    allowFullScreen
                                    title="Event Location"
                                ></iframe>
                            </div>
                        )}

                        {/* Actions */}
                        {event.video_url && (
                            <a
                                href={event.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="action-btn primary full-width"
                            >
                                <ExternalLink size={16} />
                                Access Recording
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Lightbox Overlay */}
            {isLightboxOpen && galleryItems[activeSlide] && (
                <div className="lightbox-overlay" onClick={() => setIsLightboxOpen(false)}>
                    <button className="lightbox-close-btn" onClick={() => setIsLightboxOpen(false)}>
                        <X size={32} />
                    </button>
                    <div className="lightbox-content" onClick={e => e.stopPropagation()}>
                        <img
                            src={galleryItems[activeSlide].url}
                            alt="Full View"
                        />
                        <div className="lightbox-caption">
                            {galleryItems[activeSlide].type === 'main' ? 'Full Frame Scene' : `Detected Object: ${galleryItems[activeSlide].label}`}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
