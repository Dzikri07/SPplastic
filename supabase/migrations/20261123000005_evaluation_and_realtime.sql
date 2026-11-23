-- ==============================================================================
-- MIGRATION: Conventional Routes Evaluation Snapshot & Realtime Publication
-- File: supabase/migrations/20261123000005_evaluation_and_realtime.sql
-- ==============================================================================

-- 1. Penambahan Kolom Snapshot Evaluasi pada Tabel conventional_routes
DO $$
BEGIN
  -- optimal_route_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conventional_routes' AND column_name = 'optimal_route_id') THEN
    ALTER TABLE public.conventional_routes ADD COLUMN optimal_route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL;
  END IF;

  -- vehicle_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conventional_routes' AND column_name = 'vehicle_id') THEN
    ALTER TABLE public.conventional_routes ADD COLUMN vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;
  END IF;

  -- optimal_jarak_km
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conventional_routes' AND column_name = 'optimal_jarak_km') THEN
    ALTER TABLE public.conventional_routes ADD COLUMN optimal_jarak_km NUMERIC NOT NULL DEFAULT 0;
  END IF;

  -- optimal_biaya_bbm
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conventional_routes' AND column_name = 'optimal_biaya_bbm') THEN
    ALTER TABLE public.conventional_routes ADD COLUMN optimal_biaya_bbm NUMERIC NOT NULL DEFAULT 0;
  END IF;

  -- selisih_jarak_km
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conventional_routes' AND column_name = 'selisih_jarak_km') THEN
    ALTER TABLE public.conventional_routes ADD COLUMN selisih_jarak_km NUMERIC NOT NULL DEFAULT 0;
  END IF;

  -- persentase_penghematan_jarak
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conventional_routes' AND column_name = 'persentase_penghematan_jarak') THEN
    ALTER TABLE public.conventional_routes ADD COLUMN persentase_penghematan_jarak NUMERIC;
  END IF;

  -- selisih_biaya_bbm
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conventional_routes' AND column_name = 'selisih_biaya_bbm') THEN
    ALTER TABLE public.conventional_routes ADD COLUMN selisih_biaya_bbm NUMERIC NOT NULL DEFAULT 0;
  END IF;

  -- snapshot_settings (JSON snapshot parameter: depot_lat, depot_lng, faktor_jalan, konsumsi_bbm, harga_bbm, kecepatan)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conventional_routes' AND column_name = 'snapshot_settings') THEN
    ALTER TABLE public.conventional_routes ADD COLUMN snapshot_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  -- created_by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conventional_routes' AND column_name = 'created_by') THEN
    ALTER TABLE public.conventional_routes ADD COLUMN created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Pastikan RLS Aktif dan Policy conventional_routes HANYA untuk Admin
ALTER TABLE public.conventional_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conventional_routes_admin_all" ON public.conventional_routes;

CREATE POLICY "conventional_routes_admin_all" ON public.conventional_routes
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- 3. Aktifkan Supabase Realtime pada Tabel Utama
DO $$
BEGIN
  -- orders
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  -- routes
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'routes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.routes;
  END IF;

  -- delivery_confirmations
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'delivery_confirmations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_confirmations;
  END IF;
END $$;
