// src/App.jsx
import "./App.css";

// Context
import { SystemProvider, useSystem } from "./context/SystemContext";

// Components
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { CameraWall } from "./components/CameraWall";
import { AlertsPage } from "./components/AlertsPage";
import { Gallery } from "./components/Gallery";
import { IntroOverlay } from "./components/IntroOverlay";
import { EventModal } from "./components/EventModal";
import { Settings } from "./components/Settings";

function AppContent() {
  const {
    activeTab,
    showIntro, setShowIntro,
    activeEvent, setActiveEvent
  } = useSystem();

  return (
    <>
      {showIntro && <IntroOverlay onComplete={() => setShowIntro(false)} />}

      {activeEvent && (
        <EventModal
          event={activeEvent}
          onClose={() => setActiveEvent(null)}
        />
      )}

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
