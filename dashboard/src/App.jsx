// src/App.jsx
import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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
        const data = await res.json(); // { status: "Running" }
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

  // Fetch available cameras (for filter)
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

  // Fetch available video sources for live feed preview
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
          const defaultOption =
            data.find((opt) => opt.is_default) || data[0];
          setSelectedVideoSource((prev) => prev || defaultOption.id);
          setMultiSourceIds((prev) =>
            prev.length > 0 ? prev : [defaultOption.id]
          );
        }
      } catch (err) {
        console.error("Error fetching video sources:", err);
      }
    }

    fetchVideoSources();
    const id = setInterval(fetchVideoSources, 15000);
    return () => clearInterval(id);
  }, []);

  const getSourceMeta = (sourceId) =>
    videoSources.find((src) => src.id === sourceId);

  const getSourceValue = (sourceId) =>
    (sourceId && videoSourceValues[sourceId]) || "";

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
      if (val) {
        params.set("source_value", val);
      }
    }
    const query = params.toString();
    return `${BACKEND_URL}/video_feed${query ? `?${query}` : ""}`;
  };

  const currentVideoSource = getSourceMeta(selectedVideoSource);
  const currentRequiresValue = currentVideoSource?.requires_value;
  const currentValue = getSourceValue(selectedVideoSource);
  const hasValueReady = selectedVideoSource && sourceHasRequiredValue(selectedVideoSource);

  const getCameraInfo = (sourceId) => {
    if (!sourceId) {
      return { name: "", location: "", lat: null, lng: null };
    }
    const meta = getSourceMeta(sourceId) || {};
    const overrides = cameraMetaValues[sourceId] || {};
    return {
      name: overrides.name !== undefined ? overrides.name : (meta.camera_name || meta.label || ""),
      location: overrides.location !== undefined ? overrides.location : (meta.location || ""),
      lat:
        overrides.lat !== undefined && overrides.lat !== null
          ? overrides.lat
          : meta.location_lat !== undefined && meta.location_lat !== null
            ? meta.location_lat
            : null,
      lng:
        overrides.lng !== undefined && overrides.lng !== null
          ? overrides.lng
          : meta.location_lng !== undefined && meta.location_lng !== null
            ? meta.location_lng
            : null,
      detection_enabled: overrides.detection_enabled !== undefined
        ? overrides.detection_enabled
        : meta.detection_enabled !== undefined ? meta.detection_enabled : false,
    };
  };

  const buildMapUrlFromInfo = (info) => {
    if (!info) return null;
    // Prioritize text location if available (so user edits reflect immediately)
    if (info.location && info.location.trim()) {
      return `https://www.google.com/maps?q=${encodeURIComponent(
        info.location
      )}&z=15&output=embed`;
    }
    if (
      info.lat !== null &&
      info.lat !== undefined &&
      info.lng !== null &&
      info.lng !== undefined
    ) {
      return `https://www.google.com/maps?q=${info.lat},${info.lng}&z=16&output=embed`;
    }
    return null;
  };

  const selectedSourceInfo = getCameraInfo(selectedVideoSource);
  const liveFeedMapUrl = buildMapUrlFromInfo(selectedVideoSource ? selectedSourceInfo : null);

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

  // Autocomplete state
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

    // Debounce
    if (suggestionTimeout.current) clearTimeout(suggestionTimeout.current);
    suggestionTimeout.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 500);
  };

  const selectSuggestion = (s) => {
    const name = s.display_name; // Full address
    // Prefer simpler name? 
    // s.address.city || s.address.town || s.address.village ...
    // Let's use display_name for clarity or trim it.

    updateCameraMetaValue(selectedVideoSource, "location", name);
    setShowSuggestions(false);

    // Update coordinates and save
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    updateCameraMetaValue(selectedVideoSource, "lat", lat);
    updateCameraMetaValue(selectedVideoSource, "lng", lng);

    saveCameraConfig(selectedVideoSource, { lat, lng, location: name });
  };

  const handleLocationCommit = async (sourceId, text) => {
    if (!sourceId) return;
    // 1. Try to geocode
    const coords = await geocodeLocation(text);
    if (coords) {
      updateCameraMetaValue(sourceId, "lat", coords.lat);
      updateCameraMetaValue(sourceId, "lng", coords.lng);
      // Wait for state update to propagate? 
      // Since updateCameraMetaValue is async (setState), we might have a race condition if we call save immediately with old state.
      // Better to call save with explicit values or rely on a specialized save function.
      // Let's modify saveCameraConfig or just creating a specialized save here.

      // Actually, let's update the meta values first, then call save. 
      // To ensure we save the NEW coords, we pass them directly to an enhanced save function or just update the object in memory before saving.
      // Since `saveCameraConfig` reads from state `cameraMetaValues`, rely on `setTimeout` or pass overrides.
      // Let's pass overrides to `saveCameraConfig`.

      saveCameraConfig(sourceId, { lat: coords.lat, lng: coords.lng });
    } else {
      saveCameraConfig(sourceId);
    }
  };

  const saveCameraConfig = async (sourceId, overrides = {}) => {
    if (!sourceId) return;

    // Find the actual camera_id associated with this source
    const sourceObj = videoSources.find(s => s.id === sourceId);
    // Fallback to sourceId if no camera_id found (though usually there should be one)
    const cameraId = (sourceObj && sourceObj.camera_id) ? sourceObj.camera_id : sourceId;

    const meta = cameraMetaValues[sourceId] || {};
    // Merge overrides
    const payload = {
      name: meta.name,
      location: meta.location,
      lat: overrides.lat !== undefined ? overrides.lat : meta.lat,
      lng: overrides.lng !== undefined ? overrides.lng : meta.lng,
      detection_enabled: overrides.detection_enabled !== undefined ? overrides.detection_enabled : (meta.detection_enabled ?? true),
    };

    try {
      const res = await fetch(`${BACKEND_URL}/cameras/${encodeURIComponent(cameraId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        console.log(`Camera config saved for ${cameraId}`);
        // Opt: Show a toast?
      } else {
        console.error("Failed to save camera config");
      }
    } catch (err) {
      console.error("Error saving camera config:", err);
    }
  };

  const buildMapEmbedUrl = (evt) => {
    if (!evt) return null;
    const { location_lat: lat, location_lng: lng } = evt;
    if (
      lat !== undefined &&
      lat !== null &&
      lng !== undefined &&
      lng !== null
    ) {
      return `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
    }
    if (evt.location && evt.location.trim()) {
      return `https://www.google.com/maps?q=${encodeURIComponent(
        evt.location
      )}&z=15&output=embed`;
    }
    return null;
  };

  const detailMapUrl = buildMapEmbedUrl(activeEvent);

  return (
    <div className="app-root">
      {showIntro && (
        <div className="intro-overlay">
          <video
            src="/intro.mp4"
            autoPlay
            muted
            playsInline
            className="intro-video"
            onEnded={() => setShowIntro(false)}
            onError={(e) => console.log("Intro video missing or error", e)}
          />
          <button className="skip-btn" onClick={() => setShowIntro(false)}>
            Skip Intro
          </button>
        </div>
      )}
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">Accident<span>AI</span></div>
        <nav className="nav">
          <button
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`nav-item ${activeTab === "camerawall" ? "active" : ""}`}
            onClick={() => setActiveTab("camerawall")}
          >
            Camera Wall
          </button>
          <button
            className={`nav-item ${activeTab === "alerts" ? "active" : ""}`}
            onClick={() => setActiveTab("alerts")}
          >
            Alerts
          </button>
          <button
            className={`nav-item ${activeTab === "gallery" ? "active" : ""}`}
            onClick={() => setActiveTab("gallery")}
          >
            Gallery
          </button>
          <button
            className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            Settings
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="main">
        <header className="header">
          <div className="header-left">
            <h1>Accident Detection</h1>
            <p>Real-time camera monitoring &amp; alerts</p>
          </div>
          <div className="header-right">
            <div className="camera-select">
              <label htmlFor="cameraSelect">Camera:</label>
              <select
                id="cameraSelect"
                value={selectedCamera || "all"}
                onChange={(e) => setSelectedCamera(e.target.value)}
              >
                <option value="all">All</option>
                {cameras.map((cam) => (
                  <option key={cam} value={cam}>
                    {cam}
                  </option>
                ))}
              </select>
            </div>
            <div className="status-pill">
              Status: <span>{status}</span>
            </div>
          </div>
        </header>

        <section className="grid">
          {activeTab === "dashboard" && (
            <>
              {/* Live Feed card */}
              <div className="card live-feed">
                <h2>Live Feed</h2>
                <div className="video-source-select">
                  <label htmlFor="videoSourceSelect">Source:</label>
                  {videoSources.length === 0 ? (
                    <span className="video-source-hint">No sources configured</span>
                  ) : (
                    <>
                      <select
                        id="videoSourceSelect"
                        value={selectedVideoSource}
                        onChange={(e) => {
                          setSelectedVideoSource(e.target.value);
                        }}
                        style={{ marginRight: '1rem' }}
                      >
                        {videoSources.map((src) => (
                          <option key={src.id} value={src.id}>
                            {src.label}
                          </option>
                        ))}
                      </select>

                      <label className="detection-toggle">
                        <input
                          type="checkbox"
                          checked={getCameraInfo(selectedVideoSource).detection_enabled}
                          onChange={(e) => {
                            const newState = e.target.checked;
                            updateCameraMetaValue(selectedVideoSource, "detection_enabled", newState);
                            saveCameraConfig(selectedVideoSource, { detection_enabled: newState });
                          }}
                        />
                        <span>Detection {getCameraInfo(selectedVideoSource).detection_enabled ? "ON" : "OFF"}</span>
                      </label>
                    </>
                  )}
                </div>

                {currentVideoSource?.requires_value && (
                  <div className="video-source-custom">
                    <input
                      type={
                        currentVideoSource.value_type === "number"
                          ? "number"
                          : "text"
                      }
                      placeholder={
                        currentVideoSource.value_hint ||
                        "Enter path / URL / webcam index"
                      }
                      value={currentValue}
                      onChange={(e) =>
                        setVideoSourceValues((prev) => ({
                          ...prev,
                          [selectedVideoSource]: e.target.value,
                        }))
                      }
                      className="video-source-input"
                    />
                    <small className="video-source-hint">
                      {currentVideoSource.description ||
                        "Provide connection details for this source"}
                    </small>
                  </div>
                )}

                {selectedVideoSource && (
                  <div className="camera-meta-editor">
                    <button
                      className="set-source-btn"
                      style={{
                        background: 'rgba(74, 222, 128, 0.2)',
                        border: '1px solid rgba(74, 222, 128, 0.5)',
                        color: '#e5eef5',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        marginBottom: '8px'
                      }}
                      onClick={() => {
                        // We assume 'demo_cam_main' is the primary detector ID.
                        // We want to set its 'video_source' to the *actual* source of the currently selected preview.
                        // 1. Get current actual source
                        let actualSource = null;
                        const meta = getSourceMeta(selectedVideoSource);
                        if (meta.requires_value) {
                          actualSource = getSourceValue(selectedVideoSource);
                        } else {
                          actualSource = meta.source;
                        }

                        if (actualSource === null || actualSource === undefined || actualSource === "") {
                          alert(`Please enter a value for this source first. (Value was: ${actualSource})`);
                          return;
                        }

                        // 2. Update demo_cam_main config
                        // We use 'demo_cam_main' because that's what detector_publisher polls by default.
                        const targetCamId = "demo_cam_main";

                        // We need to fetch current config to preserve other fields? 
                        // Or just send the update. Our API endpoint in App.jsx (saveCameraConfig)
                        // merges overrides with existing meta if we just pass overrides to it?
                        // Actually saveCameraConfig merges 'cameraMetaValues[sourceId]' + overrides.
                        // But here we want to update a *different* camera ID (targetCamId) with a value from *selectedVideoSource*.

                        // 2. Resource Conflict Prevention (Windows)
                        // We must STOP the live feed (API preview) BEFORE the detector tries to open the same camera.
                        // Otherwise, both processes compete for the webcam, causing a freeze.

                        // Step A: Kill the current preview immediately
                        setSelectedVideoSource(""); // This unmounts the <img src> for the local preview

                        // Step B: Wait for the API to release the camera handle (cap.release() in finally block)
                        // 2.5 seconds should be safe.
                        const DELAY_MS = 2500;
                        alert(`Releasing camera... Please wait ${DELAY_MS / 1000}s before detector takes over.`);

                        setTimeout(() => {
                          // Step C: Now it's safe to tell the detector to grab the camera
                          const payload = { video_source: String(actualSource) };
                          // alert(`Sending payload: ${JSON.stringify(payload)}`); // Debug

                          fetch(`${BACKEND_URL}/cameras/${targetCamId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                          })
                            .then(res => res.json())
                            .then(() => {
                              // Step D: Switch UI to detector stream
                              alert(`Detector matched! Switching view...`);
                              setSelectedVideoSource("detector_stream");
                            })
                            .catch(err => {
                              console.error(err);
                              alert("Failed to switch source");
                            });
                        }, DELAY_MS);
                      }}
                    >
                      Set as Active Detector Input
                    </button>

                    {/* Inputs moved to Camera Location card */}
                    <small className="video-source-hint">
                      Configure name and location in the "Camera Location" card.
                    </small>
                  </div>
                )}
                <div className="live-feed-body">
                  {hasValueReady ? (
                    <img
                      src={buildFeedUrl(selectedVideoSource)}
                      alt="Live feed"
                      className="live-feed-img"
                      onError={(e) => {
                        console.error("Error loading live feed");
                        e.target.style.opacity = 0;
                      }}
                    />
                  ) : (
                    <div className="live-feed-placeholder">
                      Enter connection details to preview this source.
                    </div>
                  )}
                </div>
                <p className="card-hint">
                  If blank, ensure backend is running at <code>{BACKEND_URL}</code>{" "}
                  and serving <code>/video_feed</code>.
                </p>
              </div>

              {/* Camera map card */}
              <div className="card camera-map">
                <h2>Camera Location</h2>
                <div className="video-source-select">
                  <label htmlFor="videoSourceSelect">Source:</label>
                  {videoSources.length === 0 ? (
                    <span className="video-source-hint">No sources configured</span>
                  ) : (
                    <>
                      <select
                        id="videoSourceSelect"
                        value={selectedVideoSource}
                        onChange={(e) => {
                          setSelectedVideoSource(e.target.value);
                        }}
                        style={{ marginRight: '1rem' }}
                      >
                        {videoSources.map((src) => (
                          <option key={src.id} value={src.id}>
                            {src.label}
                          </option>
                        ))}
                      </select>

                      <label className="detection-toggle">
                        <input
                          type="checkbox"
                          checked={selectedSourceInfo.detection_enabled}
                          onChange={(e) => {
                            const newState = e.target.checked;
                            updateCameraMetaValue(selectedVideoSource, "detection_enabled", newState);
                            saveCameraConfig(selectedVideoSource, { detection_enabled: newState });
                          }}
                        />
                        <span>Detection {selectedSourceInfo.detection_enabled ? "ON" : "OFF"}</span>
                      </label>
                    </>
                  )}
                </div>
                <div className="camera-map-info">
                  <div className="camera-meta-field">
                    <input
                      className="camera-map-name-input"
                      type="text"
                      placeholder="Camera Name"
                      value={selectedSourceInfo.name}
                      onChange={(e) =>
                        updateCameraMetaValue(
                          selectedVideoSource,
                          "name",
                          e.target.value
                        )
                      }
                      onBlur={() => saveCameraConfig(selectedVideoSource)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveCameraConfig(selectedVideoSource);
                      }}
                    />
                  </div>
                  <div className="camera-meta-field" style={{ position: 'relative' }}>
                    <input
                      className="camera-map-location-input"
                      type="text"
                      placeholder="Location (City/Intersection)"
                      value={selectedSourceInfo.location}
                      onChange={handleLocationChange}
                      onBlur={(e) => {
                        // Delayed hide to allow click on suggestion
                        setTimeout(() => setShowSuggestions(false), 200);
                        handleLocationCommit(selectedVideoSource, e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setShowSuggestions(false);
                          handleLocationCommit(selectedVideoSource, e.target.value);
                        }
                      }}
                    />
                    {showSuggestions && locationSuggestions.length > 0 && (
                      <ul className="suggestions-dropdown">
                        {locationSuggestions.map((s) => (
                          <li key={s.place_id} onClick={() => selectSuggestion(s)}>
                            {s.display_name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                {/* Leaflet Map Logic */}
                <div style={{ height: "300px", width: "100%", marginTop: "10px", borderRadius: "8px", overflow: "hidden" }}>
                  <MapContainer
                    center={[
                      selectedSourceInfo.lat || 20.5937,
                      selectedSourceInfo.lng || 78.9629
                    ]}
                    zoom={selectedSourceInfo.lat ? 13 : 4}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker
                      lat={selectedSourceInfo.lat}
                      lng={selectedSourceInfo.lng}
                      onLocationSelect={(lat, lng) => {
                        updateCameraMetaValue(selectedVideoSource, "lat", lat);
                        updateCameraMetaValue(selectedVideoSource, "lng", lng);
                        // Also trigger save immediately? Or wait for user to confirm?
                        // Let's trigger save for seamless "drop pin to set"
                        // Need to access cameraMetaValues state which might be stale in this callback if not careful,
                        // but updateCameraMetaValue updates state.
                        // We can call saveCameraConfig but we need to ensure state is updated first.
                        // Actually, let's just update local state and let user press "Enter" in fields or maybe add a "Save" button? 
                        // User requested "drop the pin to set exact location", implies immediate effect.
                        // We'll wrap save in a timeout or useEffect or just call it:
                        setTimeout(() => saveCameraConfig(selectedVideoSource), 100);
                      }}
                    />
                  </MapContainer>
                </div>
              </div>
            </>
          )
          }

          {/* Multi-feed wall - Moved to separate tab */}
          {
            activeTab === "camerawall" && (
              <div className="card multi-feed">
                <h2>Multi Camera Wall</h2>
                <div className="multi-feed-controls">
                  {videoSources.length === 0 ? (
                    <span className="video-source-hint">
                      Configure sources in backend to enable multi view.
                    </span>
                  ) : (
                    videoSources.map((src) => {
                      const checked = multiSourceIds.includes(src.id);
                      const disabled =
                        !checked &&
                        multiSourceIds.length >= MAX_MULTI_FEEDS;
                      return (
                        <div key={src.id} className="multi-feed-control-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                          <label
                            className={`multi-feed-option ${checked ? "selected" : ""
                              } ${disabled ? "disabled" : ""}`}
                            style={{ margin: 0 }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (multiSourceIds.length < MAX_MULTI_FEEDS) {
                                    setMultiSourceIds((prev) => [...prev, src.id]);
                                  }
                                } else {
                                  setMultiSourceIds((prev) =>
                                    prev.filter((id) => id !== src.id)
                                  );
                                }
                              }}
                            />
                            {src.label}
                          </label>

                          <label className="detection-toggle" style={{ fontSize: '0.8rem' }} title="Toggle AI Detection">
                            <input
                              type="checkbox"
                              checked={getCameraInfo(src.id).detection_enabled}
                              onChange={(e) => {
                                const newState = e.target.checked;
                                updateCameraMetaValue(src.id, "detection_enabled", newState);
                                saveCameraConfig(src.id, { detection_enabled: newState });
                              }}
                            />
                            <span>AI</span>
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="multi-feed-grid">
                  {multiSourceIds.length === 0 && (
                    <div className="multi-feed-placeholder">
                      Select cameras above to monitor multiple feeds seamlessly.
                    </div>
                  )}
                  {multiSourceIds.map((sourceId) => {
                    const hasVal = sourceHasRequiredValue(sourceId);
                    return (
                      <div key={sourceId} className="multi-feed-item">
                        <div className="multi-feed-overlay">
                          {getSourceMeta(sourceId)?.label || sourceId}
                        </div>
                        {hasVal ? (
                          <img
                            src={buildFeedUrl(sourceId)}
                            alt={sourceId}
                            className="multi-feed-img"
                            onError={(e) => {
                              e.target.style.opacity = 0;
                            }}
                          />
                        ) : (
                          <div className="multi-feed-error">No Signal</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          }
          {activeTab === "settings" && (
            <div className="card settings-card">
              <h2>System Settings</h2>
              <div className="setting-group" style={{ marginBottom: '2rem' }}>
                <h3>Simultaneous Detection</h3>
                <label className="toggle-switch" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
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
                      }).catch(err => console.error(err));
                    }}
                  />
                  <span className="label-text">Enable Multi-Stream Detection (Beta)</span>
                </label>
                <p className="setting-hint" style={{ color: '#888', fontSize: '0.9rem', marginTop: '5px' }}>
                  Allows the backend to process multiple video feeds concurrently if supported.
                </p>
              </div>

              <div className="setting-group">
                <h3>Camera Management</h3>
                <div className="camera-list" style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
                  {videoSources.map(src => (
                    <div key={src.id} className="camera-list-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <span className="camera-name" style={{ fontWeight: 'bold' }}>{src.label}</span>
                        <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{src.description}</div>
                      </div>
                      <div className="camera-actions">
                        <span className="badge" style={{ background: '#333', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{src.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="card alerts-full" style={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ marginBottom: '1rem' }}>Alert History</h2>
                <div className="filters-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <select value={selectedCamera} onChange={e => setSelectedCamera(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <option value="all">All Cameras</option>
                    {cameras.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="datetime-local" value={filterStartTime} onChange={e => setFilterStartTime(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <input type="datetime-local" value={filterEndTime} onChange={e => setFilterEndTime(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <button onClick={() => { setFilterStartTime(""); setFilterEndTime(""); setSelectedCamera("all"); }} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>Reset</button>
                </div>
              </div>
              <div className="alerts-list scroll" style={{ flex: 1, overflowY: 'auto' }}>
                {events.length === 0 && <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No alerts found for current criteria.</p>}
                {events.map(e => (
                  <div key={e.id} className="event-row" onClick={() => setActiveEvent(e)} style={{ display: 'grid', gridTemplateColumns: '40px 180px 1fr 100px', gap: '10px', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', alignItems: 'center' }}>
                    <span className={`severity-dot sev-${e.severity}`} style={{ width: '12px', height: '12px', borderRadius: '50%', display: 'inline-block' }}></span>
                    <span className="time">{new Date(e.time * 1000).toLocaleString()}</span>
                    <span className="camera" style={{ color: '#aaa' }}>{e.camera_id}</span>
                    <span className="type" style={{ textTransform: 'capitalize' }}>{e.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "gallery" && (
            <div className="card gallery-full" style={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ marginBottom: '1rem' }}>Snapshot Gallery</h2>
                <div className="filters-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <select value={selectedCamera} onChange={e => setSelectedCamera(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <option value="all">All Cameras</option>
                    {cameras.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="datetime-local" value={filterStartTime} onChange={e => setFilterStartTime(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <input type="datetime-local" value={filterEndTime} onChange={e => setFilterEndTime(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <button onClick={() => { setFilterStartTime(""); setFilterEndTime(""); setSelectedCamera("all"); }} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>Reset</button>
                </div>
              </div>
              <div className="gallery-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px', overflowY: 'auto', paddingRight: '10px' }}>
                {events.filter(e => e.snapshot_id).length === 0 && <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No snapshots found for current criteria.</p>}
                {events.filter(e => e.snapshot_id).map(e => (
                  <div key={e.id} className="gallery-item" onClick={() => window.open(`${BACKEND_URL}/snapshot/${e.snapshot_id}`, '_blank')} style={{ cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', position: 'relative', aspectRatio: '16/9', background: '#000' }}>
                    <img src={`${BACKEND_URL}/snapshot/${e.snapshot_id}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(ev) => ev.target.style.display = "none"} />
                    <div className="gallery-meta" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px', background: 'rgba(0,0,0,0.8)', fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.camera_id}</div>
                      <div style={{ color: '#aaa' }}>{new Date(e.time * 1000).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Alerts & Snapshots - Dashboard specific */}
          {
            activeTab === "dashboard" && (
              <>
                {/* Recent Alerts */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Recent Alerts</h2>
                    <button
                      className="clear-alerts-btn"
                      onClick={async () => {
                        if (confirm("Are you sure you want to clear all alerts?")) {
                          try {
                            await fetch(`${BACKEND_URL}/accidents`, { method: 'DELETE' });
                            setEvents([]); // clear local state
                          } catch (e) {
                            console.error("Failed to clear alerts", e);
                          }
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid #ff4444',
                        color: '#ff4444',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                      }}
                    >
                      Clear Alerts
                    </button>
                  </div>
                  <div className="card-body scroll">
                    {events.length === 0 && <p>No alerts yet</p>}
                    {events.map((e) => (
                      <div
                        key={e.id}
                        className="event-item"
                        onClick={() => setActiveEvent(e)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(evt) => {
                          if (evt.key === "Enter" || evt.key === " ") {
                            evt.preventDefault();
                            setActiveEvent(e);
                          }
                        }}
                      >
                        {/* Snapshot thumbnail (if available) */}
                        {e.snapshot_id && (
                          <div className="event-thumb-wrap">
                            <img
                              src={`${BACKEND_URL}/snapshot/${e.snapshot_id}`}
                              alt="Accident snapshot"
                              className="event-thumb"
                              onError={(ev) => {
                                ev.target.style.display = "none";
                              }}
                            />
                          </div>
                        )}
                        <div className="event-content">
                          <div className="event-header">
                            <span className="event-type">
                              {e.type || "accident"}
                            </span>
                            <span className={`event-severity sev-${e.severity}`}>
                              {e.severity}
                            </span>
                          </div>
                          <div className="event-meta">
                            <span>
                              Time:{" "}
                              {e.time
                                ? new Date(e.time * 1000).toLocaleString()
                                : "—"}
                            </span>
                            <span>
                              Camera: {e.camera_id && e.camera_id.trim()
                                ? e.camera_id
                                : "—"}
                            </span>
                            <span>
                              Location: {e.location && e.location.trim()
                                ? e.location
                                : "—"}
                            </span>
                            <span>Rel speed: {e.rel_speed?.toFixed(2) ?? "—"}</span>
                            <span>IoU: {e.iou?.toFixed(2) ?? "—"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Snapshots */}
                <div className="card">
                  <h2>Snapshots</h2>
                  <div className="card-body scroll snaps">
                    {snapshots.length === 0 && <p>No snapshots</p>}
                    {snapshots.map((id) => (
                      <a
                        key={id}
                        href={`${BACKEND_URL}/snapshot/${id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="snapshot-link"
                      >
                        Snapshot {id}
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )
          }


        </section >
      </main >
      {
        activeEvent && (
          <div className="detail-overlay">
            <div className="detail-card">
              <div className="detail-card-header">
                <div>
                  <p className="detail-breadcrumb">Dashboard / Alert Detail</p>
                  <h2>Accident Information</h2>
                  <p className="detail-id">ID: {activeEvent.id}</p>
                </div>
                <button
                  className="detail-close"
                  onClick={() => setActiveEvent(null)}
                >
                  ← Back to dashboard
                </button>
              </div>

              <div className="detail-info-grid">
                <div>
                  <label>Camera</label>
                  <p>{activeEvent.camera_id || "—"}</p>
                </div>
                <div>
                  <label>Severity</label>
                  <p className={`event-severity sev-${activeEvent.severity}`}>
                    {activeEvent.severity}
                  </p>
                </div>
                <div>
                  <label>Time</label>
                  <p>
                    {activeEvent.time
                      ? new Date(activeEvent.time * 1000).toLocaleString()
                      : "—"}
                  </p>
                </div>
                <div>
                  <label>Location</label>
                  <p>{activeEvent.location || "—"}</p>
                </div>
                <div>
                  <label>IoU</label>
                  <p>{activeEvent.iou?.toFixed(2) ?? "—"}</p>
                </div>
                <div>
                  <label>Relative speed</label>
                  <p>{activeEvent.rel_speed?.toFixed(2) ?? "—"}</p>
                </div>
              </div>

              <div className="detail-content">
                <div className="detail-media">
                  <h3>Snapshots ({activeEvent.snapshot_count || (activeEvent.snapshot_id ? 1 : 0)})</h3>
                  {activeEvent.snapshot_id ? (
                    <div className="detail-snapshots-grid">
                      {/* Render all available crops */}
                      {Array.from({ length: activeEvent.snapshot_count || 1 }).map((_, idx) => (
                        <div key={idx} className="snapshot-wrapper">
                          <img
                            src={`${BACKEND_URL}/snapshot/${activeEvent.snapshot_id}?crop_idx=${idx}`}
                            alt={`Accident snapshot ${idx + 1}`}
                            className="detail-snapshot"
                            title={`Snapshot ${idx + 1}`}
                            onError={(e) => {
                              console.log("Snapshot load error", e);
                              e.target.style.display = "none";
                              e.target.parentNode.style.background = "#222";
                              e.target.parentNode.style.display = "flex";
                              e.target.parentNode.style.alignItems = "center";
                              e.target.parentNode.style.justifyContent = "center";
                              e.target.parentNode.textContent = "Image not found";
                              e.target.parentNode.style.color = "#888";
                              e.target.parentNode.style.fontSize = "12px";
                            }}
                          />
                          <span className="snapshot-label" style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>#{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="detail-snapshot placeholder">
                      No snapshot available
                    </div>
                  )}
                </div>
                <div className="detail-map">
                  <h3>Accident location</h3>
                  {activeEvent.location_lat && activeEvent.location_lng ? (
                    <div style={{ height: "300px", width: "100%", borderRadius: "12px", overflow: "hidden" }}>
                      <MapContainer
                        center={[activeEvent.location_lat, activeEvent.location_lng]}
                        zoom={15}
                        style={{ height: "100%", width: "100%" }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[activeEvent.location_lat, activeEvent.location_lng]} />
                      </MapContainer>
                    </div>
                  ) : detailMapUrl ? (
                    <iframe
                      src={detailMapUrl}
                      title="Accident location map"
                      allowFullScreen
                      loading="lazy"
                    />
                  ) : (
                    <div className="detail-map-placeholder">
                      Location data not available for this alert.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

// Helper component for map clicks
function LocationMarker({ lat, lng, onLocationSelect }) {
  const map = useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  // Pan map if external props change
  useEffect(() => {
    if (lat !== null && lng !== null && lat !== undefined && lng !== undefined) {
      map.flyTo([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);

  return lat === null || lng === null || lat === undefined || lng === undefined ? null : (
    <Marker position={[lat, lng]} />
  );
}

export default App;
