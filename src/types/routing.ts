export interface Coordinate {
  lat: number;
  lng: number;
}

export interface CustomerDemand extends Coordinate {
  id: string;
  namaToko?: string;
  demandKg: number;
}

export interface DepotConfig extends Coordinate {
  nama?: string;
}

export interface DistanceService {
  calculateDistance(from: Coordinate, to: Coordinate): number;
}

export interface SavingPair {
  i: string;
  j: string;
  savingKm: number;
}

export type MergeAction =
  | 'MERGED'
  | 'REJECTED_CAPACITY'
  | 'REJECTED_NOT_EXTERIOR'
  | 'REJECTED_SAME_ROUTE';

export interface MergeStepLog {
  step: number;
  pair: [string, string];
  savingKm: number;
  action: MergeAction;
  routeA?: string[];
  routeB?: string[];
  reason?: string;
  resultRoute?: string[];
}

export interface SavingMatrixRoute {
  urutanCustomerIds: string[];
  totalJarakKm: number;
  totalMuatanKg: number;
}

export interface SavingMatrixResult {
  routes: SavingMatrixRoute[];
  logs: {
    distanceMatrix: Record<string, Record<string, number>>;
    savingsList: SavingPair[];
    mergeSteps: MergeStepLog[];
  };
}
