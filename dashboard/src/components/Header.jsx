// src/components/Header.jsx
import { Camera } from 'lucide-react';
import './Header.css';

export function Header({ status, cameras, selectedCamera, setSelectedCamera }) {
    return (
        <header className="main-header">
            <div className="header-title">
                <h1>Accident Detection System</h1>
                <p>Real-time roadway monitoring and incident response</p>
            </div>
            <div className="header-controls">
                <div className="camera-filter">
                    <Camera size={16} />
                    <select
                        value={selectedCamera || 'all'}
                        onChange={(e) => setSelectedCamera(e.target.value)}
                        className="header-select"
                    >
                        <option value="all">All Cameras</option>
                        {cameras.map((cam) => (
                            <option key={cam} value={cam}>{cam}</option>
                        ))}
                    </select>
                </div>
                <div className={`status-badge ${status === 'Running' ? 'success' : 'danger'}`}>
                    <span className="status-dot" />
                    {status}
                </div>
            </div>
        </header>
    );
}
