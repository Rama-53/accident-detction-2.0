import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Maximize2, ChevronLeft, ChevronRight, Shield, MapPin, Video, Calendar, Clock, Activity, Cpu, Target, Copy, Check, AlertTriangle, Zap, Database, Radio } from 'lucide-react';
import { BACKEND_URL } from '../config';
import './EventModal.css';

export function EventModal({ event, onClose }) {
    const [activeSlide, setActiveSlide] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [copiedId, setCopiedId] = useState(false);

    // Combine main snapshot and crops into a gallery
    const galleryItems = [
        { type: 'main', url: `${BACKEND_URL}/snapshot/${event.id}?crop_idx=0` },
        ...(event.snapshots || [])
            .filter(snap => snap.idx > 0) // Skip index 0 as it's the main image
            .map(snap => ({
                type: 'crop',
                url: `${BACKEND_URL}/snapshot/${event.id}?crop_idx=${snap.idx}`,
                label: snap.label
            }))
    ];

    const currentItem = galleryItems[activeSlide];

    // Calculate confidence from available data
    const confidence = event.confidence || event.classification?.confidence ||
        (event.snapshots?.[0]?.confidence) || 0.85; // Default fallback
    const confidencePercent = Math.round(confidence * 100);

    // Format timestamps
    const eventDate = new Date(event.time * 1000);
    const isoTimestamp = eventDate.toISOString();
    const unixTimestamp = event.time;
    const relativeTime = getRelativeTime(eventDate);

    function getRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    }

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(true);
            setTimeout(() => setCopiedId(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

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

    // Severity color mapping
    const severityConfig = {
        high: { color: '#ff3366', bg: 'rgba(255, 51, 102, 0.15)', label: 'CRITICAL' },
        critical: { color: '#ff3366', bg: 'rgba(255, 51, 102, 0.15)', label: 'CRITICAL' },
        medium: { color: '#ff9f0a', bg: 'rgba(255, 159, 10, 0.15)', label: 'MEDIUM' },
        low: { color: '#30d158', bg: 'rgba(48, 209, 88, 0.15)', label: 'LOW' }
    };
    const sevConfig = severityConfig[event.severity] || severityConfig.medium;

    if (!event) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content-split modal-technical" onClick={e => e.stopPropagation()}>
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

                {/* RIGHT PANEL: TECHNICAL DETAILS */}
                <div className="modal-right-panel">
                    {/* Technical Header */}
                    <div className="details-header technical-header">
                        <div className="header-status-row">
                            <div className="status-indicator-group">
                                <span className="status-dot active"></span>
                                <span className="status-label">PROCESSED</span>
                            </div>
                            <span
                                className="event-id-hex"
                                onClick={() => copyToClipboard(event.id)}
                                title="Click to copy"
                            >
                                <span className="hex-prefix">0x</span>
                                {event.id?.slice(-8).toUpperCase()}
                                {copiedId ? <Check size={12} /> : <Copy size={12} />}
                            </span>
                        </div>

                        <div className="header-main">
                            <div className={`severity-badge-tech ${event.severity || 'high'}`}>
                                <AlertTriangle size={14} />
                                {sevConfig.label}
                            </div>
                            <h2 className="event-title-tech">
                                {event.title || event.type?.replace(/_/g, ' ').toUpperCase() || 'INCIDENT DETECTED'}
                            </h2>
                        </div>

                        {/* Confidence Meter */}
                        <div className="confidence-section">
                            <div className="confidence-header">
                                <div className="confidence-label">
                                    <Cpu size={14} />
                                    <span>AI CONFIDENCE</span>
                                </div>
                                <span className="confidence-value">{confidencePercent}%</span>
                            </div>
                            <div className="confidence-meter">
                                <div
                                    className="confidence-fill"
                                    style={{
                                        width: `${confidencePercent}%`,
                                        background: confidencePercent >= 80 ? '#30d158' :
                                            confidencePercent >= 50 ? '#ff9f0a' : '#ff3366'
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="details-scroll-content">
                        {/* Detection Metrics Grid */}
                        <div className="tech-section">
                            <div className="section-header">
                                <Activity size={14} />
                                <span>DETECTION METRICS</span>
                            </div>
                            <div className="metrics-grid">
                                <div className="metric-card">
                                    <div className="metric-icon"><Target size={16} /></div>
                                    <div className="metric-data">
                                        <span className="metric-label">Model Type</span>
                                        <span className="metric-value mono">HYBRID_CNN</span>
                                    </div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-icon"><Zap size={16} /></div>
                                    <div className="metric-data">
                                        <span className="metric-label">Severity Score</span>
                                        <span className="metric-value mono" style={{ color: sevConfig.color }}>
                                            {event.severity?.toUpperCase() || 'HIGH'}
                                        </span>
                                    </div>
                                </div>
                                {event.iou && (
                                    <div className="metric-card">
                                        <div className="metric-icon"><Database size={16} /></div>
                                        <div className="metric-data">
                                            <span className="metric-label">IOU Score</span>
                                            <span className="metric-value mono">{(event.iou * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                )}
                                <div className="metric-card">
                                    <div className="metric-icon"><Radio size={16} /></div>
                                    <div className="metric-data">
                                        <span className="metric-label">Detections</span>
                                        <span className="metric-value mono">{event.snapshot_count || galleryItems.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Camera Telemetry */}
                        <div className="tech-section">
                            <div className="section-header">
                                <Video size={14} />
                                <span>CAMERA TELEMETRY</span>
                            </div>
                            <div className="telemetry-grid">
                                <div className="telemetry-row">
                                    <span className="telemetry-label">SOURCE</span>
                                    <span className="telemetry-value">{event.camera_name || event.camera_id?.replace(/_/g, ' ') || 'Unknown'}</span>
                                </div>
                                <div className="telemetry-row">
                                    <span className="telemetry-label">CAM_ID</span>
                                    <span className="telemetry-value mono">{event.camera_id || 'N/A'}</span>
                                </div>
                                <div className="telemetry-row">
                                    <span className="telemetry-label">SECTOR</span>
                                    <span className="telemetry-value sector-highlight">{event.sector_id || 'UNASSIGNED'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Temporal Data */}
                        <div className="tech-section">
                            <div className="section-header">
                                <Clock size={14} />
                                <span>TEMPORAL DATA</span>
                            </div>
                            <div className="telemetry-grid">
                                <div className="telemetry-row">
                                    <span className="telemetry-label">RELATIVE</span>
                                    <span className="telemetry-value time-highlight">{relativeTime}</span>
                                </div>
                                <div className="telemetry-row">
                                    <span className="telemetry-label">ISO_8601</span>
                                    <span className="telemetry-value mono text-sm">{isoTimestamp}</span>
                                </div>
                                <div className="telemetry-row">
                                    <span className="telemetry-label">UNIX_TS</span>
                                    <span className="telemetry-value mono">{unixTimestamp}</span>
                                </div>
                                <div className="telemetry-row">
                                    <span className="telemetry-label">LOCAL</span>
                                    <span className="telemetry-value">{eventDate.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Spatial Data */}
                        <div className="tech-section">
                            <div className="section-header">
                                <MapPin size={14} />
                                <span>SPATIAL DATA</span>
                            </div>
                            <div className="telemetry-grid">
                                <div className="telemetry-row">
                                    <span className="telemetry-label">LOCATION</span>
                                    <span className="telemetry-value">{event.location || 'Unknown Location'}</span>
                                </div>
                                {(event.location_lat && event.location_lng) && (
                                    <div className="telemetry-row">
                                        <span className="telemetry-label">COORDS</span>
                                        <span className="telemetry-value mono">
                                            {event.location_lat?.toFixed(6)}, {event.location_lng?.toFixed(6)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

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

                        {/* Video Recording */}
                        {event.video_filename && event.video_status === 'ready' && (
                            <div className="video-section">
                                <div className="section-header">
                                    <Video size={14} />
                                    <span>RECORDED FOOTAGE</span>
                                </div>
                                <video
                                    controls
                                    style={{
                                        width: '100%',
                                        borderRadius: '8px',
                                        marginTop: '10px',
                                        background: '#000'
                                    }}
                                >
                                    <source
                                        src={`${BACKEND_URL}/video/${event.video_filename}`}
                                        type="video/mp4"
                                    />
                                    Your browser does not support video playback.
                                </video>
                                <a
                                    href={`${BACKEND_URL}/video/${event.video_filename}`}
                                    download={event.video_filename}
                                    className="action-btn primary full-width"
                                    style={{ marginTop: '10px' }}
                                >
                                    <ExternalLink size={16} />
                                    Download Video
                                </a>
                            </div>
                        )}
                        {event.video_status === 'recording' && (
                            <div className="info-message recording">
                                <div className="recording-dot"></div>
                                <span>VIDEO CAPTURE IN PROGRESS</span>
                            </div>
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
