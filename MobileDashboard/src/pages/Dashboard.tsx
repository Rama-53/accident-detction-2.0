import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  fetchVideoSources,
  fetchEvents,
  fetchSystemStats,
  getVideoFeedUrl,
  formatRelativeTime,
  type VideoSource,
  type Event,
  type SystemStats,
} from '../services/api';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker for incidents
const incidentIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="width:24px;height:24px;background:#ef4444;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(239,68,68,0.5);display:flex;align-items:center;justify-content:center"><span style="color:#fff;font-size:12px;font-weight:bold">!</span></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Custom marker for cameras
const cameraIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="width:20px;height:20px;background:#135bec;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(19,91,236,0.4)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function Dashboard() {
  const navigate = useNavigate();
  const [cameras, setCameras] = useState<VideoSource[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCamera, setActiveCamera] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [cams, evts, sysStats] = await Promise.all([
        fetchVideoSources(),
        fetchEvents(undefined, 10),
        fetchSystemStats().catch(() => null),
      ]);
      setCameras(cams);
      setEvents(evts);
      setStats(sysStats);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { containerRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: loadData,
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      try {
        const [evts, sysStats] = await Promise.all([
          fetchEvents(undefined, 10),
          fetchSystemStats().catch(() => null),
        ]);
        setEvents(evts);
        if (sysStats) setStats(sysStats);
      } catch { }
    }, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Compute live stats
  const activeCamCount = cameras.filter(c => c.detection_enabled).length;
  const highCount = events.filter(e => e.severity === 'high').length;

  // Default map center (first camera with coords or fallback)
  const firstCamWithCoords = cameras.find(c => c.lat && c.lng);
  const mapCenter: [number, number] = firstCamWithCoords
    ? [firstCamWithCoords.lat!, firstCamWithCoords.lng!]
    : [28.6139, 77.2090]; // Default: New Delhi

  if (isLoading) {
    return (
      <div ref={containerRef} className="max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="animate-pulse space-y-4">
          <div className="skeleton h-8 w-48"></div>
          <div className="skeleton h-4 w-32"></div>
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="skeleton h-20 rounded-xl"></div>
            <div className="skeleton h-20 rounded-xl"></div>
            <div className="skeleton h-20 rounded-xl"></div>
          </div>
          <div className="skeleton h-48 rounded-xl mt-4"></div>
          <div className="skeleton h-32 rounded-xl mt-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="max-w-md mx-auto px-4 pb-24 overflow-y-auto">
      {/* Pull to Refresh Indicator */}
      {pullDistance > 0 && (
        <div
          className="flex justify-center py-2 pull-indicator"
          style={{ transform: `translateY(${pullDistance - 40}px)`, opacity: pullDistance / 80 }}
        >
          <span className={clsx(
            "w-6 h-6 border-2 border-primary rounded-full",
            isRefreshing ? "border-t-transparent animate-spin" : "border-t-primary/30"
          )} />
        </div>
      )}

      {/* Header */}
      <header className="pt-6 mb-6 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
          <span className="text-xs font-semibold uppercase tracking-widest text-success">System Active</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Command<span className="text-primary">Center</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {cameras.length} camera{cameras.length !== 1 ? 's' : ''} • {events.length} recent event{events.length !== 1 ? 's' : ''}
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          {
            label: 'Active AI',
            value: activeCamCount,
            icon: 'visibility',
            gradient: 'from-primary to-primary-dark',
          },
          {
            label: 'Alerts',
            value: events.length,
            icon: 'notifications_active',
            gradient: 'from-severity-medium to-orange-600',
          },
          {
            label: 'Critical',
            value: highCount,
            icon: 'error',
            gradient: 'from-severity-high to-red-700',
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={clsx(
              "relative overflow-hidden rounded-xl p-3 text-white animate-fade-in-up",
              `bg-gradient-to-br ${stat.gradient}`,
              `stagger-${i + 1}`
            )}
          >
            <div className="absolute top-1 right-1 opacity-20">
              <span className="material-icons text-3xl">{stat.icon}</span>
            </div>
            <p className="text-2xl font-black">{stat.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Live Camera Feed */}
      <section className="mb-6 animate-fade-in-up stagger-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Live Feed</h2>
          <button
            onClick={() => navigate('/cameras')}
            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
          >
            View All <span className="material-icons text-sm">chevron_right</span>
          </button>
        </div>

        {/* Camera selector pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-3">
          {cameras.slice(0, 6).map(cam => (
            <button
              key={cam.id}
              onClick={() => setActiveCamera(cam.id)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                (activeCamera || cameras[0]?.id) === cam.id
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              )}
            >
              {cam.camera_name || cam.label || cam.id}
            </button>
          ))}
        </div>

        {/* MJPEG Stream */}
        {cameras.length > 0 ? (
          <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
            <img
              src={getVideoFeedUrl(activeCamera || cameras[0]?.id)}
              alt="Live camera feed"
              className="w-full aspect-video object-cover"
            />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-severity-high/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              Live
            </div>
            {stats && (
              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-1 rounded-lg">
                CPU {stats.cpu_percent}% • RAM {stats.memory_percent}%
              </div>
            )}
          </div>
        ) : (
          <div className="h-48 rounded-xl bg-slate-800 flex items-center justify-center text-slate-600">
            <span className="material-icons text-4xl">videocam_off</span>
          </div>
        )}
      </section>

      {/* Interactive Map */}
      <section className="mb-6 animate-fade-in-up stagger-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Coverage Map</h2>
          <span className="text-[10px] text-slate-500 font-mono">
            {cameras.filter(c => c.lat && c.lng).length} pinned
          </span>
        </div>
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg h-56">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {/* Camera markers */}
            {cameras.filter(c => c.lat && c.lng).map(cam => (
              <Marker key={cam.id} position={[cam.lat!, cam.lng!]} icon={cameraIcon}>
                <Popup>
                  <strong>{cam.camera_name || cam.label}</strong>
                  <br />
                  <span style={{ fontSize: '11px' }}>{cam.location || 'Camera'}</span>
                </Popup>
              </Marker>
            ))}
            {/* Event markers */}
            {events.filter(e => e.location_lat && e.location_lng).map(evt => (
              <Marker
                key={evt.id}
                position={[evt.location_lat!, evt.location_lng!]}
                icon={incidentIcon}
              >
                <Popup>
                  <strong style={{ color: '#ef4444' }}>{evt.type}</strong>
                  <br />
                  <span style={{ fontSize: '11px' }}>{evt.location || 'Incident'}</span>
                  <br />
                  <span style={{ fontSize: '10px', color: '#999' }}>{formatRelativeTime(evt.time)}</span>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </section>

      {/* Recent Alerts */}
      <section className="mb-6 animate-fade-in-up stagger-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Recent Alerts</h2>
          <button
            onClick={() => navigate('/incidents')}
            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
          >
            See All <span className="material-icons text-sm">chevron_right</span>
          </button>
        </div>
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <span className="material-icons text-3xl mb-2 opacity-40">check_circle</span>
              <p className="text-sm">No recent incidents</p>
            </div>
          ) : (
            events.slice(0, 5).map((evt, i) => (
              <div
                key={evt.id}
                onClick={() => navigate(`/incidents/${evt.id}`)}
                className={clsx(
                  "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.98] hover:shadow-md animate-slide-in-right",
                  "bg-white dark:bg-card-dark border-slate-100 dark:border-slate-800",
                  `stagger-${i + 1}`
                )}
              >
                <div className={clsx(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  evt.severity === 'high' ? "bg-severity-high/10" : "bg-severity-medium/10"
                )}>
                  <span className={clsx(
                    "material-icons",
                    evt.severity === 'high' ? "text-severity-high" : "text-severity-medium"
                  )}>
                    {evt.severity === 'high' ? 'error' : 'warning'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold capitalize truncate">{evt.type}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {evt.camera_name || evt.camera_id} • {evt.location || 'Unknown'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-primary font-semibold">{formatRelativeTime(evt.time)}</p>
                  <span className={clsx(
                    "inline-block mt-0.5 w-2 h-2 rounded-full",
                    evt.severity === 'high' ? "bg-severity-high" : "bg-severity-medium"
                  )}></span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* System Health */}
      {stats && (
        <section className="animate-fade-in-up stagger-5 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">System Health</h2>
          <div className="bg-white dark:bg-card-dark rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'CPU Usage', value: `${stats.cpu_percent}%`, bar: stats.cpu_percent, color: stats.cpu_percent > 80 ? 'bg-severity-high' : 'bg-primary' },
                { label: 'Memory', value: `${stats.memory_percent}%`, bar: stats.memory_percent, color: stats.memory_percent > 80 ? 'bg-severity-high' : 'bg-primary' },
                { label: 'Uptime', value: stats.uptime_str, bar: 100, color: 'bg-success' },
                { label: 'Detector', value: stats.detector_online ? 'Online' : 'Offline', bar: stats.detector_online ? 100 : 0, color: stats.detector_online ? 'bg-success' : 'bg-severity-high' },
              ].map(metric => (
                <div key={metric.label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{metric.label}</span>
                    <span className="text-xs font-bold">{metric.value}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={clsx("h-full rounded-full transition-all duration-500", metric.color)}
                      style={{ width: `${Math.min(metric.bar, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
