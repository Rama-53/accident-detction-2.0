import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, MapPin, Video, Search } from 'lucide-react';
import { BACKEND_URL } from '../config';

const AlertsPage = ({ events, setActiveEvent }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredEvents = events.filter(e =>
        e.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.location && e.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.camera_id && e.camera_id.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Alert History</h2>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>Comprehensive log of all detection events</p>
                </div>

                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search IP, Location, ID..."
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

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.2)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(5px)' }}>
                        <tr> // Added style to th headers in next block
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
