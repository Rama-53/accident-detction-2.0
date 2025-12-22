import { createContext, useContext, useState, useEffect } from "react";
import { BACKEND_URL } from "../config";
import { useSystemData } from "../hooks/useSystemData";
import { useCameraControl } from "../hooks/useCameraControl";

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

    // --- Hooks ---
    const systemData = useSystemData(selectedCamera, filterStartTime, filterEndTime);
    const cameraControl = useCameraControl();

    // --- Helpers & Computed Values ---
    const {
        events,
        setEvents
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

        // System Data
        ...systemData,

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
