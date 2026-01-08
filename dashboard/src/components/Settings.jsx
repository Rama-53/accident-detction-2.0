// src/components/Settings.jsx
import { useState, useEffect } from 'react';
import { Save, Trash2, Server, Shield, Activity, Users, Volume2 } from 'lucide-react';
import { BACKEND_URL } from '../config';
import { ResponderManager } from './ResponderManager';
import { useSystem } from '../context/SystemContext';
import {
    setAudioEnabled,
    isAudioAlertEnabled,
    setAudioVolume,
    getAudioVolume,
    playTestSound
} from '../utils/audioAlert';
import './Settings.css';

export function Settings() {
    const {
        multiDetectionEnabled,
        setMultiDetectionEnabled,
        clearAllAlerts
    } = useSystem();

    const [config, setConfig] = useState({
        multi_detection_enabled: multiDetectionEnabled || false,
        video_recording_enabled: false,
        email_alerts_enabled: false,
        whatsapp_alerts_enabled: false,
        admin_email: "",
        admin_phone: "",
        alert_delay_minutes: 10,
        system_name: "Accident Detection System 2.0"
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    // Sound settings state
    const [soundEnabled, setSoundEnabled] = useState(isAudioAlertEnabled());
    const [soundVolume, setSoundVolume] = useState(getAudioVolume());

    useEffect(() => {
        // Fetch full system config on mount
        const fetchConfig = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/system/config`);
                if (res.ok) {
                    const data = await res.json();
                    setConfig(prev => ({
                        ...prev,
                        ...data
                    }));
                }
            } catch (err) {
                console.error("Failed to load settings:", err);
            }
        };
        fetchConfig();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            // Save system config
            const res = await fetch(`${BACKEND_URL}/system/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    multi_detection_enabled: config.multi_detection_enabled,
                    video_recording_enabled: config.video_recording_enabled,
                    email_alerts_enabled: config.email_alerts_enabled,
                    whatsapp_alerts_enabled: config.whatsapp_alerts_enabled,
                    admin_email: config.admin_email,
                    admin_phone: config.admin_phone,
                    alert_delay_minutes: config.alert_delay_minutes
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
            {!config ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>Loading settings...</div>
            ) : (
                <>
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
                                        onChange={e => {
                                            if (e.target.checked) {
                                                alert("Need More GPU power, Need Server");
                                                return;
                                            }
                                            setConfig({ ...config, multi_detection_enabled: e.target.checked });
                                        }}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>Video Recording</label>
                                    <p>Automatically record video clips of accident events</p>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={config.video_recording_enabled ?? false}
                                        onChange={e => setConfig({ ...config, video_recording_enabled: e.target.checked })}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>Alert Grouping Delay</label>
                                    <p>Minimum time between separate alerts for the same sector</p>
                                </div>
                                <select
                                    className="premium-input-field"
                                    value={config.alert_delay_minutes ?? 10}
                                    onChange={e => setConfig({ ...config, alert_delay_minutes: parseInt(e.target.value) })}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'white',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        width: '120px'
                                    }}
                                >
                                    <option value={0}>No Delay</option>
                                    <option value={5}>5 Minutes</option>
                                    <option value={10}>10 Minutes</option>
                                    <option value={30}>30 Minutes</option>
                                </select>
                            </div>
                        </div>

                        {/* Sound Settings */}
                        <div className="settings-section">
                            <h3><Volume2 size={16} /> Sound Alerts</h3>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>Enable Alert Sounds</label>
                                    <p>Play audio notification when accidents are detected</p>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={soundEnabled}
                                        onChange={e => {
                                            setSoundEnabled(e.target.checked);
                                            setAudioEnabled(e.target.checked);
                                        }}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>Volume: {Math.round(soundVolume * 100)}%</label>
                                    <p>Adjust the volume of alert sounds</p>
                                </div>
                                <div className="volume-control">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={soundVolume * 100}
                                        onChange={e => {
                                            const vol = e.target.value / 100;
                                            setSoundVolume(vol);
                                            setAudioVolume(vol);
                                        }}
                                        className="volume-slider"
                                        disabled={!soundEnabled}
                                    />
                                </div>
                            </div>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>Test Sound</label>
                                    <p>Preview the alert sound at current volume</p>
                                </div>
                                <button
                                    className="btn-secondary"
                                    onClick={playTestSound}
                                    disabled={!soundEnabled}
                                >
                                    🔊 Play Test
                                </button>
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

                        {/* Notification Settings */}
                        <div className="settings-section">
                            <h3><Activity size={16} /> Notifications</h3>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>Email Alerts</label>
                                    <p>Send accident reports via Email (SMTP)</p>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={config.email_alerts_enabled ?? true}
                                        onChange={e => setConfig({ ...config, email_alerts_enabled: e.target.checked })}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>WhatsApp Alerts</label>
                                    <p>Send instant alerts via WhatsApp Cloud API</p>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={config.whatsapp_alerts_enabled ?? true}
                                        onChange={e => setConfig({ ...config, whatsapp_alerts_enabled: e.target.checked })}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                        </div>

                        {/* Admin Contacts */}
                        <div className="settings-section">
                            <h3><Shield size={16} /> Admin Fallback</h3>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>Admin Email</label>
                                    <p>Receive alerts if vehicle owner is unknown</p>
                                </div>
                                <input
                                    type="email"
                                    className="premium-input-field"
                                    placeholder="admin@example.com"
                                    value={config.admin_email || ""}
                                    onChange={e => setConfig({ ...config, admin_email: e.target.value })}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '4px' }}
                                />
                            </div>
                            <div className="setting-item">
                                <div className="setting-info">
                                    <label>Admin Phone</label>
                                    <p>WhatsApp number (started with country code)</p>
                                </div>
                                <input
                                    type="text"
                                    className="premium-input-field"
                                    placeholder="15551234567"
                                    value={config.admin_phone || ""}
                                    onChange={e => setConfig({ ...config, admin_phone: e.target.value })}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '4px' }}
                                />
                            </div>
                        </div>

                        {/* --- NEW: Responder Management --- */}
                        <div className="settings-section">
                            <h3><Users size={16} /> Emergency Response</h3>
                            <ResponderManager />
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
                </>
            )}
        </div>
    );
}
