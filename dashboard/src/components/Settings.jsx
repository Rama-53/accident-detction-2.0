// src/components/Settings.jsx
import { useState, useEffect } from 'react';
import { Save, Trash2, Server, Shield, Activity } from 'lucide-react';
import { BACKEND_URL } from '../config';
import './Settings.css';

export function Settings({
    multiDetectionEnabled,
    setMultiDetectionEnabled,
    clearAllAlerts
}) {
    const [config, setConfig] = useState({
        multi_detection_enabled: multiDetectionEnabled || false,
        system_name: "Accident Detection System 2.0" // Placeholder
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        // Sync local state if prop changes from outside
        setConfig(prev => ({ ...prev, multi_detection_enabled: multiDetectionEnabled }));
    }, [multiDetectionEnabled]);

    const handleSave = async () => {
        setLoading(true);
        try {
            // Save system config
            const res = await fetch(`${BACKEND_URL}/system/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    multi_detection_enabled: config.multi_detection_enabled
                })
            });

            if (res.ok) {
                setMultiDetectionEnabled(config.multi_detection_enabled);
                setMessage({ type: 'success', text: 'Settings saved successfully' });
            } else {
                throw new Error('Failed to save');
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Error saving settings' });
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    return (
        <div className="glass-panel settings-panel animate-slide-up">
            <div className="panel-header">
                <div className="panel-title">
                    <Server size={18} />
                    <span>System Configuration</span>
                </div>
            </div>

            <div className="settings-content">
                {/* Detection Settings */}
                <div className="settings-section">
                    <h3><Shield size={16} /> Detection Logic</h3>
                    <div className="setting-item">
                        <div className="setting-info">
                            <label>Multi-Camera Detection Grouping</label>
                            <p>Enable cross-camera event correlation (experimental)</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={config.multi_detection_enabled}
                                onChange={e => setConfig({ ...config, multi_detection_enabled: e.target.checked })}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>

                {/* Database Management */}
                <div className="settings-section">
                    <h3><Activity size={16} /> Data Management</h3>
                    <div className="setting-item">
                        <div className="setting-info">
                            <label>Clear Accident History</label>
                            <p>Permanently remove all logged events and snapshots</p>
                        </div>
                        <button
                            className="btn-danger"
                            onClick={async () => {
                                if (confirm("Are you sure you want to delete ALL accident history?")) {
                                    await clearAllAlerts();
                                    setMessage({ type: 'success', text: 'Database cleared' });
                                    setTimeout(() => setMessage(null), 3000);
                                }
                            }}
                        >
                            <Trash2 size={14} /> Clear Database
                        </button>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="settings-actions">
                    {message && (
                        <div className={`settings-msg ${message.type}`}>
                            {message.text}
                        </div>
                    )}
                    <button
                        className="btn-primary"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : <><Save size={16} /> Save Changes</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
