import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { EditableRoute } from '../services/routingService';
import { depotIcon } from '../lib/leafletIcons';
import { getRoadGeometry } from '../services/osrmRoutingService';

interface RouteMapProps {
  depot: { nama: string; lat: number; lng: number };
  routes: EditableRoute[];
  selectedRouteIndex?: number | null;
  height?: string;
}

// Palet warna kontras untuk membedakan polyline rute setiap armada
export const ROUTE_COLORS = [
  '#2563eb', // Biru
  '#059669', // Emerald
  '#7c3aed', // Ungu
  '#d97706', // Amber
  '#dc2626', // Merah
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
];

// Helper untuk membuat custom numbered marker pin pada peta
export function createNumberedIcon(num: number, color: string) {
  return L.divIcon({
    className: 'custom-route-marker',
    html: `
      <div style="
        background-color: ${color};
        color: white;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">
        ${num}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

// Sinkronisasi auto-fit bounds agar seluruh titik rute dan depot muat di layar
function MapBoundsUpdater({
  bounds,
}: {
  bounds: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [bounds, map]);
  return null;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  depot,
  routes,
  selectedRouteIndex = null,
  height = '480px',
}) => {
  // State geometri jalan raya riil (OSRM)
  const [roadGeometries, setRoadGeometries] = useState<Record<string, [number, number][]>>({});
  const [isLoadingRoads, setIsLoadingRoads] = useState<boolean>(false);

  // Kumpulkan semua titik untuk menghitung bounds
  const allCoords: [number, number][] = [[depot.lat, depot.lng]];
  routes.forEach((r) => {
    r.stops.forEach((s) => allCoords.push([s.lat, s.lng]));
  });

  // Fetch geometri jalan raya nyata dari OSRM
  useEffect(() => {
    let isCancelled = false;

    async function loadRoadRoutes() {
      if (routes.length === 0) return;
      setIsLoadingRoads(true);

      const updatedGeometries: Record<string, [number, number][]> = {};

      await Promise.all(
        routes.map(async (route) => {
          if (route.stops.length === 0) return;

          const waypoints: [number, number][] = [
            [depot.lat, depot.lng],
            ...route.stops.map((s) => [s.lat, s.lng] as [number, number]),
            [depot.lat, depot.lng],
          ];

          const roadCoords = await getRoadGeometry(waypoints);
          if (!isCancelled) {
            updatedGeometries[route.tempId] = roadCoords;
          }
        })
      );

      if (!isCancelled) {
        setRoadGeometries(updatedGeometries);
        setIsLoadingRoads(false);
      }
    }

    loadRoadRoutes();

    return () => {
      isCancelled = true;
    };
  }, [depot, routes]);

  return (
    <div className="w-full rounded-md overflow-hidden border border-border relative z-0">
      {/* Badge status OSRM */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-200 shadow-xs text-[11px] font-medium text-slate-700 flex items-center gap-1.5 pointer-events-none">
        {isLoadingRoads ? (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Menyesuaikan jalur jalan raya...</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Jalur Jalan Raya (OSRM)</span>
          </>
        )}
      </div>

      <MapContainer
        center={[depot.lat, depot.lng]}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsUpdater bounds={allCoords} />

        {/* Marker Depot Pusat (Node 0) */}
        <Marker position={[depot.lat, depot.lng]} icon={depotIcon}>
          <Popup>
            <div className="text-xs">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                DEPOT PUSAT (NODE 0)
              </span>
              <p className="font-bold text-slate-900 mt-1">{depot.nama}</p>
              <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                {depot.lat.toFixed(6)}, {depot.lng.toFixed(6)}
              </p>
              <p className="text-slate-600 text-[10px] mt-1">
                Titik awal dan akhir seluruh perjalanan armada distribusi.
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Render Polyline & Stop per Rute */}
        {routes.map((route, rIndex) => {
          const color = ROUTE_COLORS[rIndex % ROUTE_COLORS.length];
          const isSelected = selectedRouteIndex === null || selectedRouteIndex === rIndex;

          if (route.stops.length === 0) return null;

          // Koordinat rute loop standar (fallback)
          const fallbackCoords: [number, number][] = [
            [depot.lat, depot.lng],
            ...route.stops.map((s) => [s.lat, s.lng] as [number, number]),
            [depot.lat, depot.lng],
          ];

          // Gunakan geometri jalan raya jika sudah tersedia
          const polylineCoords = roadGeometries[route.tempId] || fallbackCoords;

          return (
            <React.Fragment key={route.tempId}>
              {/* Garis Polyline Rute (Menempel ke jalan raya) */}
              <Polyline
                positions={polylineCoords}
                pathOptions={{
                  color,
                  weight: isSelected ? 4 : 2,
                  opacity: isSelected ? 0.9 : 0.35,
                  dashArray: isSelected ? undefined : '5, 5',
                }}
              />

              {/* Marker Toko Pelanggan (Stop Berurutan) */}
              {route.stops.map((stop) => (
                <Marker
                  key={stop.orderId}
                  position={[stop.lat, stop.lng]}
                  icon={createNumberedIcon(stop.urutan, color)}
                  opacity={isSelected ? 1.0 : 0.5}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                          style={{ backgroundColor: color }}
                        >
                          Rute #{rIndex + 1} &bull; Stop #{stop.urutan}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-slate-700">
                          {stop.jarakDariSebelumnyaKm} km
                        </span>
                      </div>

                      <p className="font-bold text-slate-900 text-sm mt-1">{stop.namaToko}</p>
                      <p className="text-slate-500 text-[11px]">{stop.alamat}</p>
                      <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600">Muatan Dikirim:</span>
                        <span className="font-bold text-blue-700 font-mono">{stop.muatanKg} kg</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};
