import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  fetchVideoSources,
  fetchEvents,
  getVideoFeedUrl,
  getSnapshotUrl,
  formatRelativeTime,
  type VideoSource,
  type Event,
} from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [cameras, setCameras] = useState<VideoSource[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch cameras and events on mount
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [cams, evts] = await Promise.all([
          fetchVideoSources(),
          fetchEvents(undefined, 10),
        ]);
        if (!active) return;
        setCameras(cams);
        setEvents(evts);
        if (cams.length > 0) {
          const defaultCam = cams.find(c => c.is_default) || cams[0];
          setSelectedCameraId(defaultCam.id);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();

    // Poll events every 5 seconds
    const interval = setInterval(async () => {
      try {
        const evts = await fetchEvents(undefined, 10);
        if (active) setEvents(evts);
      } catch { }
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const selectedCamera = cameras.find(c => c.id === selectedCameraId) || cameras[0];
  const onlineCameras = cameras.filter(c => c.detection_enabled);
  const recentAlerts = events.slice(0, 5);

  const severityColor: Record<string, string> = {
    high: 'severity-high',
    medium: 'severity-med',
    low: 'primary',
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 mt-4 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <span className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></span>
          <span className="text-sm font-medium">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 mt-4 space-y-6">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 pt-2 pb-4 bg-background-light dark:bg-background-dark border-b border-primary/10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="material-icons text-white">analytics</span>
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-wider text-slate-500">ADS 2.0</h1>
              <p className="text-lg font-bold">System Dashboard</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/incidents')}
            className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center relative"
          >
            <span className="material-icons text-primary">notifications</span>
            {events.length > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-severity-high border-2 border-background-dark rounded-full"></span>
            )}
          </button>
        </div>
      </header>

      {/* Live Monitoring Section */}
      <section className="space-y-3">
        <div className="flex justify-between items-end">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">Live Monitoring</h2>
          <div className="flex items-center gap-2">
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 text-xs rounded-lg py-1 pl-2 pr-6 focus:ring-2 focus:ring-primary outline-none"
            >
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id}>
                  {cam.camera_name || cam.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-severity-high/10 text-severity-high text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-severity-high animate-pulse"></span>
              REC
            </div>
          </div>
        </div>
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl group transition-all duration-300">
          {/* MJPEG Stream or placeholder */}
          {selectedCamera ? (
            <img
              key={selectedCamera.id}
              className="w-full h-full object-cover animate-in fade-in duration-500"
              alt={`Feed from ${selectedCamera.camera_name || selectedCamera.label}`}
              src={getVideoFeedUrl(selectedCamera.id)}
              onError={(e) => {
                // Fallback to a placeholder on error
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
              <span className="text-slate-500 text-sm">No camera selected</span>
            </div>
          )}

          <div className="absolute bottom-3 left-3 flex gap-2">
            <div className="glass-effect px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 text-xs font-medium text-white">
              <span className="material-icons text-sm">videocam</span>
              {selectedCamera?.camera_name || selectedCamera?.label || 'Camera'}
            </div>
          </div>
          <div className="absolute top-3 right-3">
            <button className="glass-effect w-8 h-8 rounded-lg border border-white/10 text-white flex items-center justify-center">
              <span className="material-icons text-sm">fullscreen</span>
            </button>
          </div>
        </div>
      </section>

      {/* Alerts Feed Horizontal Carousel */}
      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">Recent Alerts</h2>
          <Link to="/incidents" className="text-xs font-medium text-slate-500 hover:text-primary transition-colors">View All</Link>
        </div>
        <div className="flex overflow-x-auto gap-4 hide-scrollbar -mx-4 px-4 pb-2 snap-x">
          {recentAlerts.length === 0 ? (
            <div className="flex-shrink-0 w-full text-center py-8 text-slate-500">
              <span className="material-icons text-3xl mb-2 opacity-50">verified</span>
              <p className="text-sm">No recent alerts — all clear!</p>
            </div>
          ) : (
            recentAlerts.map((evt) => (
              <div
                key={evt.id}
                onClick={() => navigate(`/incidents/${evt.id}`)}
                className={clsx(
                  "flex-shrink-0 w-64 bg-neutral-dark rounded-xl border-l-4 p-4 shadow-lg snap-start cursor-pointer hover:bg-neutral-dark/80 transition-colors",
                  `border-${severityColor[evt.severity] || 'primary'}`
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={clsx(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter border",
                    evt.severity === 'high'
                      ? "bg-severity-high/20 text-severity-high border-severity-high/30"
                      : evt.severity === 'medium'
                        ? "bg-severity-med/20 text-severity-med border-severity-med/30"
                        : "bg-primary/20 text-primary border-primary/30"
                  )}>
                    {evt.severity} Severity
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">{formatRelativeTime(evt.time)}</span>
                </div>
                <h3 className="font-bold text-sm mb-1 capitalize">{evt.type}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="material-icons text-sm">location_on</span>
                  {evt.location || evt.camera_name || evt.camera_id}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* System Overview Stats */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">System Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-neutral-dark rounded-xl p-4 border border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Alerts</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-white">{events.length}</span>
            </div>
          </div>
          <div className="bg-neutral-dark rounded-xl p-4 border border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Active Nodes</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-white">{onlineCameras.length}/{cameras.length}</span>
              <span className="text-[10px] text-slate-500 mb-1">Online</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Map Section */}
      <section className="space-y-3">
        <div className="bg-neutral-dark rounded-xl overflow-hidden border border-white/5 shadow-xl">
          <div className="p-4 flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="material-icons text-primary text-sm">map</span>
              <h3 className="text-xs font-bold uppercase">Incident Map</h3>
            </div>
            <span className="text-[10px] text-slate-500 bg-background-dark px-2 py-1 rounded">
              {cameras.length} cameras
            </span>
          </div>
          <div className="relative h-44 w-full bg-slate-800 group">
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <span className="text-slate-600 text-xs">Map View</span>
            </div>

            {/* Camera pins from API data */}
            {cameras.filter(c => c.location_lat && c.location_lng).map((cam, idx) => (
              <div
                key={cam.id}
                className="absolute cursor-pointer"
                style={{
                  top: `${20 + (idx * 20) % 60}%`,
                  left: `${15 + (idx * 25) % 70}%`,
                }}
                onClick={() => setSelectedCameraId(cam.id)}
              >
                <div className="relative -translate-x-1/2 -translate-y-1/2">
                  {cam.id === selectedCameraId ? (
                    <>
                      <span className="absolute -top-1 -left-1 w-6 h-6 bg-primary/30 rounded-full animate-ping"></span>
                      <span className="material-icons text-primary relative z-10 text-2xl drop-shadow-lg">location_on</span>
                    </>
                  ) : (
                    <span className="material-icons text-slate-500 hover:text-white transition-colors text-xl">location_on</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
