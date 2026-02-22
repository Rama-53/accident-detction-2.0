// src/components/ToastContainer.tsx
// Real-time alert toast notifications

import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { type Toast } from '../hooks/useAlertToast';
import { formatRelativeTime } from '../services/api';

interface Props {
    toasts: Toast[];
    onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
    const navigate = useNavigate();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 left-4 z-[200] flex flex-col gap-2 max-w-md mx-auto pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className="toast-enter pointer-events-auto bg-card-dark/95 dark:bg-card-dark/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl shadow-black/40 flex items-start gap-3 cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => {
                        onDismiss(toast.id);
                        navigate(`/incidents/${toast.id}`);
                    }}
                >
                    {/* Severity indicator */}
                    <div className={clsx(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        toast.event.severity === 'high'
                            ? "bg-severity-high/20"
                            : toast.event.severity === 'medium'
                                ? "bg-severity-medium/20"
                                : "bg-primary/20"
                    )}>
                        <span className={clsx(
                            "material-icons text-lg",
                            toast.event.severity === 'high'
                                ? "text-severity-high"
                                : toast.event.severity === 'medium'
                                    ? "text-severity-medium"
                                    : "text-primary"
                        )}>
                            {toast.event.severity === 'high' ? 'error' : 'warning'}
                        </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <span className={clsx(
                                "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                                toast.event.severity === 'high'
                                    ? "bg-severity-high/20 text-severity-high"
                                    : toast.event.severity === 'medium'
                                        ? "bg-severity-medium/20 text-severity-medium"
                                        : "bg-primary/20 text-primary"
                            )}>
                                {toast.event.severity} severity
                            </span>
                            <span className="text-[10px] text-slate-500">{formatRelativeTime(toast.event.time)}</span>
                        </div>
                        <p className="text-sm font-semibold text-white mt-1 capitalize truncate">{toast.event.type}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                            {toast.event.location || toast.event.camera_name || toast.event.camera_id}
                        </p>
                    </div>

                    {/* Dismiss */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDismiss(toast.id);
                        }}
                        className="text-slate-500 hover:text-white transition-colors flex-shrink-0 p-1"
                    >
                        <span className="material-icons text-sm">close</span>
                    </button>
                </div>
            ))}
        </div>
    );
}
