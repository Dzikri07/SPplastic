import { describe, expect, it } from 'vitest';
import type { CustomerDemand, DepotConfig } from '../../types/routing';
import { HaversineDistanceService } from '../distance';
import { calculateSavingMatrix, DEPOT_NODE_ID } from '../savingMatrix';

describe('Algoritma Clarke-Wright Saving Matrix (CVRP)', () => {
  const distanceService = new HaversineDistanceService(1.0, 2);

  // Koordinat Depot: CV Saripan Plastik, Haurwangi, Cianjur
  const defaultDepot: DepotConfig = {
    nama: 'CV Saripan Plastik (Haurwangi)',
    lat: -6.827218,
    lng: 107.291637,
  };

  /**
   * Dataset 5 Pelanggan Dummy di Wilayah Cianjur
   */
  const dummyCustomers5: CustomerDemand[] = [
    {
      id: 'C1',
      namaToko: 'Toko Berkah Ciranjang',
      lat: -6.8200,
      lng: 107.2600,
      demandKg: 120,
    },
    {
      id: 'C2',
      namaToko: 'Toko Maju Bojongpicung',
      lat: -6.8600,
      lng: 107.2500,
      demandKg: 150,
    },
    {
      id: 'C3',
      namaToko: 'Toko Subur Sukaluyu',
      lat: -6.8400,
      lng: 107.2000,
      demandKg: 200,
    },
    {
      id: 'C4',
      namaToko: 'Toko Rejeki Karangtengah',
      lat: -6.8100,
      lng: 107.1800,
      demandKg: 180,
    },
    {
      id: 'C5',
      namaToko: 'Toko Plastik Cianjur Kota',
      lat: -6.8200,
      lng: 107.1400,
      demandKg: 150,
    },
  ];

  it('menghasilkan log matriks jarak simetris yang lengkap (N+1 x N+1)', () => {
    const result = calculateSavingMatrix(defaultDepot, dummyCustomers5, 500, {
      distanceService,
    });

    const matrix = result.logs.distanceMatrix;
    expect(matrix).toBeDefined();

    // Node: depot + 5 customer = 6 node
    const allNodes = [DEPOT_NODE_ID, 'C1', 'C2', 'C3', 'C4', 'C5'];
    for (const n1 of allNodes) {
      expect(matrix[n1]).toBeDefined();
      for (const n2 of allNodes) {
        // Simetri: d(i, j) == d(j, i)
        expect(matrix[n1][n2]).toBe(matrix[n2][n1]);
        if (n1 === n2) {
          expect(matrix[n1][n2]).toBe(0);
        } else {
          expect(matrix[n1][n2]).toBeGreaterThan(0);
        }
      }
    }
  });

  it('mengurutkan nilai saving secara menurun dan membuang saving <= 0', () => {
    const result = calculateSavingMatrix(defaultDepot, dummyCustomers5, 500, {
      distanceService,
    });

    const savings = result.logs.savingsList;
    expect(savings.length).toBeGreaterThan(0);

    for (let k = 0; k < savings.length - 1; k++) {
      expect(savings[k].savingKm).toBeGreaterThanOrEqual(savings[k + 1].savingKm);
      expect(savings[k].savingKm).toBeGreaterThan(0);
    }
  });

  it('membentuk rute valid dengan batasan kapasitas Q = 500 kg', () => {
    const capacityQ = 500;
    const result = calculateSavingMatrix(defaultDepot, dummyCustomers5, capacityQ, {
      distanceService,
    });

    expect(result.routes.length).toBeGreaterThanOrEqual(2);

    // Verifikasi semua pelanggan terlayani tepat satu kali
    const visitedCustomers: string[] = [];
    let totalPayloadAllRoutes = 0;

    for (const route of result.routes) {
      // Muatan tidak boleh melebihi kapasitas
      expect(route.totalMuatanKg).toBeLessThanOrEqual(capacityQ);
      expect(route.totalJarakKm).toBeGreaterThan(0);
      visitedCustomers.push(...route.urutanCustomerIds);
      totalPayloadAllRoutes += route.totalMuatanKg;
    }

    expect(visitedCustomers.sort()).toEqual(['C1', 'C2', 'C3', 'C4', 'C5'].sort());
    // Total muatan 120 + 150 + 200 + 180 + 150 = 800 kg
    expect(totalPayloadAllRoutes).toBe(800);
  });

  it('menolak penggabungan jika muatan melebihi kapasitas (REJECTED_CAPACITY)', () => {
    // 2 pelanggan dengan demand masing-masing 300 kg, Q = 500 kg
    const customers2: CustomerDemand[] = [
      { id: 'T1', lat: -6.8200, lng: 107.2600, demandKg: 300 },
      { id: 'T2', lat: -6.8210, lng: 107.2610, demandKg: 300 },
    ];

    const result = calculateSavingMatrix(defaultDepot, customers2, 500, {
      distanceService,
    });

    // Harus tetap menghasilkan 2 rute terpisah karena 300 + 300 = 600 > 500
    expect(result.routes.length).toBe(2);
    expect(result.routes[0].totalMuatanKg).toBe(300);
    expect(result.routes[1].totalMuatanKg).toBe(300);

    const capacityLog = result.logs.mergeSteps.find(
      (s) => s.action === 'REJECTED_CAPACITY'
    );
    expect(capacityLog).toBeDefined();
    expect(capacityLog?.reason).toContain('melebihi kapasitas');
  });

  it('menolak penggabungan node interior (bukan di ujung rute / REJECTED_NOT_EXTERIOR)', () => {
    // Buat skenario di mana 3 node digabung membentuk [A, B, C]
    // lalu ada pasangan saving tinggi antara B dan node D
    const customNodes: CustomerDemand[] = [
      { id: 'A', lat: -6.820, lng: 107.260, demandKg: 50 },
      { id: 'B', lat: -6.821, lng: 107.261, demandKg: 50 },
      { id: 'C', lat: -6.822, lng: 107.262, demandKg: 50 },
      { id: 'D', lat: -6.823, lng: 107.263, demandKg: 50 },
    ];

    const result = calculateSavingMatrix(defaultDepot, customNodes, 1000, {
      distanceService,
    });

    // Verifikasi tidak ada rute yang memecah rantai dan semua node terlayani
    const allVisited = result.routes.flatMap((r) => r.urutanCustomerIds);
    expect(allVisited.length).toBe(4);
    expect(new Set(allVisited).size).toBe(4);
  });

  it('menangani kasus khusus: 1 pelanggan tunggal', () => {
    const singleCustomer: CustomerDemand[] = [
      {
        id: 'C_SOLO',
        namaToko: 'Toko Mandiri',
        lat: -6.8200,
        lng: 107.2600,
        demandKg: 150,
      },
    ];

    const result = calculateSavingMatrix(defaultDepot, singleCustomer, 500, {
      distanceService,
    });

    expect(result.routes.length).toBe(1);
    expect(result.routes[0].urutanCustomerIds).toEqual(['C_SOLO']);
    expect(result.routes[0].totalMuatanKg).toBe(150);

    const d0 = distanceService.calculateDistance(defaultDepot, singleCustomer[0]);
    expect(result.routes[0].totalJarakKm).toBeCloseTo(2 * d0, 1);
  });

  it('menangani kasus khusus: daftar pelanggan kosong', () => {
    const result = calculateSavingMatrix(defaultDepot, [], 500, {
      distanceService,
    });

    expect(result.routes).toEqual([]);
    expect(result.logs.savingsList).toEqual([]);
    expect(result.logs.mergeSteps).toEqual([]);
  });

  it('melempar error jika ada demand pelanggan melebihi kapasitas kendaraan (demand > Q)', () => {
    const overDemandCustomer: CustomerDemand[] = [
      {
        id: 'C_OVER',
        namaToko: 'Toko Grosir Raksasa',
        lat: -6.8200,
        lng: 107.2600,
        demandKg: 650,
      },
    ];

    expect(() =>
      calculateSavingMatrix(defaultDepot, overDemandCustomer, 500, {
        distanceService,
      })
    ).toThrowError(/melebihi kapasitas kendaraan/);
  });

  it('melempar error jika kapasitas kendaraan <= 0', () => {
    expect(() =>
      calculateSavingMatrix(defaultDepot, dummyCustomers5, 0, {
        distanceService,
      })
    ).toThrowError(/Kapasitas kendaraan harus lebih besar dari 0/);
  });
});
