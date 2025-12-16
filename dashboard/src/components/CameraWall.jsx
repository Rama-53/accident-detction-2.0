// src/components/CameraWall.jsx
import { Video, LayoutDashboard, Monitor } from 'lucide-react';
import './CameraWall.css';

const MAX_MULTI_FEEDS = 4;

export function CameraWall({
    videoSources,
    multiSourceIds,
    setMultiSourceIds,
    layoutMode,
    setLayoutMode,
    buildFeedUrl,
    getSourceMeta,
    saveCameraConfig,
    setVideoSources,
}) {
    return (
        <div className="glass-panel camera-wall-panel animate-slide-up">
            <div className="panel-header">
                <div className="panel-title">
                    <Video size={18} />
                    <span>Multi-Camera Wall</span>
                </div>
                <div className="layout-switcher">
                    <button
                        className={`layout-btn ${layoutMode === 'auto' ? 'active' : ''}`}
                        onClick={() => setLayoutMode('auto')}
                        title="Auto Grid"
                    >
                        <LayoutDashboard size={16} />
                    </button>
                    <button
                        className={`layout-btn ${layoutMode === '2x2' ? 'active' : ''}`}
                        onClick={() => setLayoutMode('2x2')}
                        title="2x2 Grid"
                    >
                        <div className="grid-icon-2x2">
                            <span /><span /><span /><span />
                        </div>
                    </button>
                    <button
                        className={`layout-btn ${layoutMode === 'focus' ? 'active' : ''}`}
                        onClick={() => setLayoutMode('focus')}
                        title="Focus"
                    >
                        <Monitor size={16} />
                    </button>
                    <button
                        className={`layout-btn ${layoutMode === '1x1' ? 'active' : ''}`}
                        onClick={() => setLayoutMode('1x1')}
                        title="Single View"
                    >
                        <div className="grid-icon-1x1" />
                    </button>
                </div>
            </div>

            <div className="multi-feed-controls">
                {videoSources.map(src => {
                    const checked = multiSourceIds.includes(src.id);
                    return (
                        <div key={src.id} className={`multi-feed-option ${checked ? 'selected' : ''}`}>
                            <label className="camera-checkbox">
                                <div className={`checkbox-box ${checked ? 'checked' : ''}`}>
                                    {checked && <span className="checkbox-check" />}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={e => {
                                        if (e.target.checked) {
                                            if (multiSourceIds.length < MAX_MULTI_FEEDS) {
                                                setMultiSourceIds(p => [...p, src.id]);
                                            }
                                        } else {
                                            setMultiSourceIds(p => p.filter(id => id !== src.id));
                                        }
                                    }}
                                />
                                <span className="camera-name">{src.label}</span>
                            </label>

                            {src.id !== 'detector_stream' && (
                                <label className="ai-toggle">
                                    <div className={`toggle-track ${src.detection_enabled ? 'on' : ''}`}>
                                        <div className="toggle-thumb" />
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={src.detection_enabled || false}
                                        onChange={(e) => {
                                            const val = e.target.checked;
                                            saveCameraConfig(src.id, { detection_enabled: val });
                                            setVideoSources(prev => prev.map(s => s.id === src.id ? { ...s, detection_enabled: val } : s));
                                        }}
                                    />
                                    <span className={`ai-label ${src.detection_enabled ? 'active' : ''}`}>AI</span>
                                </label>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className={`wall-grid wall-grid-${layoutMode}`}>
                {multiSourceIds.map(sid => (
                    <div key={sid} className="wall-feed-card animate-scale-in">
                        <div className="feed-label">
                            <span className={`status-dot ${getSourceMeta(sid)?.detection_enabled ? 'active' : ''}`} />
                            {getSourceMeta(sid)?.label}
                        </div>
                        <img
                            src={buildFeedUrl(sid)}
                            alt={getSourceMeta(sid)?.label}
                            onError={e => e.target.style.opacity = 0}
                        />
                    </div>
                ))}
                {multiSourceIds.length === 0 && (
                    <div className="wall-placeholder">
                        <Video size={48} />
                        <span>Select cameras above to view feeds</span>
                    </div>
                )}
            </div>
        </div>
    );
}
