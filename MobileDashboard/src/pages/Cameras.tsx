import { useState, useEffect } from 'react';
import clsx from 'clsx';
import {
  fetchVideoSources,
  fetchSystemStats,
  getVideoFeedUrl,
  type VideoSource,
  type SystemStats,
} from '../services/api';

export default function Cameras() {
  const [searchQuery, setSearchQuery] = useState('');
  const [cameras, setCameras] = useState<VideoSource[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [fullscreenCamera, setFullscreenCamera] = useState<VideoSource | null>(null);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [cams, sysStats] = await Promise.all([
          fetchVideoSources(),
          fetchSystemStats().catch(() => null),
        ]);
        if (!active) return;
        setCameras(cams);
        setStats(sysStats);
      } catch (err) {
        console.error('Failed to load cameras:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();

    // Poll every 10 seconds
    const interval = setInterval(async () => {
      try {
        const [cams, sysStats] = await Promise.all([
          fetchVideoSources(),
          fetchSystemStats().catch(() => null),
        ]);
        if (active) {
          setCameras(cams);
          setStats(sysStats);
        }
      } catch { }
    }, 10000);

    return () => { active = false; clearInterval(interval); };
  }, []);

  const filteredCameras = cameras.filter(cam =>
    (cam.camera_name || cam.label || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cam.location || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCameraStatus = (cam: VideoSource): 'live' | 'incident' | 'offline' => {
    if (!cam.detection_enabled) return 'offline';
    return 'live';
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <span className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></span>
          <span className="text-sm font-medium">Loading cameras...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col">
      {/* Header Section */}
      <header className="px-4 pb-4 pt-6 bg-background-light dark:bg-background-dark border-b border-primary/10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold tracking-tight">Camera Wall</h1>
          <div className="flex gap-3">
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <span className="material-icons">notifications</span>
            </button>
          </div>
        </div>
        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input
              className="w-full bg-white dark:bg-slate-800/50 border border-primary/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Search cameras..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 bg-white dark:bg-slate-800/50 border border-primary/10 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <span className="material-icons text-sm">tune</span>
            <span>Filter</span>
          </button>
        </div>
      </header>

      {/* Camera Grid */}
      <main className="flex-grow p-4 overflow-y-auto">
        <div className={clsx("grid gap-3 h-full", layout === 'grid' ? "grid-cols-2" : "grid-cols-1")}>
          {filteredCameras.map((cam) => {
            const status = getCameraStatus(cam);
            return (
              <div
                key={cam.id}
                className={clsx(
                  "relative rounded-xl overflow-hidden bg-slate-900 group border-2 transition-all cursor-pointer",
                  status === 'incident' ? "border-red-500/50" : "border-transparent hover:border-primary/50",
                  layout === 'grid' ? "aspect-square md:aspect-video" : "aspect-video"
                )}
                onClick={() => setFullscreenCamera(cam)}
              >
                {/* Camera feed or placeholder */}
                {cam.detection_enabled ? (
                  <img
                    className="w-full h-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                    alt={cam.camera_name || cam.label}
                    src={getVideoFeedUrl(cam.id)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900">
                    <span className="material-icons text-slate-700 text-3xl">videocam_off</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40"></div>

                {/* Status Overlays */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {status === 'incident' && (
                    <span className="bg-red-600 px-2 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-1 uppercase tracking-wider">
                      <span className="material-icons text-[10px]">warning</span>
                      Incident
                    </span>
                  )}
                  {cam.detection_enabled && (
                    <span className="bg-primary px-2 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-1 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                      AI Enabled
                    </span>
                  )}
                  {!cam.detection_enabled && (
                    <span className="bg-slate-600 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                      Offline
                    </span>
                  )}
                </div>

                <div className="absolute bottom-2 left-2">
                  <p className="text-[11px] font-medium text-white/90">{cam.camera_name || cam.label}</p>
                  <p className="text-[9px] text-white/60">
                    {cam.detection_enabled ? 'Live' : 'Standby'} • {cam.location || 'No location'}
                  </p>
                </div>

                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="bg-black/40 backdrop-blur-md p-1.5 rounded-lg text-white hover:bg-black/60">
                    <span className="material-icons text-xs">fullscreen</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredCameras.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <span className="material-icons text-4xl mb-2 opacity-50">videocam_off</span>
            <p className="text-sm">No cameras found</p>
          </div>
        )}

        {/* System Stats Bar */}
        <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">System Health</h3>
            <span className="text-[10px] text-slate-500">
              {stats ? `Uptime: ${stats.uptime_str}` : 'Connecting...'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-primary/5">
              <p className="text-[10px] text-slate-500">CPU</p>
              <p className="text-sm font-bold text-primary">{stats ? `${stats.cpu_percent}%` : '--'}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-primary/5">
              <p className="text-[10px] text-slate-500">Memory</p>
              <p className="text-sm font-bold text-primary">{stats ? `${stats.memory_percent}%` : '--'}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-primary/5">
              <p className="text-[10px] text-slate-500">Active AI</p>
              <p className="text-sm font-bold text-primary">{stats ? `${stats.active_detections}` : '--'}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button for Layout */}
      <div className="fixed bottom-24 right-6">
        <button
          onClick={() => setLayout(layout === 'grid' ? 'list' : 'grid')}
          className="w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <span className="material-icons">{layout === 'grid' ? 'view_list' : 'grid_view'}</span>
        </button>
      </div>

      {/* Fullscreen Modal */}
      {fullscreenCamera && (
        <div className="fixed inset-0 z-[150] bg-black flex flex-col animate-in fade-in duration-200">
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={() => setFullscreenCamera(null)}
              className="w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
          <div className="flex-grow relative flex items-center justify-center">
            {fullscreenCamera.detection_enabled ? (
              <img
                className="max-w-full max-h-full object-contain"
                alt={fullscreenCamera.camera_name || fullscreenCamera.label}
                src={getVideoFeedUrl(fullscreenCamera.id)}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <span className="material-icons text-5xl">videocam_off</span>
                <p className="text-sm">Camera is offline</p>
              </div>
            )}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg">
              <h2 className="text-white font-bold">{fullscreenCamera.camera_name || fullscreenCamera.label}</h2>
              <div className="flex items-center gap-2 mt-1">
                {fullscreenCamera.detection_enabled && (
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
                <span className="text-white/80 text-xs">
                  {fullscreenCamera.detection_enabled ? 'LIVE' : 'OFFLINE'} • {fullscreenCamera.location || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
