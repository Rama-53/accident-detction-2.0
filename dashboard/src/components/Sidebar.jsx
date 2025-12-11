import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Grid, Bell, Image, Settings, Video } from 'lucide-react';
import clsx from 'clsx';
import '../index.css'; // Ensure we have access to variables if needed via generic classes

const Sidebar = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'camerawall', label: 'Camera Wall', icon: Grid },
        { id: 'alerts', label: 'Alerts', icon: Bell },
        { id: 'gallery', label: 'Gallery', icon: Image },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="glass-panel"
            style={{
                width: '260px',
                display: 'flex',
                flexDirection: 'column',
                padding: '2rem 1.5rem',
                borderRight: '1px solid var(--border-color)',
                zIndex: 10
            }}
        >
            <div style={{ marginBottom: '3rem', paddingLeft: '0.5rem' }}>
                <h1 className="text-gradient" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Video size={28} color="#4ade80" />
                    AccidentAI
                </h1>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: 'none',
                                background: isActive ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                                color: isActive ? 'rgb(74, 222, 128)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                fontWeight: isActive ? 600 : 500,
                                textAlign: 'left',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'rgba(148, 163, 184, 0.05)';
                                    e.currentTarget.style.color = 'var(--text-primary)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }
                            }}
                        >
                            <item.icon size={20} />
                            {item.label}
                            {isActive && (
                                <motion.div
                                    layoutId="activeTabIndicator"
                                    style={{
                                        marginLeft: 'auto',
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: 'rgb(74, 222, 128)'
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
            </nav>

            <div style={{ marginTop: 'auto', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>System Status</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }}></div>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Online</span>
                </div>
            </div>
        </motion.aside>
    );
};

export default Sidebar;
