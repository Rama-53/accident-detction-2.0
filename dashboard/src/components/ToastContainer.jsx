// src/components/ToastContainer.jsx
import { useSystem } from '../context/SystemContext';
import { ToastNotification } from './ToastNotification';
import './ToastContainer.css';

export function ToastContainer() {
    const { toasts, removeToast, setActiveEvent } = useSystem();

    const handleToastClick = (event) => {
        setActiveEvent(event);
    };

    // Limit to 5 visible toasts
    const visibleToasts = toasts.slice(-5);

    if (visibleToasts.length === 0) {
        return null;
    }

    return (
        <div className="toast-container">
            {visibleToasts.map((toast) => (
                <ToastNotification
                    key={toast.id}
                    toast={toast}
                    onDismiss={removeToast}
                    onClick={handleToastClick}
                />
            ))}
        </div>
    );
}
