// src/App.jsx
import { useEffect, useState } from "react";
import "./App.css";
import { BACKEND_URL } from "./config";

// Hooks
import { useSystemData } from "./hooks/useSystemData";
import { useCameraControl } from "./hooks/useCameraControl";

// Components
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { CameraWall } from "./components/CameraWall";
import { AlertsPage } from "./components/AlertsPage";
import { Gallery } from "./components/Gallery";
import { IntroOverlay } from "./components/IntroOverlay";
import { EventModal } from "./components/EventModal";
import { Settings } from "./components/Settings";

function App() {
  // --- UI State ---
  const [activeTab, setActiveTab] = useState("dashboard");
  const [layoutMode, setLayoutMode] = useState("auto");
  const [showIntro, setShowIntro] = useState(true);
  const [activeEvent, setActiveEvent] = useState(null);

  // Theme State
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // --- Filtering State ---
  // Lifted specific filter state here if needed for cross-component sharing, 
  // though individual pages manage some of it. 
  // Let's keep shared filters here for consistency across tabs if desired.
  const [selectedCamera, setSelectedCamera] = useState("all");
  const [filterStartTime, setFilterStartTime] = useState("");
  const [filterEndTime, setFilterEndTime] = useState("");
  const [multiDetectionEnabled, setMultiDetectionEnabled] = useState(false);

  // --- System Data Hook ---
  const {
    status,
    events,
    setEvents,
    cameras,
    snapshots,
    clearAllAlerts
  } = useSystemData(selectedCamera, filterStartTime, filterEndTime);

  // --- Camera Control Hook ---
  const {
    videoSources,
    setVideoSources,
    selectedVideoSource,
    setSelectedVideoSource,
    videoSourceValues,
    setVideoSourceValues,
    multiSourceIds,
    setMultiSourceIds,
    locationSuggestions,
    showSuggestions,
    setShowSuggestions,
    getSourceMeta,
    getSourceValue,
    sourceHasRequiredValue,
    buildFeedUrl,
    getCameraInfo,
    updateCameraMetaValue,
    saveCameraConfig,
    handleLocationChange,
    selectSuggestion,
    switchDetectorSource,
  } = useCameraControl();

  // Helper to get info for the currently selected single-view source
  const selectedSourceInfo = getCameraInfo(selectedVideoSource);
  const currentVideoSource = getSourceMeta(selectedVideoSource);
  const currentValue = getSourceValue(selectedVideoSource);
  const hasValueReady = selectedVideoSource && sourceHasRequiredValue(selectedVideoSource);

  // Sync active event updates
  useEffect(() => {
    if (!activeEvent) return;
    const updated = events.find((evt) => evt.id === activeEvent.id);
    if (updated && updated !== activeEvent) {
      setActiveEvent(updated);
    }
  }, [events, activeEvent]);

  // Fetch System Config (multi_detection_enabled check - mostly purely informational or for future use)
  useEffect(() => {
    fetch(`${BACKEND_URL}/system/config`)
      .then(res => res.json())
      .then(data => {
        if (data && data.multi_detection_enabled !== undefined) {
          setMultiDetectionEnabled(data.multi_detection_enabled);
        }
      })
      .catch(err => console.error("Failed to load system config", err));
  }, []);

  return (
    <>
      {showIntro && <IntroOverlay onComplete={() => setShowIntro(false)} />}

      {activeEvent && (
        <EventModal
          event={activeEvent}
          onClose={() => setActiveEvent(null)}
        />
      )}

      <Layout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        toggleTheme={toggleTheme}
        status={status}
        cameras={cameras}
        selectedCamera={selectedCamera}
        setSelectedCamera={setSelectedCamera}
      >
        {activeTab === "dashboard" && (
          <Dashboard
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
            handleLocationChange={handleLocationChange}
            locationSuggestions={locationSuggestions}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            selectSuggestion={selectSuggestion}
            events={events} // Pass filtered events? or raw? Dashboard usually shows recent.
            // Actually Dashboard sidebar shows *filtered* events if we pass filtered 'events' from useSystemData
            // If we want dashboard to ALWAYS show all recent events regardless of filter, we might need separate state.
            // For now, let's respect the global filter on the dashboard too, or reset it.
            setActiveEvent={setActiveEvent}
            clearAllAlerts={clearAllAlerts}
          />
        )}

        {activeTab === "camerawall" && (
          <CameraWall
            videoSources={videoSources}
            multiSourceIds={multiSourceIds}
            setMultiSourceIds={setMultiSourceIds}
            layoutMode={layoutMode}
            setLayoutMode={setLayoutMode}
            buildFeedUrl={buildFeedUrl}
            getSourceMeta={getSourceMeta}
            saveCameraConfig={saveCameraConfig}
            setVideoSources={setVideoSources}
          />
        )}

        {activeTab === "alerts" && (
          <AlertsPage
            events={events}
            cameras={cameras}
            selectedCamera={selectedCamera}
            setSelectedCamera={setSelectedCamera}
            filterStartTime={filterStartTime}
            setFilterStartTime={setFilterStartTime}
            filterEndTime={filterEndTime}
            setFilterEndTime={setFilterEndTime}
            setActiveEvent={setActiveEvent}
          />
        )}

        {activeTab === "gallery" && (
          <Gallery
            events={events}
            cameras={cameras}
            selectedCamera={selectedCamera}
            setSelectedCamera={setSelectedCamera}
            filterStartTime={filterStartTime}
            setFilterStartTime={setFilterStartTime}
            filterEndTime={filterEndTime}
            setFilterEndTime={setFilterEndTime}
          />
        )}

        {activeTab === "settings" && (
          <Settings
            multiDetectionEnabled={multiDetectionEnabled}
            setMultiDetectionEnabled={setMultiDetectionEnabled}
            clearAllAlerts={clearAllAlerts}
          />
        )}
      </Layout>
    </>
  );
}

export default App;
