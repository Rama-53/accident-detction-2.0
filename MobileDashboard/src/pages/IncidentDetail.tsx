import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  fetchEvents,
  fetchSystemConfig,
  getSnapshotUrl,
  getMapsNavigationUrl,
  getCallUrl,
  formatTime,
  formatDate,
  type Event,
} from '../services/api';
import { useIncidentStatus } from '../hooks/useIncidentStatus';

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [adminPhone, setAdminPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { status: responseStatus, setStatus: setResponseStatus } = useIncidentStatus(id);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [events, config] = await Promise.all([
          fetchEvents(undefined, 100),
          fetchSystemConfig().catch(() => null),
        ]);
        if (!active) return;
        const found = events.find(e => e.id === id);
        setEvent(found || null);
        if (config?.admin_phone) setAdminPhone(config.admin_phone);
      } catch (err) {
        console.error('Failed to fetch event:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <span className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></span>
          <span className="text-sm font-medium">Loading incident...</span>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto px-4 pb-24 pt-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <span className="material-icons">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold">Incident Not Found</h1>
        </div>
        <div className="text-center py-12 text-slate-500">
          <span className="material-icons text-4xl mb-2 opacity-50">error_outline</span>
          <p>This incident could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-24 pt-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold">Incident Report</h1>
      </div>

      <div className="space-y-6">
        {/* Main Image */}
        <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 relative">
          {event.snapshot_id ? (
            <img
              src={getSnapshotUrl(event.snapshot_id)}
              alt={event.type}
              className="w-full h-64 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-64 bg-slate-800 flex items-center justify-center">
              <span className="material-icons text-slate-600 text-5xl">videocam_off</span>
            </div>
          )}
          <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
            {responseStatus && (
              <span className={clsx(
                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md",
                responseStatus === 'en_route' && "bg-amber-500 text-white",
                responseStatus === 'arrived' && "bg-emerald-500 text-white",
                responseStatus === 'completed' && "bg-slate-600 text-white"
              )}>
                {responseStatus === 'en_route' ? 'En Route' : responseStatus === 'arrived' ? 'On Scene' : 'Completed'}
              </span>
            )}
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md">
              {event.severity} Severity
            </span>
          </div>
        </div>

        {/* Additional snapshots */}
        {event.snapshot_count > 1 && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {event.snapshots.map((snap) => (
              <div key={snap.idx} className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <img
                  src={getSnapshotUrl(event.id, snap.idx)}
                  alt={snap.label}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Key Info */}
        <div className="bg-white dark:bg-card-dark rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-lg font-bold mb-4 capitalize">{event.type}</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Location</p>
              <p className="font-medium text-sm">{event.location || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Camera</p>
              <p className="font-medium text-sm">{event.camera_name || event.camera_id}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Time</p>
              <p className="font-medium text-sm">{formatTime(event.time)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Date</p>
              <p className="font-medium text-sm">{formatDate(event.time)}</p>
            </div>
            {event.sector_id && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Sector</p>
                <p className="font-medium text-sm">{event.sector_id}</p>
              </div>
            )}
            {event.iou !== null && event.iou !== undefined && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">IoU Score</p>
                <p className="font-medium text-sm">{(event.iou * 100).toFixed(1)}%</p>
              </div>
            )}
          </div>

          {/* Coordinates */}
          {event.location_lat && event.location_lng && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Coordinates</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-mono">
                {event.location_lat.toFixed(4)}° N, {event.location_lng.toFixed(4)}° W
              </p>
            </div>
          )}

          {/* Responder Quick Actions */}
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Responder Actions</p>
            <div className="flex flex-wrap gap-2">
              {event.location_lat && event.location_lng && (
                <a
                  href={getMapsNavigationUrl(event.location_lat, event.location_lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform"
                >
                  <span className="material-icons text-lg">directions</span>
                  Get Directions
                </a>
              )}
              {adminPhone && (
                <a
                  href={getCallUrl(adminPhone)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
                >
                  <span className="material-icons text-lg">phone</span>
                  Call Dispatch
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {(['en_route', 'arrived', 'completed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setResponseStatus(responseStatus === s ? null : s)}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                    responseStatus === s
                      ? s === 'en_route'
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/50"
                        : s === 'arrived'
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50"
                          : "bg-slate-500/20 text-slate-600 dark:text-slate-300 border border-slate-500/50"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  <span className="material-icons text-sm">
                    {s === 'en_route' ? 'local_shipping' : s === 'arrived' ? 'place' : 'check_circle'}
                  </span>
                  {s === 'en_route' ? 'En Route' : s === 'arrived' ? 'Arrived' : 'Completed'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detection Info */}
        <div className="bg-white dark:bg-card-dark rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Detection Details</h3>
          <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
            <div className="relative pl-8">
              <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-primary border-4 border-white dark:border-card-dark"></div>
              <p className="text-xs font-mono text-slate-500 mb-0.5">{formatTime(event.time)}</p>
              <p className="text-sm font-medium">Incident detected by AI model</p>
            </div>
            <div className="relative pl-8">
              <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-primary border-4 border-white dark:border-card-dark"></div>
              <p className="text-xs font-mono text-slate-500 mb-0.5">{formatTime(event.time)}</p>
              <p className="text-sm font-medium">Alert flagged as {event.severity} severity</p>
            </div>
            {event.snapshot_count > 0 && (
              <div className="relative pl-8">
                <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-primary border-4 border-white dark:border-card-dark"></div>
                <p className="text-xs font-mono text-slate-500 mb-0.5">{formatTime(event.time)}</p>
                <p className="text-sm font-medium">{event.snapshot_count} snapshot(s) captured</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/evidence')}
            className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform"
          >
            View Evidence
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold active:scale-[0.98] transition-transform"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
