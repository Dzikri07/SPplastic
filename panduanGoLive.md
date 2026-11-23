# PANDUAN DEPLOYMENT & GO-LIVE PRODUKSI
## Sistem Informasi Distribusi Produk & Penentuan Rute Optimal (CVRP)
### CV SP Plastik (Saripan Plastik) - Cianjur

Dokumen ini merupakan panduan komprehensif langkah demi langkah untuk melakukan *deployment* aplikasi web ke platform **Vercel** dengan basis data & otentikasi **Supabase**, serta prosedur verifikasi pasca-peluncuran (*smoke test*) dan rencana pemulihan (*rollback plan*).

---

## 1. Checklist Pra-Deploy (Persiapan Sistem)

Sebelum menghubungkan repository ke Vercel, pastikan seluruh kriteria kesiapan berikut terpenuhi:

- [x] **Integritas Kode & Tipe**: `npm run build` berhasil tanpa *error* (`tsc -b && vite build` exit code 0).
- [x] **Pengujian Algoritma & Formula**: `npm test` lulus 100% (44 skenario Vitest lolos).
- [x] **Keamanan Row Level Security (RLS)**: `npm run test:rls` lulus 100% (seluruh peran terisolasi aman).
- [x] **Kerahasiaan Service Role**: Pastikan file `.env` dan `.env.local` tercantum di dalam `.gitignore`. Kunci rahasia `SUPABASE_SERVICE_ROLE_KEY` **TIDAK BOLEH** diunggah ke GitHub atau disetel di dashboard Vercel.
- [x] **Konfigurasi Single Page Application (SPA)**: File [vercel.json](file:///c:/dwiky/vercel.json) telah disiapkan dengan aturan *rewrite* semua rute ke `/index.html`:
  ```json
  {
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```
- [x] **Migrasi Database Supabase**: Pastikan seluruh migrasi SQL berikut telah dijalankan di SQL Editor dashboard Supabase:
  1. `20261123000001_init_schema.sql` (Skema awal 11 tabel, RLS, Storage proofs)
  2. `20261123000002_rls_fixes.sql` (Pengetatan RLS & trigger keamanan)
  3. `20261123000003_orders_rpc.sql` (RPC pembuatan pesanan transaksional)
  4. `20261123000004_driver_delivery_security.sql` (Folder storage driver & Unique constraint)
  5. `20261123000005_evaluation_and_realtime.sql` (Snapshot evaluasi & Publikasi Realtime)

---

## 2. Langkah-Langkah Deployment ke Vercel

1. **Unggah Proyek ke GitHub**:
   ```bash
   git add .
   git commit -m "feat: complete all 7 phases of SP Plastik distribution system"
   git push origin main
   ```

2. **Hubungkan Project di Vercel Dashboard**:
   - Kunjungi [Vercel Dashboard](https://vercel.com/dashboard) dan klik **Add New...** $\to$ **Project**.
   - Pilih repository GitHub Anda (`dwiky` atau repositori terkait).
   - Pastikan **Framework Preset** terdeteksi sebagai **Vite**.
   - **Root Directory**: `./` (default).

3. **Pengaturan Environment Variables di Vercel**:
   Di bagian **Environment Variables**, tambahkan **HANYA 2 VARIABEL PUBLIK** berikut:

   | Variable Key | Nilai (Value) | Keterangan |
   |---|---|---|
   | `VITE_SUPABASE_URL` | `https://ftmgtzpdmenhexcznebn.supabase.co` | URL API Supabase Anda |
   | `VITE_SUPABASE_ANON_KEY` | `sb_publishable_ZBh05ZhufxtCbdzd0TAXtw_Zo58vAmo` | Kunci anonim/publishable |

   > **PENTING**: JANGAN PERNAH menambahkan variabel `SUPABASE_SERVICE_ROLE_KEY` ke Vercel! Seluruh logika bisnis klien hanya membutuhkan anon key.

4. **Eksekusi Deployment**:
   - Klik tombol **Deploy**.
   - Tunggu proses *build* Vite selesai ($\pm 1$ menit).
   - Anda akan mendapatkan URL domain produksi, misalnya: `https://cv-sp-plastik.vercel.app`.

---

## 3. Penyelarasan Konfigurasi Supabase

Setelah domain Vercel diperoleh, selaraskan pengaturan Auth di Supabase:

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) $\to$ Pilih Project Anda.
2. Masuk ke menu **Authentication** $\to$ **URL Configuration**:
   - **Site URL**: Masukkan domain Vercel Anda (contoh: `https://cv-sp-plastik.vercel.app`).
   - **Redirect URLs**: Tambahkan `https://cv-sp-plastik.vercel.app/**` dan `http://localhost:5173/**` (untuk pengujian lokal).
3. Masuk ke menu **Authentication** $\to$ **Providers** $\to$ **Email**:
   - Pastikan **Enable Email provider** aktif (ON).
   - Pastikan **Confirm email** non-aktif (OFF) karena sistem menggunakan pemetaan email internal `@spplastik.app`.

---

## 4. Pengujian Pasca-Deploy (Smoke Testing di Produksi)

Lakukan verifikasi operasional langsung pada domain Vercel:

| No | Tahap Pengujian | Akun Penguji | Aksi & Verifikasi yang Diharapkan |
|:--:|---|:---:|---|
| 1 | **Login Tiga Peran** | Admin, Gudang, Driver | Pastikan setiap role dialihkan ke dashboard yang tepat (`/admin/dashboard`, `/gudang/dashboard`, `/driver/dashboard`). |
| 2 | **Manajemen Pesanan** | Admin | Buat 1 pesanan baru dengan 2 item produk. Pastikan total muatan ($kg$) terhitung otomatis di database. |
| 3 | **Konfirmasi Gudang** | Gudang | Buka menu *Konfirmasi Pesanan*, ubah status pesanan tadi menjadi `'siap'`. Pastikan indikator Realtime di Admin Dashboard langsung bertambah tanpa *refresh*. |
| 4 | **Penentuan Rute** | Admin | Buka menu *Penentuan Rute*, klik *Hitung Rute Optimal*. Pastikan garis rute warna-warni dan marker Leaflet tampil sempurna. Simpan rute. |
| 5 | **Alur Lapangan Driver** | Driver (HP Asli) | Buka domain Vercel dari *smartphone* Android/iOS driver: <br>• Uji tombol *Buka Google Maps* (harus membuka aplikasi Maps mode berkendara). <br>• Uji tombol *WhatsApp* (harus membuka chat WA ke toko). <br>• Buka konfirmasi: ambil foto nota dengan kamera HP (pastikan terkompresi $<200\text{ KB}$), bubuhkan tanda tangan di layar sentuh, lalu klik Simpan. |
| 6 | **Pemeriksaan Bukti** | Admin | Buka pesanan selesai, klik *Lihat Bukti Foto & TTD*. Pastikan gambar tampil via *Signed URL* privat. |
| 7 | **Evaluasi & Cetak PDF/Excel** | Admin | Buka menu *Evaluasi Rute*: periksa persentase hemat. Buka menu *Laporan*: unduh Surat Jalan PDF dan Rekapitulasi Excel (pastikan angka numerik dan formula `SUM` aktif). |

---

## 5. Rencana Pemulihan & Rollback (Rollback Plan)

Bila terjadi kendala kritis setelah proses *deploy*:

1. **Rollback Versi Frontend di Vercel**:
   - Buka tab **Deployments** di Vercel Dashboard.
   - Cari *commit/deployment* stabil sebelumnya.
   - Klik menu titik tiga ($\dots$) pada *deployment* tersebut $\to$ pilih **Promote to Production**. Vercel akan mengembalikan versi stabil dalam hitungan detik tanpa *downtime*.

2. **Rollback Skema Database**:
   - Supabase secara otomatis mencadangkan (*backup*) basis data secara berkala pada menu **Database** $\to$ **Backups**.
   - Bila ada data yang perlu dikoreksi, admin dapat menggunakan SQL Editor untuk menjalankan *query* penyesuaian.
