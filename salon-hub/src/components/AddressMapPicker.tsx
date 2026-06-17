import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icon for selected location (red)
const selectedLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to pan map to position without changing zoom
function MapPan({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      // Only pan to center, never change zoom
      map.panTo(center, { animate: true });
    }
  }, [center, map]);
  return null;
}

// Component to handle map clicks
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
      onMapClick(newPos[0], newPos[1]);
    },
  });
  return null;
}

interface AddressMapPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string, buildingNumber?: string) => void;
  initialPosition?: [number, number] | null;
  selectedPosition?: [number, number] | null;
  disabled?: boolean;
}

export default function AddressMapPicker({ 
  onLocationSelect, 
  initialPosition = null,
  selectedPosition = null,
  disabled = false
}: AddressMapPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(initialPosition || selectedPosition);
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]); // Default: New York
  const [zoom, setZoom] = useState(15);

  useEffect(() => {
    // Request user location when component mounts
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setMapCenter(userPos);
          
          // If no position is set yet, use user location as default
          if (!position && !initialPosition && !selectedPosition) {
            setPosition(userPos);
            onLocationSelect(userPos[0], userPos[1], '');
          }
        },
        (err) => {
          // Handle different geolocation error types
          let errorMessage = 'Location access denied or unavailable';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Location permission denied by user';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case err.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
            default:
              errorMessage = `Location error: ${err.message || 'Unknown error'}`;
              break;
          }
          // Only log non-critical errors (don't spam console with expected permission denials)
          if (err.code !== err.PERMISSION_DENIED) {
            console.warn('Geolocation error:', errorMessage, err);
          }
          // If no initial position, use default center
          if (!initialPosition && !selectedPosition) {
            setMapCenter([40.7128, -74.0060]);
          }
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 60000 // Cache location for 1 minute to avoid repeated requests
        }
      );
    } else {
      // Geolocation not supported
      console.warn('Geolocation is not supported by this browser');
      if (!initialPosition && !selectedPosition) {
        setMapCenter([40.7128, -74.0060]);
      }
    }
  }, []);

  // Update position if initialPosition or selectedPosition changes (from external sources like search)
  useEffect(() => {
    if (selectedPosition) {
      setPosition(selectedPosition);
      // Only update mapCenter for external selections, which will trigger a pan (not zoom change)
      setMapCenter(selectedPosition);
    } else if (initialPosition && !position) {
      setPosition(initialPosition);
      setMapCenter(initialPosition);
    }
  }, [initialPosition, selectedPosition]);

  const handlePositionChange = async (lat: number, lng: number) => {
    const newPos: [number, number] = [lat, lng];
    setPosition(newPos);
    // Don't update mapCenter when user clicks - this prevents zoom reset
    // The marker will move to the new position without changing zoom
    
    // Reverse geocode to get address
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Booksy Registration App'
          }
        }
      );
      const data = await response.json();
      const address = data.display_name || '';
      // Extract building number from address details
      const buildingNumber = data.address?.house_number || data.address?.building || '';
      onLocationSelect(lat, lng, address, buildingNumber);
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      onLocationSelect(lat, lng, '', '');
    }
  };

  return (
    <div className="w-full">
      <div className={`w-full h-96 rounded-xl overflow-hidden border-2 border-gray-200 relative ${disabled ? 'opacity-50' : ''}`}>
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={!disabled}
          dragging={!disabled}
          doubleClickZoom={!disabled}
          touchZoom={!disabled}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Only pan to center when mapCenter changes (from external selection), never change zoom */}
          <MapPan center={mapCenter} />
          
          {/* Global map click handler - only when not disabled */}
          {!disabled && <MapClickHandler onMapClick={handlePositionChange} />}
          
          {/* Selected location marker */}
          {position && (
            <Marker 
              position={position} 
              icon={selectedLocationIcon}
            />
          )}
        </MapContainer>
        {/* Disabled overlay - more prominent gray overlay */}
        {disabled && (
          <div className="absolute inset-0 bg-gray-400/60 z-[1000] cursor-not-allowed pointer-events-none" />
        )}
      </div>
      
      <p className="mt-2 text-xs text-gray-600">
        {disabled ? 'Please close the business hours dialog to interact with the map' : 'Click on the map to select your business location'}
      </p>
    </div>
  );
}

