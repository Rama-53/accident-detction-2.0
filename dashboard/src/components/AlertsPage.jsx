import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, MapPin, Video, Search } from 'lucide-react';
import { BACKEND_URL } from '../config';

const AlertsPage = ({ events, setActiveEvent }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCamFilter, setSelectedCamFilter] = useState('all');

    // Get unique camera IDs for dropdown
    const uniqueCameras = [...new Set(events.map(e => e.camera_id).filter(Boolean))];

    const filteredEvents = events.filter(e => {
        // 1. Search Term (ID, Location)
        const matchesSearch =
            e.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.location && e.location.toLowerCase().includes(searchTerm.toLowerCase()));

        // 2. Camera Filter
        const matchesCamera = selectedCamFilter === 'all' || e.camera_id === selectedCamFilter;

        // 3. Date Range Filter
        let matchesDate = true;
        if (startDate || endDate) {
            const eventDate = new Date(e.timestamp * 1000);
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0); // start of day
                if (eventDate < start) matchesDate = false;
            }
            if (endDate && matchesDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999); // end of day
                if (eventDate > end) matchesDate = false;
            }
        }

        return matchesSearch && matchesCamera && matchesDate;
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '24px',
                overflow: 'hidden',
                background: 'rgba(15, 23, 42, 0.6)'
            }}
        >
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Alert History</h2>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>Comprehensive log of all detection events</p>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search ID or Location..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                padding: '10px 10px 10px 40px',
                                borderRadius: '8px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border-color)',
                                color: '#fff',
                                width: '300px'
                            }}
                        />
                    </div>
                </div>

                {/* Filters Row */}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <Clock size={16} color="var(--primary)" />
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>From:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#fff', fontFamily: 'inherit' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>To:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#fff', fontFamily: 'inherit' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <Video size={16} color="var(--primary)" />
                        <select
                            value={selectedCamFilter}
                            onChange={e => setSelectedCamFilter(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#fff', fontFamily: 'inherit', paddingRight: '8px', cursor: 'pointer' }}
                        >
                            <option value="all" style={{ color: '#000' }}>All Cameras</option>
                            {uniqueCameras.map(camId => (
                                <option key={camId} value={camId} style={{ color: '#000' }}>{camId}</option>
                            ))}
                        </select>
                    </div>

                    {(startDate || endDate || selectedCamFilter !== 'all') && (
                        <button
                            onClick={() => { setStartDate(''); setEndDate(''); setSelectedCamFilter('all'); }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.2)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(5px)' }}>
                        <tr>
                            <th style={thStyle}>Preview</th>
                            <th style={thStyle}>Date & Time</th>
                            <th style={thStyle}>Camera / Location</th>
                            <th style={thStyle}>Severity</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEvents.map(evt => (
                            <tr key={evt.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ width: '80px', height: '45px', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
                                        {evt.snapshot_url ? (
                                            <img src={`${BACKEND_URL}${evt.snapshot_url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                        ) : (
                                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}><Video size={16} /></div>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ fontWeight: 500 }}>{new Date(evt.timestamp * 1000).toLocaleDateString()}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(evt.timestamp * 1000).toLocaleTimeString()}</div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <MapPin size={14} color="var(--primary)" />
                                        <span>{evt.camera_id}</span>
                                    </div>
                                    {evt.location && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '22px' }}>{evt.location}</div>}
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <span style={{
                                        padding: '4px 12px', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 600,
                                        background: evt.severity === 'high' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                        color: evt.severity === 'high' ? 'rgb(239, 68, 68)' : 'rgb(234, 179, 8)'
                                    }}>
                                        {evt.severity?.toUpperCase() || 'NORMAL'}
                                    </span>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <button
                                        onClick={() => setActiveEvent(evt)}
                                        style={{
                                            background: 'var(--primary)', color: '#000', border: 'none',
                                            padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer'
                                        }}
                                    >
                                        View Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredEvents.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No alerts found.</div>
                )}
            </div>
        </motion.div>
    );
};

const thStyle = {
    textAlign: 'left',
    padding: '16px',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    fontSize: '0.85rem',
    textTransform: 'uppercase'
};

export default AlertsPage;
