// src/components/Sidebar.jsx
import {
    LayoutDashboard,
    Video,
    Bell,
    Images,
    Settings,
    AlertTriangle,
    Sun,
    Moon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSystem } from '../context/SystemContext';
import './Sidebar.css';

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'camerawall', label: 'Camera Wall', icon: Video },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'gallery', label: 'Gallery', icon: Images },
    { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
    const { activeTab, setActiveTab, theme, toggleTheme } = useSystem();

    return (
        <aside className="sidebar">
            <div className="brand">
                <div className="brand-icon-wrapper">
                    <AlertTriangle className="brand-icon" size={26} />
                </div>
                <span className="brand-text">AccidentAI</span>
            </div>

            <nav className="nav-menu">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            className={`nav-btn ${isActive ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="active-tab"
                                    className="active-background"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <div className="nav-icon-wrapper">
                                <Icon size={20} />
                            </div>
                            <span className="nav-label">{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <button className="theme-toggle" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
            </div>
        </aside>
    );
}
