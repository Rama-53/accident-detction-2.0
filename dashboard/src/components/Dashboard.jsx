// src/components/Dashboard.jsx
import { LiveFeed } from './LiveFeed';
import { CameraMap } from './CameraMap';
import { AlertsList } from './AlertsList';
import './Dashboard.css';

export function Dashboard({
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
    handleLocationChange,
    locationSuggestions,
    showSuggestions,
    setShowSuggestions,
    selectSuggestion,
    events,
    setActiveEvent,
    clearAllAlerts
}) {
    return (
        <div className="dashboard-grid animate-enter">
            <div className="live-feed-section">
                <LiveFeed
                    videoSources={videoSources}
                    selectedVideoSource={selectedVideoSource}
                    setSelectedVideoSource={setSelectedVideoSource}
                    selectedSourceInfo={selectedSourceInfo}
                    updateCameraMetaValue={updateCameraMetaValue}
                    saveCameraConfig={saveCameraConfig}
                    currentVideoSource={currentVideoSource}
                    currentValue={currentValue}
                    setVideoSourceValues={setVideoSourceValues}
                    hasValueReady={hasValueReady}
                    buildFeedUrl={buildFeedUrl}
                    switchDetectorSource={switchDetectorSource}
                />
            </div>

            <div className="alerts-section">
                <AlertsList
                    events={events}
                    setActiveEvent={setActiveEvent}
                    clearAllAlerts={clearAllAlerts}
                />
            </div>

            <div className="map-section">
                <CameraMap
                    selectedVideoSource={selectedVideoSource}
                    selectedSourceInfo={selectedSourceInfo}
                    updateCameraMetaValue={updateCameraMetaValue}
                    saveCameraConfig={saveCameraConfig}
                    handleLocationChange={handleLocationChange}
                    locationSuggestions={locationSuggestions}
                    showSuggestions={showSuggestions}
                    setShowSuggestions={setShowSuggestions}
                    selectSuggestion={selectSuggestion}
                />
            </div>
        </div>
    );
}
