// src/components/CameraWall.jsx
import { Video, LayoutDashboard, Monitor } from 'lucide-react';
import AICheckbox from './AICheckbox';
import './CameraWall.css';
import './WinampSelection.css'; // New Winamp Styles

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

            {/* Winamp Camera Selection */}
            <div className="winamp-player-container">
                <div className="player-header">
                    <div className="header-bars"></div>
                    <span className="header-title">PREFERENCES // AUDIO_MODE</span>
                </div>

                <div className="radio-stack">
                    {videoSources.map(src => {
                        const checked = multiSourceIds.includes(src.id);
                        return (
                            <label key={src.id} className="track-select" htmlFor={`track-${src.id}`}>
                                <input
                                    type="checkbox"
                                    id={`track-${src.id}`}
                                    name="camera-select"
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
                                <div className="led-indicator">
                                    <div className="led-glass"></div>
                                    <div className="led-light"></div>
                                    <div className="led-reflection"></div>
                                </div>
                                <div className="track-info">
                                    <span className="track-title">{src.label}</span>
                                    <span className="track-kbps">
                                        {src.id === 'detector_stream' ? 'AI_Active' : 'LIVE_FEED'}
                                    </span>
                                </div>
                                <div className="equalizer-mini">
                                    <div className="bar"></div>
                                    <div className="bar"></div>
                                    <div className="bar"></div>
                                </div>

                                {/* AI Toggle Integration */}
                                {src.id !== 'detector_stream' && (
                                    <div className="winamp-ai-scale" onClick={e => e.stopPropagation()}>
                                        <AICheckbox
                                            label=""
                                            checked={src.detection_enabled || false}
                                            onChange={(e) => {
                                                const val = e.target.checked;
                                                saveCameraConfig(src.id, { detection_enabled: val });
                                                setVideoSources(prev => prev.map(s => s.id === src.id ? { ...s, detection_enabled: val } : s));
                                            }}
                                        />
                                    </div>
                                )}
                            </label>
                        );
                    })}
                </div>

                <div className="screen-overlay"></div>
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
