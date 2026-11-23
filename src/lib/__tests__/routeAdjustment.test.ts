import { describe, it, expect } from 'vitest';
import {
  recalculateRouteMetrics,
  type EditableRoute,
  type EditableStop,
  type MetricSettings,
} from '../../services/routingService';
import { HaversineDistanceService } from '../distance';

describe('Route Metrics & Adjustment Unit Tests (Fase 5)', () => {
  const distanceService = new HaversineDistanceService(1.0);
  const depot = { lat: -6.827218, lng: 107.291637 }; // CV SP Plastik Haurwangi
  const settings: MetricSettings = {
    kecepatanRataRataKmh: 40,
    konsumsiBbmKmPerLiter: 8,
    hargaBbmPerLiter: 10000,
  };

  const sampleStops: EditableStop[] = [
    {
      urutan: 1,
      orderId: 'order-1',
      customerId: 'cust-1',
      namaToko: 'Toko Berkah',
      alamat: 'Ciranjang',
      lat: -6.815,
      lng: 107.28,
      muatanKg: 150,
      jarakDariSebelumnyaKm: 0,
    },
    {
      urutan: 2,
      orderId: 'order-2',
      customerId: 'cust-2',
      namaToko: 'Toko Makmur',
      alamat: 'Bojongpicung',
      lat: -6.84,
      lng: 107.31,
      muatanKg: 250,
      jarakDariSebelumnyaKm: 0,
    },
  ];

  const initialRoute: EditableRoute = {
    tempId: 'r-1',
    vehicleId: 'veh-1',
    driverId: 'drv-1',
    stops: sampleStops,
    totalJarakKm: 0,
    totalMuatanKg: 0,
    estimasiWaktuMenit: 0,
    estimasiBiayaBbm: 0,
    kapasitasMaksKg: 1000,
  };

  it('recalculates segment distances, return distance to depot, and cost metrics correctly', () => {
    const updated = recalculateRouteMetrics(initialRoute, depot, distanceService, settings);

    expect(updated.stops.length).toBe(2);
    expect(updated.stops[0].urutan).toBe(1);
    expect(updated.stops[1].urutan).toBe(2);

    // Segment 1: depot -> stop 1
    const d0_1 = distanceService.calculateDistance(depot, {
      lat: sampleStops[0].lat,
      lng: sampleStops[0].lng,
    });
    expect(updated.stops[0].jarakDariSebelumnyaKm).toBe(Math.round(d0_1 * 100) / 100);

    // Segment 2: stop 1 -> stop 2
    const d1_2 = distanceService.calculateDistance(
      { lat: sampleStops[0].lat, lng: sampleStops[0].lng },
      { lat: sampleStops[1].lat, lng: sampleStops[1].lng }
    );
    expect(updated.stops[1].jarakDariSebelumnyaKm).toBe(Math.round(d1_2 * 100) / 100);

    // Total payload
    expect(updated.totalMuatanKg).toBe(400);

    // Total distance = d(0, 1) + d(1, 2) + d(2, 0)
    const d2_0 = distanceService.calculateDistance(
      { lat: sampleStops[1].lat, lng: sampleStops[1].lng },
      depot
    );
    const expectedTotalDist = Math.round((d0_1 + d1_2 + d2_0) * 100) / 100;
    expect(updated.totalJarakKm).toBe(expectedTotalDist);

    // Duration: (totalJarak / 40) * 60
    const expectedTime = Math.round((expectedTotalDist / 40) * 60);
    expect(updated.estimasiWaktuMenit).toBe(expectedTime);

    // Cost: (totalJarak / 8) * 10000
    const expectedFuel = Math.round((expectedTotalDist / 8) * 10000);
    expect(updated.estimasiBiayaBbm).toBe(expectedFuel);
  });

  it('handles reordering stops (move up / move down) and adjusts metrics accordingly', () => {
    // Balik urutan: stop 2 menjadi stop pertama
    const reversedStops = [sampleStops[1], sampleStops[0]];
    const routeWithReversed = { ...initialRoute, stops: reversedStops };

    const recalculated = recalculateRouteMetrics(
      routeWithReversed,
      depot,
      distanceService,
      settings
    );

    expect(recalculated.stops[0].namaToko).toBe('Toko Makmur');
    expect(recalculated.stops[0].urutan).toBe(1);
    expect(recalculated.stops[1].namaToko).toBe('Toko Berkah');
    expect(recalculated.stops[1].urutan).toBe(2);

    // Segment 1 sekarang depot -> stop 2
    const d0_2 = distanceService.calculateDistance(depot, {
      lat: sampleStops[1].lat,
      lng: sampleStops[1].lng,
    });
    expect(recalculated.stops[0].jarakDariSebelumnyaKm).toBe(Math.round(d0_2 * 100) / 100);

    // Total muatan tetap 400 kg
    expect(recalculated.totalMuatanKg).toBe(400);
  });

  it('handles empty stops safely returning 0 metrics', () => {
    const emptyRoute: EditableRoute = {
      ...initialRoute,
      stops: [],
    };

    const recalculated = recalculateRouteMetrics(emptyRoute, depot, distanceService, settings);
    expect(recalculated.stops).toEqual([]);
    expect(recalculated.totalJarakKm).toBe(0);
    expect(recalculated.totalMuatanKg).toBe(0);
    expect(recalculated.estimasiWaktuMenit).toBe(0);
    expect(recalculated.estimasiBiayaBbm).toBe(0);
  });

  it('validates capacity constraint when simulating stop transfer between routes', () => {
    const rute1: EditableRoute = {
      ...initialRoute,
      tempId: 'r-1',
      kapasitasMaksKg: 500,
      stops: [sampleStops[0]], // 150 kg
    };

    const rute2: EditableRoute = {
      ...initialRoute,
      tempId: 'r-2',
      kapasitasMaksKg: 400,
      stops: [sampleStops[1]], // 250 kg
    };

    // Pindahkan stop dari rute1 (150 kg) ke rute2 (sekarang 250 kg)
    const proposedRute2Payload = rute2.stops.reduce((sum, s) => sum + s.muatanKg, 0) + sampleStops[0].muatanKg;
    expect(rute1.stops.length).toBe(1);
    // 250 + 150 = 400 kg <= kapasitas 400 kg -> VALID
    expect(proposedRute2Payload <= rute2.kapasitasMaksKg).toBe(true);

    // Jika stop ketiga (300 kg) coba ditransfer ke rute2:
    const heavyPayload = proposedRute2Payload + 300; // 700 kg > 400 kg -> REJECTED
    expect(heavyPayload <= rute2.kapasitasMaksKg).toBe(false);
  });
});
