// src/components/ToastNotification.jsx
import { useEffect } from 'react';
import './ToastNotification.css';

export function ToastNotification({ toast, onDismiss, onClick }) {
    const { id, event, timestamp } = toast;

    // Auto-dismiss after 5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(id);
        }, 5000);

        return () => clearTimeout(timer);
    }, [id, onDismiss]);

    const handleClick = () => {
        if (onClick) {
            onClick(event);
        }
        onDismiss(id);
    };

    const formatTime = (ts) => {
        const date = new Date(ts);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getSeverityLabel = (severity) => {
        if (!severity || severity === 'unknown') return 'ALERT';
        return severity.toUpperCase();
    };

    const getSeverityClass = (severity) => {
        if (!severity || severity === 'unknown') return 'severity-medium';
        const severityLower = severity.toLowerCase();
        if (severityLower === 'high' || severityLower === 'critical') return 'severity-high';
        if (severityLower === 'medium') return 'severity-medium';
        return 'severity-low';
    };

    return (
        <div
            className={`toast-notification ${getSeverityClass(event.severity)}`}
            onClick={handleClick}
        >
            <div className="toast-header">
                <div className="toast-severity">
                    <span className="severity-badge">{getSeverityLabel(event.severity)}</span>
                    <span className="toast-time">{formatTime(timestamp)}</span>
                </div>
                <button
                    className="toast-close"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(id);
                    }}
                    aria-label="Dismiss notification"
                >
                    ✕
                </button>
            </div>

            <div className="toast-body">
                <div className="toast-title">
                    🚨 Accident Detected
                </div>
                <div className="toast-details">
                    <div className="toast-detail-row">
                        <span className="detail-label">Camera:</span>
                        <span className="detail-value">{event.camera_name || event.camera_id || 'Unknown'}</span>
                    </div>
                    {event.location && (
                        <div className="toast-detail-row">
                            <span className="detail-label">Location:</span>
                            <span className="detail-value">{event.location}</span>
                        </div>
                    )}
                    {event.confidence !== undefined && (
                        <div className="toast-detail-row">
                            <span className="detail-label">Confidence:</span>
                            <span className="detail-value confidence">{(event.confidence * 100).toFixed(1)}%</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="toast-footer">
                <span className="toast-action-hint">Click to view details</span>
            </div>
        </div>
    );
}
