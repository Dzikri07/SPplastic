-- ==============================================================================
-- SEED DATA: CV SP PLASTIK (Saripan Plastik, Cianjur)
-- ==============================================================================

-- 1. PENGATURAN APP / DEPOT PUSAT
-- Koordinat persis: -6.8272177, 107.2916367 (CV Saripan Plastik, Haurwangi, Cianjur)
INSERT INTO public.app_settings (
  id,
  depot_nama,
  depot_lat,
  depot_lng,
  konsumsi_bbm_km_per_liter,
  harga_bbm_per_liter,
  kecepatan_rata_rata_kmh,
  faktor_jalan
) VALUES (
  1,
  'CV Saripan Plastik (Haurwangi, Cianjur)',
  -6.8272177,
  107.2916367,
  8.0,
  10000,
  40.0,
  1.0
) ON CONFLICT (id) DO UPDATE SET
  depot_nama = EXCLUDED.depot_nama,
  depot_lat = EXCLUDED.depot_lat,
  depot_lng = EXCLUDED.depot_lng,
  konsumsi_bbm_km_per_liter = EXCLUDED.konsumsi_bbm_km_per_liter,
  harga_bbm_per_liter = EXCLUDED.harga_bbm_per_liter,
  kecepatan_rata_rata_kmh = EXCLUDED.kecepatan_rata_rata_kmh,
  faktor_jalan = EXCLUDED.faktor_jalan;

-- 2. KENDARAAN (3 Kendaraan dengan Kapasitas Sama: 1000 kg)
INSERT INTO public.vehicles (nama, plat, kapasitas_kg) VALUES
  ('Armada Pick-Up 01 (L300)', 'F 8101 WA', 1000),
  ('Armada Pick-Up 02 (GranMax)', 'F 8102 WB', 1000),
  ('Armada Pick-Up 03 (Carry)', 'F 8103 WC', 1000)
ON CONFLICT DO NOTHING;

-- 3. MASTER PRODUK (8 Produk Plastik)
INSERT INTO public.products (nama, stok, harga, berat_per_unit_kg) VALUES
  ('Kantong Kresek HD Bening 15', 300, 7500, 0.25),
  ('Kantong Kresek HD Hitam 24', 250, 12000, 0.40),
  ('Plastik PE Cor Bening Roll', 100, 45000, 1.50),
  ('Plastik PP Bening Tebal 05', 180, 14000, 0.35),
  ('Tali Rafia Gulung Super 1kg', 150, 22000, 1.00),
  ('Mika Plastik Bento Box 4 Sekat', 200, 28000, 0.50),
  ('Cup Plastik Minuman 16oz', 220, 18500, 0.30),
  ('Plastik Wrapping Roll 50cm', 80, 65000, 2.00)
ON CONFLICT DO NOTHING;

-- 4. 10 PELANGGAN DUMMY DI WILAYAH SEKITAR CIANJUR
INSERT INTO public.customers (nama_toko, alamat, no_hp, latitude, longitude) VALUES
  ('[DUMMY] Toko Plastik Berkah 01', 'Jl. Raya Ciranjang No. 45, Ciranjang, Cianjur', '081234567801', -6.820050, 107.260120),
  ('[DUMMY] Toko Sukses Jaya 02', 'Jl. Bojongpicung No. 12, Bojongpicung, Cianjur', '081234567802', -6.861200, 107.251400),
  ('[DUMMY] Toko Sinar Rejeki 03', 'Jl. Sukaluyu Raya No. 8, Sukaluyu, Cianjur', '081234567803', -6.839800, 107.201500),
  ('[DUMMY] Toko Harapan Bersama 04', 'Jl. Karangtengah No. 102, Karangtengah, Cianjur', '081234567804', -6.812400, 107.182100),
  ('[DUMMY] Toko Plastik Cianjur Kota 05', 'Jl. Dr. Muwardi No. 55, Cianjur Kota', '081234567805', -6.821500, 107.139800),
  ('[DUMMY] Toko Sumber Makmur 06', 'Jl. Raya Cibeber Km 5, Cibeber, Cianjur', '081234567806', -6.892100, 107.145600),
  ('[DUMMY] Toko Abadi Sentosa 07', 'Jl. Mande Asri No. 17, Mande, Cianjur', '081234567807', -6.781200, 107.195400),
  ('[DUMMY] Toko Cahaya Baru 08', 'Jl. Cikalongkulon Raya No. 30, Cikalongkulon, Cianjur', '081234567808', -6.721400, 107.172300),
  ('[DUMMY] Toko Utama Plastik 09', 'Jl. Warungkondang No. 88, Warungkondang, Cianjur', '081234567809', -6.845600, 107.098700),
  ('[DUMMY] Toko Sahabat Plastik 10', 'Jl. Raya Cipanas Km 10, Pacet, Cianjur', '081234567810', -6.751200, 107.042100)
ON CONFLICT DO NOTHING;
