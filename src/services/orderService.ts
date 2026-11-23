import { supabase } from '../lib/supabase';
import type { Order, OrderStatus } from '../types/database';

export interface OrderItemInput {
  product_id: string;
  qty: number;
}

export interface SaveOrderPayload {
  orderId?: string | null;
  customerId: string;
  tanggal: string;
  catatan?: string | null;
  items: OrderItemInput[];
}

/**
 * Menyimpan pesanan baru atau memperbarui pesanan lama melalui RPC transaksional di database.
 * Snapshot berat dan kalkulasi total muatan dihitung di server-side PostgreSQL.
 */
export async function saveOrder(payload: SaveOrderPayload): Promise<string> {
  const { data, error } = await supabase.rpc('create_or_update_order', {
    p_order_id: payload.orderId || null,
    p_customer_id: payload.customerId,
    p_tanggal: payload.tanggal,
    p_catatan: payload.catatan || null,
    p_items: payload.items,
  });

  if (error) {
    throw new Error(error.message || 'Gagal menyimpan pesanan.');
  }

  return data as string;
}

/**
 * Menghapus pesanan melalui RPC dengan validasi status pesanan.
 */
export async function deleteOrder(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_order', {
    p_order_id: orderId,
  });

  if (error) {
    throw new Error(error.message || 'Gagal menghapus pesanan.');
  }
}

/**
 * Memperbarui status pesanan (khusus gudang: baru/belum_siap/siap).
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) {
    throw new Error(error.message || 'Gagal memperbarui status pesanan.');
  }
}

/**
 * Mengambil daftar pesanan lengkap beserta relasi customer dan order_items.
 */
export async function fetchOrders(options?: {
  status?: string;
  tanggal?: string;
}): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select(`
      *,
      customers (
        id,
        nama_toko,
        alamat,
        no_hp,
        latitude,
        longitude
      ),
      order_items (
        id,
        order_id,
        product_id,
        qty,
        berat_kg,
        products (
          id,
          nama,
          stok,
          harga,
          berat_per_unit_kg
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options?.tanggal) {
    query = query.eq('tanggal', options.tanggal);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Gagal mengambil data pesanan.');
  }

  return (data || []) as Order[];
}
