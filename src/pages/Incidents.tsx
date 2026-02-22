import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

interface Alert {
  id: number;
  title: string;
  location: string;
  camera: string;
  sector: string;
  time: string;
  ago: string;
  severity: 'high' | 'medium' | 'low';
  image: string;
  live: boolean;
}

const INITIAL_ALERTS: Alert[] = [
  {
    id: 1,
    title: "Multi-vehicle Collision",
    location: "I-95 North, Exit 24B",
    camera: "CAM-084",
    sector: "Sector A-4",
    time: "14:24:08",
    ago: "2 mins ago",
    severity: "high",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCt4pqe_7AAc7H-523uIMc1S6eBPurYUNyhmCO1SVz2iMv-U515KQ4QvGKYPaQnHc45mMXwam6hv6LAgLVnE2D_k1k8XrGclxSB66ql6fNy__95bOdQ3p8aVEpLcHGE1nHFWtJiLRkfyhrKl2fGhf5KW0-nQYG5A-6nTFnnZ88ymMPHbJ51L_7DI-ftv2S57hoiB9jGBtcWjWqwVmE96sRu1EHcUzJiqrevoiU348k9Ru_hhmxHkYh-j0scq-l8acJvYfNg_xfv6Fw",
    live: true
  },
  {
    id: 2,
    title: "Stationary Vehicle",
    location: "Main Street Bridge",
    camera: "CAM-112",
    sector: "Sector D-1",
    time: "14:15:32",
    ago: "11 mins ago",
    severity: "medium",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDI3QgiV4aLlIPhSaBrq22-Ou4Ianhr1B7AOJNihv5ljGnFkUAOSl-bpn3Q7k3EQ2G9YhBS6yRVFX8111sxwASobibXM3XkjfPw61nupGC-swkHAaVdh140QLX5qESS8h8Ydah3xqywWrMlYSdMvSYPjz5-mqaSuyp8LTaig4tVvec5jHkxBPGAe8ldnMDyovv2cF3v_EmHBE4JRpnaZvx7Uy6o6GIjNU6cqxyEXyZMZbjYM5s2IkFUKSxVyF6RCMmbki9QS8MFauo",
    live: false
  },
  {
    id: 3,
    title: "Debris on Roadway",
    location: "King's Cross Intersection",
    camera: "CAM-019",
    sector: "Sector B-2",
    time: "13:42:12",
    ago: "44 mins ago",
    severity: "high",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC3uKLDZZV3vnvu8hr6vdJyW9IIzmGa50SOZuuEsDTSBi2lLOJH9o5MQmmfteGjKLq1LC64_0kLsxTJ2_HvZE_4CyUF-tJ71-KpVrxhTAQqC-ufOv00OKDYqoT6C0ibpTRmGgRaxwES2z3C5BO0Qk_3o0DpZ9ReA1Yw9NGhBhwMD_WHnZCHNkusclvsnHVlfwh_hDjYzQ3yb9Sj26we9UcGpe6xggIg0xvnKR5nwd8C21FEatd0anTyoW2DCAP4FdhCDZ-FR9I3Bvw",
    live: false
  }
];

export default function Incidents() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [isLoading, setIsLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium'>('all');

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = 
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.camera.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;

    return matchesSearch && matchesSeverity;
  });

  const handleLoadMore = () => {
    setIsLoading(true);
    // Simulate loading more data
    setTimeout(() => {
      const newAlert: Alert = {
        id: alerts.length + 1,
        title: "Pedestrian in Tunnel",
        location: "Tunnel Exit West",
        camera: "CAM-055",
        sector: "Sector C-3",
        time: "12:10:05",
        ago: "2 hours ago",
        severity: "high",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBbA7STs0Szlx1CnNltwKXJMqSuaAojVEuE3YsmvkFsLNU6-pfXrbmB4mKtQIkqusMcsUDBm1HC2NwBw15nMT47lLvHWBYbTxRyCcac4F6NGI9kJqAwGMSSiaYfFXIGB-YW1j47vGlNXl58q36QCKdEwoFdSLIvyzEvMz7wjOUSstHFMBWuNC1HTthQ91jQeOfyRmVlIQpIprSq41SdojjO738x4A--3kjVnWKhUIH89WbZbTin4oOK4r2oQZ9Bhw6d5UpbTRTgzWo",
        live: false
      };
      setAlerts([...alerts, newAlert]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="max-w-md mx-auto px-4 pb-24">
      {/* Header Section */}
      <header className="mb-6 pt-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <span className="material-icons">notifications_none</span>
          </button>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm">{filteredAlerts.length} alerts visible</p>
      </header>

      {/* Search and Filter Bar */}
      <div className="sticky top-0 z-40 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md py-3 -mx-4 px-4">
        <div className="relative mb-4">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input 
            className="w-full bg-white dark:bg-card-dark border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary shadow-sm outline-none transition-all" 
            placeholder="Search by location or camera..." 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          <button 
            onClick={() => setFilterSeverity('all')}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
              filterSeverity === 'all' 
                ? "bg-primary text-white shadow-md shadow-primary/20" 
                : "bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
            )}
          >
            <span className="material-icons text-xs">tune</span>
            All Alerts
          </button>
          <button 
            onClick={() => setFilterSeverity(filterSeverity === 'high' ? 'all' : 'high')}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              filterSeverity === 'high'
                ? "bg-severity-high text-white shadow-md"
                : "bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
            )}
          >
            High Severity
          </button>
          <button 
            onClick={() => setFilterSeverity(filterSeverity === 'medium' ? 'all' : 'medium')}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              filterSeverity === 'medium'
                ? "bg-severity-medium text-white shadow-md"
                : "bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
            )}
          >
            Medium Severity
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4 mt-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <span className="material-icons text-4xl mb-2 opacity-50">search_off</span>
            <p>No alerts found matching your criteria</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div key={alert.id} className="bg-white dark:bg-card-dark rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 active:scale-[0.99] transition-transform cursor-pointer hover:shadow-md">
              <div className="relative h-48 w-full">
                <img 
                  alt={alert.title} 
                  className="w-full h-full object-cover" 
                  src={alert.image}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute top-3 right-3">
                  <span className={clsx(
                    "text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg",
                    alert.severity === 'high' ? "bg-severity-high" : "bg-severity-medium"
                  )}>
                    {alert.severity} Severity
                  </span>
                </div>
                {alert.live && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <div className="bg-black/50 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                      <span className="text-white text-[10px] font-medium">LIVE REC</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{alert.title}</h3>
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 mt-1">
                      <span className="material-icons text-sm">location_on</span>
                      <span className="text-xs">{alert.location}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-primary">{alert.camera}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-tighter">{alert.sector}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="material-icons text-xs">schedule</span>
                    <span className="text-xs font-medium">{alert.time} • {alert.ago}</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/incidents/${alert.id}`);
                    }}
                    className="text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-1 hover:underline"
                  >
                    Details <span className="material-icons text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination / Load More */}
      <div className="mt-8 flex justify-center">
        <button 
          onClick={handleLoadMore}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-card-dark rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-800 shadow-sm active:bg-slate-50 dark:active:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
              Loading...
            </>
          ) : (
            <>
              <span className="material-icons text-sm">history</span>
              Load Previous Alerts
            </>
          )}
        </button>
      </div>
    </div>
  );
}
