import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents, Marker, Popup } from 'react-leaflet';
import { motion } from 'framer-motion';
import { MapPin, Search } from 'lucide-react';
import "leaflet/dist/leaflet.css";
// Fix for default marker icon in React Leaflet
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const LocationMarker = ({ lat, lng, onLocationSelect }) => {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    return (lat && lng) ? (
        <Marker position={[lat, lng]}>
            <Popup>Camera Location</Popup>
        </Marker>
    ) : null;
};

const CameraMap = ({
    selectedVideoSource,
    cameraMetaValues,
    updateCameraMetaValue,
    saveCameraConfig,
    videoSources
}) => {
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionTimeout = useRef(null);

    const getSourceMeta = (id) => videoSources.find(s => s.id === id);
    const getCameraInfo = (sourceId) => {
        if (!sourceId) return { name: "", location: "", lat: null, lng: null };
        const meta = getSourceMeta(sourceId) || {};
        const overrides = cameraMetaValues[sourceId] || {};
        return {
            name: overrides.name !== undefined ? overrides.name : (meta.camera_name || meta.label || ""),
            location: overrides.location !== undefined ? overrides.location : (meta.location || ""),
            lat: overrides.lat ?? meta.location_lat ?? null,
            lng: overrides.lng ?? meta.location_lng ?? null,
        };
    };

    const selectedSourceInfo = getCameraInfo(selectedVideoSource);

    const fetchSuggestions = async (text) => {
        if (!text || text.length < 3) {
            setLocationSuggestions([]);
            return;
        }
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&addressdetails=1&limit=5`);
            const data = await res.json();
            setLocationSuggestions(data || []);
            setShowSuggestions(true);
        } catch (err) {
            console.error("Autocomplete error:", err);
        }
    };

    const handleLocationChange = (e) => {
        const text = e.target.value;
        updateCameraMetaValue(selectedVideoSource, "location", text);
        if (suggestionTimeout.current) clearTimeout(suggestionTimeout.current);
        suggestionTimeout.current = setTimeout(() => fetchSuggestions(text), 500);
    };

    const selectSuggestion = (s) => {
        const name = s.display_name;
        const lat = parseFloat(s.lat);
        const lng = parseFloat(s.lon);

        updateCameraMetaValue(selectedVideoSource, "location", name);
        updateCameraMetaValue(selectedVideoSource, "lat", lat);
        updateCameraMetaValue(selectedVideoSource, "lng", lng);
        setShowSuggestions(false);

        saveCameraConfig(selectedVideoSource, { lat, lng, location: name });
    };

    return (
        <motion.div
            className="glass-panel"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
                padding: '20px',
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                position: 'relative'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <MapPin className="text-primary" size={20} />
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Camera Configuration</h2>
            </div>

            <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
                <input
                    type="text"
                    placeholder="Camera Name"
                    value={selectedSourceInfo.name}
                    onChange={(e) => updateCameraMetaValue(selectedVideoSource, "name", e.target.value)}
                    onBlur={() => saveCameraConfig(selectedVideoSource)}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-color)',
                        padding: '10px',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        fontSize: '1rem',
                        fontWeight: 600
                    }}
                />

                <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search location..."
                        value={selectedSourceInfo.location}
                        onChange={handleLocationChange}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border-color)',
                            padding: '10px 10px 10px 36px',
                            borderRadius: '12px',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem'
                        }}
                    />
                    {showSuggestions && locationSuggestions.length > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: '#1e293b',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            zIndex: 1000,
                            marginTop: '4px',
                            overflow: 'hidden',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                        }}>
                            {locationSuggestions.map((s) => (
                                <div
                                    key={s.place_id}
                                    onClick={() => selectSuggestion(s)}
                                    style={{
                                        padding: '10px 12px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                >
                                    {s.display_name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ flex: 1, minHeight: '200px', borderRadius: '16px', overflow: 'hidden' }}>
                <MapContainer
                    key={`${selectedSourceInfo.lat}-${selectedSourceInfo.lng}`} // Force re-render on drastic change or centered view
                    center={[
                        selectedSourceInfo.lat || 20.5937,
                        selectedSourceInfo.lng || 78.9629
                    ]}
                    zoom={selectedSourceInfo.lat ? 13 : 4}
                    style={{ height: "100%", width: "100%" }}
                >
                    <TileLayer
                        attribution='&copy; OpenStreetMap'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker
                        lat={selectedSourceInfo.lat}
                        lng={selectedSourceInfo.lng}
                        onLocationSelect={(lat, lng) => {
                            updateCameraMetaValue(selectedVideoSource, "lat", lat);
                            updateCameraMetaValue(selectedVideoSource, "lng", lng);
                            setTimeout(() => saveCameraConfig(selectedVideoSource), 100);
                        }}
                    />
                </MapContainer>
            </div>
        </motion.div>
    );
};

export default CameraMap;
