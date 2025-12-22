// src/components/Dashboard.jsx
import { LiveFeed } from './LiveFeed';
import { CameraMap } from './CameraMap';
import { AlertsList } from './AlertsList';
import './Dashboard.css';

export function Dashboard() {
    return (
        <div className="dashboard-grid animate-enter">
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
    );
}
