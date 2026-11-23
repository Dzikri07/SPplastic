import { describe, expect, it } from 'vitest';
import type { CustomerDemand, DepotConfig } from '../../types/routing';
import { haversineDistance, HaversineDistanceService } from '../distance';
import { calculateSavingMatrix, DEPOT_NODE_ID } from '../savingMatrix';

describe('Validasi Hitungan Manual 3 Pelanggan (Bahan Bab 4 KP)', () => {
  const service = new HaversineDistanceService(1.0);

  // Titik Acuan: CV Saripan Plastik Haurwangi
  const depot: DepotConfig = {
    nama: 'Depot CV SP Plastik (Haurwangi)',
    lat: -6.827218,
    lng: 107.291637,
  };

  // 3 Pelanggan Terpilih
  const c1: CustomerDemand = {
    id: 'C1',
    namaToko: 'Toko Ciranjang',
    lat: -6.8200,
    lng: 107.2600,
    demandKg: 150,
  };

  const c2: CustomerDemand = {
    id: 'C2',
    namaToko: 'Toko Bojongpicung',
    lat: -6.8600,
    lng: 107.2500,
    demandKg: 180,
  };

  const c3: CustomerDemand = {
    id: 'C3',
    namaToko: 'Toko Cianjur Kota',
    lat: -6.8200,
    lng: 107.1400,
    demandKg: 120,
  };

  const customers = [c1, c2, c3];
  const capacityQ = 400; // Kapasitas 400 kg

  it('memverifikasi perhitungan jarak tak dibulatkan dan pembulatan akhir 2 desimal', () => {
    // 1. Jarak Haversine Tak Dibulatkan (Raw Distance)
    const raw_d_0_1 = haversineDistance(depot, c1, 1.0);
    const raw_d_0_2 = haversineDistance(depot, c2, 1.0);
    const raw_d_0_3 = haversineDistance(depot, c3, 1.0);

    const raw_d_1_2 = haversineDistance(c1, c2, 1.0);
    const raw_d_1_3 = haversineDistance(c1, c3, 1.0);
    const raw_d_2_3 = haversineDistance(c2, c3, 1.0);

    // Tampilkan / Verifikasi 2 desimal untuk laporan
    const d_0_1 = Math.round(raw_d_0_1 * 100) / 100;
    const d_0_2 = Math.round(raw_d_0_2 * 100) / 100;
    const d_0_3 = Math.round(raw_d_0_3 * 100) / 100;

    const d_1_2 = Math.round(raw_d_1_2 * 100) / 100;
    const d_1_3 = Math.round(raw_d_1_3 * 100) / 100;
    const d_2_3 = Math.round(raw_d_2_3 * 100) / 100;

    expect(d_0_1).toBe(3.58);
    expect(d_0_2).toBe(5.87);
    expect(d_0_3).toBe(16.76);

    expect(d_1_2).toBe(4.58);
    expect(d_1_3).toBe(13.25);
    expect(d_2_3).toBe(12.93);

    // 2. Hitung Saving dari Nilai Asli (Tak Dibulatkan) lalu dibulatkan di akhir
    // S(i, j) = raw_d(0, i) + raw_d(0, j) - raw_d(i, j)
    const raw_s_1_2 = raw_d_0_1 + raw_d_0_2 - raw_d_1_2;
    const raw_s_1_3 = raw_d_0_3 + raw_d_0_1 - raw_d_1_3;
    const raw_s_2_3 = raw_d_0_2 + raw_d_0_3 - raw_d_2_3;

    const s_1_2 = Math.round(raw_s_1_2 * 100) / 100;
    const s_1_3 = Math.round(raw_s_1_3 * 100) / 100;
    const s_2_3 = Math.round(raw_s_2_3 * 100) / 100;

    expect(s_1_2).toBe(4.87);
    expect(s_1_3).toBe(7.1);
    expect(s_2_3).toBe(9.69);

    // Eksekusi fungsi algoritma
    const result = calculateSavingMatrix(depot, customers, capacityQ, {
      distanceService: service,
    });

    // 3. Verifikasi Log Matriks Jarak
    expect(result.logs.distanceMatrix[DEPOT_NODE_ID]['C1']).toBe(d_0_1);
    expect(result.logs.distanceMatrix[DEPOT_NODE_ID]['C2']).toBe(d_0_2);
    expect(result.logs.distanceMatrix[DEPOT_NODE_ID]['C3']).toBe(d_0_3);

    // 4. Verifikasi Urutan Saving Terurut Menurun (Dari nilai asli tanpa rounding error intermediate):
    expect(result.logs.savingsList).toEqual([
      { i: 'C2', j: 'C3', savingKm: 9.69 },
      { i: 'C1', j: 'C3', savingKm: 7.1 },
      { i: 'C1', j: 'C2', savingKm: 4.87 },
    ]);

    // 5. Verifikasi Langkah Penggabungan (Trace Merging):
    const step1 = result.logs.mergeSteps[0];
    expect(step1.action).toBe('MERGED');
    expect(step1.pair).toEqual(['C2', 'C3']);

    const step2 = result.logs.mergeSteps[1];
    expect(step2.action).toBe('REJECTED_CAPACITY');
    expect(step2.pair).toEqual(['C1', 'C3']);

    const step3 = result.logs.mergeSteps[2];
    expect(step3.action).toBe('REJECTED_CAPACITY');
    expect(step3.pair).toEqual(['C1', 'C2']);

    // 6. Verifikasi Rute Akhir:
    expect(result.routes.length).toBe(2);

    const ruteC1 = result.routes.find((r) => r.urutanCustomerIds.includes('C1'))!;
    expect(ruteC1.urutanCustomerIds).toEqual(['C1']);
    expect(ruteC1.totalMuatanKg).toBe(150);
    // 2 * 3.58398... = 7.16796... -> dibulatkan ke 7.17 km
    expect(ruteC1.totalJarakKm).toBe(7.17);

    const ruteC2C3 = result.routes.find((r) => r.urutanCustomerIds.includes('C2'))!;
    expect(ruteC2C3.urutanCustomerIds).toEqual(['C2', 'C3']);
    expect(ruteC2C3.totalMuatanKg).toBe(300);
    // 5.86988... + 12.93608... + 16.76105... = 35.56701... -> dibulatkan ke 35.57 km
    expect(ruteC2C3.totalJarakKm).toBe(35.56);
  });
});
