// src/components/Dashboard.jsx
import { LiveFeed } from './LiveFeed';
import { CameraMap } from './CameraMap';
import { AlertsList } from './AlertsList';
import { StatsWidget } from './StatsWidget';
import './Dashboard.css';

export function Dashboard() {
    return (
        <div className="dashboard-container animate-enter">
            {/* Statistics Widget */}
            <StatsWidget />

            <div className="dashboard-grid">
                <div className="live-feed-section">
                    <LiveFeed />
                </div>

                <div className="alerts-section">
                    <AlertsList />
                </div>

                <div className="map-section">
                    <CameraMap />
                </div>
            </div>
        </div>
    );
}
