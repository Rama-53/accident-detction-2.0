// src/App.jsx
import "./App.css";

// Context
import { SystemProvider, useSystem } from "./context/SystemContext";

// Hooks
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

// Components
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { CameraWall } from "./components/CameraWall";
import { AlertsPage } from "./components/AlertsPage";
import { Gallery } from "./components/Gallery";
import { IntroOverlay } from "./components/IntroOverlay";
import { EventModal } from "./components/EventModal";
import { Settings } from "./components/Settings";
import { ToastContainer } from "./components/ToastContainer";

function AppContent() {
  const {
    activeTab,
    showIntro, setShowIntro,
    activeEvent, setActiveEvent,
    events,
    toggleTheme
  } = useSystem();

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onEscape: () => {
      if (activeEvent) setActiveEvent(null);
      if (showIntro) setShowIntro(false);
    },
    onToggleTheme: toggleTheme,
    onNavigatePrev: (event) => setActiveEvent(event),
    onNavigateNext: (event) => setActiveEvent(event),
    activeEvent,
    events
  });

  return (
    <>
      {showIntro && <IntroOverlay onComplete={() => setShowIntro(false)} />}

      {activeEvent && (
        <EventModal
          event={activeEvent}
          onClose={() => setActiveEvent(null)}
        />
      )}

      <ToastContainer />

      <Layout>
        {activeTab === "dashboard" && <Dashboard />}

        {activeTab === "camerawall" && <CameraWall />}

        {activeTab === "alerts" && <AlertsPage />}

        {activeTab === "gallery" && <Gallery />}

        {activeTab === "settings" && <Settings />}
      </Layout>
    </>
  );
}

function App() {
  return (
    <SystemProvider>
      <AppContent />
    </SystemProvider>
  );
}

export default App;

