import { describe, expect, it } from 'vitest';
import type { OrderStatus, Product } from '../../types/database';

describe('Logika Validasi & Kalkulasi Pesanan (Order RPC Constraints)', () => {
  const dummyProducts: Product[] = [
    { id: 'P1', nama: 'Kresek Bening 15', stok: 100, harga: 7500, berat_per_unit_kg: 0.25 },
    { id: 'P2', nama: 'Kresek Hitam 24', stok: 80, harga: 12000, berat_per_unit_kg: 0.40 },
    { id: 'P3', nama: 'PE Cor Roll', stok: 20, harga: 45000, berat_per_unit_kg: 1.50 },
  ];

  it('menghitung total muatan dan snapshot berat per item dengan benar', () => {
    const items = [
      { product_id: 'P1', qty: 40 }, // 40 * 0.25 = 10.0 kg
      { product_id: 'P2', qty: 50 }, // 50 * 0.40 = 20.0 kg
      { product_id: 'P3', qty: 10 }, // 10 * 1.50 = 15.0 kg
    ];

    let totalMuatan = 0;
    const snapshots: Array<{ product_id: string; berat_kg: number }> = [];

    for (const item of items) {
      const prod = dummyProducts.find((p) => p.id === item.product_id)!;
      const itemWeight = Math.round(prod.berat_per_unit_kg * item.qty * 100) / 100;
      snapshots.push({ product_id: item.product_id, berat_kg: itemWeight });
      totalMuatan += itemWeight;
    }

    expect(snapshots[0].berat_kg).toBe(10.0);
    expect(snapshots[1].berat_kg).toBe(20.0);
    expect(snapshots[2].berat_kg).toBe(15.0);
    expect(totalMuatan).toBe(45.0);
  });

  it('mendeteksi kondisi pesanan terkunci (tidak boleh diubah/dihapus jika dalam_pengiriman/diterima/tidak_lengkap)', () => {
    const isOrderLocked = (status: OrderStatus): boolean => {
      return ['dalam_pengiriman', 'diterima', 'tidak_lengkap'].includes(status);
    };

    expect(isOrderLocked('baru')).toBe(false);
    expect(isOrderLocked('belum_siap')).toBe(false);
    expect(isOrderLocked('siap')).toBe(false);

    expect(isOrderLocked('dalam_pengiriman')).toBe(true);
    expect(isOrderLocked('diterima')).toBe(true);
    expect(isOrderLocked('tidak_lengkap')).toBe(true);
  });

  it('memvalidasi peringatan kapasitas jika total muatan melebihi armada terbesar', () => {
    const maxFleetCapacityKg = 1000;

    const checkOverCapacity = (totalKg: number) => {
      return totalKg > maxFleetCapacityKg;
    };

    expect(checkOverCapacity(450)).toBe(false);
    expect(checkOverCapacity(1000)).toBe(false);
    expect(checkOverCapacity(1050)).toBe(true);
  });
});
