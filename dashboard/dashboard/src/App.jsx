import { useEffect, useState } from "react";

/**
 * Simple dashboard that fetches backend status and shows live MJPEG feed.
 * Adjust endpoints if your backend runs on a different host/port.
 */

export default function App() {
  const [status, setStatus] = useState("Checking...");
  const backendBase = "http://127.0.0.1:5000"; // adjust if needed

  useEffect(() => {
    fetch(`${backendBase}/status`)
      .then((r) => r.json())
      .then((data) => setStatus(data?.status ?? "OK"))
      .catch(() => setStatus("Backend not reachable"));
  }, []);

  return (
    <div className="page">
      <header className="header">
        <h1>⚠️ Accident Detection Dashboard</h1>
        <div className="status">Backend status: <strong>{status}</strong></div>
      </header>

      <main className="content">
        <section className="panel">
          <h2>Live Feed</h2>
          <div className="video-wrap">
            <img
              className="live"
              src={`${backendBase}/video_feed`}
              alt="Live feed"
              onError={() => {}}
            />
          </div>
          <p className="hint">If the feed is blank, confirm the Python backend is running and serving /video_feed.</p>
        </section>

        <section className="panel">
          <h2>Recent Alerts</h2>
          <div className="alerts">
            <p>No alerts yet — when the backend detects a crash it should log/send alerts here (future feature).</p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <small>Local development — connects to your Python backend. See prototype_accident_detector.py for server code. :contentReference[oaicite:2]{index=2}</small>
      </footer>
    </div>
  );
}
