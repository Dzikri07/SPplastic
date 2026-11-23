import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import type { Marker as LeafletMarker } from 'leaflet';
import { activePickerIcon } from '../lib/leafletIcons';

interface MapLocationPickerProps {
  lat: number;
  lng: number;
  onChange?: (lat: number, lng: number) => void;
  height?: string;
  readOnly?: boolean;
  markerLabel?: string;
}

// Komponen pembantu untuk sinkronisasi perpindahan posisi peta saat koordinat berubah
function MapViewUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], map.getZoom(), { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

// Komponen penangkap event klik pada peta
function MapClickHandler({
  onClick,
  readOnly,
}: {
  onClick: (lat: number, lng: number) => void;
  readOnly?: boolean;
}) {
  useMapEvents({
    click(e) {
      if (!readOnly) {
        // Bulatkan ke 6 desimal (akurasi ~0.1 meter, ideal untuk GPS/GIS)
        const roundLat = Math.round(e.latlng.lat * 1000000) / 1000000;
        const roundLng = Math.round(e.latlng.lng * 1000000) / 1000000;
        onClick(roundLat, roundLng);
      }
    },
  });
  return null;
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  lat,
  lng,
  onChange,
  height = '320px',
  readOnly = false,
  markerLabel = 'Lokasi Terpilih',
}) => {
  const markerRef = useRef<LeafletMarker>(null);

  const validLat = !isNaN(lat) && lat !== 0 ? lat : -6.827218;
  const validLng = !isNaN(lng) && lng !== 0 ? lng : 107.291637;

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker && onChange && !readOnly) {
          const latlng = marker.getLatLng();
          const roundLat = Math.round(latlng.lat * 1000000) / 1000000;
          const roundLng = Math.round(latlng.lng * 1000000) / 1000000;
          onChange(roundLat, roundLng);
        }
      },
    }),
    [onChange, readOnly]
  );

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-300 shadow-inner relative z-0">
      <MapContainer
        center={[validLat, validLng]}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewUpdater lat={validLat} lng={validLng} />

        <MapClickHandler
          onClick={(newLat, newLng) => onChange && onChange(newLat, newLng)}
          readOnly={readOnly}
        />

        <Marker
          draggable={!readOnly}
          eventHandlers={eventHandlers}
          position={[validLat, validLng]}
          ref={markerRef}
          icon={activePickerIcon}
        >
          <Popup>
            <div className="text-xs">
              <p className="font-semibold">{markerLabel}</p>
              <p className="text-slate-600 mt-0.5">
                {validLat.toFixed(6)}, {validLng.toFixed(6)}
              </p>
              {!readOnly && (
                <p className="text-blue-600 font-medium text-[10px] mt-1">
                  (Klik peta atau geser pin untuk mengubah)
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};
