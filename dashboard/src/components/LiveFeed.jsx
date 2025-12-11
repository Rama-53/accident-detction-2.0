import React from 'react';
import { motion } from 'framer-motion';
import { Video, Activity, Monitor, Settings2 } from 'lucide-react';
import { BACKEND_URL } from '../config';

const LiveFeed = ({
    videoSources,
    selectedVideoSource,
    setSelectedVideoSource,
    videoSourceValues,
    setVideoSourceValues,
    cameraMetaValues,
    updateCameraMetaValue,
    saveCameraConfig
}) => {

    const getSourceMeta = (id) => videoSources.find(s => s.id === id);
    const currentVideoSource = getSourceMeta(selectedVideoSource);
    const currentRequiresValue = currentVideoSource?.requires_value;
    const currentValue = (selectedVideoSource && videoSourceValues[selectedVideoSource]) || "";

    const getCameraInfo = (sourceId) => {
        if (!sourceId) return {};
        const meta = getSourceMeta(sourceId) || {};
        const overrides = cameraMetaValues[sourceId] || {};
        return {
            detection_enabled: overrides.detection_enabled !== undefined
                ? overrides.detection_enabled
                : meta.detection_enabled !== undefined ? meta.detection_enabled : false,
        };
    };

    const detectionEnabled = getCameraInfo(selectedVideoSource).detection_enabled;

    const buildFeedUrl = (sourceId) => {
        if (!sourceId) return `${BACKEND_URL}/video_feed`;
        const meta = getSourceMeta(sourceId);
        const params = new URLSearchParams();
        params.set("source_id", sourceId);
        if (meta?.requires_value) {
            const val = (videoSourceValues[sourceId] || "").trim();
            if (val) {
                params.set("source_value", val);
            }
        }
        const query = params.toString();
        return `${BACKEND_URL}/video_feed${query ? `?${query}` : ""}`;
    };

    const hasValueReady = selectedVideoSource && (!currentRequiresValue || currentValue.trim().length > 0);

    return (
        <motion.div
            className="glass-panel"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
                padding: '20px',
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        padding: '6px 12px',
                        borderRadius: '99px',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <motion.div
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}
                        />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fca5a5', letterSpacing: '0.05em' }}>LIVE</span>
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Main Feed</h2>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="custom-select-wrapper">
                        <select
                            value={selectedVideoSource || ""}
                            onChange={(e) => setSelectedVideoSource(e.target.value)}
                            style={{
                                background: 'rgba(2, 6, 23, 0.6)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                outline: 'none',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            {!selectedVideoSource && <option value="">Select Source</option>}
                            {videoSources.map(src => (
                                <option key={src.id} value={src.id}>{src.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div style={{ position: 'relative', flex: 1, borderRadius: '16px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.05)' }}>
                {hasValueReady ? (
                    <img
                        src={buildFeedUrl(selectedVideoSource)}
                        alt="Live Feed"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', flexDirection: 'column', gap: '12px' }}>
                        <Monitor size={48} opacity={0.5} />
                        <p>Select a source to view feed</p>
                    </div>
                )}

                {/* Overlay Controls */}
                <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    right: '16px',
                    padding: '12px',
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={() => {
                                const newState = !detectionEnabled;
                                updateCameraMetaValue(selectedVideoSource, "detection_enabled", newState);
                                saveCameraConfig(selectedVideoSource, { detection_enabled: newState });
                            }}
                            style={{
                                background: detectionEnabled ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                color: detectionEnabled ? '#000' : 'var(--text-primary)',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <Activity size={16} />
                            AI Detection: {detectionEnabled ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {currentRequiresValue && (
                        <input
                            type={currentVideoSource.value_type === "number" ? "number" : "text"}
                            placeholder={currentVideoSource.value_hint || "Enter Input"}
                            value={currentValue}
                            onChange={(e) => setVideoSourceValues(prev => ({ ...prev, [selectedVideoSource]: e.target.value }))}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 10px',
                                color: '#fff',
                                fontSize: '0.85rem',
                                width: '180px'
                            }}
                        />
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default LiveFeed;
