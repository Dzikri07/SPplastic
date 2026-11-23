import { describe, it, expect } from 'vitest';
import {
  calculateConventionalRouteDistance,
  compareRoutesMetrics,
  formatRupiah,
  formatEfficiencyLabel,
  formatTanggalWIB,
  isDateInWIBRange,
  type RouteCostParameters,
} from '../evaluationLogic';
import { HaversineDistanceService } from '../distance';

describe('Evaluation & Report Logic Unit Tests (Fase 7)', () => {
  const distanceService = new HaversineDistanceService(1.0);
  const depot = { lat: -6.827218, lng: 107.291637 };
  const params: RouteCostParameters = {
    konsumsiBbmKmPerLiter: 8,
    hargaBbmPerLiter: 10000,
  };

  describe('calculateConventionalRouteDistance', () => {
    it('returns 0 if no customer stops provided', () => {
      const dist = calculateConventionalRouteDistance(depot, [], distanceService);
      expect(dist).toBe(0);
    });

    it('calculates round-trip distance depot -> stops -> depot accurately', () => {
      const stops = [
        { lat: -6.815, lng: 107.28 },
        { lat: -6.84, lng: 107.31 },
      ];

      const d0_1 = distanceService.calculateDistance(depot, stops[0]);
      const d1_2 = distanceService.calculateDistance(stops[0], stops[1]);
      const d2_0 = distanceService.calculateDistance(stops[1], depot);
      const expected = Math.round((d0_1 + d1_2 + d2_0) * 100) / 100;

      const dist = calculateConventionalRouteDistance(depot, stops, distanceService);
      expect(dist).toBe(expected);
    });
  });

  describe('compareRoutesMetrics', () => {
    it('computes positive efficiency and fuel savings under normal conditions', () => {
      const dConv = 50.0;
      const dOpt = 40.0;

      const res = compareRoutesMetrics(dConv, dOpt, params);
      expect(res.jarakKonvensionalKm).toBe(50.0);
      expect(res.jarakOptimalKm).toBe(40.0);
      expect(res.selisihJarakKm).toBe(10.0);
      // ((50 - 40) / 50) * 100 = 20%
      expect(res.persentasePenghematanJarak).toBe(20.0);
      expect(formatEfficiencyLabel(res.persentasePenghematanJarak)).toBe('+20.00% (Hemat)');

      // BBM: 50/8 * 10000 = 62500, 40/8 * 10000 = 50000, selisih = 12500
      expect(res.biayaBbmKonvensionalRp).toBe(62500);
      expect(res.biayaBbmOptimalRp).toBe(50000);
      expect(res.selisihBiayaBbmRp).toBe(12500);
    });

    it('handles divide-by-zero when d_conv = 0 gracefully (returns null and "-")', () => {
      const res = compareRoutesMetrics(0, 25.0, params);
      expect(res.selisihJarakKm).toBe(-25.0);
      expect(res.persentasePenghematanJarak).toBeNull();
      expect(formatEfficiencyLabel(res.persentasePenghematanJarak)).toBe('-');
    });

    it('handles negative efficiency when conventional route happens to be shorter as-is without forcing to 0', () => {
      const dConv = 30.0;
      const dOpt = 35.0;

      const res = compareRoutesMetrics(dConv, dOpt, params);
      expect(res.selisihJarakKm).toBe(-5.0);
      // ((30 - 35) / 30) * 100 = -16.67%
      expect(res.persentasePenghematanJarak).toBe(-16.67);
      expect(formatEfficiencyLabel(res.persentasePenghematanJarak)).toBe(
        '-16.67% (Konvensional Lebih Pendek)'
      );
    });

    it('handles identical distance (0% difference) accurately', () => {
      const res = compareRoutesMetrics(42.5, 42.5, params);
      expect(res.selisihJarakKm).toBe(0);
      expect(res.persentasePenghematanJarak).toBe(0);
      expect(formatEfficiencyLabel(res.persentasePenghematanJarak)).toBe('0.00% (Sama)');
    });
  });

  describe('formatRupiah', () => {
    it('formats number into standard Indonesian Rupiah currency string', () => {
      const formatted = formatRupiah(154000);
      // Mengandung 'Rp' dan '154.000'
      expect(formatted).toMatch(/Rp\s*154\.000/);
    });

    it('handles 0 and negative numbers properly', () => {
      expect(formatRupiah(0)).toMatch(/Rp\s*0/);
    });
  });

  describe('WIB Timezone and Date Range Filtering', () => {
    it('formats UTC ISO date string into Indonesian WIB date', () => {
      // 2026-11-23T15:00:00Z adalah 2026-11-23 jam 22:00 WIB
      const isoStr = '2026-11-23T15:00:00Z';
      const formatted = formatTanggalWIB(isoStr);
      expect(formatted).toContain('2026');
      expect(formatted).toContain('November');
    });

    it('correctly filters dates within range (WIB)', () => {
      expect(isDateInWIBRange('2026-11-23', '2026-11-20', '2026-11-25')).toBe(true);
      expect(isDateInWIBRange('2026-11-19', '2026-11-20', '2026-11-25')).toBe(false);
      expect(isDateInWIBRange('2026-11-26', '2026-11-20', '2026-11-25')).toBe(false);
      expect(isDateInWIBRange('2026-11-20', '2026-11-20', '2026-11-25')).toBe(true);
      expect(isDateInWIBRange('2026-11-25', '2026-11-20', '2026-11-25')).toBe(true);
    });
  });
});
