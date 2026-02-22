import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen flex flex-col dark">
      <div className="flex-grow pb-24">
        {children}
      </div>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-background-dark/95 border-t border-primary/20 backdrop-blur-xl z-[100] px-6 py-4 max-w-md mx-auto left-0 right-0">
        <div className="flex justify-between items-center">
          <Link to="/" className={clsx("flex flex-col items-center gap-1", isActive('/') ? "text-primary" : "text-slate-500 hover:text-slate-300")}>
            <span className="material-icons">grid_view</span>
            <span className="text-[10px] font-bold">Monitor</span>
          </Link>
          <Link to="/evidence" className={clsx("flex flex-col items-center gap-1", isActive('/evidence') ? "text-primary" : "text-slate-500 hover:text-slate-300")}>
            <span className="material-icons">photo_library</span>
            <span className="text-[10px] font-bold">Evidence</span>
          </Link>
          
          <div className="relative -mt-12">
            <Link to="/incidents" className="w-14 h-14 bg-primary rounded-2xl shadow-xl shadow-primary/40 flex items-center justify-center text-white ring-4 ring-background-dark">
              <span className="material-icons text-2xl">add_alert</span>
            </Link>
          </div>

          <Link to="/cameras" className={clsx("flex flex-col items-center gap-1", isActive('/cameras') ? "text-primary" : "text-slate-500 hover:text-slate-300")}>
            <span className="material-icons">sensors</span>
            <span className="text-[10px] font-bold">Cameras</span>
          </Link>
          <Link to="/settings" className={clsx("flex flex-col items-center gap-1", isActive('/settings') ? "text-primary" : "text-slate-500 hover:text-slate-300")}>
            <span className="material-icons">settings</span>
            <span className="text-[10px] font-bold">Setup</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
