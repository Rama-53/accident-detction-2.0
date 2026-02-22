import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { ReactNode } from 'react';
import { type Theme } from '../hooks/useTheme';
import { type ConnectionStatus } from '../hooks/useConnection';

interface Props {
  children: ReactNode;
  theme: Theme;
  onToggleTheme: () => void;
  connectionStatus: ConnectionStatus;
}

export default function Layout({ children, theme, onToggleTheme, connectionStatus }: Props) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: '/', icon: 'grid_view', label: 'Monitor' },
    { path: '/evidence', icon: 'photo_library', label: 'Evidence' },
    { path: '/incidents', icon: 'add_alert', label: 'Alerts', center: true },
    { path: '/cameras', icon: 'sensors', label: 'Cameras' },
    { path: '/settings', icon: 'settings', label: 'Setup' },
  ];

  return (
    <div className={clsx(
      "font-display min-h-screen flex flex-col transition-colors duration-300",
      theme === 'dark'
        ? "dark bg-background-dark text-slate-100"
        : "bg-background-light text-slate-900"
    )}>
      {/* Theme Toggle + Connection Status - floating top-right */}
      <div className="fixed top-3 right-3 z-[90] flex items-center gap-2">
        {/* Connection dot */}
        <div className={clsx(
          "w-2 h-2 rounded-full transition-all",
          connectionStatus === 'connected' ? "status-dot-connected" :
            connectionStatus === 'reconnecting' ? "status-dot-reconnecting" :
              "status-dot-disconnected"
        )} />

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className={clsx(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90",
            theme === 'dark'
              ? "bg-white/10 text-slate-400 hover:text-white hover:bg-white/20"
              : "bg-black/5 text-slate-500 hover:text-slate-800 hover:bg-black/10"
          )}
        >
          <span className="material-icons-outlined text-sm">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-grow pb-24">
        {children}
      </div>

      {/* Bottom Navigation Bar */}
      <nav className={clsx(
        "fixed bottom-0 inset-x-0 z-[100] px-6 py-3 max-w-md mx-auto left-0 right-0 safe-bottom transition-colors duration-300",
        theme === 'dark'
          ? "bg-background-dark/95 border-t border-primary/20 backdrop-blur-xl"
          : "bg-white/95 border-t border-slate-200 backdrop-blur-xl shadow-lg shadow-black/5"
      )}>
        <div className="flex justify-between items-center">
          {navItems.map((item) => {
            if (item.center) {
              return (
                <div key={item.path} className="relative -mt-10">
                  <Link
                    to={item.path}
                    className={clsx(
                      "w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center text-white ring-4 transition-all active:scale-95",
                      isActive(item.path) ? "bg-primary shadow-primary/40" : "bg-primary/80 shadow-primary/20",
                      theme === 'dark' ? "ring-background-dark" : "ring-white"
                    )}
                  >
                    <span className="material-icons text-2xl">{item.icon}</span>
                  </Link>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  "flex flex-col items-center gap-0.5 transition-all active:scale-95",
                  isActive(item.path)
                    ? "text-primary"
                    : theme === 'dark'
                      ? "text-slate-500 hover:text-slate-300"
                      : "text-slate-400 hover:text-slate-600"
                )}
              >
                <span className={clsx(
                  "material-icons transition-transform",
                  isActive(item.path) && "scale-110"
                )}>
                  {item.icon}
                </span>
                <span className={clsx(
                  "text-[10px] font-bold transition-all",
                  isActive(item.path) && "tracking-wide"
                )}>
                  {item.label}
                </span>
                {/* Active indicator dot */}
                {isActive(item.path) && (
                  <span className="w-1 h-1 rounded-full bg-primary mt-0.5 animate-scale-in"></span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
