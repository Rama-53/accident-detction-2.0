import { useParams, useNavigate } from 'react-router-dom';

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock data - in a real app this would come from an API based on ID
  const incident = {
    id: id,
    title: "Multi-vehicle Collision",
    location: "I-95 North, Exit 24B",
    camera: "CAM-084",
    sector: "Sector A-4",
    time: "14:24:08",
    date: "Oct 24, 2024",
    severity: "high",
    status: "Open",
    description: "Collision involving three vehicles in the northbound lane. Traffic flow obstructed. Emergency services dispatched.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCt4pqe_7AAc7H-523uIMc1S6eBPurYUNyhmCO1SVz2iMv-U515KQ4QvGKYPaQnHc45mMXwam6hv6LAgLVnE2D_k1k8XrGclxSB66ql6fNy__95bOdQ3p8aVEpLcHGE1nHFWtJiLRkfyhrKl2fGhf5KW0-nQYG5A-6nTFnnZ88ymMPHbJ51L_7DI-ftv2S57hoiB9jGBtcWjWqwVmE96sRu1EHcUzJiqrevoiU348k9Ru_hhmxHkYh-j0scq-l8acJvYfNg_xfv6Fw",
    timeline: [
      { time: "14:24:08", event: "Incident detected by AI Model v2.4" },
      { time: "14:24:12", event: "Alert flagged as High Severity" },
      { time: "14:24:45", event: "Operator acknowledged alert" },
      { time: "14:25:30", event: "Emergency services notified" }
    ]
  };

  return (
    <div className="max-w-md mx-auto px-4 pb-24 pt-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold">Incident Report #{id}</h1>
      </div>

      <div className="space-y-6">
        {/* Main Image */}
        <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 relative">
          <img src={incident.image} alt={incident.title} className="w-full h-64 object-cover" />
          <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md">
            {incident.severity} Severity
          </div>
        </div>

        {/* Key Info */}
        <div className="bg-white dark:bg-card-dark rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-lg font-bold mb-4">{incident.title}</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Location</p>
              <p className="font-medium text-sm">{incident.location}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Camera</p>
              <p className="font-medium text-sm">{incident.camera}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Time</p>
              <p className="font-medium text-sm">{incident.time}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Date</p>
              <p className="font-medium text-sm">{incident.date}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Description</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {incident.description}
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white dark:bg-card-dark rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Event Timeline</h3>
          <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
            {incident.timeline.map((item, index) => (
              <div key={index} className="relative pl-8">
                <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-primary border-4 border-white dark:border-card-dark"></div>
                <p className="text-xs font-mono text-slate-500 mb-0.5">{item.time}</p>
                <p className="text-sm font-medium">{item.event}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform">
            Download Report
          </button>
          <button className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold active:scale-[0.98] transition-transform">
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
