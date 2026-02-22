import { MapPin, Save, Loader } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import PremiumInput from './PremiumInput';
import { useSystem } from '../context/SystemContext';
import './CameraMap.css';
import { useState } from 'react';

// Fix for default marker icon in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ lat, lng, onLocationSelect }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    return lat && lng ? <Marker position={[lat, lng]} /> : null;
}

export function CameraMap() {
    const {
        selectedVideoSource,
        selectedSourceInfo,
        updateCameraMetaValue,
        saveCameraConfig,
        handleLocationChange,
        locationSuggestions,
        showSuggestions,
        setShowSuggestions,
        selectSuggestion,
    } = useSystem();

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await saveCameraConfig(selectedVideoSource);
        setTimeout(() => setIsSaving(false), 800);
    };

    return (
        <div className="glass-panel camera-map-panel">
            <div className="panel-header">
                <div className="panel-title">
                    <MapPin size={18} className="map-icon-glow" />
                    <span>Camera Location</span>
                </div>
                <button
                    className="btn-save premium-btn"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? <Loader size={14} className="spin" /> : <Save size={14} />}
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>

            <div className="camera-map-content">
                <div className="camera-config-sidebar glass-panel-inner">
                    <div className="input-group">
                        <label>Camera Name</label>
                        <PremiumInput
                            placeholder="e.g. Main Intersection"
                            value={selectedSourceInfo.name || ""}
                            onChange={e => updateCameraMetaValue(selectedVideoSource, 'name', e.target.value)}
                        />
                    </div>

                    <div className="input-group location-input-wrapper">
                        <label>Location Search</label>
                        <PremiumInput
                            placeholder="City, Street, or Landmark"
                            value={selectedSourceInfo.location || ""}
                            onChange={e => handleLocationChange(selectedVideoSource, e.target.value)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        />
                        {showSuggestions && locationSuggestions.length > 0 && (
                            <ul className="suggestions-dropdown glass-dropdown">
                                {locationSuggestions.map((s) => (
                                    <li key={s.place_id} onClick={() => selectSuggestion(selectedVideoSource, s)}>
                                        <MapPin size={12} className="suggestion-icon" />
                                        <span>{s.display_name}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="input-group">
                        <label>Sector Assignment</label>
                        <PremiumInput
                            type="text"
                            placeholder="e.g. SEC-NORTH-01"
                            value={selectedSourceInfo.sector_id || ""}
                            onChange={e => updateCameraMetaValue(selectedVideoSource, 'sector_id', e.target.value)}
                        />
                    </div>

                    <div className="coordinates-display">
                        <div className="coord-item">
                            <span className="coord-label">LAT</span>
                            <span className="coord-val">{selectedSourceInfo.lat ? selectedSourceInfo.lat.toFixed(4) : '---'}</span>
                        </div>
                        <div className="coord-item">
                            <span className="coord-label">LNG</span>
                            <span className="coord-val">{selectedSourceInfo.lng ? selectedSourceInfo.lng.toFixed(4) : '---'}</span>
                        </div>
                    </div>
                </div>

                <div className="map-container-wrapper">
                    <div className="map-container ui-map-frame">
                        <MapContainer
                            center={[selectedSourceInfo.lat || 20.5937, selectedSourceInfo.lng || 78.9629]}
                            zoom={selectedSourceInfo.lat ? 13 : 4}
                            scrollWheelZoom={true}
                            style={{ height: '100%', width: '100%' }}
                        >
                            {/* Using a darker map tile layer for the dark theme */}
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                                url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                            />
                            <LocationMarker
                                lat={selectedSourceInfo.lat}
                                lng={selectedSourceInfo.lng}
                                onLocationSelect={(lat, lng) => {
                                    updateCameraMetaValue(selectedVideoSource, 'lat', lat);
                                    updateCameraMetaValue(selectedVideoSource, 'lng', lng);
                                }}
                            />
                        </MapContainer>
                    </div>
                    <div className="map-overlay-hint">Click on the map to drop a pin</div>
                </div>
            </div>
        </div>
    );
}
