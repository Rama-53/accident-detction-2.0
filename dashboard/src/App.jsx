import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Video, Map as MapIcon, Image as ImageIcon } from "lucide-react";
import "./App.css"; // We still keep this for some basic overrides or legacy if needed
import { BACKEND_URL } from "./config";

// Components
import Sidebar from "./components/Sidebar";
import LiveFeed from "./components/LiveFeed";
import RecentAlerts from "./components/RecentAlerts";
import StatsCard from "./components/StatsCard";
import CameraMap from "./components/CameraMap";
import MultiCameraWall from "./components/MultiCameraWall";
import Gallery from "./components/Gallery";
import AlertsPage from "./components/AlertsPage";
import Settings from "./components/Settings";

function App() {
  const [status, setStatus] = useState("Unavailable");
  const [events, setEvents] = useState([]);
  const [snapshots, setSnapshots] = useState([]); // Kept for gallery if needed
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");

  // Video Source State
  const [videoSources, setVideoSources] = useState([]);
  const [selectedVideoSource, setSelectedVideoSource] = useState("");
  const [videoSourceValues, setVideoSourceValues] = useState({});
  const [multiSourceIds, setMultiSourceIds] = useState([]);
  const [cameraMetaValues, setCameraMetaValues] = useState({});

  const [activeEvent, setActiveEvent] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showIntro, setShowIntro] = useState(true);

  // Poll Backend Status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`${BACKEND_URL}/status`);
        const data = await res.json();
        setStatus(data.status || "Unknown");
      } catch (err) {
        setStatus("Unavailable");
      }
    }
    fetchStatus();
    const id = setInterval(fetchStatus, 5000);
    return () => clearInterval(id);
  }, []);

  // Poll Events
  useEffect(() => {
    async function fetchEvents() {
      try {
        const query = selectedCamera && selectedCamera !== "all"
          ? `?camera_id=${encodeURIComponent(selectedCamera)}`
          : "";
        const res = await fetch(`${BACKEND_URL}/events${query}`);
        const data = await res.json();
        setEvents(data);
      } catch (err) {
        console.error("Error fetching events", err);
      }
    }
    fetchEvents();
    const id = setInterval(fetchEvents, 2000); // 2s poll
    return () => clearInterval(id);
  }, [selectedCamera]);

  // Fetch Video Sources
  const fetchVideoSources = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/video_sources`);
      const data = await res.json();
      setVideoSources(data);

      // Populate Meta Values
      setCameraMetaValues((prev) => {
        const next = { ...prev };
        data.forEach((src) => {
          if (!next[src.id]) { // only if not already there
            next[src.id] = {
              name: src.camera_name || "",
              location: src.location || "",
              detection_enabled: src.detection_enabled,
              lat: src.location_lat,
              lng: src.location_lng
            };
          }
        });
        return next;
      });
    } catch (err) {
      console.error("Error fetching sources", err);
    }
  };

  useEffect(() => {
    fetchVideoSources();
    const id = setInterval(fetchVideoSources, 15000);
    return () => clearInterval(id);
  }, []);

  // One-time effect to set default video source if not set
  useEffect(() => {
    if (videoSources.length > 0 && !selectedVideoSource) {
      const defaultOption = videoSources.find((opt) => opt.is_default) || videoSources[0];
      setSelectedVideoSource(defaultOption.id);
      if (multiSourceIds.length === 0) setMultiSourceIds([defaultOption.id]);
    }
  }, [videoSources, selectedVideoSource, multiSourceIds]);

  const updateCameraMetaValue = (sourceId, field, value) => {
    if (!sourceId) return;
    setCameraMetaValues((prev) => ({
      ...prev,
      [sourceId]: {
        ...(prev[sourceId] || {}),
        [field]: value,
      },
    }));
  };

  const saveCameraConfig = async (sourceId, overrides = {}) => {
    if (!sourceId) return;
    const sourceObj = videoSources.find(s => s.id === sourceId);
    const cameraId = (sourceObj && sourceObj.camera_id) ? sourceObj.camera_id : sourceId;
    const meta = cameraMetaValues[sourceId] || {};

    const payload = {
      name: meta.name,
      location: meta.location,
      lat: overrides.lat !== undefined ? overrides.lat : meta.lat,
      lng: overrides.lng !== undefined ? overrides.lng : meta.lng,
      detection_enabled: overrides.detection_enabled !== undefined ? overrides.detection_enabled : (meta.detection_enabled ?? false),
    };

    try {
      await fetch(`${BACKEND_URL}/cameras/${encodeURIComponent(cameraId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // Optionally re-fetch sources to sync
    } catch (err) {
      console.error("Error saving camera config:", err);
    }
  };

  return (
    <div className="app-root" style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-deep)', overflow: 'hidden' }}>

      {/* Intro Overlay */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            className="intro-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <video
              src="/intro.mp4"
              autoPlay
              muted
              playsInline
              className="intro-video"
              onEnded={() => setShowIntro(false)}
              onError={() => setShowIntro(false)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <button
              onClick={() => setShowIntro(false)}
              style={{ position: 'absolute', bottom: '50px', right: '50px', background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '10px 20px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.5)', cursor: 'pointer', backdropFilter: 'blur(10px)' }}
            >
              Skip Intro
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Header/Stats Row (Only visible on Dashboard) */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <StatsCard title="Total Accidents" value={events.length} icon={AlertTriangle} trend={events.length > 5 ? 12 : 0} />
              <StatsCard title="Active Cameras" value={videoSources.filter(s => s.available).length} icon={Video} />
              <StatsCard title="System Status" value={status} icon={Activity} />
            </div>
          )}

          {/* Main Content Area */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1.5fr 1fr', gap: '20px', height: '100%' }}
                >
                  {/* Top Left: Live Feed */}
                  <div style={{ gridColumn: '1 / 2', gridRow: '1 / 2' }}>
                    <LiveFeed
                      videoSources={videoSources}
                      selectedVideoSource={selectedVideoSource}
                      setSelectedVideoSource={setSelectedVideoSource}
                      videoSourceValues={videoSourceValues}
                      setVideoSourceValues={setVideoSourceValues}
                      cameraMetaValues={cameraMetaValues}
                      updateCameraMetaValue={updateCameraMetaValue}
                      saveCameraConfig={saveCameraConfig}
                    />
                  </div>

                  {/* Right Column: Recent Alerts (Spans Full Height) */}
                  <div style={{ gridColumn: '2 / 3', gridRow: '1 / 3' }}>
                    <RecentAlerts
                      events={events}
                      setEvents={setEvents}
                      setActiveEvent={setActiveEvent}
                      activeEvent={activeEvent}
                    />
                  </div>

                  {/* Bottom Left: Camera Map */}
                  <div style={{ gridColumn: '1 / 2', gridRow: '2 / 3' }}>
                    <CameraMap
                      selectedVideoSource={selectedVideoSource}
                      videoSources={videoSources}
                      cameraMetaValues={cameraMetaValues}
                      updateCameraMetaValue={updateCameraMetaValue}
                      saveCameraConfig={saveCameraConfig}
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'camerawall' && (
                <motion.div
                  key="camerawall"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ height: '100%' }}
                >
                  <MultiCameraWall
                    videoSources={videoSources}
                    multiSourceIds={multiSourceIds}
                    setMultiSourceIds={setMultiSourceIds}
                    cameraMetaValues={cameraMetaValues}
                    updateCameraMetaValue={updateCameraMetaValue}
                    saveCameraConfig={saveCameraConfig}
                    onRefreshSources={fetchVideoSources}
                  />
                </motion.div>
              )}

              {/* Placeholders for other tabs */}
              {activeTab === 'alerts' && (
                <AlertsPage
                  events={events}
                  setActiveEvent={setActiveEvent}
                />
              )}

              {activeTab === 'gallery' && (
                <Gallery
                  events={events}
                  setActiveEvent={setActiveEvent}
                />
              )}

              {activeTab === 'settings' && (
                <Settings
                  videoSources={videoSources}
                  saveCameraConfig={saveCameraConfig}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Detail Overlay using AnimatePresence */}
      <AnimatePresence>
        {activeEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px'
            }}
            onClick={() => setActiveEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel"
              style={{
                width: '100%', maxWidth: '1000px', maxHeight: '90vh',
                background: '#0f172a', borderRadius: '24px', padding: '32px',
                overflowY: 'auto', border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Accident Details</h2>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>Event ID: {activeEvent.id}</p>
                </div>
                <button
                  onClick={() => setActiveEvent(null)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', color: '#fff' }}
                >✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 1fr', gap: '24px' }}>
                <div>
                  <img
                    src={activeEvent.snapshot_url ? `${BACKEND_URL}${activeEvent.snapshot_url}` : ''}
                    alt="Main Snapshot"
                    style={{ width: '100%', borderRadius: '16px', border: '1px solid var(--border-color)' }}
                  />
                  <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {/* Placeholder for snapshot carousel if we had multiple */}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                    <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Location</label>
                    <p style={{ margin: '4px 0 0', fontSize: '1.1rem' }}>{activeEvent.location || 'Unknown'}</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                    <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Severity</label>
                    <p style={{ margin: '4px 0 0', fontSize: '1.1rem', color: activeEvent.severity === 'high' ? 'var(--danger)' : 'var(--warning)' }}>
                      {activeEvent.severity || 'Moderate'}
                    </p>
                  </div>
                  <div style={{ flex: 1, minHeight: '200px', borderRadius: '12px', overflow: 'hidden' }}>
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.google.com/maps?q=${activeEvent.location_lat || 0},${activeEvent.location_lng || 0}&z=15&output=embed`}
                    ></iframe>
                  </div>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;

function Activity(props) {
  return <AlertTriangle {...props} />; // Quick polyfill if Activity icon from lucide is missing or similar
}
