// src/App.jsx
import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  LayoutDashboard,
  Video,
  Bell,
  Settings,
  Images,
  MapPin,
  Camera,
  AlertTriangle,
  X,
  Radio,
  Monitor
} from "lucide-react";

// Fix for default marker icon in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

import "./App.css";
import { BACKEND_URL } from "./config";

const MAX_MULTI_FEEDS = 4;

function App() {
  const [status, setStatus] = useState("Unavailable");
  const [events, setEvents] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [videoSources, setVideoSources] = useState([]);
  const [selectedVideoSource, setSelectedVideoSource] = useState("");
  const [videoSourceValues, setVideoSourceValues] = useState({});
  const [multiSourceIds, setMultiSourceIds] = useState([]);
  const [cameraMetaValues, setCameraMetaValues] = useState({});
  const [activeEvent, setActiveEvent] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showIntro, setShowIntro] = useState(true);

  // Settings & Filters
  const [multiDetectionEnabled, setMultiDetectionEnabled] = useState(false);
  const [filterStartTime, setFilterStartTime] = useState("");
  const [filterEndTime, setFilterEndTime] = useState("");

  // Fetch System Config
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

  // Fetch backend status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`${BACKEND_URL}/status`);
        const data = await res.json();
        setStatus(data.status || "Unknown");
      } catch (err) {
        console.error("Error fetching status:", err);
        setStatus("Unavailable");
      }
    }
    fetchStatus();
    const id = setInterval(fetchStatus, 5000);
    return () => clearInterval(id);
  }, []);

  // Fetch events
  useEffect(() => {
    async function fetchEvents() {
      try {
        const params = new URLSearchParams();
        if (selectedCamera && selectedCamera !== "all") {
          params.append("camera_id", selectedCamera);
        }
        if (filterStartTime) {
          const startTs = new Date(filterStartTime).getTime() / 1000;
          if (!isNaN(startTs)) params.append("start_time", startTs);
        }
        if (filterEndTime) {
          const endTs = new Date(filterEndTime).getTime() / 1000;
          if (!isNaN(endTs)) params.append("end_time", endTs);
        }

        const res = await fetch(`${BACKEND_URL}/events?${params.toString()}`);
        const data = await res.json();
        setEvents(data);
      } catch (err) {
        console.error("Error fetching events:", err);
      }
    }
    fetchEvents();
    const id = setInterval(fetchEvents, 500);
    return () => clearInterval(id);
  }, [selectedCamera]);

  // Fetch available cameras
  useEffect(() => {
    async function fetchCameras() {
      try {
        const res = await fetch(`${BACKEND_URL}/cameras`);
        const data = await res.json();
        setCameras(data);
      } catch (err) {
        console.error("Error fetching cameras:", err);
      }
    }
    fetchCameras();
    const id = setInterval(fetchCameras, 10000);
    return () => clearInterval(id);
  }, []);

  // Fetch snapshots list
  useEffect(() => {
    async function fetchSnaps() {
      try {
        const res = await fetch(`${BACKEND_URL}/snapshots`);
        const data = await res.json();
        setSnapshots(data);
      } catch (err) {
        console.error("Error fetching snapshots:", err);
      }
    }
    fetchSnaps();
    const id = setInterval(fetchSnaps, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!activeEvent) return;
    const updated = events.find((evt) => evt.id === activeEvent.id);
    if (updated && updated !== activeEvent) {
      setActiveEvent(updated);
    }
  }, [events, activeEvent]);

  // Fetch available video sources
  useEffect(() => {
    async function fetchVideoSources() {
      try {
        const res = await fetch(`${BACKEND_URL}/video_sources`);
        const data = await res.json();
        setVideoSources(data);
        setCameraMetaValues((prev) => {
          const next = { ...prev };
          data.forEach((src) => {
            if (!next[src.id]) {
              next[src.id] = {
                name: src.camera_name || "",
                location: src.location || "",
                detection_enabled: src.detection_enabled,
              };
            }
          });
          return next;
        });
        if (data.length > 0) {
          const defaultOption = data.find((opt) => opt.is_default) || data[0];
          setSelectedVideoSource((prev) => prev || defaultOption.id);
          setMultiSourceIds((prev) => prev.length > 0 ? prev : [defaultOption.id]);
        }
      } catch (err) {
        console.error("Error fetching video sources:", err);
      }
    }
    fetchVideoSources();
    const id = setInterval(fetchVideoSources, 15000);
    return () => clearInterval(id);
  }, []);

  const getSourceMeta = (sourceId) => videoSources.find((src) => src.id === sourceId);
  const getSourceValue = (sourceId) => (sourceId && videoSourceValues[sourceId]) || "";

  const sourceHasRequiredValue = (sourceId) => {
    const meta = getSourceMeta(sourceId);
    if (!meta) return false;
    if (!meta.requires_value) return true;
    return getSourceValue(sourceId).trim().length > 0;
  };

  const buildFeedUrl = (sourceId) => {
    if (!sourceId) return `${BACKEND_URL}/video_feed`;
    const meta = getSourceMeta(sourceId);
    const params = new URLSearchParams();
    params.set("source_id", sourceId);
    if (meta?.requires_value) {
      const val = getSourceValue(sourceId).trim();
      if (val) params.set("source_value", val);
    }
    const query = params.toString();
    return `${BACKEND_URL}/video_feed${query ? `?${query}` : ""}`;
  };

  const currentVideoSource = getSourceMeta(selectedVideoSource);
  const currentValue = getSourceValue(selectedVideoSource);
  const hasValueReady = selectedVideoSource && sourceHasRequiredValue(selectedVideoSource);

  const getCameraInfo = (sourceId) => {
    if (!sourceId) return { name: "", location: "", lat: null, lng: null };
    const meta = getSourceMeta(sourceId) || {};
    const overrides = cameraMetaValues[sourceId] || {};
    return {
      name: overrides.name !== undefined ? overrides.name : (meta.camera_name || meta.label || ""),
      location: overrides.location !== undefined ? overrides.location : (meta.location || ""),
      lat: overrides.lat ?? meta.location_lat ?? null,
      lng: overrides.lng ?? meta.location_lng ?? null,
      detection_enabled: overrides.detection_enabled ?? meta.detection_enabled ?? false,
    };
  };

  const selectedSourceInfo = getCameraInfo(selectedVideoSource);

  const updateCameraMetaValue = (sourceId, field, value) => {
    if (!sourceId) return;
    setCameraMetaValues((prev) => ({
      ...prev,
      [sourceId]: { ...(prev[sourceId] || {}), [field]: value },
    }));
  };

  // Autocomplete
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionTimeout = useRef(null);

  const fetchSuggestions = async (text) => {
    if (!text || text.length < 3) {
      setLocationSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&addressdetails=1&limit=5`);
      const data = await res.json();
      setLocationSuggestions(data || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Autocomplete error:", err);
    }
  };

  const handleLocationChange = (e) => {
    const text = e.target.value;
    updateCameraMetaValue(selectedVideoSource, "location", text);
    if (suggestionTimeout.current) clearTimeout(suggestionTimeout.current);
    suggestionTimeout.current = setTimeout(() => fetchSuggestions(text), 500);
  };

  const selectSuggestion = (s) => {
    const name = s.display_name;
    updateCameraMetaValue(selectedVideoSource, "location", name);
    setShowSuggestions(false);
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    updateCameraMetaValue(selectedVideoSource, "lat", lat);
    updateCameraMetaValue(selectedVideoSource, "lng", lng);
    saveCameraConfig(selectedVideoSource, { lat, lng, location: name });
  };

  const handleLocationCommit = async (sourceId, text) => {
    if (!sourceId) return;
    // Simple commit mostly relies on user selecting suggestion or just saving text
    saveCameraConfig(sourceId);
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
      detection_enabled: overrides.detection_enabled !== undefined ? overrides.detection_enabled : (meta.detection_enabled ?? true),
    };

    try {
      await fetch(`${BACKEND_URL}/cameras/${encodeURIComponent(cameraId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Error saving camera config:", err);
    }
  };

  const buildMapEmbedUrl = (evt) => {
    if (!evt) return null;
    if (evt.location_lat && evt.location_lng) {
      return `https://www.google.com/maps?q=${evt.location_lat},${evt.location_lng}&z=16&output=embed`;
    }
    if (evt.location && evt.location.trim()) {
      return `https://www.google.com/maps?q=${encodeURIComponent(evt.location)}&z=15&output=embed`;
    }
    return null;
  };

  const detailMapUrl = buildMapEmbedUrl(activeEvent);

  return (
    <div className="app-container">
      {/* Intro Video Overlay */}
      {showIntro && (
        <div className="intro-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
          <video
            src="/intro.mp4"
            autoPlay
            muted
            playsInline
            className="intro-video"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onEnded={() => setShowIntro(false)}
            onError={() => setShowIntro(false)}
          />
          <button className="skip-btn" onClick={() => setShowIntro(false)} style={{ position: 'absolute', bottom: 40, right: 40, padding: '10px 20px', borderRadius: 8 }}>
            Skip Intro
          </button>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <AlertTriangle className="brand-icon" size={28} />
          <div className="brand-text">AccidentAI</div>
        </div>

        <nav className="nav-menu">
          <button className={`nav-btn ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
            <LayoutDashboard className="icon" /> Dashboard
          </button>
          <button className={`nav-btn ${activeTab === "camerawall" ? "active" : ""}`} onClick={() => setActiveTab("camerawall")}>
            <Video className="icon" /> Camera Wall
          </button>
          <button className={`nav-btn ${activeTab === "alerts" ? "active" : ""}`} onClick={() => setActiveTab("alerts")}>
            <Bell className="icon" /> Alerts
          </button>
          <button className={`nav-btn ${activeTab === "gallery" ? "active" : ""}`} onClick={() => setActiveTab("gallery")}>
            <Images className="icon" /> Gallery
          </button>
          <button className={`nav-btn ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>
            <Settings className="icon" /> Settings
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="header-section">
          <div className="page-title">
            <h1>Accident Detection System</h1>
            <p>Real-time roadway monitoring and incident response</p>
          </div>
          <div className="header-status" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div className="camera-select" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Camera Filter:</span>
              <select
                value={selectedCamera || "all"}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="glass-input"
                style={{ width: 'auto', padding: '6px 12px' }}
              >
                <option value="all">All Cameras</option>
                {cameras.map((cam) => <option key={cam} value={cam}>{cam}</option>)}
              </select>
            </div>
            <div className={`badge ${status === 'Running' ? 'badge-high' : 'badge-high'}`} style={{ background: status === 'Running' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: status === 'Running' ? '#34d399' : '#fca5a5', border: status === 'Running' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>
              {status}
            </div>
          </div>
        </div>

        {/* Dashboard View */}
        {activeTab === "dashboard" && (
          <div className="dashboard-grid">
            <div className="col-main">
              {/* Live Feed Panel */}
              <div className="glass-panel">
                <div className="panel-header">
                  <div className="panel-title"><Camera size={18} /> Live Feed</div>
                  <div className="feed-controls" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <select
                      value={selectedVideoSource}
                      onChange={(e) => setSelectedVideoSource(e.target.value)}
                      className="glass-input"
                      style={{ padding: '6px 12px', fontSize: 13 }}
                    >
                      {videoSources.length === 0 ? <option>No sources</option> : videoSources.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>

                    {selectedVideoSource && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <input
                          type="checkbox"
                          checked={selectedSourceInfo.detection_enabled}
                          onChange={(e) => {
                            const newState = e.target.checked;
                            updateCameraMetaValue(selectedVideoSource, "detection_enabled", newState);
                            saveCameraConfig(selectedVideoSource, { detection_enabled: newState });
                          }}
                        />
                        Detection
                      </label>
                    )}
                  </div>
                </div>

                {/* Source Input Area */}
                {selectedVideoSource && (
                  <div style={{ marginBottom: 16, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    {currentVideoSource?.requires_value && (
                      <input
                        type={currentVideoSource.value_type === "number" ? "number" : "text"}
                        placeholder={currentVideoSource.value_hint || "Enter path/URL"}
                        value={currentValue}
                        onChange={(e) => setVideoSourceValues(p => ({ ...p, [selectedVideoSource]: e.target.value }))}
                        className="glass-input"
                        style={{ marginBottom: 8 }}
                      />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center' }}>
                      {/* This button should be available for ANY source to let user force it as detector input */}
                      <button className="btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => {
                        const actualSource = currentVideoSource?.requires_value ? currentValue : currentVideoSource?.source;

                        if (!actualSource) return alert("Source value is missing/invalid");

                        // Logic to switch detector source
                        setSelectedVideoSource(""); // Unmount preview first
                        const DELAY = 2500;

                        // Optional: Toast or clearer feedback
                        alert(`Switching detector input to: ${actualSource}... (Please wait ${DELAY / 1000}s)`);

                        setTimeout(() => {
                          fetch(`${BACKEND_URL}/cameras/demo_cam_main`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ video_source: String(actualSource) })
                          })
                            .then(res => res.json())
                            .then(() => {
                              setSelectedVideoSource("detector_stream");
                            })
                            .catch(err => {
                              console.error(err);
                              alert("Failed to switch source");
                            });
                        }, DELAY);
                      }}>
                        Analyze this stream
                      </button>
                    </div>
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
                    <div className="live-feed-placeholder" style={{ color: 'var(--text-muted)' }}>
                      Select a source to preview
                    </div>
                  )}
                </div>
              </div>

              {/* Camera Map Panel */}
              <div className="glass-panel">
                <div className="panel-header">
                  <div className="panel-title"><MapPin size={18} /> Camera Location</div>
                </div>
                <div className="camera-config-grid" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
                  <input
                    className="glass-input"
                    placeholder="Camera Name"
                    value={selectedSourceInfo.name}
                    onChange={e => updateCameraMetaValue(selectedVideoSource, "name", e.target.value)}
                    onBlur={() => saveCameraConfig(selectedVideoSource)}
                  />
                  <div style={{ position: 'relative' }}>
                    <input
                      className="glass-input"
                      placeholder="Location (City/Place)"
                      value={selectedSourceInfo.location}
                      onChange={handleLocationChange}
                      onBlur={e => {
                        setTimeout(() => setShowSuggestions(false), 200);
                        handleLocationCommit(selectedVideoSource, e.target.value);
                      }}
                    />
                    {showSuggestions && locationSuggestions.length > 0 && (
                      <ul className="suggestions-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, listStyle: 'none', padding: 0, margin: 0, zIndex: 100 }}>
                        {locationSuggestions.map((s) => (
                          <li key={s.place_id} onClick={() => selectSuggestion(s)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #334155', fontSize: 12, color: '#e2e8f0' }}>
                            {s.display_name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div style={{ height: "300px", width: "100%", borderRadius: "12px", overflow: "hidden" }}>
                  <MapContainer
                    center={[selectedSourceInfo.lat || 20.5937, selectedSourceInfo.lng || 78.9629]}
                    zoom={selectedSourceInfo.lat ? 13 : 4}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker
                      lat={selectedSourceInfo.lat}
                      lng={selectedSourceInfo.lng}
                      onLocationSelect={(lat, lng) => {
                        updateCameraMetaValue(selectedVideoSource, "lat", lat);
                        updateCameraMetaValue(selectedVideoSource, "lng", lng);
                        setTimeout(() => saveCameraConfig(selectedVideoSource), 100);
                      }}
                    />
                  </MapContainer>
                </div>
              </div>
            </div>

            <div className="col-side">
              {/* Recent Alerts */}
              <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="panel-header">
                  <div className="panel-title"><Bell size={18} /> Recent Alerts</div>
                  <button className="clear-alerts-btn" onClick={async () => {
                    if (confirm("Clear all alerts?")) {
                      await fetch(`${BACKEND_URL}/accidents`, { method: 'DELETE' });
                      setEvents([]);
                    }
                  }}>Clear</button>
                </div>
                <div className="event-list scroll-y" style={{ flex: 1 }}>
                  {events.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>No recent alerts</p>}
                  {events.map(e => (
                    <div key={e.id} className="event-card" onClick={() => setActiveEvent(e)}>
                      {e.snapshot_id && (
                        <img src={`${BACKEND_URL}/snapshot/${e.snapshot_id}`} className="event-thumb" alt="thumb" onError={ev => ev.target.style.display = 'none'} />
                      )}
                      <div className="event-details">
                        <div className="event-type">{e.type || "Accident"}</div>
                        <div className="event-time">{new Date(e.time * 1000).toLocaleString()}</div>
                        <div className="event-meta" style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <span className={`badge badge-high`}>{e.severity}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.camera_id}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Camera Wall */}
        {activeTab === "camerawall" && (
          <div className="glass-panel">
            <div className="panel-header">
              <div className="panel-title"><Video size={18} /> Multi-Camera Wall</div>
            </div>
            <div className="multi-feed-controls" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              {videoSources.map(src => {
                const checked = multiSourceIds.includes(src.id);
                return (
                  <div key={src.id} className={`multi-feed-option ${checked ? 'selected' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: checked ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)', borderRadius: 99, border: checked ? '1px solid #3b82f6' : '1px solid transparent' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input type="checkbox" checked={checked} style={{ display: 'none' }} onChange={e => {
                        if (e.target.checked) {
                          if (multiSourceIds.length < MAX_MULTI_FEEDS) setMultiSourceIds(p => [...p, src.id]);
                        } else setMultiSourceIds(p => p.filter(id => id !== src.id));
                      }} />
                      {src.label}
                    </label>
                    {/* Independent AI Toggle for this source */}
                    <label style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, paddingLeft: 8, borderLeft: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
                      <span style={{ color: src.detection_enabled ? '#34d399' : '#94a3b8' }}>AI</span>
                      <input
                        type="checkbox"
                        checked={src.detection_enabled || false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          saveCameraConfig(src.id, { detection_enabled: val });
                          setVideoSources(prev => prev.map(s => s.id === src.id ? { ...s, detection_enabled: val } : s));
                        }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
            <div className="multi-feed-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {multiSourceIds.map(sid => (
                <div key={sid} style={{ background: '#000', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', position: 'relative', border: '1px solid var(--glass-border)' }}>
                  <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: 4, fontSize: 11, zIndex: 10 }}>{getSourceMeta(sid)?.label}</div>
                  <img src={buildFeedUrl(sid)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => e.target.style.opacity = 0} />
                </div>
              ))}
              {multiSourceIds.length === 0 && <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Select cameras above to view feeds.</div>}
            </div>
          </div>
        )}

        {/* Alerts Page (Full History) */}
        {activeTab === "alerts" && (
          <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div className="panel-title"><AlertTriangle size={18} /> Alert History</div>

              <div className="filters-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  value={selectedCamera}
                  onChange={e => setSelectedCamera(e.target.value)}
                  className="glass-input"
                  style={{ padding: '6px 12px', fontSize: 12, width: 'auto' }}
                >
                  <option value="all">All Cameras</option>
                  {cameras.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  type="datetime-local"
                  value={filterStartTime}
                  onChange={e => setFilterStartTime(e.target.value)}
                  className="glass-input"
                  style={{ padding: '6px 12px', fontSize: 12, width: 'auto' }}
                />
                <input
                  type="datetime-local"
                  value={filterEndTime}
                  onChange={e => setFilterEndTime(e.target.value)}
                  className="glass-input"
                  style={{ padding: '6px 12px', fontSize: 12, width: 'auto' }}
                />
                <button
                  onClick={() => { setFilterStartTime(""); setFilterEndTime(""); setSelectedCamera("all"); }}
                  style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 12 }}
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="event-list scroll-y" style={{ flex: 1, paddingRight: 8 }}>
              {events.map(e => {
                const dateObj = new Date(e.time * 1000);
                const dateStr = dateObj.toLocaleDateString();
                const timeStr = dateObj.toLocaleTimeString();

                return (
                  <div key={e.id} className="event-card" onClick={() => setActiveEvent(e)} style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 16, alignItems: 'center', padding: 12 }}>
                    {/* Thumbnail */}
                    <div style={{ width: 80, height: 60, background: '#000', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                      {e.snapshot_id ? (
                        <img src={`${BACKEND_URL}/snapshot/${e.snapshot_id}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={ev => ev.target.style.display = 'none'} />
                      ) : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 10 }}>No Image</div>}
                    </div>

                    {/* Main Details: Camera & Location */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {e.camera_id}
                        <span className={`badge badge-high`} style={{ fontSize: 10, padding: '2px 6px' }}>{e.severity}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} /> {e.location || "Unknown Location"}
                      </div>
                    </div>

                    {/* Time & Date */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, minWidth: 80 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#cbd5e1' }}>{timeStr}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dateStr}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gallery Page */}
        {activeTab === "gallery" && (
          <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div className="panel-title"><Images size={18} /> Snapshot Gallery</div>
              <div className="filters-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  value={selectedCamera}
                  onChange={e => setSelectedCamera(e.target.value)}
                  className="glass-input"
                  style={{ padding: '6px 12px', fontSize: 12, width: 'auto' }}
                >
                  <option value="all">All Cameras</option>
                  {cameras.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  type="datetime-local"
                  value={filterStartTime}
                  onChange={e => setFilterStartTime(e.target.value)}
                  className="glass-input"
                  style={{ padding: '6px 12px', fontSize: 12, width: 'auto' }}
                />
                <input
                  type="datetime-local"
                  value={filterEndTime}
                  onChange={e => setFilterEndTime(e.target.value)}
                  className="glass-input"
                  style={{ padding: '6px 12px', fontSize: 12, width: 'auto' }}
                />
                <button
                  onClick={() => { setFilterStartTime(""); setFilterEndTime(""); setSelectedCamera("all"); }}
                  style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 12 }}
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="gallery-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, overflowY: 'auto' }}>
              {events.filter(e => e.snapshot_id).map(e => (
                <div key={e.id} className="gallery-item" onClick={() => window.open(`${BACKEND_URL}/snapshot/${e.snapshot_id}`, '_blank')} style={{ aspectRatio: '16/9', background: '#000', borderRadius: 8, overflow: 'hidden', position: 'relative', cursor: 'pointer', border: '1px solid var(--glass-border)' }}>
                  <img src={`${BACKEND_URL}/snapshot/${e.snapshot_id}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8, background: 'rgba(0,0,0,0.8)', fontSize: 11 }}>
                    {e.camera_id} - {new Date(e.time * 1000).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Page */}
        {activeTab === "settings" && (
          <div className="glass-panel">
            <div className="panel-header">
              <div className="panel-title"><Settings size={18} /> System Settings</div>
            </div>
            <div style={{ padding: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="checkbox"
                  checked={multiDetectionEnabled}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setMultiDetectionEnabled(val);
                    fetch(`${BACKEND_URL}/system/config`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ multi_detection_enabled: val })
                    });
                  }}
                  style={{ width: 16, height: 16 }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>Enable Multi-Stream Detection</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Process multiple cameras concurrently (Beta)</div>
                </div>
              </label>
            </div>
          </div>
        )}

      </main>

      {/* Detail Overlay */}
      {activeEvent && (
        <div className="detail-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(5px)' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: 1000, height: '90%', overflowY: 'auto', background: '#0f172a', border: '1px solid #334155' }}>
            <div className="panel-header" style={{ borderBottom: '1px solid #334155', paddingBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0 }}>Accident Details</h2>
                <div className="event-time" style={{ marginTop: 4 }}>ID: {activeEvent.id}</div>
              </div>
              <button onClick={() => setActiveEvent(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginTop: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ aspectRatio: '16/9', background: '#000', borderRadius: 12, overflow: 'hidden', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {activeEvent.snapshot_id ? (
                    <img src={`${BACKEND_URL}/snapshot/${activeEvent.snapshot_id}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : <span style={{ color: '#64748b' }}>No Snapshot</span>}
                </div>
                <div className="detail-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="glass-panel" style={{ padding: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SEVERITY</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#fca5a5' }}>{activeEvent.severity}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>TYPE</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{activeEvent.type}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SPEED</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{activeEvent.rel_speed?.toFixed(1) || '-'}</div>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ height: 300, background: '#000', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                  {activeEvent.location_lat ? (
                    <MapContainer center={[activeEvent.location_lat, activeEvent.location_lng]} zoom={15} style={{ width: '100%', height: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[activeEvent.location_lat, activeEvent.location_lng]} />
                    </MapContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>No GPS Data</div>
                  )}
                </div>
                <div className="glass-panel" style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 14, marginTop: 0 }}>Metadata</h3>
                  <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Camera</span> <span>{activeEvent.camera_id}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Location</span> <span>{activeEvent.location}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Confidence</span> <span>{activeEvent.iou?.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LocationMarker({ lat, lng, onLocationSelect }) {
  const map = useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });
  useEffect(() => {
    if (lat !== null && lng !== null && lat !== undefined && lng !== undefined) {
      map.flyTo([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);
  return lat === null || lng === null ? null : <Marker position={[lat, lng]} />;
}

export default App;
