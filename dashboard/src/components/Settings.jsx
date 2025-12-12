import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Save, Server, Bell, Shield } from 'lucide-react';

const Settings = ({ videoSources, saveCameraConfig }) => {
    const [globalSettings, setGlobalSettings] = useState({
        notifications: true,
        email: 'admin@accident-detection.com',
        retentionDays: 30,
        darkTime: '20:00',
        deploymentMode: 'On-Premise'
    });

    const handleSave = () => {
        // Mock save
        alert("Settings Saved Successfully (Mock)");
    };

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
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>System Configuration</h2>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>Manage global preferences and deployment settings</p>
            </div>

            <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
                <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Section 1: Notifications */}
                    <Section title="Notifications" icon={Bell}>
                        <div className="form-group">
                            <label>Enable Desktop Alerts</label>
                            <input
                                type="checkbox"
                                checked={globalSettings.notifications}
                                onChange={e => setGlobalSettings({ ...globalSettings, notifications: e.target.checked })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Admin Email</label>
                            <input
                                type="email"
                                value={globalSettings.email}
                                onChange={e => setGlobalSettings({ ...globalSettings, email: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                    </Section>

                    {/* Section 2: Deployment */}
                    <Section title="Deployment & Server" icon={Server}>
                        <div className="form-group">
                            <label>Deployment Mode</label>
                            <select
                                value={globalSettings.deploymentMode}
                                onChange={e => setGlobalSettings({ ...globalSettings, deploymentMode: e.target.value })}
                                style={inputStyle}
                            >
                                <option>On-Premise (Edge)</option>
                                <option>AWS Cloud (Hybrid)</option>
                                <option>Fully Cloud</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Data Retention (Days)</label>
                            <input
                                type="number"
                                value={globalSettings.retentionDays}
                                onChange={e => setGlobalSettings({ ...globalSettings, retentionDays: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                    </Section>

                    {/* Section 3: Connected Cameras */}
                    <Section title="Connected Cameras" icon={Shield}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {videoSources.map(src => (
                                <div key={src.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                    <span>{src.label || src.id}</span>
                                    <span style={{ color: src.available ? 'var(--success)' : 'var(--danger)' }}>
                                        {src.available ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <button
                        onClick={handleSave}
                        style={{
                            alignSelf: 'flex-start',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'var(--primary)', color: '#000',
                            padding: '12px 24px', borderRadius: '8px', border: 'none',
                            fontWeight: 600, cursor: 'pointer', marginTop: '16px'
                        }}
                    >
                        <Save size={18} />
                        Save Changes
                    </button>

                </div>
            </div>
        </motion.div>
    );
};

const Section = ({ title, icon: Icon, children }) => (
    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                <Icon size={20} color="var(--primary)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {children}
        </div>
    </div>
);

const inputStyle = {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    background: 'rgba(0,0,0,0.3)',
    color: '#fff',
    width: '100%',
    maxWidth: '300px'
};

export default Settings;
