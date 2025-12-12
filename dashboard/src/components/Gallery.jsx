import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Calendar, Filter } from 'lucide-react';
import { BACKEND_URL } from '../config';

const Gallery = ({ events, setActiveEvent }) => {
    const [filter, setFilter] = useState('all');

    // Filter events based on severity or camera
    const filteredEvents = events.filter(e => {
        if (!e.snapshot_url) return false;
        if (filter === 'all') return true;
        if (filter === 'high') return e.severity === 'high';
        return true;
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
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Snapshot Gallery</h2>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>{filteredEvents.length} Snapshots Available</p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--border-color)' }}
                    >
                        <option value="all">All Severities</option>
                        <option value="high">High Severity Only</option>
                    </select>
                </div>
            </div>

            {/* Grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                    {filteredEvents.length > 0 ? filteredEvents.map((evt) => (
                        <motion.div
                            key={evt.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveEvent(evt)}
                            style={{
                                cursor: 'pointer',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--border-color)',
                                position: 'relative',
                                aspectRatio: '16/9'
                            }}
                        >
                            <img
                                src={`${BACKEND_URL}${evt.snapshot_url}`}
                                alt={evt.id}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                loading="lazy"
                            />
                            <div style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                padding: '12px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'
                            }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{evt.camera_id}</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                                    {new Date(evt.timestamp * 1000).toLocaleString()}
                                </div>
                            </div>

                            {/* Severity Badge */}
                            {evt.severity === 'high' && (
                                <div style={{
                                    position: 'absolute', top: '10px', right: '10px',
                                    background: 'var(--danger)', color: '#fff',
                                    fontSize: '0.7rem', padding: '2px 8px', borderRadius: '99px', fontWeight: 'bold'
                                }}>
                                    HIGH INTENSITY
                                </div>
                            )}
                        </motion.div>
                    )) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <ImageIcon size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                            <p>No snapshots found matching your criteria.</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default Gallery;
