// src/components/Header.jsx
import { Camera, AlertTriangle, Clock, Activity } from 'lucide-react';
import SystemStatus from './SystemStatus';
import LogTicker from './LogTicker';
import PrecisionClock from './PrecisionClock';
import SensorWaveform from './SensorWaveform';
import SystemIndicators from './SystemIndicators';
import { useSystem } from '../context/SystemContext';
import './Header.css';

export function Header() {
    const { status, cameras, events, selectedCamera, setSelectedCamera } = useSystem();

    // Calculate stats
    const activeCameras = cameras?.filter(c => c.status === 'active' || c.connected)?.length || cameras?.length || 0;
    const totalCameras = cameras?.length || 0;
    const todayIncidents = events?.length || 0;

    return (
        <header className="main-header">
            <div className="header-left">
                <LogTicker />
                <PrecisionClock />
            </div>

            <SensorWaveform />

            <div className="header-right">
                {/* New Status Bar */}
                <div className="status-bar">
                    <div className="status-item">
                        <span className="status-dot online"></span>
                        <span className="status-label">System Online</span>
                    </div>
                    <span className="status-separator">|</span>
                    <div className="status-item">
                        <Camera size={14} />
                        <span className="status-value">{activeCameras}</span>
                        <span className="status-label">/ {totalCameras} Cameras</span>
                    </div>
                    <span className="status-separator">|</span>
                    <div className="status-item incidents">
                        <AlertTriangle size={14} />
                        <span className="status-value">{todayIncidents}</span>
                        <span className="status-label">Alerts</span>
                    </div>
                </div>
                <SystemIndicators />
                <SystemStatus status={status} />
            </div>
        </header>
    );
}

