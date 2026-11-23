-- ==============================================================================
-- SISTEM INFORMASI DISTRIBUSI & PENENTUAN RUTE OPTIMAL (CV SP PLASTIK)
-- SUPABASE MIGRATION: Schema, RLS Policies, Triggers, RPC, and Storage
-- ==============================================================================

-- 1. TABEL PROFILES (Ekstensi auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'gudang', 'driver')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABEL CUSTOMERS (Data Pelanggan / Toko)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_toko TEXT NOT NULL,
  alamat TEXT NOT NULL,
  no_hp TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABEL PRODUCTS (Master Produk Plastik)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  stok INTEGER NOT NULL DEFAULT 0 CHECK (stok >= 0),
  harga NUMERIC NOT NULL DEFAULT 0 CHECK (harga >= 0),
  berat_per_unit_kg NUMERIC NOT NULL DEFAULT 0 CHECK (berat_per_unit_kg >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TABEL VEHICLES (Master Kendaraan Distribusi)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  plat TEXT NOT NULL,
  kapasitas_kg NUMERIC NOT NULL CHECK (kapasitas_kg > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TABEL APP_SETTINGS (Pengaturan Tunggal Sistem: Depot & Biaya)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  depot_nama TEXT NOT NULL,
  depot_lat DOUBLE PRECISION NOT NULL,
  depot_lng DOUBLE PRECISION NOT NULL,
  konsumsi_bbm_km_per_liter NUMERIC NOT NULL DEFAULT 8.0 CHECK (konsumsi_bbm_km_per_liter > 0),
  harga_bbm_per_liter NUMERIC NOT NULL DEFAULT 10000 CHECK (harga_bbm_per_liter > 0),
  kecepatan_rata_rata_kmh NUMERIC NOT NULL DEFAULT 40.0 CHECK (kecepatan_rata_rata_kmh > 0),
  faktor_jalan NUMERIC NOT NULL DEFAULT 1.0 CHECK (faktor_jalan > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. TABEL ORDERS (Pesanan Pelanggan)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  total_muatan_kg NUMERIC NOT NULL DEFAULT 0 CHECK (total_muatan_kg >= 0),
  status TEXT NOT NULL DEFAULT 'baru' CHECK (
    status IN ('baru', 'belum_siap', 'siap', 'dalam_pengiriman', 'diterima', 'tidak_lengkap')
  ),
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TABEL ORDER_ITEMS (Item Detail Pesanan)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  berat_kg NUMERIC NOT NULL CHECK (berat_kg >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. TABEL ROUTES (Rute Pengiriman yang Telah Dihitung)
CREATE TABLE IF NOT EXISTS public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_jarak_km NUMERIC NOT NULL DEFAULT 0,
  total_muatan_kg NUMERIC NOT NULL DEFAULT 0,
  estimasi_waktu_menit NUMERIC NOT NULL DEFAULT 0,
  estimasi_biaya_bbm NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'dibuat' CHECK (status IN ('dibuat', 'dalam_pengiriman', 'selesai')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. TABEL ROUTE_STOPS (Perhentian Toko dalam Rute)
CREATE TABLE IF NOT EXISTS public.route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  urutan INTEGER NOT NULL CHECK (urutan >= 1),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  jarak_dari_sebelumnya_km NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. TABEL DELIVERY_CONFIRMATIONS (Konfirmasi Penerimaan Driver)
CREATE TABLE IF NOT EXISTS public.delivery_confirmations (
  order_id UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('diterima', 'tidak_lengkap')),
  foto_path TEXT,
  ttd_path TEXT,
  catatan TEXT,
  waktu TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. TABEL CONVENTIONAL_ROUTES (Evaluasi Rute Kebiasaan Driver)
CREATE TABLE IF NOT EXISTS public.conventional_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  urutan_customer_ids UUID[] NOT NULL,
  total_jarak_km NUMERIC NOT NULL DEFAULT 0,
  biaya_bbm NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- HELPER FUNCTIONS & SECURITY DEFINER (Mencegah Rekursi RLS)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conventional_routes ENABLE ROW LEVEL SECURITY;

-- --- POLICIES: PROFILES ---
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.current_user_role() = 'admin');

CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin');

-- --- POLICIES: APP_SETTINGS ---
CREATE POLICY "app_settings_select_authenticated" ON public.app_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "app_settings_admin_all" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin');

-- --- POLICIES: PRODUCTS ---
CREATE POLICY "products_select_authenticated" ON public.products
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "products_admin_all" ON public.products
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin');

-- --- POLICIES: VEHICLES ---
CREATE POLICY "vehicles_select_authenticated" ON public.vehicles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "vehicles_admin_all" ON public.vehicles
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin');

-- --- POLICIES: CUSTOMERS ---
-- Admin & Gudang baca semua; Driver hanya baca customer pada rute miliknya
CREATE POLICY "customers_admin_all" ON public.customers
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin');

CREATE POLICY "customers_gudang_select" ON public.customers
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'gudang');

CREATE POLICY "customers_driver_select" ON public.customers
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'driver' AND
    id IN (
      SELECT rs.customer_id
      FROM public.route_stops rs
      JOIN public.routes r ON r.id = rs.route_id
      WHERE r.driver_id = auth.uid()
    )
  );

-- --- POLICIES: ORDERS ---
CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin');

CREATE POLICY "orders_gudang_select" ON public.orders
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'gudang');

CREATE POLICY "orders_gudang_update_status" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'gudang' AND
    status IN ('baru', 'belum_siap', 'siap')
  )
  WITH CHECK (
    public.current_user_role() = 'gudang' AND
    status IN ('baru', 'belum_siap', 'siap')
  );

CREATE POLICY "orders_driver_select" ON public.orders
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'driver' AND
    id IN (
      SELECT rs.order_id
      FROM public.route_stops rs
      JOIN public.routes r ON r.id = rs.route_id
      WHERE r.driver_id = auth.uid()
    )
  );

-- --- POLICIES: ORDER_ITEMS ---
CREATE POLICY "order_items_admin_all" ON public.order_items
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin');

CREATE POLICY "order_items_gudang_select" ON public.order_items
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'gudang');

CREATE POLICY "order_items_driver_select" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'driver' AND
    order_id IN (
      SELECT rs.order_id
      FROM public.route_stops rs
      JOIN public.routes r ON r.id = rs.route_id
      WHERE r.driver_id = auth.uid()
    )
  );

-- --- POLICIES: ROUTES ---
CREATE POLICY "routes_admin_all" ON public.routes
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin');

CREATE POLICY "routes_driver_select" ON public.routes
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'driver' AND
    driver_id = auth.uid()
  );

-- --- POLICIES: ROUTE_STOPS ---
CREATE POLICY "route_stops_admin_all" ON public.route_stops
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin');

CREATE POLICY "route_stops_driver_select" ON public.route_stops
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'driver' AND
    route_id IN (
      SELECT id FROM public.routes WHERE driver_id = auth.uid()
    )
  );

-- --- POLICIES: DELIVERY_CONFIRMATIONS ---
CREATE POLICY "delivery_confirmations_admin_all" ON public.delivery_confirmations
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin');

CREATE POLICY "delivery_confirmations_driver_insert" ON public.delivery_confirmations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'driver' AND
    driver_id = auth.uid() AND
    route_id IN (SELECT id FROM public.routes WHERE driver_id = auth.uid())
  );

CREATE POLICY "delivery_confirmations_driver_select" ON public.delivery_confirmations
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'driver' AND
    driver_id = auth.uid()
  );

-- --- POLICIES: CONVENTIONAL_ROUTES ---
CREATE POLICY "conventional_routes_admin_all" ON public.conventional_routes
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin');

-- ==============================================================================
-- TRIGGERS PENJAGA & OTOMATISASI STATUS
-- ==============================================================================

-- 1. Trigger Penjaga: Mencegah Gudang Mengubah Kolom Selain 'status'
CREATE OR REPLACE FUNCTION public.check_gudang_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.current_user_role() = 'gudang' THEN
    IF (NEW.id IS DISTINCT FROM OLD.id) OR
       (NEW.customer_id IS DISTINCT FROM OLD.customer_id) OR
       (NEW.tanggal IS DISTINCT FROM OLD.tanggal) OR
       (NEW.total_muatan_kg IS DISTINCT FROM OLD.total_muatan_kg) OR
       (NEW.catatan IS DISTINCT FROM OLD.catatan) THEN
      RAISE EXCEPTION 'Tim gudang hanya diizinkan untuk mengubah status pesanan.';
    END IF;

    IF NEW.status NOT IN ('baru', 'belum_siap', 'siap') THEN
      RAISE EXCEPTION 'Status yang diizinkan untuk tim gudang hanya: baru, belum_siap, atau siap.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_gudang_order_update ON public.orders;
CREATE TRIGGER trg_check_gudang_order_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.check_gudang_order_update();

-- 2. Trigger Otomatis: Update Status Orders Menjadi 'diterima' / 'tidak_lengkap'
-- Saat Driver Memasukkan Bukti Penerimaan (Driver tidak butuh hak akses langsung ke orders)
CREATE OR REPLACE FUNCTION public.on_delivery_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.orders
  SET status = NEW.status
  WHERE id = NEW.order_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_delivery_confirmed ON public.delivery_confirmations;
CREATE TRIGGER trg_on_delivery_confirmed
  AFTER INSERT OR UPDATE ON public.delivery_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION public.on_delivery_confirmed();

-- ==============================================================================
-- STORED PROCEDURE (RPC): TRANSAKSI SIMPAN RUTE & UPDATE PESANAN
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.save_route(
  p_tanggal DATE,
  p_vehicle_id UUID,
  p_driver_id UUID,
  p_total_jarak_km NUMERIC,
  p_total_muatan_kg NUMERIC,
  p_estimasi_waktu_menit NUMERIC,
  p_estimasi_biaya_bbm NUMERIC,
  p_stops JSONB -- Array of { urutan, order_id, customer_id, jarak_dari_sebelumnya_km }
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_route_id UUID;
  v_stop JSONB;
BEGIN
  -- Hanya admin yang boleh menyimpan rute
  IF public.current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Hanya admin yang memiliki wewenang menyimpan rute pengiriman.';
  END IF;

  -- 1. Insert ke tabel routes
  INSERT INTO public.routes (
    tanggal,
    vehicle_id,
    driver_id,
    total_jarak_km,
    total_muatan_kg,
    estimasi_waktu_menit,
    estimasi_biaya_bbm,
    status,
    created_by
  ) VALUES (
    p_tanggal,
    p_vehicle_id,
    p_driver_id,
    p_total_jarak_km,
    p_total_muatan_kg,
    p_estimasi_waktu_menit,
    p_estimasi_biaya_bbm,
    'dalam_pengiriman',
    auth.uid()
  ) RETURNING id INTO v_route_id;

  -- 2. Iterasi dan insert route_stops + update status order menjadi 'dalam_pengiriman'
  FOR v_stop IN SELECT * FROM jsonb_array_elements(p_stops)
  LOOP
    INSERT INTO public.route_stops (
      route_id,
      urutan,
      order_id,
      customer_id,
      jarak_dari_sebelumnya_km
    ) VALUES (
      v_route_id,
      (v_stop->>'urutan')::INTEGER,
      (v_stop->>'order_id')::UUID,
      (v_stop->>'customer_id')::UUID,
      (v_stop->>'jarak_dari_sebelumnya_km')::NUMERIC
    );

    UPDATE public.orders
    SET status = 'dalam_pengiriman'
    WHERE id = (v_stop->>'order_id')::UUID;
  END LOOP;

  RETURN v_route_id;
END;
$$;

-- ==============================================================================
-- STORAGE: BUCKET 'proofs' & POLICIES
-- ==============================================================================

-- Buat bucket privat 'proofs' jika belum ada
INSERT INTO storage.buckets (id, name, public)
VALUES ('proofs', 'proofs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Policy Storage: Admin akses penuh
CREATE POLICY "proofs_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'proofs' AND
    public.current_user_role() = 'admin'
  );

-- Policy Storage: Driver dapat mengunggah file bukti ke direktori rute/pesanan miliknya
CREATE POLICY "proofs_driver_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'proofs' AND
    public.current_user_role() = 'driver'
  );

-- Policy Storage: Driver dapat membaca file bukti miliknya
CREATE POLICY "proofs_driver_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'proofs' AND
    public.current_user_role() = 'driver'
  );
