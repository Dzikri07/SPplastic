-- ==============================================================================
-- MIGRATION: Driver Delivery & Storage Security
-- File: supabase/migrations/20261123000004_driver_delivery_security.sql
-- ==============================================================================

-- 1. Pastikan CONSTRAINT UNIQUE pada order_id di tabel delivery_confirmations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_delivery_confirmations_order_id'
  ) THEN
    ALTER TABLE public.delivery_confirmations
      ADD CONSTRAINT uq_delivery_confirmations_order_id UNIQUE (order_id);
  END IF;
END $$;

-- 2. Perbarui Trigger on_delivery_confirmed:
--    - Menangani status 'diterima' dan 'tidak_lengkap' pada orders
--    - Mengubah otomatis status rute menjadi 'selesai' jika semua stop telah selesai
CREATE OR REPLACE FUNCTION public.on_delivery_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_remaining_stops INTEGER;
BEGIN
  -- 1. Perbarui status order menjadi status konfirmasi ('diterima' / 'tidak_lengkap')
  UPDATE public.orders
  SET status = NEW.status
  WHERE id = NEW.order_id;

  -- 2. Periksa sisa stop yang belum dikonfirmasi pada rute terkait
  SELECT COUNT(*)
  INTO v_remaining_stops
  FROM public.route_stops rs
  WHERE rs.route_id = NEW.route_id
    AND NOT EXISTS (
      SELECT 1 FROM public.delivery_confirmations dc
      WHERE dc.order_id = rs.order_id
    );

  -- 3. Bila semua stop telah selesai, rute otomatis selesai
  IF v_remaining_stops = 0 THEN
    UPDATE public.routes
    SET status = 'selesai'
    WHERE id = NEW.route_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_delivery_confirmed ON public.delivery_confirmations;
CREATE TRIGGER trg_on_delivery_confirmed
  AFTER INSERT OR UPDATE ON public.delivery_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION public.on_delivery_confirmed();

-- 3. PERBAIKAN POLICY STORAGE BUCKET 'proofs'
-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "proofs_driver_upload" ON storage.objects;
DROP POLICY IF EXISTS "proofs_driver_select" ON storage.objects;
DROP POLICY IF EXISTS "proofs_admin_all" ON storage.objects;

-- Policy Admin: Akses penuh pada bucket proofs
CREATE POLICY "proofs_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'proofs' AND
    public.current_user_role() = 'admin'
  );

-- Policy Driver Upload:
-- Driver HANYA boleh mengunggah file ke direktori {order_id}/* untuk order
-- yang terdapat pada rute miliknya (r.driver_id = auth.uid())
CREATE POLICY "proofs_driver_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'proofs' AND
    public.current_user_role() = 'driver' AND
    EXISTS (
      SELECT 1
      FROM public.routes r
      JOIN public.route_stops rs ON rs.route_id = r.id
      WHERE r.driver_id = auth.uid()
        AND rs.order_id::text = split_part(name, '/', 1)
    )
  );

-- Policy Driver Select:
-- Driver HANYA boleh membaca file bukti miliknya sendiri ({order_id}/* di rutenya)
CREATE POLICY "proofs_driver_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'proofs' AND
    public.current_user_role() = 'driver' AND
    EXISTS (
      SELECT 1
      FROM public.routes r
      JOIN public.route_stops rs ON rs.route_id = r.id
      WHERE r.driver_id = auth.uid()
        AND rs.order_id::text = split_part(name, '/', 1)
    )
  );
