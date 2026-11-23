import { supabase } from '../lib/supabase';
import type { DistanceService } from '../types/routing';

export interface EditableStop {
  urutan: number;
  orderId: string;
  customerId: string;
  namaToko: string;
  alamat: string;
  lat: number;
  lng: number;
  muatanKg: number;
  jarakDariSebelumnyaKm: number;
}

export interface EditableRoute {
  tempId: string;
  vehicleId: string;
  driverId: string;
  stops: EditableStop[];
  totalJarakKm: number;
  totalMuatanKg: number;
  estimasiWaktuMenit: number;
  estimasiBiayaBbm: number;
  kapasitasMaksKg: number;
}

export interface MetricSettings {
  kecepatanRataRataKmh: number;
  konsumsiBbmKmPerLiter: number;
  hargaBbmPerLiter: number;
}

/**
 * Menghitung ulang metrik segmen jarak, total jarak bolak-balik depot, total muatan,
 * estimasi durasi tempuh (menit), dan estimasi biaya BBM (Rp) secara deterministik.
 */
export function recalculateRouteMetrics(
  route: EditableRoute,
  depot: { lat: number; lng: number },
  distanceService: DistanceService,
  settings: MetricSettings
): EditableRoute {
  if (route.stops.length === 0) {
    return {
      ...route,
      stops: [],
      totalJarakKm: 0,
      totalMuatanKg: 0,
      estimasiWaktuMenit: 0,
      estimasiBiayaBbm: 0,
    };
  }

  let totalJarak = 0;
  let totalMuatan = 0;
  let prevCoord = { lat: depot.lat, lng: depot.lng };

  const recalculatedStops: EditableStop[] = route.stops.map((stop, index) => {
    const currCoord = { lat: stop.lat, lng: stop.lng };
    const segDist = distanceService.calculateDistance(prevCoord, currCoord);
    totalJarak += segDist;
    totalMuatan += stop.muatanKg;
    prevCoord = currCoord;

    return {
      ...stop,
      urutan: index + 1,
      jarakDariSebelumnyaKm: Math.round(segDist * 100) / 100,
    };
  });

  // Jarak dari stop terakhir kembali ke Depot
  const returnToDepotDist = distanceService.calculateDistance(prevCoord, {
    lat: depot.lat,
    lng: depot.lng,
  });
  totalJarak += returnToDepotDist;

  const totalJarakKm = Math.round(totalJarak * 100) / 100;
  const estimasiWaktuMenit = Math.round((totalJarakKm / (settings.kecepatanRataRataKmh || 40)) * 60);
  const estimasiBiayaBbm = Math.round(
    (totalJarakKm / (settings.konsumsiBbmKmPerLiter || 8)) * (settings.hargaBbmPerLiter || 10000)
  );

  return {
    ...route,
    stops: recalculatedStops,
    totalJarakKm,
    totalMuatanKg: Math.round(totalMuatan * 100) / 100,
    estimasiWaktuMenit,
    estimasiBiayaBbm,
  };
}

/**
 * Menyimpan seluruh rute final secara transaksional ke database Supabase
 * menggunakan RPC `save_route`. Setiap order yang dimuat otomatis berstatus 'dalam_pengiriman'.
 */
export async function saveFinalRoutes(
  routes: EditableRoute[],
  tanggal: string
): Promise<string[]> {
  const createdRouteIds: string[] = [];

  for (const r of routes) {
    if (r.stops.length === 0) continue;

    const stopsPayload = r.stops.map((s) => ({
      urutan: s.urutan,
      order_id: s.orderId,
      customer_id: s.customerId,
      jarak_dari_sebelumnya_km: s.jarakDariSebelumnyaKm,
    }));

    const { data: routeId, error } = await supabase.rpc('save_route', {
      p_tanggal: tanggal,
      p_vehicle_id: r.vehicleId || null,
      p_driver_id: r.driverId || null,
      p_total_jarak_km: r.totalJarakKm,
      p_total_muatan_kg: r.totalMuatanKg,
      p_estimasi_waktu_menit: r.estimasiWaktuMenit,
      p_estimasi_biaya_bbm: r.estimasiBiayaBbm,
      p_stops: stopsPayload,
    });

    if (error) {
      throw new Error(`Gagal menyimpan rute: ${error.message}`);
    }

    createdRouteIds.push(routeId);
  }

  return createdRouteIds;
}
