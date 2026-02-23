import { useState, useEffect } from 'react';
import clsx from 'clsx';
import {
  fetchSystemConfig,
  updateSystemConfig,
  fetchResponders,
  deleteResponder,
  type SystemConfig,
  type Responder,
} from '../services/api';
import { BACKEND_URL } from '../config';
import { useResponder } from '../hooks/useResponder';

export default function Settings() {
  const [volume, setVolume] = useState(() => {
    const stored = localStorage.getItem('ads_alert_volume');
    return stored ? parseInt(stored) : 85;
  });
  const [criticalAlerts, setCriticalAlerts] = useState(() => {
    return localStorage.getItem('ads_critical_alerts') !== 'false';
  });
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { currentResponder, setResponder, clearResponder } = useResponder(responders);

  // Fetch system config and responders on mount
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [sysConfig, resps] = await Promise.all([
          fetchSystemConfig(),
          fetchResponders().catch(() => []),
        ]);
        if (!active) return;
        setConfig(sysConfig);
        setResponders(resps);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  // Persist local settings
  useEffect(() => {
    localStorage.setItem('ads_alert_volume', String(volume));
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('ads_critical_alerts', String(criticalAlerts));
  }, [criticalAlerts]);

  const playTestSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(volume / 1000, audioContext.currentTime);

    oscillator.start();
    setTimeout(() => oscillator.stop(), 200);
  };

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      const result = await updateSystemConfig({
        multi_detection_enabled: config.multi_detection_enabled,
        video_recording_enabled: config.video_recording_enabled,
        email_alerts_enabled: config.email_alerts_enabled,
        whatsapp_alerts_enabled: config.whatsapp_alerts_enabled,
        admin_email: config.admin_email,
        admin_phone: config.admin_phone,
        alert_delay_minutes: config.alert_delay_minutes,
      });
      setConfig(result.config);
    } catch (err) {
      console.error('Failed to save config:', err);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteResponder = async (id: string) => {
    try {
      await deleteResponder(id);
      setResponders(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      console.error('Failed to delete responder:', err);
    }
  };

  const handleExportResponders = () => {
    window.open(`${BACKEND_URL}/responders/export`, '_blank');
  };

  const roleIcon: Record<string, { icon: string; color: string }> = {
    police: { icon: 'local_police', color: 'red' },
    ambulance: { icon: 'medical_services', color: 'blue' },
    fire: { icon: 'local_fire_department', color: 'orange' },
    admin: { icon: 'admin_panel_settings', color: 'purple' },
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <span className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></span>
          <span className="text-sm font-medium">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col relative pb-28">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-6 py-4 border-b border-primary/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-icons-outlined text-primary">settings</span>
          <h1 className="text-xl font-bold tracking-tight">System Settings</h1>
        </div>
        <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
          <span className="material-icons-outlined text-sm text-primary">person</span>
        </div>
      </header>

      <main className="flex-grow px-4 pt-6 space-y-8">
        {/* Section: Responder Profile - "I am" selector */}
        <section>
          <h2 className="px-2 mb-2 text-xs font-semibold text-primary uppercase tracking-widest">Responder Profile</h2>
          <p className="px-2 mb-3 text-xs text-slate-500">Select your profile for sector filtering and quick actions</p>
          <div className="bg-white dark:bg-primary/5 rounded-xl border border-slate-200 dark:border-primary/20 overflow-hidden">
            <button
              onClick={() => clearResponder()}
              className={clsx(
                "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                !currentResponder
                  ? "bg-primary/10 border-l-4 border-primary"
                  : "hover:bg-slate-50 dark:hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="material-icons-outlined text-slate-400">person_outline</span>
                <div className="text-left">
                  <p className="text-sm font-semibold">Guest / Monitor</p>
                  <p className="text-[10px] text-slate-500">View all sectors</p>
                </div>
              </div>
              {!currentResponder && <span className="material-icons text-primary">check_circle</span>}
            </button>
            {responders.map((resp) => {
              const ri = roleIcon[resp.role] || { icon: 'person', color: 'slate' };
              const isSelected = currentResponder?._id === resp._id;
              return (
                <button
                  key={resp._id}
                  onClick={() => resp._id && setResponder(String(resp._id))}
                  className={clsx(
                    "w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-t border-slate-100 dark:border-primary/10",
                    isSelected ? "bg-primary/10 border-l-4 border-primary" : "hover:bg-slate-50 dark:hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="material-icons-outlined text-primary text-lg">{ri.icon}</span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{resp.name}</p>
                      <p className="text-[10px] text-slate-500">{resp.role} • {resp.sector_id}</p>
                    </div>
                  </div>
                  {isSelected && <span className="material-icons text-primary">check_circle</span>}
                </button>
              );
            })}
            {responders.length === 0 && (
              <div className="px-4 py-3 text-slate-500 text-xs">
                No responders configured. Import from desktop dashboard.
              </div>
            )}
          </div>
        </section>

        {/* Section: Detection Logic */}
        <section>
          <h2 className="px-2 mb-2 text-xs font-semibold text-primary uppercase tracking-widest">Detection Logic</h2>
          <div className="bg-white dark:bg-primary/5 rounded-xl border border-slate-200 dark:border-primary/20 divide-y divide-slate-100 dark:divide-primary/10 overflow-hidden">
            {/* Multi-Camera Grouping */}
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Multi-Camera Grouping</span>
                <span className="text-xs text-slate-500">Sync sensors across zones</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={config?.multi_detection_enabled ?? false}
                  onChange={(e) => setConfig(prev => prev ? ({ ...prev, multi_detection_enabled: e.target.checked }) : prev)}
                />
                <div className="w-12 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            {/* Automatic Recording */}
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Automatic Recording</span>
                <span className="text-xs text-slate-500">Auto-save incident footage</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={config?.video_recording_enabled ?? false}
                  onChange={(e) => setConfig(prev => prev ? ({ ...prev, video_recording_enabled: e.target.checked }) : prev)}
                />
                <div className="w-12 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Section: Alert Notifications */}
        <section>
          <h2 className="px-2 mb-2 text-xs font-semibold text-primary uppercase tracking-widest">Alert Notifications</h2>
          <div className="bg-white dark:bg-primary/5 rounded-xl border border-slate-200 dark:border-primary/20 p-4 space-y-6">
            {/* Volume Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">System Volume</span>
                <span className="text-xs font-mono text-primary">{volume}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-icons-outlined text-slate-400 text-lg">volume_mute</span>
                <input
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none accent-primary cursor-pointer"
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                />
                <span className="material-icons-outlined text-slate-400 text-lg">volume_up</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Critical Sound Alerts</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={criticalAlerts}
                  onChange={(e) => setCriticalAlerts(e.target.checked)}
                />
                <div className="w-12 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <button
              onClick={playTestSound}
              className="w-full py-3 px-4 bg-primary/10 border border-primary/30 rounded-lg text-primary text-sm font-semibold hover:bg-primary/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <span className="material-icons-outlined text-lg">campaign</span>
              Test Alert Sound
            </button>
          </div>
        </section>

        {/* Section: Responder Manager */}
        <section>
          <div className="flex items-center justify-between px-2 mb-2">
            <h2 className="text-xs font-semibold text-primary uppercase tracking-widest">Responder Manager</h2>
          </div>
          <div className="bg-white dark:bg-primary/5 rounded-xl border border-slate-200 dark:border-primary/20 overflow-hidden">
            {responders.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <span className="material-icons text-3xl mb-2 opacity-50">group</span>
                <p className="text-sm">No responders configured</p>
                <p className="text-xs mt-1 text-slate-400">Import from Excel in the desktop dashboard</p>
              </div>
            ) : (
              responders.map((resp, idx) => {
                const ri = roleIcon[resp.role] || { icon: 'person', color: 'slate' };
                return (
                  <div
                    key={resp._id || idx}
                    className={clsx(
                      "flex items-center justify-between px-4 py-4",
                      idx < responders.length - 1 && "border-b border-slate-100 dark:border-primary/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-${ri.color}-500/10 flex items-center justify-center`}>
                        <span className={`material-icons-outlined text-${ri.color}-500`}>{ri.icon}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{resp.name}</span>
                        <span className="text-xs text-slate-500">{resp.email}{resp.phone ? ` • ${resp.phone}` : ''}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => resp._id && handleDeleteResponder(resp._id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <span className="material-icons-outlined text-sm">delete</span>
                    </button>
                  </div>
                );
              })
            )}
            {/* Export/Import Link */}
            <button
              onClick={handleExportResponders}
              className="w-full flex items-center gap-3 px-4 py-4 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-t border-slate-100 dark:border-primary/10"
            >
              <span className="material-icons-outlined text-lg">file_download</span>
              <span className="text-sm font-medium">Export Responder List (Excel)</span>
            </button>
          </div>
        </section>
      </main>

      {/* Fixed Footer Action */}
      <div className="fixed bottom-24 left-0 right-0 p-4 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/95 dark:via-background-dark/95 to-transparent pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100"
          >
            {isSaving ? (
              <span className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
