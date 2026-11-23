export type UserRole = 'admin' | 'gudang' | 'driver';

export type OrderStatus =
  | 'baru'
  | 'belum_siap'
  | 'siap'
  | 'dalam_pengiriman'
  | 'diterima'
  | 'tidak_lengkap';

export type RouteStatus = 'dibuat' | 'dalam_pengiriman' | 'selesai';

export interface Profile {
  id: string;
  nama: string;
  username: string;
  role: UserRole;
  created_at?: string;
}

export interface Customer {
  id: string;
  nama_toko: string;
  alamat: string;
  no_hp: string;
  latitude: number;
  longitude: number;
  created_at?: string;
}

export interface Product {
  id: string;
  nama: string;
  stok: number;
  harga: number;
  berat_per_unit_kg: number;
  created_at?: string;
}

export interface Vehicle {
  id: string;
  nama: string;
  plat: string;
  kapasitas_kg: number;
  created_at?: string;
}

export interface AppSettings {
  id: number;
  depot_nama: string;
  depot_lat: number;
  depot_lng: number;
  konsumsi_bbm_km_per_liter: number;
  harga_bbm_per_liter: number;
  kecepatan_rata_rata_kmh: number;
  faktor_jalan: number;
  updated_at?: string;
}

export interface Order {
  id: string;
  customer_id: string;
  tanggal: string;
  total_muatan_kg: number;
  status: OrderStatus;
  catatan?: string | null;
  created_at?: string;
  // Relasi opsional saat join
  customers?: Customer;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  qty: number;
  berat_kg: number;
  created_at?: string;
  // Relasi opsional saat join
  products?: Product;
}

export interface Route {
  id: string;
  tanggal: string;
  vehicle_id: string | null;
  driver_id: string | null;
  total_jarak_km: number;
  total_muatan_kg: number;
  estimasi_waktu_menit: number;
  estimasi_biaya_bbm: number;
  status: RouteStatus;
  created_by: string | null;
  created_at?: string;
  // Relasi opsional
  vehicles?: Vehicle;
  driver?: Profile;
  route_stops?: RouteStop[];
}

export interface RouteStop {
  id: string;
  route_id: string;
  urutan: number;
  order_id: string;
  customer_id: string;
  jarak_dari_sebelumnya_km: number;
  created_at?: string;
  // Relasi opsional
  orders?: Order;
  customers?: Customer;
}

export interface DeliveryConfirmation {
  order_id: string;
  route_id: string;
  driver_id: string;
  status: 'diterima' | 'tidak_lengkap';
  foto_path: string | null;
  ttd_path: string | null;
  catatan: string | null;
  waktu: string;
}

export interface ConventionalRoute {
  id: string;
  tanggal: string;
  urutan_customer_ids: string[];
  total_jarak_km: number;
  biaya_bbm: number;
  created_at?: string;
}
