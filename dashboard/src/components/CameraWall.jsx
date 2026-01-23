// src/components/CameraWall.jsx
import { Video, LayoutDashboard, Monitor, CheckSquare, Square, Search, X } from 'lucide-react';
import { useState } from 'react';
import AICheckbox from './AICheckbox';
import { useSystem } from '../context/SystemContext';
import './CameraWall.css';

const MAX_MULTI_FEEDS = 4;

export function CameraWall() {
    const {
        videoSources,
        multiSourceIds,
        setMultiSourceIds,
        layoutMode,
        setLayoutMode,
        buildFeedUrl,
        getSourceMeta,
        saveCameraConfig,
        setVideoSources,
    } = useSystem();

    const [searchQuery, setSearchQuery] = useState('');

    // Filter cameras based on search
    const filteredSources = videoSources.filter(src =>
        src.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        src.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Quick actions
    const selectAll = () => {
        const selectableIds = filteredSources.slice(0, MAX_MULTI_FEEDS).map(s => s.id);
        setMultiSourceIds(selectableIds);
    };

    const clearAll = () => {
        setMultiSourceIds([]);
    };

    return (
        <div className="camera-wall-container">
            {/* SIDEBAR: Camera Selection */}
            <aside className="camera-sidebar">
                <div className="sidebar-header">
                    <h3 className="sidebar-title">
                        <Video size={16} />
                        <span>Camera Sources</span>
                    </h3>
                    <div className="sidebar-count">
                        {multiSourceIds.length}/{MAX_MULTI_FEEDS}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="sidebar-search">
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder="Search cameras..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="search-clear" onClick={() => setSearchQuery('')}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="sidebar-actions">
                    <button
                        className="action-btn-sm"
                        onClick={selectAll}
                        disabled={filteredSources.length === 0}
                    >
                        <CheckSquare size={12} />
                        Select All
                    </button>
                    <button
                        className="action-btn-sm secondary"
                        onClick={clearAll}
                        disabled={multiSourceIds.length === 0}
                    >
                        <Square size={12} />
                        Clear
                    </button>
                </div>

                {/* Camera List */}
                <div className="camera-list">
                    {filteredSources.map(src => {
                        const isSelected = multiSourceIds.includes(src.id);
                        const isDisabled = !isSelected && multiSourceIds.length >= MAX_MULTI_FEEDS;

                        return (
                            <div
                                key={src.id}
                                className={`camera-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                                onClick={() => {
                                    if (isSelected) {
                                        setMultiSourceIds(p => p.filter(id => id !== src.id));
                                    } else if (!isDisabled) {
                                        setMultiSourceIds(p => [...p, src.id]);
                                    }
                                }}
                            >
                                <div className="card-checkbox">
                                    {isSelected ? (
                                        <CheckSquare size={18} className="check-icon selected" />
                                    ) : (
                                        <Square size={18} className="check-icon" />
                                    )}
                                </div>

                                <div className="card-content">
                                    <div className="card-header">
                                        <span className="camera-name">{src.label}</span>
                                        <span className={`status-indicator ${src.detection_enabled || src.id === 'detector_stream' ? 'active' : ''}`}>
                                            {src.id === 'detector_stream' ? 'AI' : (src.detection_enabled ? 'LIVE' : 'OFF')}
                                        </span>
                                    </div>
                                    <div className="card-meta">
                                        <span className="camera-id">{src.id}</span>
                                    </div>
                                </div>

                                {/* AI Toggle - only for non-detector cameras */}
                                {src.id !== 'detector_stream' && (
                                    <div
                                        className="card-ai-toggle"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <AICheckbox
                                            label=""
                                            checked={src.detection_enabled || false}
                                            onChange={(e) => {
                                                const val = e.target.checked;
                                                saveCameraConfig(src.id, { detection_enabled: val });
                                                setVideoSources(prev =>
                                                    prev.map(s => s.id === src.id ? { ...s, detection_enabled: val } : s)
                                                );
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {filteredSources.length === 0 && (
                        <div className="no-results">
                            <Search size={32} />
                            <span>No cameras found</span>
                        </div>
                    )}
                </div>
            </aside>

            {/* MAIN AREA: Feed Display */}
            <main className="feed-display-area">
                <div className="feed-header">
                    <h2 className="feed-title">
                        <Monitor size={18} />
                        <span>Multi-Camera Wall</span>
                    </h2>
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
                            <span>Select cameras from the sidebar to view feeds</span>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
