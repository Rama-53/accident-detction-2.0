import { useState } from 'react';
import clsx from 'clsx';

export default function Evidence() {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [gridCols, setGridCols] = useState<2 | 3 | 1>(2);
  const [isExporting, setIsExporting] = useState(false);

  const images = [
    {
      id: 1,
      src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDIPYr9clu6EAq7ERpbV-HSbjrmA6sUjltNZfKqvGOCrkVtOawuJ_AIhVdY-w05VovT1Xc7YEjj0CueV8z7hke2npD63IaVx8kGzwiWVNU4d-sOQ98EONM5X42RWAbWGwK0aUM_MalaDWmEcTsXLP1dJIPohjKKJpqFR-v65SwIPSh6acmT_vR8TIoscnolbYAYWNimcQ_VlIRVb-Em6owNsYRoRLsgM4B45PtZ7iz2Ro5wDV9NjfkbvtZ0xmxqJykxvNK6gGTzrvQ",
      alt: "CCTV capture of urban intersection at night",
      date: "OCT 24 • 14:22:05",
      cam: "CAM-04 NORTH"
    },
    {
      id: 2,
      src: "https://lh3.googleusercontent.com/aida-public/AB6AXuC6OXJiQZCqI27a6ImPSBJSnnxUMPA_XodLnBa90y-PgaGIYGTw9AvL3SdquQmh-N_WcwRvx3AkrkOJOXTtHjxOPWmBII4_DzBdFytaEc9PvjWfECeGRLKPXzM7xTqOOsyfqPw8Ytwu3sMhWoR6ayVqbnMVraBfcdcf8Q0G-f07z03LnIJ3mTlcPWAED3KKSNjphgY4BJZB3hFdfZrbCn527RODejp28Fbr9l_ZftarW5iD-tYMoYbc2P6SmrghDCAzj95XNQpjLos",
      alt: "Dashcam footage of heavy highway traffic",
      date: "OCT 24 • 14:21:44",
      cam: "DASH-FRONT"
    },
    {
      id: 3,
      src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCkjLhpcMDGrD5G8fAE4DAr1TPmxcIcnfQX8wyssz5wvRe72b8jKA21mxFAb8JCTs0RBr5wHINoMugiS8AlQ4hL0Bjo-je5oA2dOrwKgEQHndt9he3VWqwtnqrqKMtqiQ8oJxtwvf0IZVVFgsoWZoVMWAYdbQYdW0HXCy8y1hEFJcriuSmAv2lqHnqkAcJLbI3e5oZuTdnjx8uDqjJpksSK0CrmTagxS4WnjAHVlANp_TXEOpfHGjIyaHxLnfPOJHhK8eXuzdMEOg4",
      alt: "Emergency vehicle lights blurred in distance",
      date: "OCT 24 • 14:20:12",
      cam: "CAM-01 SOUTH"
    },
    {
      id: 4,
      src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhCGFEHpzUlhNl8FMYlaIOpqlCI9Hnp2nLbFnhD9BMt44YYIR1eF77cWAG1t7w_MKb3ppIUdXKXSU1k4pQq8R44Tn36miyW1FSS0pVKhEs3O60av85j75hXR1lExiR9N3jRaKOKVnYHwUHhOlDppX1sa_cA-oRta7ESE3TB4SXtXHmqssgozpzCQGJeVuaNWj4csd6v08kVvakeZZ8qK7MLxvATmjJZ--wnOSVQRbl5c-MyA5kz6IYOwhwEJRjCAhqwmWQGV4jEJ0",
      alt: "Aerial view of roadway junction with lane markings",
      date: "OCT 24 • 14:18:59",
      cam: "DRONE-02"
    },
    {
      id: 5,
      src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBJ7cdMysr0iZqbS51XRumUhAlI-B5h4y8ULZQU6faRNiEliVklTAOPBfAhJZUrfe_xWwd_Y1w2bQvLCzypNVh-jJ-m_HIK-JmaFjR6LCK0JsmHaXrWEON4UohFOGDJlIE-hgk03WM5Fe3guAbOADwS1cHpd9N4MwUZ5J6kufLVXkdU9touAaZri-CCf9_WPXrIhWHk1EiGAVuGzmdLKzQFNDkyALrlTQLXVzMGsE-E4ZHM_78JUbIvpXAPMaBcqf-DI2O3Ymu6m7g",
      alt: "Close up of high-visibility safety cone",
      date: "OCT 24 • 14:15:30",
      cam: "CAM-09 EAST"
    },
    {
      id: 6,
      src: "https://lh3.googleusercontent.com/aida-public/AB6AXuALT3Zp890wEiQPth4li7HCEajKLPDJdk-8ZIMUCCE1m00FROXEebHik4P78UUBvqtpP4Fq4usPcZfeG5SwdnEUusfxEnyxpbWAmIjXpYcTh-_EJcXUK0bZwo-2XvA3Re3Q87Bn6nlgMdGq5RUx78qlgIOSDrtP2_YWJB61uoWBNu0HQAtICHWc3fn02IP2z5HXwN6-ZiWqO-R0FC3XHLY1NDU5yl2INOT0PL10Vl8mQwPQUr59ETpaldY2zstPv7lcCoR05NtsJmk",
      alt: "Vehicle interior looking out towards steering wheel",
      date: "OCT 24 • 14:12:11",
      cam: "DASH-CABIN"
    }
  ];

  const activeImage = selectedImage !== null ? images.find(img => img.id === selectedImage) : null;

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert("Export successful! Files saved to local archive.");
    }, 1500);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen relative flex flex-col">
      {/* Header / Status Bar Area */}
      <header className="sticky top-0 z-40 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-icons text-primary text-2xl">security</span>
            <h1 className="text-xl font-bold tracking-tight">Evidence Vault</h1>
          </div>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-70"
          >
            {isExporting ? (
               <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
            ) : (
               <span className="material-icons text-sm">ios_share</span>
            )}
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
        {/* Grid Controls */}
        <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl">
          <div className="flex w-full">
            <button 
              onClick={() => setGridCols(3)}
              className={clsx(
                "flex-1 flex items-center justify-center py-2 rounded-lg transition-all",
                gridCols === 3 ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <span className="material-icons text-lg">grid_view</span>
              <span className="text-xs ml-1 font-medium">Small</span>
            </button>
            <button 
              onClick={() => setGridCols(2)}
              className={clsx(
                "flex-1 flex items-center justify-center py-2 rounded-lg transition-all",
                gridCols === 2 ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <span className="material-icons text-lg">view_module</span>
              <span className="text-xs ml-1 font-medium">Medium</span>
            </button>
            <button 
              onClick={() => setGridCols(1)}
              className={clsx(
                "flex-1 flex items-center justify-center py-2 rounded-lg transition-all",
                gridCols === 1 ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <span className="material-icons text-lg">view_stream</span>
              <span className="text-xs ml-1 font-medium">Large</span>
            </button>
          </div>
        </div>
      </header>

      {/* Gallery Grid (Medium View Default) */}
      <main className="flex-1 overflow-y-auto p-4 hide-scrollbar">
        <div className={clsx("grid gap-3 transition-all", {
          'grid-cols-3': gridCols === 3,
          'grid-cols-2': gridCols === 2,
          'grid-cols-1': gridCols === 1,
        })}>
          {images.map((img) => (
            <div 
              key={img.id} 
              className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-900 cursor-pointer"
              onClick={() => setSelectedImage(img.id)}
            >
              <img 
                className="w-full h-full object-cover opacity-90 transition-opacity hover:opacity-100" 
                alt={img.alt} 
                src={img.src} 
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-[10px] text-white/90 font-medium">{img.date}</p>
                <p className="text-[8px] text-white/60 uppercase tracking-widest">{img.cam}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="py-12 flex flex-col items-center opacity-40">
          <span className="material-icons text-4xl mb-2">lock</span>
          <p className="text-xs uppercase tracking-widest font-bold">Encrypted Archive End</p>
        </div>
      </main>

      {/* Lightbox Modal Overlay */}
      {activeImage && (
        <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Modal Header */}
          <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between text-white z-50">
            <button 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <span className="material-icons">close</span>
            </button>
            <div className="text-center">
              <h2 className="text-sm font-bold">Snapshot Detail</h2>
              <p className="text-[10px] opacity-60">IMG_2024_1024_142205.raw</p>
            </div>
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors">
              <span className="material-icons">more_horiz</span>
            </button>
          </div>

          {/* Main Full Image */}
          <div className="relative w-full max-h-[60vh] flex items-center justify-center">
            <img 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl shadow-primary/20" 
              alt={activeImage.alt} 
              src={activeImage.src.replace('opacity-90', '')} // Using same src for now
            />
            {/* Navigation Arrows */}
            <button 
              className="absolute -left-2 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-primary/20 text-primary backdrop-blur-sm border border-primary/30 hover:bg-primary/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                const currentIndex = images.findIndex(img => img.id === selectedImage);
                const prevIndex = (currentIndex - 1 + images.length) % images.length;
                setSelectedImage(images[prevIndex].id);
              }}
            >
              <span className="material-icons">chevron_left</span>
            </button>
            <button 
              className="absolute -right-2 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-primary/20 text-primary backdrop-blur-sm border border-primary/30 hover:bg-primary/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                const currentIndex = images.findIndex(img => img.id === selectedImage);
                const nextIndex = (currentIndex + 1) % images.length;
                setSelectedImage(images[nextIndex].id);
              }}
            >
              <span className="material-icons">chevron_right</span>
            </button>
          </div>

          {/* Lightbox Bottom Info */}
          <div className="absolute bottom-12 inset-x-0 px-6 max-w-md mx-auto">
            <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-[10px] font-bold rounded uppercase tracking-wider">Critical Event</span>
                <span className="text-[10px] opacity-60">LAT: 40.7128° N, LON: 74.0060° W</span>
              </div>
              <div className="flex items-center gap-4 text-sm font-medium">
                <div className="flex-1 border-r border-white/10">
                  <p className="text-[10px] opacity-40 uppercase mb-0.5">Timestamp</p>
                  <p>14:22:05.42</p>
                </div>
                <div className="flex-1 border-r border-white/10">
                  <p className="text-[10px] opacity-40 uppercase mb-0.5">Speed Est.</p>
                  <p>44.2 mph</p>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] opacity-40 uppercase mb-0.5">G-Force</p>
                  <p>2.4G</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                <span className="material-icons text-lg">download</span>
                Save
              </button>
              <button className="flex-1 bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all">
                <span className="material-icons text-lg">description</span>
                Report
              </button>
            </div>
          </div>
          
          {/* Pagination Indicator */}
          <div className="absolute bottom-6 flex gap-1.5">
            {images.map((img, idx) => (
               <div 
                 key={img.id} 
                 className={clsx("w-1.5 h-1.5 rounded-full", selectedImage === img.id ? "bg-primary" : "bg-white/20")}
               />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
