import { useState, useEffect } from 'react';
import clsx from 'clsx';
import {
  fetchSnapshotIds,
  fetchEvents,
  getSnapshotUrl,
  formatTime,
  formatDate,
  type Event,
} from '../services/api';

interface SnapshotWithMeta {
  id: string;
  src: string;
  date: string;
  time: string;
  cam: string;
  severity: string;
}

export default function Evidence() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [gridCols, setGridCols] = useState<2 | 3 | 1>(2);
  const [isExporting, setIsExporting] = useState(false);
  const [snapshots, setSnapshots] = useState<SnapshotWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [snapshotIds, events] = await Promise.all([
          fetchSnapshotIds(50),
          fetchEvents(undefined, 100),
        ]);
        if (!active) return;

        // Build a lookup map from event ID to event metadata
        const eventMap = new Map<string, Event>();
        events.forEach(e => eventMap.set(e.id, e));

        // Merge snapshot IDs with event metadata
        const merged: SnapshotWithMeta[] = snapshotIds.map(id => {
          const evt = eventMap.get(id);
          return {
            id,
            src: getSnapshotUrl(id),
            date: evt ? `${formatDate(evt.time)} • ${formatTime(evt.time)}` : 'Unknown',
            time: evt ? formatTime(evt.time) : '',
            cam: evt?.camera_name || evt?.camera_id || 'Unknown',
            severity: evt?.severity || 'unknown',
          };
        });
        setSnapshots(merged);
      } catch (err) {
        console.error('Failed to load evidence:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();

    // Poll every 10 seconds
    const interval = setInterval(async () => {
      try {
        const [snapshotIds, events] = await Promise.all([
          fetchSnapshotIds(50),
          fetchEvents(undefined, 100),
        ]);
        if (!active) return;
        const eventMap = new Map<string, Event>();
        events.forEach(e => eventMap.set(e.id, e));
        const merged: SnapshotWithMeta[] = snapshotIds.map(id => {
          const evt = eventMap.get(id);
          return {
            id,
            src: getSnapshotUrl(id),
            date: evt ? `${formatDate(evt.time)} • ${formatTime(evt.time)}` : 'Unknown',
            time: evt ? formatTime(evt.time) : '',
            cam: evt?.camera_name || evt?.camera_id || 'Unknown',
            severity: evt?.severity || 'unknown',
          };
        });
        setSnapshots(merged);
      } catch { }
    }, 10000);

    return () => { active = false; clearInterval(interval); };
  }, []);

  const activeImage = selectedImage !== null ? snapshots.find(s => s.id === selectedImage) : null;

  const handleExport = () => {
    setIsExporting(true);
    // Open all snapshots in new tabs for download
    if (activeImage) {
      window.open(activeImage.src, '_blank');
    }
    setTimeout(() => {
      setIsExporting(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <span className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></span>
          <span className="text-sm font-medium">Loading evidence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen relative flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-icons text-primary text-2xl">security</span>
            <h1 className="text-xl font-bold tracking-tight">Evidence Vault</h1>
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-70"
          >
            {isExporting ? (
              <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
            ) : (
              <span className="material-icons text-sm">ios_share</span>
            )}
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
        {/* Grid Controls */}
        <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl">
          <div className="flex w-full">
            <button
              onClick={() => setGridCols(3)}
              className={clsx(
                "flex-1 flex items-center justify-center py-2 rounded-lg transition-all",
                gridCols === 3 ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <span className="material-icons text-lg">grid_view</span>
              <span className="text-xs ml-1 font-medium">Small</span>
            </button>
            <button
              onClick={() => setGridCols(2)}
              className={clsx(
                "flex-1 flex items-center justify-center py-2 rounded-lg transition-all",
                gridCols === 2 ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <span className="material-icons text-lg">view_module</span>
              <span className="text-xs ml-1 font-medium">Medium</span>
            </button>
            <button
              onClick={() => setGridCols(1)}
              className={clsx(
                "flex-1 flex items-center justify-center py-2 rounded-lg transition-all",
                gridCols === 1 ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <span className="material-icons text-lg">view_stream</span>
              <span className="text-xs ml-1 font-medium">Large</span>
            </button>
          </div>
        </div>
      </header>

      {/* Gallery Grid */}
      <main className="flex-1 overflow-y-auto p-4 hide-scrollbar">
        {snapshots.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <span className="material-icons text-4xl mb-2 opacity-50">photo_library</span>
            <p className="text-sm">No evidence snapshots yet</p>
            <p className="text-xs mt-1 text-slate-400">Snapshots will appear here when incidents are detected</p>
          </div>
        ) : (
          <div className={clsx("grid gap-3 transition-all", {
            'grid-cols-3': gridCols === 3,
            'grid-cols-2': gridCols === 2,
            'grid-cols-1': gridCols === 1,
          })}>
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-900 cursor-pointer"
                onClick={() => setSelectedImage(snap.id)}
              >
                <img
                  className="w-full h-full object-cover opacity-90 transition-opacity hover:opacity-100"
                  alt={`Evidence from ${snap.cam}`}
                  src={snap.src}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-[10px] text-white/90 font-medium">{snap.date}</p>
                  <p className="text-[8px] text-white/60 uppercase tracking-widest">{snap.cam}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {snapshots.length > 0 && (
          <div className="py-12 flex flex-col items-center opacity-40">
            <span className="material-icons text-4xl mb-2">lock</span>
            <p className="text-xs uppercase tracking-widest font-bold">Encrypted Archive End</p>
          </div>
        )}
      </main>

      {/* Lightbox Modal Overlay */}
      {activeImage && (
        <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Modal Header */}
          <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between text-white z-50">
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <span className="material-icons">close</span>
            </button>
            <div className="text-center">
              <h2 className="text-sm font-bold">Snapshot Detail</h2>
              <p className="text-[10px] opacity-60">{activeImage.cam}</p>
            </div>
            <button
              onClick={() => window.open(activeImage.src, '_blank')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors"
            >
              <span className="material-icons">download</span>
            </button>
          </div>

          {/* Main Full Image */}
          <div className="relative w-full max-h-[60vh] flex items-center justify-center">
            <img
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl shadow-primary/20"
              alt={`Evidence from ${activeImage.cam}`}
              src={activeImage.src}
            />
            {/* Navigation Arrows */}
            <button
              className="absolute -left-2 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-primary/20 text-primary backdrop-blur-sm border border-primary/30 hover:bg-primary/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                const currentIndex = snapshots.findIndex(s => s.id === selectedImage);
                const prevIndex = (currentIndex - 1 + snapshots.length) % snapshots.length;
                setSelectedImage(snapshots[prevIndex].id);
              }}
            >
              <span className="material-icons">chevron_left</span>
            </button>
            <button
              className="absolute -right-2 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-primary/20 text-primary backdrop-blur-sm border border-primary/30 hover:bg-primary/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                const currentIndex = snapshots.findIndex(s => s.id === selectedImage);
                const nextIndex = (currentIndex + 1) % snapshots.length;
                setSelectedImage(snapshots[nextIndex].id);
              }}
            >
              <span className="material-icons">chevron_right</span>
            </button>
          </div>

          {/* Lightbox Bottom Info */}
          <div className="absolute bottom-12 inset-x-0 px-6 max-w-md mx-auto">
            <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className={clsx(
                  "px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider",
                  activeImage.severity === 'high' ? "bg-red-500/20 text-red-500"
                    : activeImage.severity === 'medium' ? "bg-amber-500/20 text-amber-500"
                      : "bg-primary/20 text-primary"
                )}>
                  {activeImage.severity} Severity
                </span>
                <span className="text-[10px] opacity-60">{activeImage.date}</span>
              </div>
              <div className="flex items-center gap-4 text-sm font-medium">
                <div className="flex-1 border-r border-white/10">
                  <p className="text-[10px] opacity-40 uppercase mb-0.5">Camera</p>
                  <p>{activeImage.cam}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] opacity-40 uppercase mb-0.5">Timestamp</p>
                  <p>{activeImage.time}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => window.open(activeImage.src, '_blank')}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-icons text-lg">download</span>
                Save
              </button>
              <button className="flex-1 bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all">
                <span className="material-icons text-lg">description</span>
                Report
              </button>
            </div>
          </div>

          {/* Pagination Indicator */}
          <div className="absolute bottom-6 flex gap-1.5">
            {snapshots.slice(0, 10).map((snap) => (
              <div
                key={snap.id}
                className={clsx("w-1.5 h-1.5 rounded-full", selectedImage === snap.id ? "bg-primary" : "bg-white/20")}
              />
            ))}
            {snapshots.length > 10 && <span className="text-white/30 text-[8px]">+{snapshots.length - 10}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
