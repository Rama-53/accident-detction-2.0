// src/components/Dashboard.jsx
import { motion } from 'framer-motion';
import { LiveFeed } from './LiveFeed';
import { CameraMap } from './CameraMap';
import { AlertsList } from './AlertsList';
import { StatsWidget } from './StatsWidget';
import { IncidentTimeline } from './IncidentTimeline';
import { SeverityChart } from './SeverityChart';
import './Dashboard.css';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

export function Dashboard() {
    return (
        <motion.div
            className="dashboard-container"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Statistics Widget */}
            <motion.div variants={itemVariants}>
                <StatsWidget />
            </motion.div>

            <div className="dashboard-grid">
                <motion.div className="live-feed-section" variants={itemVariants}>
                    <LiveFeed />
                </motion.div>

                <motion.div className="alerts-section" variants={itemVariants}>
                    <AlertsList />
                </motion.div>

                <motion.div className="map-section" variants={itemVariants}>
                    <CameraMap />
                </motion.div>
            </div>

            <div className="dashboard-charts-row">
                <motion.div className="timeline-section" variants={itemVariants}>
                    <IncidentTimeline />
                </motion.div>

                <motion.div className="severity-section" variants={itemVariants}>
                    <SeverityChart />
                </motion.div>
            </div>
        </motion.div>
    );
}

