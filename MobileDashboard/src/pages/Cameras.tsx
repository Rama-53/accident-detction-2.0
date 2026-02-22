import { useState } from 'react';
import clsx from 'clsx';

interface Camera {
  id: number;
  name: string;
  status: 'live' | 'incident' | 'offline';
  fps: number;
  aiEnabled: boolean;
  image: string;
  alt: string;
}

const CAMERAS: Camera[] = [
  {
    id: 1,
    name: "Intersection A",
    status: 'live',
    fps: 32,
    aiEnabled: true,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCCKhddHDOWqh6L5VlBsqXOTabgBwroRXL1V8_Y_eT_-vsk_dSP0aH9nAL_tlAmgr3FwmSt3mD3w1AKpkMkYmFrIkbUJNcDHs60h-NAOZuuXvaks7ps9xEtW_fK1jBSZo7Jso33eJd2njJq8d6uoqVQxbv0nnVrG3CXjb5ACVb0Zdyar0G5GNXr9IGoKfoG5QIq4awY_GiJ-hNl4cYOLjTURYzR_TfuKB_OE0QXGIc98tLYpWXAWpzbTXt-onWEBoWq9eD2JcjlwAs",
    alt: "Traffic camera view of a busy city intersection"
  },
  {
    id: 2,
    name: "North Highway (M1)",
    status: 'incident',
    fps: 30,
    aiEnabled: true,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC_qzur5tWarEoZV6LIM4PwDPQhyJcO7iriQokQ95mn9KOnjTmOcseskVrZl2Ue_095zVjM50KbXp61tdJkUsZX-bZnjcE4baKyA-Fa9c6ds-LddlmzNm2bO5cIvOrN6ttFG-J_iG61-gVQrv7eQGP8ELB2ERYou-caEjztql7VsnxnTwWmftKkxeHLhO9xyF57-XtEBrY1MqzupQChRUb6xqzAyERi3ZhhkzFNTjOztiGo6z8E-2qvPZNg7bB0Lr4Rw0IGLSXpBn8",
    alt: "CCTV view of a multi-lane highway"
  },
  {
    id: 3,
    name: "Tunnel Exit West",
    status: 'live',
    fps: 24,
    aiEnabled: true,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBbA7STs0Szlx1CnNltwKXJMqSuaAojVEuE3YsmvkFsLNU6-pfXrbmB4mKtQIkqusMcsUDBm1HC2NwBw15nMT47lLvHWBYbTxRyCcac4F6NGI9kJqAwGMSSiaYfFXIGB-YW1j47vGlNXl58q36QCKdEwoFdSLIvyzEvMz7wjOUSstHFMBWuNC1HTthQ91jQeOfyRmVlIQpIprSq41SdojjO738x4A--3kjVnWKhUIH89WbZbTin4oOK4r2oQZ9Bhw6d5UpbTRTgzWo",
    alt: "Low light camera view of a tunnel exit"
  },
  {
    id: 4,
    name: "Parking Entrance P1",
    status: 'live',
    fps: 30,
    aiEnabled: true,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBIWDV5LZ6AHg5ADyMaQhKuWaTfaZwzUo-TuKGEIGDyiDgBcB9h3mymWl-t5pBfzdHD75_7-B4grZiKfcYKFZ4etfSCQebod23NFQSJS74IniGUKqHEohhxXtVQDmZ1ykx4H2aUVzxK3mYLGAIoAY5Jdyy30ipCtiqbcwmblHJ3DaKbpRTXEX6jRnDqMT8_2tjWSMpE9r0CIFEJX4iEVVJzT6si_lps5dFezHgh3yi4e4HqlAqwLSgGtVUCKra0LnfmPDG3SYCM6g0",
    alt: "CCTV security footage of a parking garage entrance"
  }
];

export default function Cameras() {
  const [searchQuery, setSearchQuery] = useState('');
  const [fullscreenCamera, setFullscreenCamera] = useState<Camera | null>(null);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  const filteredCameras = CAMERAS.filter(cam => 
    cam.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col">
      {/* Header Section */}
      <header className="px-4 pb-4 pt-6 bg-background-light dark:bg-background-dark border-b border-primary/10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold tracking-tight">Camera Wall</h1>
          <div className="flex gap-3">
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <span className="material-icons">notifications</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
              <img 
                className="w-full h-full object-cover" 
                alt="User profile avatar" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBFkC6sK27R095x-5G80mlKaXM_0kQH5a5c48-TxS797K7X0z1IkozJH1V410zU1J6VuRqsUPJmO0EAHgdvpTmYvSDGAT9Bk2WE5LWWXxBvehlzj0NUSqaNkllA9HP7PflspGq-bMjUa3lqcJQx5VvSadCUNEf-MbJdoVHoggtDM9kxVKCQBqdfQ2Bent4EBZ2RK3Bx4CqSXgrCWkc6qxf95jTgAALZtwjwjDc0xK4DRliFIbELB-qZND9arVH2FiLUTQ2G_8cBok"
              />
            </button>
          </div>
        </div>
        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input 
              className="w-full bg-white dark:bg-slate-800/50 border border-primary/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" 
              placeholder="Search cameras..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 bg-white dark:bg-slate-800/50 border border-primary/10 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <span className="material-icons text-sm">tune</span>
            <span>Filter</span>
          </button>
        </div>
      </header>

      {/* Camera Grid */}
      <main className="flex-grow p-4 overflow-y-auto">
        <div className={clsx("grid gap-3 h-full", layout === 'grid' ? "grid-cols-2" : "grid-cols-1")}>
          {filteredCameras.map((cam) => (
            <div 
              key={cam.id}
              className={clsx(
                "relative rounded-xl overflow-hidden bg-slate-900 group border-2 transition-all cursor-pointer",
                cam.status === 'incident' ? "border-red-500/50" : "border-transparent hover:border-primary/50",
                layout === 'grid' ? "aspect-square md:aspect-video" : "aspect-video"
              )}
              onClick={() => setFullscreenCamera(cam)}
            >
              <img 
                className="w-full h-full object-cover opacity-80 transition-opacity group-hover:opacity-100" 
                alt={cam.alt} 
                src={cam.image}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40"></div>
              
              {/* Status Overlays */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {cam.status === 'incident' && (
                  <span className="bg-red-600 px-2 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-1 uppercase tracking-wider">
                    <span className="material-icons text-[10px]">warning</span>
                    Incident
                  </span>
                )}
                {cam.aiEnabled && (
                  <span className={clsx(
                    "px-2 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-1 uppercase tracking-wider",
                    cam.status === 'incident' ? "bg-primary/80 backdrop-blur-sm" : "bg-primary"
                  )}>
                    {cam.status !== 'incident' && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>}
                    AI Enabled
                  </span>
                )}
              </div>
              
              <div className="absolute bottom-2 left-2">
                <p className="text-[11px] font-medium text-white/90">{cam.name}</p>
                <p className="text-[9px] text-white/60">Live • {cam.fps} fps</p>
              </div>
              
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="bg-black/40 backdrop-blur-md p-1.5 rounded-lg text-white hover:bg-black/60">
                  <span className="material-icons text-xs">fullscreen</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* System Stats Bar */}
        <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">System Health</h3>
            <span className="text-[10px] text-slate-500">Last updated: 2s ago</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-primary/5">
              <p className="text-[10px] text-slate-500">Processing</p>
              <p className="text-sm font-bold text-primary">0.4ms</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-primary/5">
              <p className="text-[10px] text-slate-500">Confidence</p>
              <p className="text-sm font-bold text-primary">98.2%</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-primary/5">
              <p className="text-[10px] text-slate-500">Active AI</p>
              <p className="text-sm font-bold text-primary">4/4</p>
            </div>
          </div>
        </div>
      </main>
      
      {/* Floating Action Button for Layout */}
      <div className="fixed bottom-24 right-6">
        <button 
          onClick={() => setLayout(layout === 'grid' ? 'list' : 'grid')}
          className="w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <span className="material-icons">{layout === 'grid' ? 'view_list' : 'grid_view'}</span>
        </button>
      </div>

      {/* Fullscreen Modal */}
      {fullscreenCamera && (
        <div className="fixed inset-0 z-[150] bg-black flex flex-col animate-in fade-in duration-200">
          <div className="absolute top-4 right-4 z-50">
            <button 
              onClick={() => setFullscreenCamera(null)}
              className="w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
          <div className="flex-grow relative flex items-center justify-center">
             <img 
                className="max-w-full max-h-full object-contain" 
                alt={fullscreenCamera.alt} 
                src={fullscreenCamera.image}
              />
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg">
                <h2 className="text-white font-bold">{fullscreenCamera.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="text-white/80 text-xs">LIVE • {fullscreenCamera.fps} FPS</span>
                </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
