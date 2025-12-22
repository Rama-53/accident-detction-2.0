// src/components/Header.jsx
import { Camera } from 'lucide-react';
import SystemStatus from './SystemStatus';
import LogTicker from './LogTicker';
import PrecisionClock from './PrecisionClock';
import SensorWaveform from './SensorWaveform';
import SystemIndicators from './SystemIndicators';
import { useSystem } from '../context/SystemContext';
import './Header.css';

export function Header() {
    const { status, cameras, selectedCamera, setSelectedCamera } = useSystem();

    return (
        <header className="main-header">
            <div className="header-left">
                <LogTicker />
                <PrecisionClock />
            </div>

            <SensorWaveform />

            <div className="header-right">
                <SystemIndicators />
                <SystemStatus status={status} />
            </div>
        </header>
    );
}

