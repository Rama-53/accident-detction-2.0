// src/components/Layout.jsx
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import './Layout.css';

export function Layout({
    children,
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
    status,
    cameras,
    selectedCamera,
    setSelectedCamera
}) {
    return (
        <div className="app-layout">
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                theme={theme}
                toggleTheme={toggleTheme}
            />
            <main className="main-content-area">
                <Header
                    status={status}
                    cameras={cameras}
                    selectedCamera={selectedCamera}
                    setSelectedCamera={setSelectedCamera}
                />
                <div className="content-scroll-area">
                    {children}
                </div>
            </main>
        </div>
    );
}
