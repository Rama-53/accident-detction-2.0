// src/App.jsx
import { useEffect, useState } from "react";
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
        const query =
          selectedCamera && selectedCamera !== "all"
            ? `?camera_id=${encodeURIComponent(selectedCamera)}`
            : "";
        const res = await fetch(`${BACKEND_URL}/events${query}`);
        const data = await res.json();
        setEvents(data);
      } catch (err) {
        console.error("Error fetching events:", err);
      }
    }

    fetchEvents();
    const id = setInterval(fetchEvents, 2000);
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
      name: overrides.name || meta.camera_name || meta.label || "",
      location: overrides.location || meta.location || "",
      lat:
        meta.location_lat !== undefined && meta.location_lat !== null
          ? meta.location_lat
          : null,
      lng:
        meta.location_lng !== undefined && meta.location_lng !== null
          ? meta.location_lng
          : null,
    };
  };

  const buildMapUrlFromInfo = (info) => {
    if (!info) return null;
    if (
      info.lat !== null &&
      info.lat !== undefined &&
      info.lng !== null &&
      info.lng !== undefined
    ) {
      return `https://www.google.com/maps?q=${info.lat},${info.lng}&z=16&output=embed`;
    }
    if (info.location && info.location.trim()) {
      return `https://www.google.com/maps?q=${encodeURIComponent(
        info.location
      )}&z=15&output=embed`;
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
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">Accident<span>AI</span></div>
        <nav className="nav">
          <button className="nav-item active">Dashboard</button>
          <button className="nav-item">Alerts</button>
          <button className="nav-item">Gallery</button>
          <button className="nav-item">Settings</button>
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
          {/* Live Feed card */}
          <div className="card live-feed">
            <h2>Live Feed</h2>
            <div className="video-source-select">
              <label htmlFor="videoSourceSelect">Source:</label>
              {videoSources.length === 0 ? (
                <span className="video-source-hint">No sources configured</span>
              ) : (
                <select
                  id="videoSourceSelect"
                  value={selectedVideoSource}
                  onChange={(e) => {
                    setSelectedVideoSource(e.target.value);
                  }}
                >
                  {videoSources.map((src) => (
                    <option key={src.id} value={src.id}>
                      {src.label}
                    </option>
                  ))}
                </select>
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
                <div className="camera-meta-field">
                  <label htmlFor="cameraName">Camera name</label>
                  <input
                    id="cameraName"
                    type="text"
                    placeholder="e.g. Main St & 5th"
                    value={selectedSourceInfo.name}
                    onChange={(e) =>
                      updateCameraMetaValue(
                        selectedVideoSource,
                        "name",
                        e.target.value
                      )
                    }
                  />
                </div>
                <div className="camera-meta-field">
                  <label htmlFor="cameraLocation">Camera location</label>
                  <input
                    id="cameraLocation"
                    type="text"
                    placeholder="City / Intersection"
                    value={selectedSourceInfo.location}
                    onChange={(e) =>
                      updateCameraMetaValue(
                        selectedVideoSource,
                        "location",
                        e.target.value
                      )
                    }
                  />
                </div>
                <small className="video-source-hint">
                  This info is used for the map and alert detail page.
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
            <div className="camera-map-info">
              <p className="camera-map-name">
                {selectedSourceInfo.name ||
                  currentVideoSource?.label ||
                  "Select a source"}
              </p>
              <p className="camera-map-location">
                {selectedSourceInfo.location || "Location not set"}
              </p>
            </div>
            {liveFeedMapUrl ? (
              <iframe
                src={liveFeedMapUrl}
                title="Camera location map"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <div className="camera-map-placeholder">
                Provide a location (or coordinates) for this camera to view it
                on the map.
              </div>
            )}
          </div>

          {/* Multi-feed wall */}
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
                    <label
                      key={src.id}
                      className={`multi-feed-option ${
                        checked ? "selected" : ""
                      } ${disabled ? "disabled" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => {
                          setMultiSourceIds((prev) => {
                            if (checked) {
                              return prev.filter((id) => id !== src.id);
                            }
                            if (prev.length >= MAX_MULTI_FEEDS) {
                              return prev;
                            }
                            return [...prev, src.id];
                          });
                        }}
                      />
                      <span>{src.label}</span>
                    </label>
                  );
                })
              )}
            </div>

            {multiSourceIds.some(
              (srcId) => getSourceMeta(srcId)?.requires_value
            ) && (
              <div className="multi-feed-inputs">
                {multiSourceIds.map((srcId) => {
                  const meta = getSourceMeta(srcId);
                  if (!meta || !meta.requires_value) {
                    return null;
                  }
                  const valueReady = sourceHasRequiredValue(srcId);
                  return (
                    <div
                      key={`${srcId}-input`}
                      className="video-source-custom"
                    >
                      <label className="video-source-input-label">
                        {meta.label} input:
                      </label>
                      <input
                        type={meta.value_type === "number" ? "number" : "text"}
                        placeholder={
                          meta.value_hint || "Enter path / URL / webcam index"
                        }
                        value={getSourceValue(srcId)}
                        onChange={(e) =>
                          setVideoSourceValues((prev) => ({
                            ...prev,
                            [srcId]: e.target.value,
                          }))
                        }
                        className="video-source-input"
                      />
                      {!valueReady && (
                        <small className="video-source-hint">
                          Provide connection details for {meta.label}.
                        </small>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="multi-feed-grid">
              {multiSourceIds.length === 0 && (
                <p className="video-source-hint">
                  Select up to {MAX_MULTI_FEEDS} sources to preview them here.
                </p>
              )}
              {multiSourceIds.map((srcId) => {
                const meta = getSourceMeta(srcId);
                const ready = sourceHasRequiredValue(srcId);
                const info = getCameraInfo(srcId);
                return (
                  <div key={srcId} className="multi-feed-tile">
                    <div className="multi-feed-label">
                      {info.name || meta?.label || srcId}
                    </div>
                    {ready ? (
                      <img
                        src={buildFeedUrl(srcId)}
                        alt={meta?.label || srcId}
                        className="multi-feed-img"
                        onError={(e) => {
                          console.error(
                            `Error loading feed for ${srcId}`,
                            e
                          );
                          e.target.style.opacity = 0;
                        }}
                      />
                    ) : (
                      <div className="multi-feed-placeholder">
                        Provide connection details to preview this feed.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="card">
            <h2>Recent Alerts</h2>
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

          {/* Map placeholder */}
          <div className="card">
            <h2>Map (Placeholder)</h2>
            <div className="card-body">
              <p>Enable Leaflet for live map. See README.</p>
            </div>
          </div>
        </section>
      </main>
      {activeEvent && (
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
                <h3>Snapshot</h3>
                {activeEvent.snapshot_id ? (
                  <img
                    src={`${BACKEND_URL}/snapshot/${activeEvent.snapshot_id}`}
                    alt="Accident snapshot"
                    className="detail-snapshot"
                  />
                ) : (
                  <div className="detail-snapshot placeholder">
                    No snapshot available
                  </div>
                )}
              </div>
              <div className="detail-map">
                <h3>Accident location</h3>
                {detailMapUrl ? (
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
      )}
    </div>
  );
}

export default App;
