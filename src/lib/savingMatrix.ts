import type {
  Coordinate,
  CustomerDemand,
  DepotConfig,
  DistanceService,
  MergeStepLog,
  SavingMatrixResult,
  SavingMatrixRoute,
  SavingPair,
} from '../types/routing';

export const DEPOT_NODE_ID = 'depot';

export interface SavingMatrixOptions {
  distanceService: DistanceService;
}

/**
 * Menghitung rute distribusi optimal menggunakan metode Clarke-Wright Saving Matrix (CVRP).
 *
 * @param depot Koordinat depot/gudang pusat
 * @param customers Daftar pelanggan beserta koordinat dan kebutuhan muatan (demandKg)
 * @param vehicleCapacityKg Kapasitas maksimal muatan kendaraan (Q dalam kg)
 * @param options Konfigurasi service jarak
 * @returns Rute optimal beserta log perhitungan lengkap
 */
export function calculateSavingMatrix(
  depot: DepotConfig,
  customers: CustomerDemand[],
  vehicleCapacityKg: number,
  options: SavingMatrixOptions
): SavingMatrixResult {
  if (vehicleCapacityKg <= 0) {
    throw new Error('Kapasitas kendaraan harus lebih besar dari 0 kg.');
  }

  // Validasi demand per pelanggan tidak melebihi kapasitas kendaraan
  for (const customer of customers) {
    if (customer.demandKg > vehicleCapacityKg) {
      const customerLabel = customer.namaToko ? `"${customer.namaToko}" (${customer.id})` : customer.id;
      throw new Error(
        `Demand pelanggan ${customerLabel} sebesar ${customer.demandKg} kg melebihi kapasitas kendaraan (${vehicleCapacityKg} kg).`
      );
    }
  }

  const { distanceService } = options;

  // Kasus kosong
  if (customers.length === 0) {
    return {
      routes: [],
      logs: {
        distanceMatrix: {},
        savingsList: [],
        mergeSteps: [],
      },
    };
  }

  // 1. Peta koordinat dan demand untuk pencarian cepat
  const nodeMap = new Map<string, Coordinate>();
  nodeMap.set(DEPOT_NODE_ID, { lat: depot.lat, lng: depot.lng });

  const demandMap = new Map<string, number>();
  for (const c of customers) {
    nodeMap.set(c.id, { lat: c.lat, lng: c.lng });
    demandMap.set(c.id, c.demandKg);
  }

  const allNodeIds = [DEPOT_NODE_ID, ...customers.map((c) => c.id)];

  // 2. Hitung matriks jarak simetris d(i, j)
  // Menyimpan rawDistance untuk kalkulasi presisi tinggi (mencegah akumulasi pembulatan)
  // dan displayDistanceMatrix (2 desimal) untuk tampilan laporan
  const rawDistanceMatrix: Record<string, Record<string, number>> = {};
  const displayDistanceMatrix: Record<string, Record<string, number>> = {};

  for (const id1 of allNodeIds) {
    rawDistanceMatrix[id1] = {};
    displayDistanceMatrix[id1] = {};
    for (const id2 of allNodeIds) {
      if (id1 === id2) {
        rawDistanceMatrix[id1][id2] = 0;
        displayDistanceMatrix[id1][id2] = 0;
      } else if (rawDistanceMatrix[id2] && rawDistanceMatrix[id2][id1] !== undefined) {
        rawDistanceMatrix[id1][id2] = rawDistanceMatrix[id2][id1];
        displayDistanceMatrix[id1][id2] = displayDistanceMatrix[id2][id1];
      } else {
        const coord1 = nodeMap.get(id1)!;
        const coord2 = nodeMap.get(id2)!;
        const rawDist = distanceService.calculateDistance(coord1, coord2);
        rawDistanceMatrix[id1][id2] = rawDist;
        displayDistanceMatrix[id1][id2] = Math.round(rawDist * 100) / 100;
      }
    }
  }

  // Kasus khusus 1 pelanggan
  if (customers.length === 1) {
    const singleCust = customers[0];
    const rawDepotCust = rawDistanceMatrix[DEPOT_NODE_ID][singleCust.id];
    const totalDist = Math.round(2 * rawDepotCust * 100) / 100;

    return {
      routes: [
        {
          urutanCustomerIds: [singleCust.id],
          totalJarakKm: totalDist,
          totalMuatanKg: singleCust.demandKg,
        },
      ],
      logs: {
        distanceMatrix: displayDistanceMatrix,
        savingsList: [],
        mergeSteps: [],
      },
    };
  }

  // 3. Hitung nilai Saving S(i, j) = d(0, i) + d(0, j) - d(i, j) dari nilai tak dibulatkan
  const savingsList: SavingPair[] = [];
  const n = customers.length;
  for (let idxI = 0; idxI < n - 1; idxI++) {
    for (let idxJ = idxI + 1; idxJ < n; idxJ++) {
      const idI = customers[idxI].id;
      const idJ = customers[idxJ].id;

      const raw0i = rawDistanceMatrix[DEPOT_NODE_ID][idI];
      const raw0j = rawDistanceMatrix[DEPOT_NODE_ID][idJ];
      const rawij = rawDistanceMatrix[idI][idJ];

      // Dihitung dari nilai asli (tak dibulatkan), lalu dibulatkan ke 2 desimal di akhir
      const rawSaving = raw0i + raw0j - rawij;
      const saving = Math.round(rawSaving * 100) / 100;

      // Buang saving <= 0
      if (saving > 0) {
        savingsList.push({
          i: idI,
          j: idJ,
          savingKm: saving,
        });
      }
    }
  }

  // Urutkan nilai saving secara menurun (descending)
  savingsList.sort((a, b) => b.savingKm - a.savingKm);

  // 4. Inisialisasi: setiap pelanggan membentuk rute awal sendiri [i]
  // Struktur internal rute:
  // Array of { customers: string[], totalDemand: number }
  interface ActiveRoute {
    customers: string[];
    totalDemand: number;
  }

  let activeRoutes: ActiveRoute[] = customers.map((c) => ({
    customers: [c.id],
    totalDemand: c.demandKg,
  }));

  const mergeSteps: MergeStepLog[] = [];
  let stepCounter = 1;

  // 5. Iterasi penggabungan rute
  for (const savingPair of savingsList) {
    const { i, j, savingKm } = savingPair;

    // Cari rute yang memuat node i dan node j
    const routeIndexI = activeRoutes.findIndex((r) => r.customers.includes(i));
    const routeIndexJ = activeRoutes.findIndex((r) => r.customers.includes(j));

    // Jika salah satu rute tidak ditemukan (kondisi anomali defensif)
    if (routeIndexI === -1 || routeIndexJ === -1) {
      continue;
    }

    const routeA = activeRoutes[routeIndexI];
    const routeB = activeRoutes[routeIndexJ];

    // Kondisi (a): i dan j harus berada pada rute yang BERBEDA
    if (routeIndexI === routeIndexJ) {
      mergeSteps.push({
        step: stepCounter++,
        pair: [i, j],
        savingKm,
        action: 'REJECTED_SAME_ROUTE',
        routeA: [...routeA.customers],
        reason: `Node ${i} dan ${j} sudah berada pada rute yang sama.`,
      });
      continue;
    }

    // Kondisi (b): i dan j harus berada di UJUNG rute masing-masing (eksterior)
    const iIsFirst = routeA.customers[0] === i;
    const iIsLast = routeA.customers[routeA.customers.length - 1] === i;
    const jIsFirst = routeB.customers[0] === j;
    const jIsLast = routeB.customers[routeB.customers.length - 1] === j;

    if ((!iIsFirst && !iIsLast) || (!jIsFirst && !jIsLast)) {
      mergeSteps.push({
        step: stepCounter++,
        pair: [i, j],
        savingKm,
        action: 'REJECTED_NOT_EXTERIOR',
        routeA: [...routeA.customers],
        routeB: [...routeB.customers],
        reason: `Node ${!iIsFirst && !iIsLast ? i : j} bukan merupakan ujung rute (interior node).`,
      });
      continue;
    }

    // Kondisi (c): total demand gabungan <= Q
    const combinedDemand = routeA.totalDemand + routeB.totalDemand;
    if (combinedDemand > vehicleCapacityKg) {
      mergeSteps.push({
        step: stepCounter++,
        pair: [i, j],
        savingKm,
        action: 'REJECTED_CAPACITY',
        routeA: [...routeA.customers],
        routeB: [...routeB.customers],
        reason: `Total muatan gabungan (${combinedDemand} kg) melebihi kapasitas kendaraan (${vehicleCapacityKg} kg).`,
      });
      continue;
    }

    // Lakukan penggabungan rute
    let mergedCustomers: string[];

    if (iIsLast && jIsFirst) {
      // [..A.., i] + [j, ..B..] => [..A.., i, j, ..B..]
      mergedCustomers = [...routeA.customers, ...routeB.customers];
    } else if (iIsLast && jIsLast) {
      // [..A.., i] + [..B.., j] => balik B => [..A.., i, j, ..B(rev)..]
      mergedCustomers = [...routeA.customers, ...[...routeB.customers].reverse()];
    } else if (iIsFirst && jIsFirst) {
      // [i, ..A..] + [j, ..B..] => balik A => [..A(rev).., i, j, ..B..]
      mergedCustomers = [...[...routeA.customers].reverse(), ...routeB.customers];
    } else {
      // iIsFirst && jIsLast
      // [..B.., j] + [i, ..A..] => [..B.., j, i, ..A..]
      mergedCustomers = [...routeB.customers, ...routeA.customers];
    }

    const newMergedRoute: ActiveRoute = {
      customers: mergedCustomers,
      totalDemand: combinedDemand,
    };

    // Hapus kedua rute lama dan tambahkan rute baru
    activeRoutes = activeRoutes.filter(
      (_, index) => index !== routeIndexI && index !== routeIndexJ
    );
    activeRoutes.push(newMergedRoute);

    mergeSteps.push({
      step: stepCounter++,
      pair: [i, j],
      savingKm,
      action: 'MERGED',
      routeA: [...routeA.customers],
      routeB: [...routeB.customers],
      resultRoute: [...mergedCustomers],
    });
  }

  // 6. Hitung jarak total untuk masing-masing rute yang terbentuk
  // Rute: Depot -> C1 -> C2 -> ... -> Ck -> Depot (dihitung dari rawDistance untuk akurasi)
  const finalRoutes: SavingMatrixRoute[] = activeRoutes.map((route) => {
    let totalDist = 0;
    let prevNode = DEPOT_NODE_ID;

    for (const customerId of route.customers) {
      totalDist += rawDistanceMatrix[prevNode][customerId];
      prevNode = customerId;
    }
    // Kembali ke depot
    totalDist += rawDistanceMatrix[prevNode][DEPOT_NODE_ID];

    return {
      urutanCustomerIds: route.customers,
      totalJarakKm: Math.round(totalDist * 100) / 100,
      totalMuatanKg: route.totalDemand,
    };
  });

  return {
    routes: finalRoutes,
    logs: {
      distanceMatrix: displayDistanceMatrix,
      savingsList,
      mergeSteps,
    },
  };
}
