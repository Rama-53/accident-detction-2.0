/**
 * ADS 2.0 Mobile Dashboard
 * Main App with theme, connection status, and real-time alert toasts
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ToastContainer from './components/ToastContainer';
import ConnectionBanner from './components/ConnectionBanner';
import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import IncidentDetail from './pages/IncidentDetail';
import Cameras from './pages/Cameras';
import Evidence from './pages/Evidence';
import Settings from './pages/Settings';
import { useTheme } from './hooks/useTheme';
import { useConnection } from './hooks/useConnection';
import { useAlertToast } from './hooks/useAlertToast';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { status: connectionStatus } = useConnection();
  const { toasts, dismissToast } = useAlertToast();

  return (
    <BrowserRouter>
      <ConnectionBanner status={connectionStatus} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <Layout theme={theme} onToggleTheme={toggleTheme} connectionStatus={connectionStatus}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/incidents/:id" element={<IncidentDetail />} />
          <Route path="/cameras" element={<Cameras />} />
          <Route path="/evidence" element={<Evidence />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
