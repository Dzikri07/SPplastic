import { describe, expect, it } from 'vitest';
import { haversineDistance, HaversineDistanceService } from '../distance';

describe('Distance Service & Haversine Formula', () => {
  const depot = { lat: -6.827218, lng: 107.291637 }; // CV SP Plastik Haurwangi
  const cianjurKota = { lat: -6.8200, lng: 107.1400 }; // Cianjur Kota

  it('menghasilkan 0 km untuk titik yang sama', () => {
    const dist = haversineDistance(depot, depot);
    expect(dist).toBe(0);
  });

  it('menghitung jarak haversine garis lurus dengan benar', () => {
    // Jarak estimasi Haurwangi ke Cianjur Kota ~16.7 - 16.8 km
    const dist = haversineDistance(depot, cianjurKota, 1.0);
    expect(dist).toBeGreaterThan(16);
    expect(dist).toBeLessThan(18);
  });

  it('mengalikan dengan faktor koreksi jalan secara akurat', () => {
    const rawDist = haversineDistance(depot, cianjurKota, 1.0);
    const roadDist = haversineDistance(depot, cianjurKota, 1.3);
    expect(roadDist).toBeCloseTo(rawDist * 1.3, 4);
  });

  it('HaversineDistanceService membulatkan ke 2 desimal sesuai presisi', () => {
    const service = new HaversineDistanceService(1.2, 2);
    const dist = service.calculateDistance(depot, cianjurKota);
    // Cek apakah desimal maksimal 2 angka
    const decimalPlaces = (dist.toString().split('.')[1] || '').length;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });
});
