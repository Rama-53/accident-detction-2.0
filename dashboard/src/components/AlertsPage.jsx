// src/components/AlertsPage.jsx
import { useState, useMemo } from 'react';
import { AlertTriangle, MapPin, Search, X, RotateCcw, Calendar, Camera, TrendingDown } from 'lucide-react';
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
                const severityOrder = { high: 0, critical: 0, medium: 1, low: 2 };
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
        <div className="alerts-page-container">
            {/* SIDEBAR: Filters */}
            <aside className="alerts-sidebar">
                <div className="sidebar-header">
                    <h3 className="sidebar-title">
                        <AlertTriangle size={16} />
                        <span>Filters</span>
                    </h3>
                    <span className="result-count">{filteredEvents.length}</span>
                </div>

                {/* Search */}
                <div className="filter-section">
                    <label className="filter-label">Search</label>
                    <div className="search-input-wrapper">
                        <Search size={14} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Camera, location..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="filter-input"
                        />
                        {searchQuery && (
                            <button className="clear-btn" onClick={() => setSearchQuery('')}>
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Severity Pills */}
                <div className="filter-section">
                    <label className="filter-label">Severity Level</label>
                    <div className="severity-pills">
                        <button
                            className={`severity-pill ${severityFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setSeverityFilter('all')}
                        >
                            All
                        </button>
                        <button
                            className={`severity-pill high ${severityFilter === 'high' ? 'active' : ''}`}
                            onClick={() => setSeverityFilter('high')}
                        >
                            High
                        </button>
                        <button
                            className={`severity-pill medium ${severityFilter === 'medium' ? 'active' : ''}`}
                            onClick={() => setSeverityFilter('medium')}
                        >
                            Medium
                        </button>
                        <button
                            className={`severity-pill low ${severityFilter === 'low' ? 'active' : ''}`}
                            onClick={() => setSeverityFilter('low')}
                        >
                            Low
                        </button>
                    </div>
                </div>

                {/* Camera Source */}
                <div className="filter-section">
                    <label className="filter-label">
                        <Camera size={14} />
                        Camera Source
                    </label>
                    <select
                        value={selectedCamera || 'all'}
                        onChange={e => setSelectedCamera(e.target.value)}
                        className="filter-input"
                    >
                        <option value="all">All Cameras</option>
                        {cameras.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {/* Sort By */}
                <div className="filter-section">
                    <label className="filter-label">
                        <TrendingDown size={14} />
                        Sort By
                    </label>
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="filter-input"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="severity">By Severity</option>
                    </select>
                </div>

                {/* Date Range */}
                <div className="filter-section">
                    <label className="filter-label">
                        <Calendar size={14} />
                        Date Range
                    </label>
                    <div className="date-inputs">
                        <PremiumInput
                            type="datetime-local"
                            value={filterStartTime}
                            onChange={e => setFilterStartTime(e.target.value)}
                            placeholder="From"
                        />
                        <PremiumInput
                            type="datetime-local"
                            value={filterEndTime}
                            onChange={e => setFilterEndTime(e.target.value)}
                            placeholder="To"
                        />
                    </div>
                </div>

                {/* Reset Button */}
                <button className="reset-filters-btn" onClick={resetFilters}>
                    <RotateCcw size={14} />
                    Reset All Filters
                </button>
            </aside>

            {/* MAIN AREA: Events */}
            <main className="alerts-main-area">
                <div className="alerts-header">
                    <h2 className="alerts-title">Alert History</h2>
                    <span className="total-count">{filteredEvents.length} events</span>
                </div>

                {/* Event Grid */}
                <div className="event-grid">
                    {visibleEvents.map((e, index) => {
                        const dateObj = new Date(e.time * 1000);
                        const dateStr = dateObj.toLocaleDateString();
                        const timeStr = dateObj.toLocaleTimeString();

                        return (
                            <div
                                key={e.id}
                                className={`event-card severity-${(e.severity || 'medium').toLowerCase()}`}
                                onClick={() => setActiveEvent(e)}
                                style={{ animationDelay: `${Math.min(index, 10) * 0.03}s` }}
                            >
                                <div className="severity-stripe"></div>
                                <div className="card-image">
                                    {e.snapshot_id ? (
                                        <img
                                            src={`${BACKEND_URL}/snapshot/${e.snapshot_id}`}
                                            alt="snapshot"
                                            loading="lazy"
                                            onError={ev => ev.target.style.display = 'none'}
                                        />
                                    ) : (
                                        <div className="no-image">
                                            <AlertTriangle size={32} />
                                        </div>
                                    )}
                                </div>

                                <div className="card-content">
                                    <div className="card-header-row">
                                        <span className="card-camera">{e.camera_name || e.camera_id}</span>
                                        <span className={`severity-badge severity-${(e.severity || 'medium').toLowerCase()}`}>
                                            {e.severity || 'Medium'}
                                        </span>
                                    </div>
                                    <div className="card-location">
                                        <MapPin size={12} />
                                        {e.location || 'Unknown'}
                                    </div>
                                    <div className="card-time">
                                        <div className="time-display">{timeStr}</div>
                                        <div className="date-display">{dateStr}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Load More Button */}
                    {hasMore && (
                        <button className="load-more-btn" onClick={loadMore}>
                            Load More ({filteredEvents.length - visibleCount} remaining)
                        </button>
                    )}

                    {filteredEvents.length === 0 && (
                        <div className="empty-state">
                            <AlertTriangle size={48} />
                            <span>No alerts found matching filters.</span>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
