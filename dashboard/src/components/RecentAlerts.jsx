import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Trash2, ChevronRight, Clock } from 'lucide-react';
import { BACKEND_URL } from '../config';

const RecentAlerts = ({ events, setEvents, setActiveEvent, activeEvent }) => {

    const clearAlerts = async () => {
        if (confirm("Are you sure you want to clear all alerts?")) {
            try {
                await fetch(`${BACKEND_URL}/accidents`, { method: 'DELETE' });
                setEvents([]);
            } catch (e) {
                console.error("Failed to clear alerts", e);
            }
        }
    };

    return (
        <motion.div
            className="glass-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
                padding: '20px',
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Recent Alerts</h2>
                <button
                    onClick={clearAlerts}
                    style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--danger)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'background 0.2s'
                    }}
                >
                    <Trash2 size={14} />
                    Clear
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                <AnimatePresence>
                    {events.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}
                        >
                            <p>No recent accidents detected.</p>
                        </motion.div>
                    ) : (
                        events.map((evt) => (
                            <motion.div
                                key={evt.id}
                                layout
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={() => setActiveEvent(evt)}
                                style={{
                                    background: activeEvent?.id === evt.id ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                    border: `1px solid ${activeEvent?.id === evt.id ? '#4ade80' : 'var(--border-color)'}`,
                                    borderRadius: '12px',
                                    padding: '12px',
                                    marginBottom: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    gap: '12px',
                                    transition: 'all 0.2s ease'
                                }}
                                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.06)' }}
                            >
                                {/* Thumbnail */}
                                <div style={{ width: '80px', height: '60px', borderRadius: '8px', overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                                    <img
                                        src={evt.snapshot_url ? `${BACKEND_URL}${evt.snapshot_url}` : ''}
                                        alt="Snapshot"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Accident Detected</span>
                                        <span className={`sev-pill ${evt.severity || 'unknown'}`}
                                            style={{
                                                fontSize: '0.7rem',
                                                padding: '2px 8px',
                                                borderRadius: '99px',
                                                background: evt.severity === 'high' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                                color: evt.severity === 'high' ? '#fca5a5' : '#fde047',
                                                border: evt.severity === 'high' ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(234, 179, 8, 0.5)'
                                            }}>
                                            {evt.severity || 'Unk'}
                                        </span>
                                    </div>
                                    <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Clock size={12} />
                                        {new Date((evt.time || Date.now() / 1000) * 1000).toLocaleTimeString()}
                                    </div>
                                    <div style={{ marginTop: '2px', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {evt.location || 'Unknown Location'}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                                    <ChevronRight size={16} />
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default RecentAlerts;
