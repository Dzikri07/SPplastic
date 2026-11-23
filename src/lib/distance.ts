import type { Coordinate, DistanceService } from '../types/routing';

const EARTH_RADIUS_KM = 6371;

/**
 * Menghitung jarak lingkaran besar (great-circle distance) antara dua titik koordinat
 * menggunakan formula Haversine dengan faktor koreksi jalan.
 *
 * @param from Titik koordinat asal { lat, lng }
 * @param to Titik koordinat tujuan { lat, lng }
 * @param roadFactor Faktor koreksi jalan (default: 1.0)
 * @returns Jarak dalam satuan kilometer (km)
 */
export function haversineDistance(
  from: Coordinate,
  to: Coordinate,
  roadFactor: number = 1.0
): number {
  if (from.lat === to.lat && from.lng === to.lng) {
    return 0;
  }

  const toRad = (degree: number) => (degree * Math.PI) / 180;

  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);

  const lat1Rad = toRad(from.lat);
  const lat2Rad = toRad(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawDistance = EARTH_RADIUS_KM * c;

  return rawDistance * roadFactor;
}

/**
 * Implementasi DistanceService menggunakan rumus Haversine.
 * Memungkinkan konfigurasi faktor jalan dan pembulatan desimal.
 */
export class HaversineDistanceService implements DistanceService {
  private roadFactor: number;
  private precision?: number;

  constructor(roadFactor: number = 1.0, precision?: number) {
    this.roadFactor = roadFactor > 0 ? roadFactor : 1.0;
    this.precision = precision;
  }

  public setRoadFactor(factor: number): void {
    if (factor > 0) {
      this.roadFactor = factor;
    }
  }

  public getRoadFactor(): number {
    return this.roadFactor;
  }

  public calculateDistance(from: Coordinate, to: Coordinate): number {
    const dist = haversineDistance(from, to, this.roadFactor);
    if (this.precision !== undefined) {
      const multiplier = Math.pow(10, this.precision);
      return Math.round(dist * multiplier) / multiplier;
    }
    return dist;
  }
}
