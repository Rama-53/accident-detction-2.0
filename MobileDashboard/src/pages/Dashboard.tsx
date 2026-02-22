import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

const DASHBOARD_CAMERAS = [
  {
    id: 'CAM-04',
    name: 'Main St (CAM-04)',
    location: 'Intersection A',
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCyvcw_HSoh-nZRkTk4fdP5LJv44-O4dy615W-dVnECNCflvQeHGp5Etr3nuZ4YzpwgITXlrmuSOPEdFssBkuBbc3Zs7nX5Sato1DlMUlLqAw6YyQkmHPgI9m01KrDvrjU14AiWzpzdRnse_DeCoHOjABZmcJDhFA3lZp8s4TN0pg5SAEYK1KqoJ2fnFuXnvQBNza0hBEMsp2MLpqiLjHLOhq5ys3GahyV5EwahICz9hMoBvJQ3SRnMsrVW388V4htzyUJHW7ATVDM",
    mapPos: { top: '50%', left: '33%' }
  },
  {
    id: 'CAM-11',
    name: 'Parkway East (CAM-11)',
    location: 'North Highway',
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuC_qzur5tWarEoZV6LIM4PwDPQhyJcO7iriQokQ95mn9KOnjTmOcseskVrZl2Ue_095zVjM50KbXp61tdJkUsZX-bZnjcE4baKyA-Fa9c6ds-LddlmzNm2bO5cIvOrN6ttFG-J_iG61-gVQrv7eQGP8ELB2ERYou-caEjztql7VsnxnTwWmftKkxeHLhO9xyF57-XtEBrY1MqzupQChRUb6xqzAyERi3ZhhkzFNTjOztiGo6z8E-2qvPZNg7bB0Lr4Rw0IGLSXpBn8",
    mapPos: { top: '25%', left: '75%' }
  },
  {
    id: 'CAM-09',
    name: 'System Node 09 (CAM-09)',
    location: 'Tunnel Exit',
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBbA7STs0Szlx1CnNltwKXJMqSuaAojVEuE3YsmvkFsLNU6-pfXrbmB4mKtQIkqusMcsUDBm1HC2NwBw15nMT47lLvHWBYbTxRyCcac4F6NGI9kJqAwGMSSiaYfFXIGB-YW1j47vGlNXl58q36QCKdEwoFdSLIvyzEvMz7wjOUSstHFMBWuNC1HTthQ91jQeOfyRmVlIQpIprSq41SdojjO738x4A--3kjVnWKhUIH89WbZbTin4oOK4r2oQZ9Bhw6d5UpbTRTgzWo",
    mapPos: { top: '75%', left: '50%' }
  }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedCameraId, setSelectedCameraId] = useState(DASHBOARD_CAMERAS[0].id);

  const selectedCamera = DASHBOARD_CAMERAS.find(c => c.id === selectedCameraId) || DASHBOARD_CAMERAS[0];

  return (
    <div className="max-w-md mx-auto px-4 mt-4 space-y-6">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 pt-2 pb-4 bg-background-light dark:bg-background-dark border-b border-primary/10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="material-icons text-white">analytics</span>
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-wider text-slate-500">ADS 2.0</h1>
              <p className="text-lg font-bold">System Dashboard</p>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center relative">
            <span className="material-icons text-primary">notifications</span>
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-severity-high border-2 border-background-dark rounded-full"></span>
          </button>
        </div>
      </header>

      {/* Live Monitoring Section */}
      <section className="space-y-3">
        <div className="flex justify-between items-end">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">Live Monitoring</h2>
          <div className="flex items-center gap-2">
             <select 
               value={selectedCameraId}
               onChange={(e) => setSelectedCameraId(e.target.value)}
               className="bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 text-xs rounded-lg py-1 pl-2 pr-6 focus:ring-2 focus:ring-primary outline-none"
             >
               {DASHBOARD_CAMERAS.map(cam => (
                 <option key={cam.id} value={cam.id}>{cam.name}</option>
               ))}
             </select>
             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-severity-high/10 text-severity-high text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-severity-high animate-pulse"></span>
              REC
            </div>
          </div>
        </div>
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl group transition-all duration-300">
          {/* Video Placeholder with AI Overlays */}
          <img 
            key={selectedCamera.id}
            className="w-full h-full object-cover animate-in fade-in duration-500" 
            alt={`CCTV footage of ${selectedCamera.name}`}
            src={selectedCamera.src}
          />
          {/* AI Bounding Boxes (Visual Representation - Only for CAM-04 for demo) */}
          {selectedCamera.id === 'CAM-04' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-1/3 w-20 h-14 border-2 border-primary rounded-sm">
                <span className="absolute -top-5 left-0 bg-primary text-white text-[9px] px-1 py-0.5 rounded-sm">VEHICLE 98%</span>
              </div>
              <div className="absolute bottom-1/3 right-1/4 w-24 h-16 border-2 border-primary/60 rounded-sm">
                <span className="absolute -top-5 left-0 bg-primary/60 text-white text-[9px] px-1 py-0.5 rounded-sm">VEHICLE 92%</span>
              </div>
              <div className="absolute top-1/2 left-1/2 w-8 h-12 border-2 border-severity-med rounded-sm">
                <span className="absolute -top-5 left-0 bg-severity-med text-white text-[9px] px-1 py-0.5 rounded-sm">PED 84%</span>
              </div>
            </div>
          )}
          
          <div className="absolute bottom-3 left-3 flex gap-2">
            <div className="glass-effect px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 text-xs font-medium text-white">
              <span className="material-icons text-sm">videocam</span> {selectedCamera.name}
            </div>
          </div>
          <div className="absolute top-3 right-3">
            <button className="glass-effect w-8 h-8 rounded-lg border border-white/10 text-white flex items-center justify-center">
              <span className="material-icons text-sm">fullscreen</span>
            </button>
          </div>
        </div>
      </section>

      {/* Alerts Feed Horizontal Carousel */}
      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">Recent Alerts</h2>
          <Link to="/incidents" className="text-xs font-medium text-slate-500 hover:text-primary transition-colors">View All</Link>
        </div>
        <div className="flex overflow-x-auto gap-4 hide-scrollbar -mx-4 px-4 pb-2 snap-x">
          {/* High Alert Card */}
          <div 
            onClick={() => navigate('/incidents/1')}
            className="flex-shrink-0 w-64 bg-neutral-dark rounded-xl border-l-4 border-severity-high p-4 shadow-lg snap-start cursor-pointer hover:bg-neutral-dark/80 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="bg-severity-high/20 text-severity-high text-[10px] font-bold px-2 py-0.5 rounded-full border border-severity-high/30 uppercase tracking-tighter">High Severity</span>
              <span className="text-[10px] text-slate-500 font-medium">2m ago</span>
            </div>
            <h3 className="font-bold text-sm mb-1">Collision Detected</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="material-icons text-sm">location_on</span> Junction A42 - CAM 04
            </div>
          </div>
          {/* Medium Alert Card */}
          <div 
            onClick={() => navigate('/incidents/2')}
            className="flex-shrink-0 w-64 bg-neutral-dark rounded-xl border-l-4 border-severity-med p-4 shadow-lg snap-start cursor-pointer hover:bg-neutral-dark/80 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="bg-severity-med/20 text-severity-med text-[10px] font-bold px-2 py-0.5 rounded-full border border-severity-med/30 uppercase tracking-tighter">Medium</span>
              <span className="text-[10px] text-slate-500 font-medium">14m ago</span>
            </div>
            <h3 className="font-bold text-sm mb-1">Heavy Obstruction</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="material-icons text-sm">location_on</span> Parkway East - CAM 11
            </div>
          </div>
          {/* Active Monitoring Card */}
          <div className="flex-shrink-0 w-64 bg-neutral-dark rounded-xl border-l-4 border-primary p-4 shadow-lg opacity-70 snap-start">
            <div className="flex justify-between items-start mb-2">
              <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/30 uppercase tracking-tighter">Routine</span>
              <span className="text-[10px] text-slate-500 font-medium">1h ago</span>
            </div>
            <h3 className="font-bold text-sm mb-1">Sensor Calibration</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="material-icons text-sm">settings</span> System Node 09
            </div>
          </div>
          {/* Extra Card for Scrolling */}
          <div className="flex-shrink-0 w-64 bg-neutral-dark rounded-xl border-l-4 border-slate-500 p-4 shadow-lg opacity-70 snap-start">
            <div className="flex justify-between items-start mb-2">
              <span className="bg-slate-500/20 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-500/30 uppercase tracking-tighter">Log</span>
              <span className="text-[10px] text-slate-500 font-medium">2h ago</span>
            </div>
            <h3 className="font-bold text-sm mb-1">System Backup</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="material-icons text-sm">backup</span> Server Cluster
            </div>
          </div>
        </div>
      </section>

      {/* System Overview Stats */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">System Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-neutral-dark rounded-xl p-4 border border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Alerts</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-white">42</span>
              <span className="text-xs text-severity-high mb-1 font-bold">+5%</span>
            </div>
          </div>
          <div className="bg-neutral-dark rounded-xl p-4 border border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Active Nodes</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-white">12/14</span>
              <span className="text-[10px] text-slate-500 mb-1">Online</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Map Section */}
      <section className="space-y-3">
        <div className="bg-neutral-dark rounded-xl overflow-hidden border border-white/5 shadow-xl">
          <div className="p-4 flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="material-icons text-primary text-sm">map</span>
              <h3 className="text-xs font-bold uppercase">Incident Map</h3>
            </div>
            <span className="text-[10px] text-slate-500 bg-background-dark px-2 py-1 rounded">London, UK</span>
          </div>
          <div className="relative h-44 w-full bg-slate-800 group">
            <img 
              className="w-full h-full object-cover opacity-50 contrast-125 grayscale" 
              alt="Dark stylized city map with blue data overlays" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBq0uV5lyieQqGT_c4WjDG1ZM6ZU3P4qxmazJfFZp74DkisM50vM9-t35TJjYZgsGZ8n2cUBkNx0vhLn291kc3pdRupNt1nfnXa_V0tgJ7YTxbINJlXiozweQG13NWDCbOGhyyR5-Zd58geWgw_fc4nXxvStGrnH9N4H7TrL22WtTYQQTRJOj1ZAVchSpiwfplEBscoAgw9PC_k0rQ3aZ-BQgzEX3olrYzMjMq4-D6gseRSQkb072XiqpMqOe9Dxx6Kh6E-hbAAWT4"
            />
            
            {/* Dynamic Active Camera Pin */}
            <div 
              className="absolute transition-all duration-500 ease-in-out"
              style={{ top: selectedCamera.mapPos.top, left: selectedCamera.mapPos.left }}
            >
              <div className="relative -translate-x-1/2 -translate-y-1/2">
                <span className="absolute -top-1 -left-1 w-6 h-6 bg-primary/30 rounded-full animate-ping"></span>
                <span className="material-icons text-primary relative z-10 text-2xl drop-shadow-lg">location_on</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-black/80 text-white text-[8px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {selectedCamera.id}
                </div>
              </div>
            </div>

            {/* Other Static Pins (faded) */}
            {DASHBOARD_CAMERAS.filter(c => c.id !== selectedCameraId).map(cam => (
               <div 
                key={cam.id}
                className="absolute cursor-pointer"
                style={{ top: cam.mapPos.top, left: cam.mapPos.left }}
                onClick={() => setSelectedCameraId(cam.id)}
              >
                <div className="relative -translate-x-1/2 -translate-y-1/2">
                  <span className="material-icons text-slate-500 hover:text-white transition-colors text-xl">location_on</span>
                </div>
              </div>
            ))}

            <div className="absolute bottom-3 right-3 flex flex-col gap-2">
              <button className="w-8 h-8 bg-background-dark/80 rounded border border-white/10 text-white flex items-center justify-center">
                <span className="material-icons text-sm">add</span>
              </button>
              <button className="w-8 h-8 bg-background-dark/80 rounded border border-white/10 text-white flex items-center justify-center">
                <span className="material-icons text-sm">remove</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
