import React from 'react';
import { motion } from 'framer-motion';
import { Grid, Plus, X } from 'lucide-react';
import { BACKEND_URL } from '../config';

const MultiCameraWall = ({
    videoSources,
    multiSourceIds,
    setMultiSourceIds,
    cameraMetaValues,
    updateCameraMetaValue,
    saveCameraConfig,
    onRefreshSources
}) => {
    const MAX_FEEDS = 4;
    const [showInitModal, setShowInitModal] = React.useState(false);
    const [newCamForm, setNewCamForm] = React.useState({ label: '', type: 'webcam', source: '' });
    const [layoutMode, setLayoutMode] = React.useState('free'); // 'free', 'grid', 'focus'

    const handleCreateCamera = async () => {
        if (!newCamForm.label || !newCamForm.source) return;

        // Generate a random ID or derived from label
        const newId = `custom_${Math.random().toString(36).substr(2, 6)}`;

        try {
            const payload = {
                id: newId,
                label: newCamForm.label,
                type: newCamForm.type,
                source: newCamForm.source,
                description: "Created via Dashboard"
            };

            await fetch(`${BACKEND_URL}/video_sources`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Close modal
            setShowInitModal(false);
            setNewCamForm({ label: '', type: 'webcam', source: '' });

            // Refresh sources
            if (onRefreshSources) {
                await onRefreshSources();
            }
            // Auto add to wall (optional)
            setMultiSourceIds(prev => [...prev, newId]);

        } catch (err) {
            console.error("Failed to create camera", err);
            alert("Failed to create camera. Check console.");
        }
    };

    const buildFeedUrl = (sourceId) => {
        // Basic feed URL construction for multi-view
        // We assume multi-view connects to sources already configured mostly, or we pass basic auth
        return `${BACKEND_URL}/video_feed?source_id=${sourceId}`;
    };

    const availableSources = videoSources.filter(s => !multiSourceIds.includes(s.id));

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Multi-Camera Wall</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="glass-panel" style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: '8px' }}>
                        <button onClick={() => setLayoutMode('free')} title="Free" style={{ background: layoutMode === 'free' ? 'rgba(255,255,255,0.2)' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '6px', color: '#fff' }}><Grid size={18} /></button>
                        <button onClick={() => setLayoutMode('grid')} title="Grid" style={{ background: layoutMode === 'grid' ? 'rgba(255,255,255,0.2)' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '6px', color: '#fff' }}>2x2</button>
                        <button onClick={() => setLayoutMode('focus')} title="Focus" style={{ background: layoutMode === 'focus' ? 'rgba(255,255,255,0.2)' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '6px', color: '#fff' }}>1+3</button>
                    </div>
                </div>
            </div>

            {/* Container Logic based on Layout Mode */}
            <div style={
                layoutMode === 'free' ? { display: 'flex', flexWrap: 'wrap', gap: '20px', flex: 1, alignContent: 'flex-start' } :
                    layoutMode === 'grid' ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '20px', flex: 1 } :
                        { display: 'grid', gridTemplateColumns: '3fr 1fr', gridTemplateRows: 'repeat(3, 1fr)', gap: '20px', flex: 1 }
            }>
                {multiSourceIds.map((id, idx) => {
                    const source = videoSources.find(s => s.id === id);

                    let focusStyle = {};
                    if (layoutMode === 'focus') {
                        focusStyle = idx === 0 ? { gridRow: '1 / -1', gridColumn: '1 / 2' } : { gridColumn: '2 / 3' };
                    }

                    return (
                        <motion.div
                            key={id}
                            layout
                            className="glass-panel"
                            style={{
                                borderRadius: '16px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative',
                                ...(layoutMode === 'free' ? {
                                    resize: 'both',
                                    minWidth: '300px',
                                    minHeight: '225px',
                                    width: '400px',
                                    height: '300px',
                                    flexGrow: 1,
                                    maxWidth: '100%'
                                } : { width: '100%', height: '100%' }),
                                ...focusStyle
                            }}
                        >
                            <div style={{
                                padding: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'rgba(0,0,0,0.3)',
                                borderBottom: '1px solid var(--border-color)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontWeight: 600 }}>{source?.label || id}</span>
                                    {/* AI Detection Toggle */}
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                                        <input
                                            type="checkbox"
                                            checked={cameraMetaValues[id]?.detection_enabled ?? source?.detection_enabled ?? false}
                                            onChange={(e) => {
                                                const newVal = e.target.checked;
                                                updateCameraMetaValue(id, 'detection_enabled', newVal);
                                                saveCameraConfig(id, { detection_enabled: newVal });
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        AI Detect
                                    </label>
                                </div>
                                <button
                                    onClick={() => setMultiSourceIds(prev => prev.filter(sid => sid !== id))}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div style={{ flex: 1, background: '#000', position: 'relative' }}>
                                <img
                                    src={buildFeedUrl(id)}
                                    alt={id}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', inset: 0 }}
                                    onError={(e) => e.target.style.display = 'none'}
                                />
                            </div>
                        </motion.div>
                    );
                })}

                {/* Add Button if space available */}
                {multiSourceIds.length < MAX_FEEDS && (
                    <motion.div
                        layout
                        className="glass-panel"
                        style={{
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderStyle: 'dashed',
                            position: 'relative',
                            // Match conditional styling of camera cards
                            ...(layoutMode === 'free' ? {
                                minWidth: '300px',
                                minHeight: '225px',
                                width: '400px',
                                height: '300px',
                                flexGrow: 1,
                                maxWidth: '100%'
                            } : {
                                width: '100%',
                                height: '100%',
                                minHeight: '300px'
                            })
                        }}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Add Camera Feed</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', padding: '0 20px', marginBottom: '16px' }}>
                                {availableSources.length > 0 ? availableSources.map(src => (
                                    <button
                                        key={src.id}
                                        onClick={() => setMultiSourceIds(prev => [...prev, src.id])}
                                        style={{
                                            background: 'rgba(74, 222, 128, 0.1)',
                                            border: '1px solid rgba(74, 222, 128, 0.3)',
                                            color: 'var(--primary)',
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        + {src.label}
                                    </button>
                                )) : (
                                    <span style={{ color: 'var(--text-muted)' }}>No existing sources available.</span>
                                )}
                            </div>

                            {/* Create New Source Button */}
                            <button
                                onClick={() => setShowInitModal(true)} // You'll need to add state for this
                                style={{
                                    background: 'var(--primary)',
                                    color: '#000',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Create New Camera
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Simple Modal for Creating Camera */}
            {showInitModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '24px', borderRadius: '16px', background: '#1e293b' }}>
                        <h3 style={{ marginTop: 0 }}>Add New Camera</h3>

                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Camera Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Back Entrance"
                                value={newCamForm.label}
                                onChange={e => setNewCamForm({ ...newCamForm, label: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                            />
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Type</label>
                            <select
                                value={newCamForm.type}
                                onChange={e => setNewCamForm({ ...newCamForm, type: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                            >
                                <option value="webcam">Webcam (USB)</option>
                                <option value="ip">IP Camera (RTSP/HTTP)</option>
                                <option value="file">Video File</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>
                                {newCamForm.type === 'webcam' ? 'Index (e.g. 0, 1, 2)' : 'Source URL / Path'}
                            </label>
                            <input
                                type="text"
                                placeholder={newCamForm.type === 'webcam' ? '0' : 'rtsp://...'}
                                value={newCamForm.source}
                                onChange={e => setNewCamForm({ ...newCamForm, source: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setShowInitModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                            <button
                                onClick={handleCreateCamera}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#000', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Add Camera
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiCameraWall;
