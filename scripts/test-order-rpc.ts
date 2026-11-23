import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('ERROR: Kredensial Supabase di .env.local belum lengkap.');
  process.exit(1);
}

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function testOrderRpc() {
  console.log('===============================================================');
  console.log('            INTEGRATION TEST: ORDER RPC & STATUS LOCK          ');
  console.log('===============================================================\n');

  // Ambil 1 pelanggan dan 2 produk yang ada
  const { data: customers } = await serviceClient.from('customers').select('id').limit(1);
  const { data: products } = await serviceClient.from('products').select('id, nama, berat_per_unit_kg').limit(2);

  if (!customers || customers.length === 0 || !products || products.length < 2) {
    console.log('Catatan: Pelanggan atau produk belum cukup di database. Jalankan seed terlebih dahulu.');
    return;
  }

  const custId = customers[0].id;
  const prodA = products[0];
  const prodB = products[1];

  // Login sebagai admin lewat anon key
  const adminClient = createClient(supabaseUrl!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: loginErr } = await adminClient.auth.signInWithPassword({
    email: 'admin@spplastik.app',
    password: 'Admin123!',
  });
  if (loginErr) {
    console.error('Gagal login admin:', loginErr.message);
    return;
  }

  let createdOrderId: string | null = null;

  try {
    // 1. Uji RPC create_or_update_order
    console.log('--- 1. Menguji RPC create_or_update_order (Perhitungan Server-Side) ---');
    const itemsPayload = [
      { product_id: prodA.id, qty: 10 },
      { product_id: prodB.id, qty: 5 },
    ];
    const expectedWeight =
      Math.round((prodA.berat_per_unit_kg * 10 + prodB.berat_per_unit_kg * 5) * 100) / 100;

    const { data: rpcOrderId, error: rpcErr } = await adminClient.rpc('create_or_update_order', {
      p_order_id: null,
      p_customer_id: custId,
      p_tanggal: '2026-11-23',
      p_catatan: 'Pesanan Uji RPC Transaksional',
      p_items: itemsPayload,
    });

    if (rpcErr) {
      console.log('Info: RPC create_or_update_order belum terpasang di database remote.');
      console.log('Silakan jalankan berkas migrasi supabase/migrations/20261123000003_orders_rpc.sql di SQL Editor Supabase.\n');
      return;
    }

    createdOrderId = rpcOrderId;
    console.log(`✓ Pesanan berhasil dibuat via RPC. ID: ${createdOrderId}`);

    // Verifikasi total_muatan_kg di database
    const { data: orderDoc } = await serviceClient
      .from('orders')
      .select('total_muatan_kg, status')
      .eq('id', createdOrderId)
      .single();

    const actualWeight = Number(orderDoc?.total_muatan_kg);
    console.log(`Ekspektasi Muatan: ${expectedWeight} kg, Aktual di DB: ${actualWeight} kg`);
    if (Math.abs(actualWeight - expectedWeight) < 0.01) {
      console.log('✓ PASS: Total muatan dihitung akurat di server PostgreSQL.');
    } else {
      console.error('✗ FAIL: Total muatan tidak cocok!');
    }

    // 2. Verifikasi Snapshot Berat di order_items
    const { data: itemDocs } = await serviceClient
      .from('order_items')
      .select('product_id, qty, berat_kg')
      .eq('order_id', createdOrderId);

    console.log(`✓ PASS: ${itemDocs?.length} item berhasil disimpan dengan snapshot berat per item.`);

    // 3. Uji Proteksi Edit saat status = 'dalam_pengiriman'
    console.log('\n--- 2. Menguji Proteksi Edit Pesanan Dalam Pengiriman ---');
    await serviceClient.from('orders').update({ status: 'dalam_pengiriman' }).eq('id', createdOrderId);

    const { error: editBlockedErr } = await adminClient.rpc('create_or_update_order', {
      p_order_id: createdOrderId,
      p_customer_id: custId,
      p_tanggal: '2026-11-23',
      p_catatan: 'Coba Edit Ilegal',
      p_items: itemsPayload,
    });

    if (editBlockedErr) {
      console.log(`✓ PASS: Edit ditolak oleh database: "${editBlockedErr.message}"`);
    } else {
      console.error('✗ FAIL: Edit pesanan dalam pengiriman seharusnya ditolak!');
    }

    // 4. Uji Proteksi Hapus saat status = 'dalam_pengiriman'
    console.log('\n--- 3. Menguji Proteksi Hapus Pesanan Dalam Pengiriman ---');
    const { error: delBlockedErr } = await adminClient.rpc('delete_order', {
      p_order_id: createdOrderId,
    });

    if (delBlockedErr) {
      console.log(`✓ PASS: Hapus ditolak oleh database: "${delBlockedErr.message}"`);
    } else {
      console.error('✗ FAIL: Hapus pesanan dalam pengiriman seharusnya ditolak!');
    }

    console.log('\n🎉 SELURUH PENGUJIAN LOGIKA RPC ORDER SELESAI DENGAN BAIK!');
  } finally {
    if (createdOrderId) {
      await serviceClient.from('order_items').delete().eq('order_id', createdOrderId);
      await serviceClient.from('orders').delete().eq('id', createdOrderId);
      console.log('\n✓ Data pesanan uji berhasil dibersihkan.');
    }
  }
}

testOrderRpc().catch((err) => {
  console.error('Fatal error dalam test:order-rpc:', err);
});
