// src/components/LiveFeed.jsx
import { Camera } from 'lucide-react';
import { BACKEND_URL } from '../config';
import AnalyzeButton from './AnalyzeButton';
import PremiumInput from './PremiumInput';
import './LiveFeed.css';

export function LiveFeed({
    videoSources,
    selectedVideoSource,
    setSelectedVideoSource,
    selectedSourceInfo,
    updateCameraMetaValue,
    saveCameraConfig,
    currentVideoSource,
    currentValue,
    setVideoSourceValues,
    hasValueReady,
    buildFeedUrl,
    switchDetectorSource,
}) {
    return (
        <div className="glass-panel live-feed-panel">
            <div className="panel-header">
                <div className="panel-title">
                    <Camera size={18} />
                    <span>Live Feed</span>
                </div>
                <div className="feed-controls">
                    <select
                        value={selectedVideoSource}
                        onChange={(e) => setSelectedVideoSource(e.target.value)}
                        className="feed-select"
                    >
                        {videoSources.length === 0 ? (
                            <option>No sources</option>
                        ) : (
                            videoSources.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))
                        )}
                    </select>

                    {selectedVideoSource && (
                        <label className="detection-toggle">
                            <input
                                type="checkbox"
                                checked={selectedSourceInfo.detection_enabled}
                                onChange={(e) => {
                                    const newState = e.target.checked;
                                    updateCameraMetaValue(selectedVideoSource, 'detection_enabled', newState);
                                    saveCameraConfig(selectedVideoSource, { detection_enabled: newState });
                                }}
                            />
                            <span className="toggle-track">
                                <span className="toggle-thumb" />
                            </span>
                            <span className="toggle-label">Detection</span>
                        </label>
                    )}
                </div>
            </div>

            {/* Source Input Area */}
            {selectedVideoSource && currentVideoSource?.requires_value && (
                <div className="source-input-area" style={{ marginBottom: '1rem' }}>
                    <PremiumInput
                        type={currentVideoSource.value_type === 'number' ? 'number' : 'text'}
                        placeholder={currentVideoSource.value_hint || 'Enter path/URL'}
                        value={currentValue}
                        onChange={(e) => setVideoSourceValues(p => ({ ...p, [selectedVideoSource]: e.target.value }))}
                    />
                </div>
            )}

            {selectedVideoSource && (
                <div className="source-actions">
                    <AnalyzeButton
                        onClick={() => {
                            const actualSource = currentVideoSource?.requires_value ? currentValue : currentVideoSource?.source;
                            if (!actualSource) {
                                alert('Invalid source');
                                return;
                            }
                            alert(`Switching detector input to: ${actualSource}... (Please wait 2.5s)`);
                            switchDetectorSource(selectedVideoSource, actualSource);
                        }}
                    />
                </div>
            )}

            <div className="live-feed-container">
                {hasValueReady ? (
                    <img
                        src={buildFeedUrl(selectedVideoSource)}
                        alt="Live feed"
                        className="live-feed-img"
                        onError={(e) => { e.target.style.opacity = 0; }}
                    />
                ) : (
                    <div className="live-feed-placeholder">
                        <Camera size={48} />
                        <span>Select a source to preview</span>
                    </div>
                )}
            </div>
        </div>
    );
}
