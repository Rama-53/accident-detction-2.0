import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  fetchEvents,
  getSnapshotUrl,
  formatTime,
  formatRelativeTime,
  type Event,
} from '../services/api';

export default function Incidents() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium'>('all');
  const [limit, setLimit] = useState(10);

  // Fetch events
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await fetchEvents(undefined, limit);
        if (active) setEvents(data);
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    load();

    // Poll every 5 seconds
    const interval = setInterval(async () => {
      try {
        const data = await fetchEvents(undefined, limit);
        if (active) setEvents(data);
      } catch { }
    }, 5000);

    return () => { active = false; clearInterval(interval); };
  }, [limit]);

  const filteredAlerts = events.filter(evt => {
    const matchesSearch =
      (evt.type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (evt.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (evt.camera_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (evt.camera_id || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = filterSeverity === 'all' || evt.severity === filterSeverity;

    return matchesSearch && matchesSeverity;
  });

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setLimit(prev => prev + 10);
    setTimeout(() => setIsLoadingMore(false), 500);
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto px-4 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <span className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></span>
          <span className="text-sm font-medium">Loading incidents...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-24">
      {/* Header Section */}
      <header className="mb-6 pt-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <span className="material-icons">notifications_none</span>
          </button>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm">{filteredAlerts.length} alerts visible</p>
      </header>

      {/* Search and Filter Bar */}
      <div className="sticky top-0 z-40 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md py-3 -mx-4 px-4">
        <div className="relative mb-4">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            className="w-full bg-white dark:bg-card-dark border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary shadow-sm outline-none transition-all"
            placeholder="Search by location or camera..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          <button
            onClick={() => setFilterSeverity('all')}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
              filterSeverity === 'all'
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
            )}
          >
            <span className="material-icons text-xs">tune</span>
            All Alerts
          </button>
          <button
            onClick={() => setFilterSeverity(filterSeverity === 'high' ? 'all' : 'high')}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              filterSeverity === 'high'
                ? "bg-severity-high text-white shadow-md"
                : "bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
            )}
          >
            High Severity
          </button>
          <button
            onClick={() => setFilterSeverity(filterSeverity === 'medium' ? 'all' : 'medium')}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              filterSeverity === 'medium'
                ? "bg-severity-medium text-white shadow-md"
                : "bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
            )}
          >
            Medium Severity
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4 mt-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <span className="material-icons text-4xl mb-2 opacity-50">search_off</span>
            <p>No alerts found matching your criteria</p>
          </div>
        ) : (
          filteredAlerts.map((evt) => (
            <div
              key={evt.id}
              onClick={() => navigate(`/incidents/${evt.id}`)}
              className="bg-white dark:bg-card-dark rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 active:scale-[0.99] transition-transform cursor-pointer hover:shadow-md"
            >
              {/* Snapshot image */}
              <div className="relative h-48 w-full bg-slate-800">
                {evt.snapshot_id ? (
                  <img
                    alt={evt.type}
                    className="w-full h-full object-cover"
                    src={getSnapshotUrl(evt.snapshot_id)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-icons text-slate-600 text-4xl">videocam_off</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute top-3 right-3">
                  <span className={clsx(
                    "text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg",
                    evt.severity === 'high' ? "bg-severity-high" : evt.severity === 'medium' ? "bg-severity-medium" : "bg-primary"
                  )}>
                    {evt.severity} Severity
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg leading-tight capitalize">{evt.type}</h3>
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 mt-1">
                      <span className="material-icons text-sm">location_on</span>
                      <span className="text-xs">{evt.location || 'Unknown location'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-primary">{evt.camera_name || evt.camera_id}</span>
                    {evt.sector_id && (
                      <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-tighter">{evt.sector_id}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="material-icons text-xs">schedule</span>
                    <span className="text-xs font-medium">{formatTime(evt.time)} • {formatRelativeTime(evt.time)}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/incidents/${evt.id}`);
                    }}
                    className="text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-1 hover:underline"
                  >
                    Details <span className="material-icons text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-card-dark rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-800 shadow-sm active:bg-slate-50 dark:active:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoadingMore ? (
            <>
              <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
              Loading...
            </>
          ) : (
            <>
              <span className="material-icons text-sm">history</span>
              Load Previous Alerts
            </>
          )}
        </button>
      </div>
    </div>
  );
}
