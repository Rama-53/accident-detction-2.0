// src/components/CameraMap.jsx
import { MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import PremiumInput from './PremiumInput';
import './CameraMap.css';

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

export function CameraMap({
    selectedVideoSource,
    selectedSourceInfo,
    updateCameraMetaValue,
    saveCameraConfig,
    handleLocationChange,
    locationSuggestions,
    showSuggestions,
    setShowSuggestions,
    selectSuggestion,
}) {
    return (
        <div className="glass-panel camera-map-panel">
            <div className="panel-header">
                <div className="panel-title">
                    <MapPin size={18} />
                    <span>Camera Location</span>
                </div>
            </div>

            <div className="camera-config-inputs">
                <div style={{ marginBottom: '15px' }}>
                    <PremiumInput
                        placeholder="Camera Name"
                        value={selectedSourceInfo.name}
                        onChange={e => updateCameraMetaValue(selectedVideoSource, 'name', e.target.value)}
                        onBlur={() => saveCameraConfig(selectedVideoSource)}
                    />
                </div>
                <div className="location-input-wrapper">
                    <PremiumInput
                        placeholder="Location (City/Place)"
                        value={selectedSourceInfo.location}
                        onChange={e => handleLocationChange(selectedVideoSource, e.target.value)}
                        onBlur={() => {
                            setTimeout(() => setShowSuggestions(false), 200);
                            saveCameraConfig(selectedVideoSource);
                        }}
                    />
                    {showSuggestions && locationSuggestions.length > 0 && (
                        <ul className="suggestions-dropdown">
                            {locationSuggestions.map((s) => (
                                <li key={s.place_id} onClick={() => selectSuggestion(selectedVideoSource, s)}>
                                    {s.display_name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div style={{ marginTop: '15px' }}>
                    <PremiumInput
                        type="text"
                        placeholder="Sector ID (e.g. North)"
                        value={selectedSourceInfo.sector_id || ""}
                        onChange={e => updateCameraMetaValue(selectedVideoSource, 'sector_id', e.target.value)}
                        onBlur={() => saveCameraConfig(selectedVideoSource)}
                    />
                </div>
            </div>

            <div className="map-container">
                <MapContainer
                    center={[selectedSourceInfo.lat || 20.5937, selectedSourceInfo.lng || 78.9629]}
                    zoom={selectedSourceInfo.lat ? 13 : 4}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; OpenStreetMap'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker
                        lat={selectedSourceInfo.lat}
                        lng={selectedSourceInfo.lng}
                        onLocationSelect={(lat, lng) => {
                            updateCameraMetaValue(selectedVideoSource, 'lat', lat);
                            updateCameraMetaValue(selectedVideoSource, 'lng', lng);
                            setTimeout(() => saveCameraConfig(selectedVideoSource), 100);
                        }}
                    />
                </MapContainer>
            </div>
        </div>
    );
}
