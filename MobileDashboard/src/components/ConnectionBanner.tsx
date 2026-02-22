// src/components/ConnectionBanner.tsx
// Shows connection status at the top of the screen when disconnected

import clsx from 'clsx';
import { type ConnectionStatus } from '../hooks/useConnection';

interface Props {
    status: ConnectionStatus;
}

export default function ConnectionBanner({ status }: Props) {
    if (status === 'connected') return null;

    return (
        <div className={clsx(
            "animate-fade-in-down fixed top-0 left-0 right-0 z-[300] flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-white safe-top",
            status === 'reconnecting'
                ? "bg-warning/90 backdrop-blur-sm"
                : "bg-severity-high/90 backdrop-blur-sm"
        )}>
            {status === 'reconnecting' ? (
                <>
                    <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                    Reconnecting to server...
                </>
            ) : (
                <>
                    <span className="material-icons text-sm">cloud_off</span>
                    Connection lost — data may be outdated
                </>
            )}
        </div>
    );
}
