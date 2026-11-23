-- ==============================================================================
-- MIGRATION: RLS & Trigger Fixes
-- File: supabase/migrations/20261123_rls_fixes.sql
-- ==============================================================================

-- 1. Pastikan trigger penjaga pesanan HANYA mengecek jika pengguna adalah 'gudang'.
--    Admin dan service role (seed/system) tidak terblokir.
CREATE OR REPLACE FUNCTION public.check_gudang_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Hanya periksa jika pengguna saat ini berstatus 'gudang'
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

-- 2. Pastikan trigger otomatisasi konfirmasi berstatus SECURITY DEFINER
--    dengan search_path terkunci
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

-- 3. Perketat policy INSERT pada delivery_confirmations:
--    Driver HANYA boleh mengonfirmasi pesanan yang stop-nya terdaftar pada rute
--    yang ditugaskan kepadanya (driver_id = auth.uid())
DROP POLICY IF EXISTS "delivery_confirmations_driver_insert" ON public.delivery_confirmations;

CREATE POLICY "delivery_confirmations_driver_insert" ON public.delivery_confirmations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'driver' AND
    driver_id = auth.uid() AND
    EXISTS (
      SELECT 1
      FROM public.routes r
      JOIN public.route_stops rs ON rs.route_id = r.id
      WHERE r.id = delivery_confirmations.route_id
        AND r.driver_id = auth.uid()
        AND rs.order_id = delivery_confirmations.order_id
    )
  );
