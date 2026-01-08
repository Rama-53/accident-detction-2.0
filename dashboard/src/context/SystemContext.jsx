import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { BACKEND_URL } from "../config";
import { useSystemData } from "../hooks/useSystemData";
import { useCameraControl } from "../hooks/useCameraControl";
import { playAlertSound } from "../utils/audioAlert";

const SystemContext = createContext(null);

export function SystemProvider({ children }) {
    // --- UI State ---
    const [activeTab, setActiveTab] = useState("dashboard");
    const [layoutMode, setLayoutMode] = useState("auto");
    const [showIntro, setShowIntro] = useState(true);
    const [activeEvent, setActiveEvent] = useState(null);

    // Theme State
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'dark';
        }
        return 'dark';
    });

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // --- Filtering State ---
    const [selectedCamera, setSelectedCamera] = useState("all");
    const [filterStartTime, setFilterStartTime] = useState("");
    const [filterEndTime, setFilterEndTime] = useState("");
    const [multiDetectionEnabled, setMultiDetectionEnabled] = useState(false);

    // --- Toast Notification State ---
    const [toasts, setToasts] = useState([]);
    const seenAlertIds = useRef(new Set());
    const initialLoadComplete = useRef(false);

    // --- Hooks ---
    const systemData = useSystemData(selectedCamera, filterStartTime, filterEndTime);
    const cameraControl = useCameraControl();

    // --- Helpers & Computed Values ---
    const {
        events,
        setEvents,
        clearAllAlerts,
        clearDisplayedAlerts
    } = systemData;

    const {
        selectedVideoSource,
        sourceHasRequiredValue,
        getCameraInfo,
        getSourceMeta,
        getSourceValue
    } = cameraControl;

    // Derived values for the currently selected source
    const selectedSourceInfo = getCameraInfo(selectedVideoSource);
    const currentVideoSource = getSourceMeta(selectedVideoSource);
    const currentValue = getSourceValue(selectedVideoSource);
    const hasValueReady = selectedVideoSource && sourceHasRequiredValue(selectedVideoSource);

    // Sync active event updates
    useEffect(() => {
        if (!activeEvent) return;
        const updated = events.find((evt) => evt.id === activeEvent.id);
        if (updated && updated !== activeEvent) {
            setActiveEvent(updated);
        }
    }, [events, activeEvent]);

    // Toast Management Functions
    const addToast = useCallback((event) => {
        const toastId = `toast-${event.id}-${Date.now()}`;
        const newToast = {
            id: toastId,
            event: event,
            timestamp: Date.now()
        };

        setToasts(prev => [...prev, newToast]);

        // Play audio alert with severity-based sound
        playAlertSound(event.severity || 'medium');
    }, []);

    const removeToast = useCallback((toastId) => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
    }, []);

    // Detect new alerts and trigger toasts
    useEffect(() => {
        if (!events || events.length === 0) return;

        // On first load, just track all existing IDs without showing toasts
        if (!initialLoadComplete.current) {
            events.forEach(event => {
                seenAlertIds.current.add(event.id);
            });
            // Mark initial load as complete after a short delay to ensure all initial events are processed
            setTimeout(() => {
                initialLoadComplete.current = true;
            }, 1000);
            return;
        }

        // After initial load, only show toasts for new alerts
        events.forEach(event => {
            if (!seenAlertIds.current.has(event.id)) {
                seenAlertIds.current.add(event.id);
                addToast(event);
            }
        });
    }, [events, addToast]);

    // Fetch System Config
    useEffect(() => {
        fetch(`${BACKEND_URL}/system/config`)
            .then(res => res.json())
            .then(data => {
                if (data && data.multi_detection_enabled !== undefined) {
                    setMultiDetectionEnabled(data.multi_detection_enabled);
                }
            })
            .catch(err => console.error("Failed to load system config", err));
    }, []);

    const value = {
        // UI
        activeTab, setActiveTab,
        layoutMode, setLayoutMode,
        showIntro, setShowIntro,
        activeEvent, setActiveEvent,
        theme, toggleTheme,

        // Filters
        selectedCamera, setSelectedCamera,
        filterStartTime, setFilterStartTime,
        filterEndTime, setFilterEndTime,
        multiDetectionEnabled, setMultiDetectionEnabled,

        // Toast Notifications
        toasts,
        addToast,
        removeToast,

        // System Data
        ...systemData,
        clearAllAlerts,
        clearDisplayedAlerts,

        // Camera Control
        ...cameraControl,

        // Computed
        selectedSourceInfo,
        currentVideoSource,
        currentValue,
        hasValueReady
    };

    return (
        <SystemContext.Provider value={value}>
            {children}
        </SystemContext.Provider>
    );
}

export function useSystem() {
    const context = useContext(SystemContext);
    if (!context) {
        throw new Error("useSystem must be used within a SystemProvider");
    }
    return context;
}
