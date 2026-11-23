import type { DistanceService } from '../types/routing';

export interface RouteCostParameters {
  konsumsiBbmKmPerLiter: number;
  hargaBbmPerLiter: number;
  kecepatanRataRataKmh?: number;
}

export interface EvaluationComparisonResult {
  jarakKonvensionalKm: number;
  biayaBbmKonvensionalRp: number;
  jarakOptimalKm: number;
  biayaBbmOptimalRp: number;
  selisihJarakKm: number;
  persentasePenghematanJarak: number | null; // null jika d_conv = 0
  selisihBiayaBbmRp: number;
}

/**
 * Menghitung total jarak bolak-balik: Depot -> Toko 1 -> Toko 2 -> ... -> Toko N -> Depot.
 */
export function calculateConventionalRouteDistance(
  depot: { lat: number; lng: number },
  stopsCoords: Array<{ lat: number; lng: number }>,
  distanceService: DistanceService
): number {
  if (stopsCoords.length === 0) return 0;

  let totalDist = 0;
  let prevCoord = { lat: depot.lat, lng: depot.lng };

  for (const stop of stopsCoords) {
    const d = distanceService.calculateDistance(prevCoord, stop);
    totalDist += d;
    prevCoord = stop;
  }

  // Kembali ke Depot
  totalDist += distanceService.calculateDistance(prevCoord, depot);

  return Math.round(totalDist * 100) / 100;
}

/**
 * Menghitung estimasi biaya BBM berdasarkan jarak tempuh, konsumsi BBM, dan harga per liter.
 */
export function calculateFuelCost(
  distanceKm: number,
  params: RouteCostParameters
): number {
  if (distanceKm <= 0 || params.konsumsiBbmKmPerLiter <= 0) return 0;
  const liters = distanceKm / params.konsumsiBbmKmPerLiter;
  return Math.round(liters * params.hargaBbmPerLiter);
}

/**
 * Menghitung metrik perbandingan rute secara adil (apple-to-apple).
 * Menangani kasus pembagian nol (d_conv = 0 menghasilkan persentase null)
 * dan nilai negatif jika rute konvensional lebih pendek (tidak dipaksa 0).
 */
export function compareRoutesMetrics(
  jarakKonvensionalKm: number,
  jarakOptimalKm: number,
  params: RouteCostParameters
): EvaluationComparisonResult {
  const biayaBbmKonvensionalRp = calculateFuelCost(jarakKonvensionalKm, params);
  const biayaBbmOptimalRp = calculateFuelCost(jarakOptimalKm, params);

  const selisihJarakKm = Math.round((jarakKonvensionalKm - jarakOptimalKm) * 100) / 100;
  const selisihBiayaBbmRp = biayaBbmKonvensionalRp - biayaBbmOptimalRp;

  // Tangani pembagi nol (d_conv = 0)
  let persentasePenghematanJarak: number | null = null;
  if (jarakKonvensionalKm > 0) {
    persentasePenghematanJarak =
      Math.round(((jarakKonvensionalKm - jarakOptimalKm) / jarakKonvensionalKm) * 10000) / 100;
  }

  return {
    jarakKonvensionalKm,
    biayaBbmKonvensionalRp,
    jarakOptimalKm,
    biayaBbmOptimalRp,
    selisihJarakKm,
    persentasePenghematanJarak,
    selisihBiayaBbmRp,
  };
}

/**
 * Memformat angka nominal uang ke format Rupiah standar Indonesia (id-ID).
 * Contoh: 154000 -> "Rp 154.000"
 */
export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
    .format(rounded)
    .replace(/\s+/g, ' ');
}

/**
 * Memformat teks persentase penghematan rute.
 * Menampilkan "-" jika null (d_conv = 0), dan label jelas jika negatif.
 */
export function formatEfficiencyLabel(efficiencyPercent: number | null): string {
  if (efficiencyPercent === null || isNaN(efficiencyPercent)) {
    return '-';
  }
  if (efficiencyPercent > 0) {
    return `+${efficiencyPercent.toFixed(2)}% (Hemat)`;
  }
  if (efficiencyPercent === 0) {
    return '0.00% (Sama)';
  }
  return `${efficiencyPercent.toFixed(2)}% (Konvensional Lebih Pendek)`;
}

/**
 * Memformat tanggal ke string zona waktu Indonesia Barat (WIB / UTC+7).
 */
export function formatTanggalWIB(
  dateOrIso: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateOrIso) return '-';
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) return '-';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('id-ID', defaultOptions).format(d);
}

/**
 * Memeriksa apakah suatu tanggal pesanan berada di dalam rentang tanggal awal dan akhir (WIB).
 */
export function isDateInWIBRange(
  targetDateStr: string,
  startDateStr: string,
  endDateStr: string
): boolean {
  if (!targetDateStr) return false;
  // targetDateStr diasumsikan format YYYY-MM-DD
  if (startDateStr && targetDateStr < startDateStr) return false;
  if (endDateStr && targetDateStr > endDateStr) return false;
  return true;
}
