# Sistem Informasi Distribusi Produk dan Penentuan Rute Optimal
### CV SP Plastik (Saripan Plastik), Cianjur
Proyek Kerja Praktek Teknik Informatika — Optimasi Distribusi Menggunakan Algoritma **Clarke-Wright Saving Matrix (CVRP)**.

---

## 🚀 Tech Stack
- **Frontend**: Vite + React 19 + TypeScript, Tailwind CSS v4, React Router v7, Lucide Icons.
- **Backend & Database**: Supabase (PostgreSQL, Row Level Security, RPC Transaction, Storage Bucket).
- **Algoritma**: Pure TypeScript Clarke-Wright Saving Matrix + Distance Service (Haversine & Road Factor).
- **Testing**: Vitest untuk pengujian unit algoritma dan pembuktian matematis manual.
- **Deployment**: Vercel (SPA mode via `vercel.json`).

---

## 🛠️ Langkah Menjalankan Proyek

### 1. Salin dan Konfigurasi Environment Variables
Salin file `.env.example` ke `.env.local`:
```bash
cp .env.example .env.local
```
Isi konfigurasi di `.env.local` (file ini otomatis diabaikan oleh `.gitignore`):
```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<your-secret-service-role-key>
```
> **Catatan Keamanan**: Kunci rahasia `SUPABASE_SERVICE_ROLE_KEY` TIDAK diberi awalan `VITE_` dan hanya digunakan oleh skrip seed lokal (`scripts/seed-users.ts`), sehingga tidak pernah bocor ke browser ataupun Git repository.

---

### 2. Terapkan Migrasi Database & Seed Data ke Supabase
1. Buka [Supabase Dashboard](https://supabase.com/dashboard) dan pilih proyek Anda.
2. Buka menu **SQL Editor**.
3. Buat Query Baru, lalu salin seluruh isi berkas:
   - `supabase/migrations/20261123_init_schema.sql` (Membuat tabel, fungsi RLS `current_user_role()`, trigger penjaga gudang, trigger otomatisasi status pesanan saat driver konfirmasi, RPC `save_route`, dan bucket privat `proofs`).
   - Klik **Run**.
4. Buat Query Baru lagi, lalu salin seluruh isi berkas:
   - `supabase/seed.sql` (Memasukkan pengaturan depot CV Saripan Plastik Haurwangi `-6.8272177, 107.2916367`, 3 armada pick-up berkapasitas 1000 kg, 8 master produk plastik, dan 10 toko dummy di Cianjur).
   - Klik **Run**.

---

### 3. Pengaturan Autentikasi Supabase
Sistem menggunakan pemetaan login `username` ke email internal `<username>@spplastik.app`:
1. Di Dashboard Supabase, buka menu **Authentication** -> **Providers** -> **Email**.
2. **Nonaktifkan (uncheck)** opsi **"Confirm email"** agar pengguna dapat langsung aktif dan login tanpa menunggu verifikasi email masuk.

---

### 4. Jalankan Skrip Seed Pengguna (Admin, Gudang, Driver)
Jalankan skrip berikut di terminal lokal untuk mendaftarkan akun default:
```bash
npm run seed:users
```

#### Akun Pengguna Default (Seed)
| Peran (Role) | Username | Email Internal Terpetakan | Hak Akses Utama |
|---|---|---|---|
| **Administrator** | `admin` | `admin@spplastik.app` | CRUD Master (Pelanggan, Produk, Kendaraan, Depot), Manajemen Pesanan, Penentuan Rute Saving Matrix, Evaluasi Konvensional, Ekspor Laporan |
| **Tim Gudang** | `gudang` | `gudang@spplastik.app` | Read-only stok produk, verifikasi kesiapan pesanan (`siap` / `belum_siap`) |
| **Driver** | `driver` | `driver@spplastik.app` | Membaca rute miliknya, navigasi titik toko, konfirmasi penerimaan + kompres foto & tanda tangan |

> **Keamanan Password Akun Seed:**
> Password default awal untuk keperluan development diatur melalui berkas `scripts/seed-users.ts`. Untuk mengubah password akun pengguna di lingkungan produksi:
> 1. Buka [Supabase Dashboard](https://supabase.com/dashboard) -> pilih project -> menu **Authentication** -> **Users**.
> 2. Klik baris pengguna yang ingin diubah (misal: `admin@spplastik.app`), lalu pilih opsi **Reset Password** / **Send Password Recovery**, atau perbarui langsung kata sandi melalui skrip `scripts/seed-users.ts` sebelum menjalankan *seeding*.

---

### 5. Menjalankan Pengujian Unit (Vitest)
Untuk memverifikasi keakuratan algoritma Saving Matrix, constraint kapasitas, penolakan node interior, dan validasi hitungan matematis Bab 4:
```bash
npm test
```

---

### 6. Menjalankan Server Pengembangan Lokal
```bash
npm run dev
```
Akses aplikasi melalui browser di `http://localhost:5173`.

---

### 7. Deployment ke Vercel
1. Hubungkan repository GitHub proyek ini ke Vercel.
2. Tambahkan 2 Environment Variables di dashboard Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Konfigurasi rewrite SPA telah ditangani secara otomatis oleh berkas `vercel.json`.
