// src/components/Header.jsx
import { useState, useEffect } from 'react';
import { Camera, AlertTriangle, Cpu, HardDrive, Clock, Video, Wifi, WifiOff } from 'lucide-react';
import SystemIndicators from './SystemIndicators';
import LogTicker from './LogTicker';
import PrecisionClock from './PrecisionClock';
import SensorWaveform from './SensorWaveform';
import { useSystem } from '../context/SystemContext';
import { BACKEND_URL } from '../config';
import './Header.css';

export function Header() {
    const { cameras, events } = useSystem();
    const [systemStats, setSystemStats] = useState(null);
    const [backendOnline, setBackendOnline] = useState(false);
    const [lastSync, setLastSync] = useState(null);

    // Calculate stats
    const activeCameras = cameras?.filter(c => c.status === 'active' || c.connected)?.length || cameras?.length || 0;
    const totalCameras = cameras?.length || 0;
    const todayIncidents = events?.length || 0;

    // Fetch system stats every 5 seconds
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/system/stats`);
                if (res.ok) {
                    const data = await res.json();
                    setSystemStats(data);
                    setBackendOnline(true);
                    setLastSync(new Date());
                } else {
                    setBackendOnline(false);
                }
            } catch (err) {
                setBackendOnline(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

    // Format last sync time
    const getLastSyncText = () => {
        if (!lastSync) return '';
        const now = new Date();
        const diff = Math.floor((now - lastSync) / 1000);
        if (diff < 5) return 'Just now';
        if (diff < 60) return `${diff}s ago`;
        return `${Math.floor(diff / 60)}m ago`;
    };

    return (
        <header className="main-header">
            <div className="header-left">
                <LogTicker />
                <PrecisionClock />
            </div>

            <SensorWaveform />

            <div className="header-right">
                {/* Status Bar */}
                <div className="status-bar">
                    {/* Connection Status */}
                    <div className={`status-item ${backendOnline ? '' : 'offline'}`}>
                        {backendOnline ? (
                            <>
                                <span className="status-dot online"></span>
                                <span className="status-label">Online</span>
                            </>
                        ) : (
                            <>
                                <WifiOff size={14} className="offline-icon" />
                                <span className="status-label">Offline</span>
                            </>
                        )}
                    </div>

                    <span className="status-separator">|</span>

                    {/* Cameras */}
                    <div className="status-item">
                        <Camera size={14} />
                        <span className="status-value">{activeCameras}</span>
                        <span className="status-label">/ {totalCameras}</span>
                    </div>

                    <span className="status-separator">|</span>

                    {/* Alerts */}
                    <div className="status-item incidents">
                        <AlertTriangle size={14} />
                        <span className="status-value">{todayIncidents}</span>
                    </div>

                    {/* Recording Indicator */}
                    {systemStats?.recording_active && (
                        <>
                            <span className="status-separator">|</span>
                            <div className="status-item recording">
                                <Video size={14} />
                                <span className="status-label">REC</span>
                            </div>
                        </>
                    )}

                    {/* CPU/Memory Stats */}
                    {systemStats && backendOnline && (
                        <>
                            <span className="status-separator">|</span>
                            <div className="status-item compact">
                                <Cpu size={12} />
                                <span className="status-value">{systemStats.cpu_percent}%</span>
                            </div>
                            <div className="status-item compact">
                                <HardDrive size={12} />
                                <span className="status-value">{systemStats.memory_percent}%</span>
                            </div>
                        </>
                    )}

                    {/* Last Sync */}
                    {lastSync && (
                        <>
                            <span className="status-separator">|</span>
                            <div className="status-item sync">
                                <Clock size={12} />
                                <span className="status-label">{getLastSyncText()}</span>
                            </div>
                        </>
                    )}
                </div>
                <SystemIndicators />
            </div>
        </header>
    );
}
