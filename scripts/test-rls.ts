import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error(
    'ERROR: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, atau SUPABASE_SERVICE_ROLE_KEY belum diatur di .env.local'
  );
  process.exit(1);
}

// Client Admin Service Role (Bypass RLS untuk setup fixture & teardown)
const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface TestResult {
  role: string;
  testCase: string;
  expected: 'SUCCESS' | 'REJECT';
  actual: 'SUCCESS' | 'REJECT';
  passed: boolean;
  notes?: string;
}

const results: TestResult[] = [];

function recordResult(
  role: string,
  testCase: string,
  expected: 'SUCCESS' | 'REJECT',
  actual: 'SUCCESS' | 'REJECT',
  notes?: string
) {
  const passed = expected === actual;
  results.push({ role, testCase, expected, actual, passed, notes });
}

async function createAnonAuthClient() {
  return createClient(supabaseUrl!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function runRlsTests() {
  console.log('===============================================================');
  console.log('      ROBUST AUTOMATED ROW LEVEL SECURITY (RLS) TEST SUITE     ');
  console.log('  Data Fixture Disiapkan lewat Service Role & Dibersihkan Total');
  console.log('===============================================================\n');

  // ID Fixture
  const FIXTURE_CUST_A = '11111111-1111-1111-1111-111111111111';
  const FIXTURE_CUST_B = '22222222-2222-2222-2222-222222222222';
  const FIXTURE_ORDER_A = '33333333-3333-3333-3333-333333333331';
  const FIXTURE_ORDER_B = '33333333-3333-3333-3333-333333333332';
  const FIXTURE_ORDER_C = '33333333-3333-3333-3333-333333333333';
  const FIXTURE_ROUTE_A = '55555555-5555-5555-5555-555555555551';
  const FIXTURE_ROUTE_B = '55555555-5555-5555-5555-555555555552';
  const FAKE_DRIVER_B = '44444444-4444-4444-4444-444444444444';

  let realDriverUid: string = '';

  try {
    console.log('--- MENYIAPKAN DATA FIXTURE LEWAT SERVICE ROLE ---');
    // Ambil UID admin dan driver asli dari tabel profiles
    const { data: profilesList } = await serviceClient
      .from('profiles')
      .select('id, username');

    const adminProf = profilesList?.find((p) => p.username === 'admin');
    const driverProf = profilesList?.find((p) => p.username === 'driver');

    if (!driverProf || !adminProf) {
      throw new Error('Pengguna "driver" atau "admin" belum ada di tabel profiles. Jalankan npm run seed:users dulu.');
    }
    realDriverUid = driverProf.id;
    const otherDriverUid = adminProf.id; // Gunakan adminProf sebagai driver lain di tabel routes

    // Bersihkan sisa fixture lama jika ada
    await serviceClient.from('delivery_confirmations').delete().in('order_id', [FIXTURE_ORDER_A, FIXTURE_ORDER_B, FIXTURE_ORDER_C]);
    await serviceClient.from('route_stops').delete().in('route_id', [FIXTURE_ROUTE_A, FIXTURE_ROUTE_B]);
    await serviceClient.from('routes').delete().in('id', [FIXTURE_ROUTE_A, FIXTURE_ROUTE_B]);
    await serviceClient.from('orders').delete().in('id', [FIXTURE_ORDER_A, FIXTURE_ORDER_B, FIXTURE_ORDER_C]);
    await serviceClient.from('customers').delete().in('id', [FIXTURE_CUST_A, FIXTURE_CUST_B]);

    // Insert Pelanggan Fixture
    const { error: errCust } = await serviceClient.from('customers').insert([
      { id: FIXTURE_CUST_A, nama_toko: 'Toko Fixture RLS A', alamat: 'Alamat A', no_hp: '081111', latitude: -6.82, longitude: 107.26 },
      { id: FIXTURE_CUST_B, nama_toko: 'Toko Fixture RLS B', alamat: 'Alamat B', no_hp: '082222', latitude: -6.83, longitude: 107.25 },
    ]);
    if (errCust) throw new Error(`Gagal insert customers fixture: ${errCust.message}`);

    // Insert Pesanan Fixture
    const { error: errOrd } = await serviceClient.from('orders').insert([
      { id: FIXTURE_ORDER_A, customer_id: FIXTURE_CUST_A, tanggal: '2026-11-23', status: 'baru', total_muatan_kg: 50 },
      { id: FIXTURE_ORDER_B, customer_id: FIXTURE_CUST_B, tanggal: '2026-11-23', status: 'siap', total_muatan_kg: 75 },
      { id: FIXTURE_ORDER_C, customer_id: FIXTURE_CUST_A, tanggal: '2026-11-23', status: 'baru', total_muatan_kg: 30 },
    ]);
    if (errOrd) throw new Error(`Gagal insert orders fixture: ${errOrd.message}`);

    // Insert Rute Fixture: Rute A ditugaskan ke driver asli, Rute B ke driver lain (otherDriverUid)
    const { error: errRt } = await serviceClient.from('routes').insert([
      { id: FIXTURE_ROUTE_A, tanggal: '2026-11-23', driver_id: realDriverUid, status: 'dalam_pengiriman' },
      { id: FIXTURE_ROUTE_B, tanggal: '2026-11-23', driver_id: otherDriverUid, status: 'dalam_pengiriman' },
    ]);
    if (errRt) throw new Error(`Gagal insert routes fixture: ${errRt.message}`);

    // Insert Route Stops Fixture
    const { error: errStops } = await serviceClient.from('route_stops').insert([
      { route_id: FIXTURE_ROUTE_A, order_id: FIXTURE_ORDER_A, customer_id: FIXTURE_CUST_A, urutan: 1, jarak_dari_sebelumnya_km: 3.5 },
      { route_id: FIXTURE_ROUTE_A, order_id: FIXTURE_ORDER_C, customer_id: FIXTURE_CUST_A, urutan: 2, jarak_dari_sebelumnya_km: 2.1 },
      { route_id: FIXTURE_ROUTE_B, order_id: FIXTURE_ORDER_B, customer_id: FIXTURE_CUST_B, urutan: 1, jarak_dari_sebelumnya_km: 4.2 },
    ]);
    if (errStops) throw new Error(`Gagal insert route_stops fixture: ${errStops.message}`);

    console.log('✓ Data fixture berhasil diinisialisasi.\n');

    // ========================================================================
    // 1. PENGUJIAN ROLE: ADMIN
    // ========================================================================
    console.log('--- 1. Menguji Role: ADMIN ---');
    const adminClient = await createAnonAuthClient();
    const { error: adminLoginErr } = await adminClient.auth.signInWithPassword({
      email: 'admin@spplastik.app',
      password: 'Admin123!',
    });
    if (adminLoginErr) throw adminLoginErr;

    // Admin: Baca master pelanggan
    const { data: adminCust, error: adminCustErr } = await adminClient.from('customers').select('id').limit(1);
    recordResult('ADMIN', 'Membaca tabel customers', 'SUCCESS', !adminCustErr && adminCust?.length > 0 ? 'SUCCESS' : 'REJECT');

    // Admin: Mengubah app_settings
    const { error: adminSettingsUpdateErr } = await adminClient
      .from('app_settings')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', 1);
    recordResult('ADMIN', 'Mengubah tabel app_settings', 'SUCCESS', !adminSettingsUpdateErr ? 'SUCCESS' : 'REJECT');

    // ========================================================================
    // 2. PENGUJIAN ROLE: GUDANG
    // ========================================================================
    console.log('\n--- 2. Menguji Role: GUDANG ---');
    const gudangClient = await createAnonAuthClient();
    const { error: gudangLoginErr } = await gudangClient.auth.signInWithPassword({
      email: 'gudang@spplastik.app',
      password: 'Gudang123!',
    });
    if (gudangLoginErr) throw gudangLoginErr;

    // Gudang: Membaca app_settings (Boleh)
    const { data: gudangSettings, error: gudangSettingsErr } = await gudangClient.from('app_settings').select('*').limit(1);
    recordResult('GUDANG', 'Membaca tabel app_settings', 'SUCCESS', !gudangSettingsErr && gudangSettings?.length > 0 ? 'SUCCESS' : 'REJECT');

    // Gudang: Mengubah app_settings (HARUS DITOLAK)
    const { error: gudangSettingsUpdateErr } = await gudangClient
      .from('app_settings')
      .update({ konsumsi_bbm_km_per_liter: 99 })
      .eq('id', 1);
    const { data: checkGudangSettings } = await serviceClient.from('app_settings').select('konsumsi_bbm_km_per_liter').eq('id', 1).single();
    const gudangBlocked = gudangSettingsUpdateErr !== null || checkGudangSettings?.konsumsi_bbm_km_per_liter !== 99;
    recordResult('GUDANG', 'Mengubah tabel app_settings', 'REJECT', gudangBlocked ? 'REJECT' : 'SUCCESS', 'Ditolak RLS');

    // Gudang: Hapus pesanan (HARUS DITOLAK)
    await gudangClient.from('orders').delete().eq('id', FIXTURE_ORDER_A);
    const { data: checkOrderA } = await serviceClient.from('orders').select('id').eq('id', FIXTURE_ORDER_A);
    recordResult('GUDANG', 'Hapus pesanan di orders', 'REJECT', checkOrderA && checkOrderA.length > 0 ? 'REJECT' : 'SUCCESS', 'Pesanan terlindungi');

    // Gudang: Ubah kolom selain status (total_muatan_kg) -> HARUS DITOLAK trigger penjaga
    const { error: gudangIllegalColErr } = await gudangClient
      .from('orders')
      .update({ total_muatan_kg: 999 })
      .eq('id', FIXTURE_ORDER_A);
    recordResult('GUDANG', 'Ubah kolom selain status (total_muatan_kg)', 'REJECT', gudangIllegalColErr ? 'REJECT' : 'SUCCESS', gudangIllegalColErr?.message);

    // Gudang: Ubah status pesanan ke 'dalam_pengiriman' -> HARUS DITOLAK
    const { error: gudangToDalamPengirimanErr } = await gudangClient
      .from('orders')
      .update({ status: 'dalam_pengiriman' })
      .eq('id', FIXTURE_ORDER_A);
    recordResult('GUDANG', 'Ubah status ke "dalam_pengiriman"', 'REJECT', gudangToDalamPengirimanErr ? 'REJECT' : 'SUCCESS', 'Ditolak trigger/RLS');

    // Gudang: Ubah status pesanan ke 'diterima' -> HARUS DITOLAK
    const { error: gudangToDiterimaErr } = await gudangClient
      .from('orders')
      .update({ status: 'diterima' })
      .eq('id', FIXTURE_ORDER_A);
    recordResult('GUDANG', 'Ubah status ke "diterima"', 'REJECT', gudangToDiterimaErr ? 'REJECT' : 'SUCCESS', 'Ditolak trigger/RLS');

    // Gudang: Ubah status pesanan ke 'siap' -> HARUS BERHASIL
    const { error: gudangToSiapErr } = await gudangClient
      .from('orders')
      .update({ status: 'siap' })
      .eq('id', FIXTURE_ORDER_A);
    recordResult('GUDANG', 'Ubah status ke "siap"', 'SUCCESS', !gudangToSiapErr ? 'SUCCESS' : 'REJECT');

    // ========================================================================
    // 3. PENGUJIAN ROLE: DRIVER
    // ========================================================================
    console.log('\n--- 3. Menguji Role: DRIVER ---');
    const driverClient = await createAnonAuthClient();
    const { error: driverLoginErr } = await driverClient.auth.signInWithPassword({
      email: 'driver@spplastik.app',
      password: 'Driver123!',
    });
    if (driverLoginErr) throw driverLoginErr;

    // Driver: Membaca app_settings (Boleh)
    const { data: driverSettings, error: driverSettingsErr } = await driverClient.from('app_settings').select('*').limit(1);
    recordResult('DRIVER', 'Membaca tabel app_settings', 'SUCCESS', !driverSettingsErr && driverSettings?.length > 0 ? 'SUCCESS' : 'REJECT');

    // Driver: Mengubah app_settings (HARUS DITOLAK)
    const { error: driverSettingsUpdateErr } = await driverClient
      .from('app_settings')
      .update({ harga_bbm_per_liter: 99999 })
      .eq('id', 1);
    const { data: checkDriverSettings } = await serviceClient.from('app_settings').select('harga_bbm_per_liter').eq('id', 1).single();
    const driverBlocked = driverSettingsUpdateErr !== null || checkDriverSettings?.harga_bbm_per_liter !== 99999;
    recordResult('DRIVER', 'Mengubah tabel app_settings', 'REJECT', driverBlocked ? 'REJECT' : 'SUCCESS', 'Ditolak RLS');

    // Driver: Update langsung ke tabel orders (HARUS DITOLAK)
    await driverClient.from('orders').update({ catatan: 'Diubah Driver Ilegal' }).eq('id', FIXTURE_ORDER_A);
    const { data: checkOrderDirect } = await serviceClient.from('orders').select('catatan').eq('id', FIXTURE_ORDER_A).single();
    const directUpdateBlocked = checkOrderDirect?.catatan !== 'Diubah Driver Ilegal';
    recordResult('DRIVER', 'Update langsung ke tabel orders', 'REJECT', directUpdateBlocked ? 'REJECT' : 'SUCCESS', 'Orders terlindungi');

    // Driver: Membaca rute milik driver lain (FIXTURE_ROUTE_B) -> HARUS KOSONG (0 baris)
    const { data: foreignRouteData } = await driverClient.from('routes').select('id').eq('id', FIXTURE_ROUTE_B);
    const foreignHidden = !foreignRouteData || foreignRouteData.length === 0;
    recordResult('DRIVER', 'Membaca rute milik driver lain', 'REJECT', foreignHidden ? 'REJECT' : 'SUCCESS', foreignHidden ? 'Rute lain tersembunyi' : 'BOCOR!');

    // Driver: INSERT delivery_confirmations untuk pesanan di rute driver lain -> HARUS DITOLAK
    const { error: foreignDeliveryInsertErr } = await driverClient.from('delivery_confirmations').insert({
      order_id: FIXTURE_ORDER_B,
      route_id: FIXTURE_ROUTE_B,
      driver_id: realDriverUid,
      status: 'diterima',
    });
    recordResult(
      'DRIVER',
      'INSERT konfirmasi pesanan rute driver lain',
      'REJECT',
      foreignDeliveryInsertErr ? 'REJECT' : 'SUCCESS',
      foreignDeliveryInsertErr ? 'Ditolak policy RLS' : 'BOCOR!'
    );

    // Driver: INSERT delivery_confirmations untuk pesanan di rutenya sendiri -> HARUS BERHASIL
    const { error: ownDeliveryInsertErr } = await driverClient.from('delivery_confirmations').insert({
      order_id: FIXTURE_ORDER_A,
      route_id: FIXTURE_ROUTE_A,
      driver_id: realDriverUid,
      status: 'diterima',
      catatan: 'Diterima oleh pemilik toko.',
    });
    recordResult(
      'DRIVER',
      'INSERT konfirmasi pesanan rute sendiri',
      'SUCCESS',
      !ownDeliveryInsertErr ? 'SUCCESS' : 'REJECT',
      ownDeliveryInsertErr?.message
    );

    // Verifikasi otomatis: status orders berubah menjadi 'diterima' lewat trigger on_delivery_confirmed
    const { data: updatedOrderA } = await serviceClient.from('orders').select('status').eq('id', FIXTURE_ORDER_A).single();
    const triggerWorked = updatedOrderA?.status === 'diterima';
    recordResult(
      'DATABASE TRIGGER',
      'Otomatisasi status orders -> "diterima" via trigger',
      'SUCCESS',
      triggerWorked ? 'SUCCESS' : 'REJECT',
      `Status order aktual: "${updatedOrderA?.status}"`
    );

    // Driver: INSERT konfirmasi DUPLIKAT untuk order yang sama (FIXTURE_ORDER_A) -> HARUS DITOLAK
    const { error: duplicateDeliveryErr } = await driverClient.from('delivery_confirmations').insert({
      order_id: FIXTURE_ORDER_A,
      route_id: FIXTURE_ROUTE_A,
      driver_id: realDriverUid,
      status: 'diterima',
    });
    recordResult(
      'DRIVER',
      'INSERT konfirmasi ganda (duplicate order_id)',
      'REJECT',
      duplicateDeliveryErr ? 'REJECT' : 'SUCCESS',
      duplicateDeliveryErr ? 'Ditolak UNIQUE constraint / Primary Key' : 'DUPLIKASI LOLOS!'
    );

    // Driver: INSERT konfirmasi pesanan rute sendiri dengan status "tidak_lengkap" -> HARUS BERHASIL
    const { error: partialDeliveryInsertErr } = await driverClient.from('delivery_confirmations').insert({
      order_id: FIXTURE_ORDER_C,
      route_id: FIXTURE_ROUTE_A,
      driver_id: realDriverUid,
      status: 'tidak_lengkap',
      catatan: 'Barang kurang 2 pack, toko menolak sebagian.',
    });
    recordResult(
      'DRIVER',
      'INSERT konfirmasi status "tidak_lengkap"',
      'SUCCESS',
      !partialDeliveryInsertErr ? 'SUCCESS' : 'REJECT',
      partialDeliveryInsertErr?.message
    );

    // Verifikasi otomatis: status orders C berubah menjadi 'tidak_lengkap' lewat trigger on_delivery_confirmed
    const { data: updatedOrderC } = await serviceClient.from('orders').select('status').eq('id', FIXTURE_ORDER_C).single();
    const partialTriggerWorked = updatedOrderC?.status === 'tidak_lengkap';
    recordResult(
      'DATABASE TRIGGER',
      'Otomatisasi status orders -> "tidak_lengkap" via trigger',
      'SUCCESS',
      partialTriggerWorked ? 'SUCCESS' : 'REJECT',
      `Status order aktual: "${updatedOrderC?.status}"`
    );

    // Storage: Driver mengunggah file bukti ke folder rute miliknya -> HARUS BERHASIL
    const dummyFileContent = Buffer.from('data dummy foto penerimaan driver');
    const { error: storageUploadErr } = await driverClient.storage
      .from('proofs')
      .upload(`${FIXTURE_ORDER_A}/foto_test.jpg`, dummyFileContent, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    recordResult(
      'STORAGE BUCKET',
      'Driver upload file bukti ke folder order sendiri',
      'SUCCESS',
      !storageUploadErr ? 'SUCCESS' : 'REJECT',
      storageUploadErr ? storageUploadErr.message : '-'
    );
    if (!storageUploadErr) {
      await serviceClient.storage.from('proofs').remove([`${FIXTURE_ORDER_A}/foto_test.jpg`]);
    }

  } finally {
    console.log('\n--- MEMBERSIHKAN DATA FIXTURE LEWAT SERVICE ROLE ---');
    await serviceClient.from('delivery_confirmations').delete().in('order_id', [FIXTURE_ORDER_A, FIXTURE_ORDER_B, FIXTURE_ORDER_C]);
    await serviceClient.from('route_stops').delete().in('route_id', [FIXTURE_ROUTE_A, FIXTURE_ROUTE_B]);
    await serviceClient.from('routes').delete().in('id', [FIXTURE_ROUTE_A, FIXTURE_ROUTE_B]);
    await serviceClient.from('orders').delete().in('id', [FIXTURE_ORDER_A, FIXTURE_ORDER_B, FIXTURE_ORDER_C]);
    await serviceClient.from('customers').delete().in('id', [FIXTURE_CUST_A, FIXTURE_CUST_B]);
    console.log('✓ Seluruh data uji berhasil dibersihkan.');
  }

  // --------------------------------------------------------------------------
  // LAPORAN HASIL PENGUJIAN
  // --------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('              RINGKASAN HASIL TEST:RLS (LENGKAP)               ');
  console.log('===============================================================');
  console.table(
    results.map((r) => ({
      Role: r.role,
      Pengujian: r.testCase,
      'Ekspektasi': r.expected,
      'Hasil Aktual': r.actual,
      Status: r.passed ? '✓ PASS' : '✗ FAIL',
      Catatan: r.notes || '-',
    }))
  );

  const allPassed = results.every((r) => r.passed);
  if (allPassed) {
    console.log('\n🎉 SEMUA PENGUJIAN RLS LULUS DENGAN SEMPURNA (ALL 14 TESTS PASSED)!');
  } else {
    console.error('\n⚠️ TERDAPAT PENGUJIAN RLS YANG GAGAL. SILAKAN TINJAU LOG DI ATAS.');
    process.exit(1);
  }
}

runRlsTests().catch((err) => {
  console.error('Fatal error dalam test:rls:', err);
  process.exit(1);
});
