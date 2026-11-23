-- ==============================================================================
-- MIGRATION: Orders RPC (Transactional Insert/Update & Delete with Server-Side Payload)
-- File: supabase/migrations/20261123000003_orders_rpc.sql
-- ==============================================================================

-- 1. RPC: CREATE OR UPDATE ORDER (TRANSAKSIONAL)
CREATE OR REPLACE FUNCTION public.create_or_update_order(
  p_order_id UUID,
  p_customer_id UUID,
  p_tanggal DATE,
  p_catatan TEXT,
  p_items JSONB -- Array of { product_id: UUID, qty: INTEGER }
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id UUID;
  v_current_status TEXT;
  v_total_muatan_kg NUMERIC := 0;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_berat_per_unit NUMERIC;
  v_item_berat_kg NUMERIC;
BEGIN
  -- Hanya admin yang boleh membuat atau mengubah pesanan
  IF public.current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Hanya admin yang memiliki wewenang mengelola pesanan.';
  END IF;

  -- Validasi list item tidak boleh kosong
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Pesanan harus memiliki minimal satu item produk.';
  END IF;

  -- Jika memperbarui pesanan lama (update)
  IF p_order_id IS NOT NULL THEN
    SELECT status INTO v_current_status
    FROM public.orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pesanan dengan ID % tidak ditemukan.', p_order_id;
    END IF;

    -- Validasi proteksi: pesanan yang sudah dalam pengiriman atau selesai tidak boleh diubah
    IF v_current_status IN ('dalam_pengiriman', 'diterima', 'tidak_lengkap') THEN
      RAISE EXCEPTION 'Pesanan berstatus "%" tidak dapat diubah karena rute telah berjalan atau selesai.', v_current_status;
    END IF;

    v_order_id := p_order_id;
  ELSE
    v_order_id := gen_random_uuid();
  END IF;

  -- Hitung total muatan di database dari master berat produk asli (server-side verification)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'qty')::INTEGER;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Jumlah kuantitas (qty) untuk setiap produk harus lebih besar dari 0.';
    END IF;

    SELECT berat_per_unit_kg INTO v_berat_per_unit
    FROM public.products
    WHERE id = v_product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk dengan ID % tidak ditemukan.', v_product_id;
    END IF;

    v_item_berat_kg := v_berat_per_unit * v_qty;
    v_total_muatan_kg := v_total_muatan_kg + v_item_berat_kg;
  END LOOP;

  -- 1. Insert atau Update dokumen Order
  IF p_order_id IS NOT NULL THEN
    UPDATE public.orders
    SET
      customer_id = p_customer_id,
      tanggal = p_tanggal,
      total_muatan_kg = v_total_muatan_kg,
      catatan = p_catatan
    WHERE id = v_order_id;

    -- Hapus item lama untuk digantikan dengan item snapshot baru
    DELETE FROM public.order_items WHERE order_id = v_order_id;
  ELSE
    INSERT INTO public.orders (
      id,
      customer_id,
      tanggal,
      total_muatan_kg,
      status,
      catatan
    ) VALUES (
      v_order_id,
      p_customer_id,
      p_tanggal,
      v_total_muatan_kg,
      'baru',
      p_catatan
    );
  END IF;

  -- 2. Insert item-item pesanan dengan snapshot berat produk saat pemesanan
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := (v_item->>'qty')::INTEGER;

    SELECT berat_per_unit_kg INTO v_berat_per_unit
    FROM public.products
    WHERE id = v_product_id;

    v_item_berat_kg := v_berat_per_unit * v_qty;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      qty,
      berat_kg
    ) VALUES (
      v_order_id,
      v_product_id,
      v_qty,
      v_item_berat_kg
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;

-- 2. RPC: DELETE ORDER DENGAN PROTEKSI STATUS
CREATE OR REPLACE FUNCTION public.delete_order(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF public.current_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Hanya admin yang dapat menghapus pesanan.';
  END IF;

  SELECT status INTO v_status
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan tidak ditemukan.';
  END IF;

  IF v_status IN ('dalam_pengiriman', 'diterima', 'tidak_lengkap') THEN
    RAISE EXCEPTION 'Pesanan berstatus "%" tidak dapat dihapus karena rute telah berjalan atau selesai.', v_status;
  END IF;

  DELETE FROM public.orders WHERE id = p_order_id;
  RETURN TRUE;
END;
$$;
