import { useState } from 'react';
import clsx from 'clsx';

export default function Settings() {
  const [volume, setVolume] = useState(85);
  const [multiCamera, setMultiCamera] = useState(true);
  const [autoRecording, setAutoRecording] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const playTestSound = () => {
    // Simple beep using Web Audio API or just a log for now since we can't easily bundle audio files
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    
    oscillator.start();
    setTimeout(() => {
        oscillator.stop();
    }, 200);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert("Settings saved successfully!");
    }, 1000);
  };

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
        {/* Section: Detection Logic */}
        <section>
          <h2 className="px-2 mb-2 text-xs font-semibold text-primary uppercase tracking-widest">Detection Logic</h2>
          <div className="bg-white dark:bg-primary/5 rounded-xl border border-slate-200 dark:border-primary/20 divide-y divide-slate-100 dark:divide-primary/10 overflow-hidden">
            {/* Toggle Row */}
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Multi-Camera Grouping</span>
                <span className="text-xs text-slate-500">Sync sensors across zones</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={multiCamera}
                  onChange={(e) => setMultiCamera(e.target.checked)}
                />
                <div className="w-12 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            {/* Toggle Row */}
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Automatic Recording</span>
                <span className="text-xs text-slate-500">Auto-save incident footage</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={autoRecording}
                  onChange={(e) => setAutoRecording(e.target.checked)}
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
            <button className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
              <span className="material-icons-outlined text-xs">add</span> Add New
            </button>
          </div>
          <div className="bg-white dark:bg-primary/5 rounded-xl border border-slate-200 dark:border-primary/20 overflow-hidden">
            {/* Responder Item */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-primary/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <span className="material-icons-outlined text-red-500">local_police</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Police Department</span>
                  <span className="text-xs text-slate-500">911 Central Dispatch</span>
                </div>
              </div>
              <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                <span className="material-icons-outlined">edit</span>
              </button>
            </div>
            {/* Responder Item */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-primary/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <span className="material-icons-outlined text-blue-500">medical_services</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Ambulance Service</span>
                  <span className="text-xs text-slate-500">+1 (555) 000-247</span>
                </div>
              </div>
              <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                <span className="material-icons-outlined">edit</span>
              </button>
            </div>
            {/* Utility Link */}
            <button className="w-full flex items-center gap-3 px-4 py-4 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <span className="material-icons-outlined text-lg">file_download</span>
              <span className="text-sm font-medium">Import/Export Responder List (Excel)</span>
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
