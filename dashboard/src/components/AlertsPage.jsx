// src/components/AlertsPage.jsx
import { useState, useMemo } from 'react';
import { AlertTriangle, MapPin, Search, Filter, SortAsc, ChevronDown, X } from 'lucide-react';
import { BACKEND_URL } from '../config';
import PremiumInput from './PremiumInput';
import { useSystem } from '../context/SystemContext';
import './AlertsPage.css';

export function AlertsPage() {
    const {
        events,
        cameras,
        selectedCamera,
        setSelectedCamera,
        filterStartTime,
        setFilterStartTime,
        filterEndTime,
        setFilterEndTime,
        setActiveEvent
    } = useSystem();

    // Local filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [visibleCount, setVisibleCount] = useState(20);

    // Filter and sort events
    const filteredEvents = useMemo(() => {
        let result = [...(events || [])];

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(e =>
                (e.camera_name || e.camera_id || '').toLowerCase().includes(query) ||
                (e.location || '').toLowerCase().includes(query) ||
                (e.type || '').toLowerCase().includes(query)
            );
        }

        // Filter by severity
        if (severityFilter !== 'all') {
            result = result.filter(e =>
                (e.severity || '').toLowerCase() === severityFilter.toLowerCase()
            );
        }

        // Sort
        switch (sortBy) {
            case 'oldest':
                result.sort((a, b) => a.time - b.time);
                break;
            case 'severity':
                const severityOrder = { high: 0, medium: 1, low: 2 };
                result.sort((a, b) =>
                    (severityOrder[a.severity?.toLowerCase()] || 2) -
                    (severityOrder[b.severity?.toLowerCase()] || 2)
                );
                break;
            case 'newest':
            default:
                result.sort((a, b) => b.time - a.time);
                break;
        }

        return result;
    }, [events, searchQuery, severityFilter, sortBy]);

    // Paginated events
    const visibleEvents = filteredEvents.slice(0, visibleCount);
    const hasMore = visibleCount < filteredEvents.length;

    const loadMore = () => {
        setVisibleCount(prev => prev + 20);
    };

    const resetFilters = () => {
        setSearchQuery('');
        setSeverityFilter('all');
        setSortBy('newest');
        setFilterStartTime('');
        setFilterEndTime('');
        setSelectedCamera('all');
        setVisibleCount(20);
    };

    return (
        <div className="glass-panel alerts-page-panel animate-slide-up">
            <div className="panel-header">
                <div className="panel-title">
                    <AlertTriangle size={18} />
                    <span>Alert History</span>
                    <span className="event-count">{filteredEvents.length} events</span>
                </div>
            </div>

            {/* Enhanced Filters Bar */}
            <div className="filters-bar">
                {/* Search Input */}
                <div className="search-wrapper">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search camera, location..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    {searchQuery && (
                        <button className="clear-search" onClick={() => setSearchQuery('')}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Severity Filter */}
                <div className="filter-group">
                    <Filter size={14} />
                    <select
                        value={severityFilter}
                        onChange={e => setSeverityFilter(e.target.value)}
                        className="glass-input filter-select"
                    >
                        <option value="all">All Severities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>

                {/* Camera Filter */}
                <select
                    value={selectedCamera || 'all'}
                    onChange={e => setSelectedCamera(e.target.value)}
                    className="glass-input filter-select"
                >
                    <option value="all">All Cameras</option>
                    {cameras.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* Sort */}
                <div className="filter-group">
                    <SortAsc size={14} />
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="glass-input filter-select"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="severity">By Severity</option>
                    </select>
                </div>

                {/* Date Filters */}
                <div style={{ width: '180px' }}>
                    <PremiumInput
                        type="datetime-local"
                        value={filterStartTime}
                        onChange={e => setFilterStartTime(e.target.value)}
                        style={{ height: '38px' }}
                    />
                </div>
                <div style={{ width: '180px' }}>
                    <PremiumInput
                        type="datetime-local"
                        value={filterEndTime}
                        onChange={e => setFilterEndTime(e.target.value)}
                        style={{ height: '38px' }}
                    />
                </div>

                <button className="btn-secondary btn-reset" onClick={resetFilters}>
                    Reset
                </button>
            </div>

            {/* Event List with Lazy Loading */}
            <div className="full-event-list">
                {visibleEvents.map((e, index) => {
                    const dateObj = new Date(e.time * 1000);
                    const dateStr = dateObj.toLocaleDateString();
                    const timeStr = dateObj.toLocaleTimeString();

                    return (
                        <div
                            key={e.id}
                            className={`full-event-card severity-${(e.severity || 'medium').toLowerCase()}`}
                            onClick={() => setActiveEvent(e)}
                            style={{ animationDelay: `${Math.min(index, 10) * 0.03}s` }}
                        >
                            <div className="severity-indicator"></div>
                            <div className="card-thumb-wrapper">
                                {e.snapshot_id ? (
                                    <img
                                        src={`${BACKEND_URL}/snapshot/${e.snapshot_id}`}
                                        className="card-thumb"
                                        alt="snapshot"
                                        loading="lazy"
                                        onError={ev => ev.target.style.display = 'none'}
                                    />
                                ) : (
                                    <div className="no-thumb">No Image</div>
                                )}
                            </div>

                            <div className="card-details">
                                <div className="card-header">
                                    <span className="card-camera">{e.camera_name || e.camera_id}</span>
                                    <span className={`severity-badge severity-${(e.severity || 'medium').toLowerCase()}`}>
                                        {e.severity || 'Medium'}
                                    </span>
                                </div>
                                <div className="card-location">
                                    <MapPin size={12} />
                                    {e.location || 'Unknown'}
                                </div>
                            </div>

                            <div className="card-time">
                                <div className="time-main">{timeStr}</div>
                                <div className="date-sub">{dateStr}</div>
                            </div>
                        </div>
                    );
                })}

                {/* Load More Button */}
                {hasMore && (
                    <button className="load-more-btn" onClick={loadMore}>
                        <ChevronDown size={18} />
                        Load More ({filteredEvents.length - visibleCount} remaining)
                    </button>
                )}

                {filteredEvents.length === 0 && (
                    <div className="empty-state">No alerts found matching filters.</div>
                )}
            </div>
        </div>
    );
}
