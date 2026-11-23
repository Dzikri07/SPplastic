# DOKUMENTASI PENGUJIAN SISTEM (TESTING REPORT)
## Sistem Informasi Distribusi Produk dan Penentuan Rute Optimal (CVRP)
### CV SP Plastik (Saripan Plastik), Haurwangi - Cianjur
**Proyek Kerja Praktek Teknik Informatika**  
**Tanggal Pengujian**: 23 November 2026  
**Environment**: Node.js + Vitest v5.1.1 + Supabase PostgreSQL (Live RLS) + Vite TypeScript  

---

## 📋 Daftar Isi
1. [Ringkasan Eksekutif Pengujian](#1-ringkasan-eksekutif-pengujian)
2. [Pengujian Unit Algoritma & Logika (Vitest)](#2-pengujian-unit-algoritma--logika-vitest)
   - 2.1. Uji Distance Service & Formula Haversine
   - 2.2. Uji Inti Algoritma Clarke-Wright Saving Matrix
   - 2.3. Uji Validasi Hitungan Manual 3 Pelanggan (Bahan Bab 4)
   - 2.4. Uji Logika Validasi & Batasan Pesanan
   - 2.5. Uji Penyesuaian Rute & Metrik Biaya (Fase 5)
   - 2.6. Uji Utilitas Driver, Deep-Link Maps, Format WA, & Kompresi Foto (Fase 6)
3. [Pengujian Keamanan Database & Row Level Security (RLS)](#3-pengujian-keamanan-database--row-level-security-rls)
   - 3.1. Metodologi Pengujian Hak Akses Nyata (Anon Key)
   - 3.2. Matriks Pengujian Hak Akses per Peran (Admin, Gudang, Driver)
   - 3.3. Uji Keandalan Database Trigger Penjaga & Otomatisasi Status
4. [Pengujian Kompilasi & Build Produksi](#4-pengujian-kompilasi--build-produksi)
5. [Instruksi Menjalankan Pengujian Mandiri](#5-instruksi-menjalankan-pengujian-mandiri)

---

## 1. Ringkasan Eksekutif Pengujian

Pengujian perangkat lunak dilakukan secara komprehensif pada lapisan **algoritma inti**, **keamanan basis data (RLS & Triggers)**, serta **integritas tipe dan antarmuka pengguna**:

| Kategori Pengujian | Target Cakupan | Jumlah Uji | Status |
|---|---|:---:|:---:|
| **Unit Testing (Vitest)** | Algoritma Clarke-Wright, Haversine, CVRP Constraints, Bab 4 Math Proof, Rute, Utilitas Driver & Foto | 34 Skenario | **100% LULUS (PASS)** |
| **Security & RLS Testing** | Hak Akses Role (Admin, Gudang, Driver), RLS Policy, Trigger Penjaga, Storage Bucket | 20 Skenario | **100% LULUS (PASS)** |
| **Production Build Test** | TypeScript Typecheck (`tsc -b`) & Vite Bundler Packaging | 1 Suite | **100% LULUS (PASS)** |
| **Total Pengujian** | Seluruh Komponen Sistem Fase 1 s/d Fase 6 | **55 Uji** | **100% LULUS (PASS)** |

---

## 2. Pengujian Unit Algoritma & Logika (Vitest)

Pengujian unit dijalankan menggunakan runner **Vitest** dengan waktu eksekusi super-cepat (< 400 ms). Seluruh logika algoritma berjalan murni tanpa dependensi browser atau framework UI (*pure functions*).

### 2.1. Uji Distance Service & Formula Haversine (`distance.test.ts`)
Menguji keakuratan perhitungan jarak lingkaran besar (*great-circle distance*) antar koordinat geografis di wilayah Kabupaten Cianjur.

| No | Kasus Uji | Deskripsi & Parameter | Ekspektasi | Hasil Aktual | Status |
|:--:|---|---|---|---|:---:|
| 1 | Jarak Titik Nol | Asal dan tujuan pada koordinat yang sama (Depot ke Depot) | Jarak = 0.00 km | 0.00 km | **PASS** |
| 2 | Akurasi Haversine | Jarak Haurwangi (-6.827218, 107.291637) ke Cianjur Kota (-6.8200, 107.1400) | $16 < d < 18\text{ km}$ | $16.76\text{ km}$ | **PASS** |
| 3 | Faktor Koreksi Jalan | Mengalikan jarak garis lurus dengan faktor jalan $1.3\times$ | Jarak jalan darat terukur akurat | Presisi $10^{-4}$ | **PASS** |
| 4 | Presisi Desimal | Pengaturan pembulatan kelas `HaversineDistanceService` | Maksimal 2 angka desimal | Lolos | **PASS** |

### 2.2. Uji Inti Algoritma Clarke-Wright Saving Matrix (`savingMatrix.test.ts`)
Menguji ketepatan matematis algoritma Saving Matrix Capacitated Vehicle Routing Problem (CVRP).

| No | Kasus Uji | Parameter Uji | Ekspektasi Algoritma | Hasil Aktual | Status |
|:--:|---|---|---|---|:---:|
| 1 | Matriks Jarak Simetris | Dataset 5 pelanggan + 1 depot (6 node) | Matriks simetris $6 \times 6$, $d(i, j) = d(j, i)$, diagonal 0 | Simetris lengkap | **PASS** |
| 2 | Pengurutan Saving | Seluruh pasangan $S(i, j) = d(0, i) + d(0, j) - d(i, j)$ | Diurutkan menurun (*descending*), nilai $\le 0$ dibuang | Terurut menurun | **PASS** |
| 3 | Batasan Kapasitas ($Q$) | 5 Toko di Cianjur (total muatan 800 kg), Armada $Q = 500\text{ kg}$ | Terbentuk minimal 2 rute, setiap rute $\le 500\text{ kg}$, total muatan tetap 800 kg | 2 Rute valid ($\le 500$) | **PASS** |
| 4 | Penolakan Muatan Berlebih | Pasangan saving positif tetapi demand gabungan $300 + 300 = 600 > 500$ | Dicatat `REJECTED_CAPACITY`, kedua toko tetap berada di rute terpisah | Rute terpisah | **PASS** |
| 5 | Aturan Ujung Rute (*Interior*) | Penggabungan toko yang posisinya di tengah rute (bukan eksterior) | Dicatat `REJECTED_NOT_EXTERIOR`, struktur rantai rute tidak dirusak | Rantai terlindungi | **PASS** |
| 6 | Kasus 1 Pelanggan | Hanya 1 toko pemesan | Menghasilkan rute tunggal $D \to C_1 \to D$ ($2 \times d_0$) | 1 Rute bolak-balik | **PASS** |
| 7 | Kasus Data Kosong | Array pelanggan kosong | Array rute dan log kosong tanpa melempar exception | Hasil aman `[]` | **PASS** |
| 8 | Error Demand $> Q$ | Demand satu toko ($650\text{ kg}$) melebihi kapasitas kendaraan ($500\text{ kg}$) | Melempar error deskriptif "melebihi kapasitas kendaraan" | Exception tertangkap | **PASS** |
| 9 | Error Kapasitas $\le 0$ | Input kapasitas kendaraan $Q = 0$ | Melempar error "Kapasitas kendaraan harus lebih besar dari 0" | Exception tertangkap | **PASS** |

### 2.3. Uji Validasi Hitungan Manual 3 Pelanggan (`manualValidation.test.ts`)
> **Bahan Laporan Bab 4 Skripsi / Kerja Praktek:**
Pengujian ini membuktikan bahwa algoritma sistem menghasilkan nilai yang **100% konsisten** dengan hitungan tangan manual di lembar kerja Excel, dihitung dari nilai pecahan asli (*raw floating point*) untuk menghindari akumulasi kesalahan pembulatan (*intermediate rounding error*).

- **Depot ($D$)**: CV SP Plastik Haurwangi ($-6.827218, 107.291637$)
- **$C_1$**: Toko Ciranjang ($-6.8200, 107.2600$, muatan: $150\text{ kg}$)
- **$C_2$**: Toko Bojongpicung ($-6.8600, 107.2500$, muatan: $180\text{ kg}$)
- **$C_3$**: Toko Cianjur Kota ($-6.8200, 107.1400$, muatan: $120\text{ kg}$)
- **Kapasitas Armada ($Q$)**: $400\text{ kg}$

**Matriks Jarak ($km$):**
$$d(D, C_1) = 3.58\text{ km}, \quad d(D, C_2) = 5.87\text{ km}, \quad d(D, C_3) = 16.76\text{ km}$$
$$d(C_1, C_2) = 4.58\text{ km}, \quad d(C_1, C_3) = 13.25\text{ km}, \quad d(C_2, C_3) = 12.93\text{ km}$$

**Urutan Saving yang Dihasilkan Sistem:**
1. $S(C_2, C_3) = 5.86988\dots + 16.76105\dots - 12.93608\dots = \mathbf{9.69\text{ km}}$
2. $S(C_1, C_3) = 3.58398\dots + 16.76105\dots - 13.24897\dots = \mathbf{7.10\text{ km}}$
3. $S(C_1, C_2) = 3.58398\dots + 5.86988\dots - 4.58013\dots = \mathbf{4.87\text{ km}}$

**Langkah Penggabungan (*Trace Merging*):**
- Pasangan $(C_2, C_3)$: Muatan $180 + 120 = 300\text{ kg} \le 400\text{ kg} \implies \mathbf{MERGED} \to [C_2, C_3]$
- Pasangan $(C_1, C_3)$: Muatan $150 + 300 = 450\text{ kg} > 400\text{ kg} \implies \mathbf{REJECTED\_CAPACITY}$
- Pasangan $(C_1, C_2)$: Muatan $150 + 300 = 450\text{ kg} > 400\text{ kg} \implies \mathbf{REJECTED\_CAPACITY}$

**Rute Akhir yang Dihasilkan:**
- **Armada 1**: $D \to C_1 \to D$ | Jarak: **$7.17\text{ km}$** | Muatan: **$150\text{ kg}$**
- **Armada 2**: $D \to C_2 \to C_3 \to D$ | Jarak: **$35.56\text{ km}$** | Muatan: **$300\text{ kg}$**
- **Status Pengujian**: **PASS (Validasi 100% Identik)**.

### 2.4. Uji Logika Validasi & Batasan Pesanan (`orderLogic.test.ts`)
Menguji kepatuhan aturan bisnis pesanan distribusi:
1. Perhitungan beban akumulatif dari $\sum (\text{qty} \times \text{berat\_per\_unit}) = 45.0\text{ kg}$ $\to$ **PASS**
2. Penegakan status pesanan terkunci (*locked*): status `dalam_pengiriman`, `diterima`, dan `tidak_lengkap` dilarang untuk diedit/dihapus $\to$ **PASS**
3. Deteksi peringatan batas kapasitas armada terbesar ($1000\text{ kg}$) $\to$ **PASS**

### 2.5. Uji Penyesuaian Rute & Metrik Biaya (`routeAdjustment.test.ts`)
Menguji fungsi kalkulasi metrik rute, manipulasi stop, dan batasan kapasitas:
1. Rekalkulasi segmen jarak, jarak balik depot, durasi tempuh (menit), dan biaya BBM (Rp) $\to$ **PASS**
2. Penyesuaian urutan stop (*Move Up / Move Down*) dan penataan ulang segmen jarak $\to$ **PASS**
3. Penanganan rute kosong (*safe 0 metrics*) saat seluruh stop dipindahkan $\to$ **PASS**
4. Validasi batasan kapasitas kendaraan ($Q$) saat simulasi transfer stop antar rute $\to$ **PASS**

### 2.6. Uji Utilitas Driver, Deep-Link Maps, Format WA, & Kompresi Foto (`driverUtils.test.ts`)
Menguji fungsi utilitas khusus alur lapangan driver:
1. **Google Maps Navigation Generator**: Menghasilkan deep-link dengan mode berkendara (`&travelmode=driving`) dan koordinat di-encode aman $\to$ **PASS**
2. **Normalisasi Nomor WhatsApp**:
   - Format lokal `081234567890` diubah menjadi internasional `6281234567890` $\to$ **PASS**
   - Format bersimbol `(0812) 3456-7890` dan spasi dinormalkan $\to$ **PASS**
   - Awalan `+62` dan awalan `8xxx` diubah ke format baku `628xxx` $\to$ **PASS**
   - Pembuatan link `https://wa.me/62...` dengan parameter pesan template $\to$ **PASS**
3. **Kompresi Foto Adaptif**:
   - Mempertahankan resolusi foto asli bila lebih kecil dari batas 1280px $\to$ **PASS**
   - Skala proporsional foto orientasi lanskap (*landscape*) ke lebar maksimal 1280px $\to$ **PASS**
   - Skala proporsional foto orientasi potret (*portrait*) ke tinggi maksimal 1280px $\to$ **PASS**
   - Skala proporsional foto persegi (*square*) ke 1280x1280px $\to$ **PASS**
4. **Validasi Kanvas Tanda Tangan**:
   - Deteksi akurat kanvas putih bersih sebagai kanvas kosong (belum ditandatangani) $\to$ **PASS**
   - Deteksi akurat kanvas yang memiliki goresan pixel tanda tangan valid $\to$ **PASS**

---

## 3. Pengujian Keamanan Database & Row Level Security (RLS)

Pengujian keamanan dijalankan langsung ke basis data Supabase PostgreSQL menggunakan skrip otomatis [scripts/test-rls.ts](file:///c:/dwiky/scripts/test-rls.ts). Klien pengujian menggunakan **Kunci Publik/Anonim (Anon Key)** untuk merefleksikan otentikasi browser yang sesungguhnya.

### 3.1. Metodologi Data Fixture Terisolasi
Agar pengujian tidak menghasilkan *false positive* akibat tabel kosong, skrip membuat data *fixture* secara dinamis menggunakan hak akses *service role* di awal, dan menjamin seluruh data uji dihapus kembali secara bersih pada blok `finally`.

### 3.2. Matriks Pengujian Hak Akses per Peran

Berikut hasil eksekusi pengujian `npm run test:rls`:

| No | Peran (Role) | Operasi yang Diuji | Ekspektasi Keamanan | Hasil Pengujian | Status |
|:--:|:---:|---|:---:|:---:|:---:|
| 1 | **ADMIN** | Membaca master pelanggan (`customers`) | Diizinkan (SUCCESS) | Berhasil dibaca | **PASS** |
| 2 | **ADMIN** | Memperbarui pengaturan sistem (`app_settings`) | Diizinkan (SUCCESS) | Berhasil diperbarui | **PASS** |
| 3 | **GUDANG** | Membaca pengaturan sistem (`app_settings`) | Diizinkan (SUCCESS) | Berhasil dibaca | **PASS** |
| 4 | **GUDANG** | Mengubah pengaturan sistem (`app_settings`) | **Ditolak (REJECT)** | Ditolak oleh RLS Policy | **PASS** |
| 5 | **GUDANG** | Menghapus data pesanan (`orders`) | **Ditolak (REJECT)** | Ditolak (pesanan utuh) | **PASS** |
| 6 | **GUDANG** | Mengubah kolom terlarang (cth: `total_muatan_kg`) | **Ditolak (REJECT)** | Ditolak Trigger Penjaga | **PASS** |
| 7 | **GUDANG** | Mengubah status pesanan ke `'dalam_pengiriman'` | **Ditolak (REJECT)** | Ditolak Trigger/RLS | **PASS** |
| 8 | **GUDANG** | Mengubah status pesanan ke `'diterima'` | **Ditolak (REJECT)** | Ditolak Trigger/RLS | **PASS** |
| 9 | **GUDANG** | Mengubah status pesanan ke `'siap'` | Diizinkan (SUCCESS) | Status berubah ke 'siap' | **PASS** |
| 10 | **DRIVER** | Membaca pengaturan sistem (`app_settings`) | Diizinkan (SUCCESS) | Berhasil dibaca | **PASS** |
| 11 | **DRIVER** | Mengubah pengaturan sistem (`app_settings`) | **Ditolak (REJECT)** | Ditolak oleh RLS Policy | **PASS** |
| 12 | **DRIVER** | Melakukan update langsung ke tabel `orders` | **Ditolak (REJECT)** | Ditolak oleh RLS Policy | **PASS** |
| 13 | **DRIVER** | Membaca rute pengiriman milik driver lain | **Ditolak (REJECT)** | Mengembalikan 0 baris | **PASS** |
| 14 | **DRIVER** | Insert konfirmasi untuk pesanan di rute driver lain | **Ditolak (REJECT)** | Ditolak Policy RLS | **PASS** |
| 15 | **DRIVER** | Insert konfirmasi untuk pesanan di rutenya sendiri | Diizinkan (SUCCESS) | Bukti berhasil tersimpan | **PASS** |
| 16 | **TRIGGER** | Otomatisasi status `orders` $\to$ `'diterima'` via trigger | Diizinkan (SUCCESS) | Status order berubah otomatis | **PASS** |
| 17 | **DRIVER** | Insert konfirmasi ganda (*duplicate order_id*) | **Ditolak (REJECT)** | Ditolak UNIQUE constraint / PK | **PASS** |
| 18 | **DRIVER** | Insert konfirmasi dengan status `'tidak_lengkap'` | Diizinkan (SUCCESS) | Berhasil tersimpan | **PASS** |
| 19 | **TRIGGER** | Otomatisasi status `orders` $\to$ `'tidak_lengkap'` via trigger | Diizinkan (SUCCESS) | Status order menjadi 'tidak_lengkap' | **PASS** |
| 20 | **STORAGE** | Driver unggah berkas bukti ke folder rute sendiri | Diizinkan (SUCCESS) | Berhasil diunggah ke bucket 'proofs' | **PASS** |

### 3.3. Uji Keandalan Database Trigger Penjaga
- **Trigger `trg_check_gudang_order_update`**: Berhasil membatasi staf gudang agar hanya bisa menyunting status pesanan ke `baru`, `belum_siap`, atau `siap`. Upaya mengubah kolom data inti lainnya (kuantitas, pelanggan, tanggal, muatan) digagalkan langsung oleh mesin database PostgreSQL.
- **Trigger `trg_on_delivery_confirmed`**: Berjalan dengan privilege `SECURITY DEFINER` dan `search_path` terkunci. Hal ini memungkinkan pembaruan otomatis status pesanan menjadi `'diterima'` atau `'tidak_lengkap'` saat driver mengirim konfirmasi penerimaan, **tanpa perlu memberikan hak UPDATE tabel pesanan kepada akun driver**.

---

## 4. Pengujian Kompilasi & Build Produksi

Pengujian kompilasi statis dijalankan untuk menjamin tidak ada cacat sintaksis, pelanggaran tipe (*type error*), maupun modul yang hilang sebelum rilis produksi:

```bash
> npm run build
> tsc -b && vite build

vite v8.3.8 building client environment for production...
transforming...
✓ 2253 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-CXiH6rBc.css   60.87 kB │ gzip:  14.61 kB
dist/assets/index-v92qk7fM.js   830.15 kB │ gzip: 228.36 kB
✓ built in 830ms
```

- **Hasil**: Kompilasi TypeScript lulus 100% tanpa kesalahan (*0 errors*).
- **Kompatibilitas**: Seluruh modul mematuhi aturan ketat `verbatimModuleSyntax: true` dan Tailwind CSS v4.

---

## 5. Instruksi Menjalankan Pengujian Mandiri

Penguji, dosen pembimbing, maupun penguji sidang dapat mereplikasi seluruh hasil pengujian di atas dengan perintah berikut:

```bash
# 1. Menjalankan seluruh Unit Testing Algoritma & Formula Matematis
npm test

# 2. Menjalankan Pengujian Hak Akses Row Level Security (RLS) Database
npm run test:rls

# 3. Menjalankan Pengecekan Integritas Build Produksi
npm run build
```
Semua perintah di atas akan menghasilkan status **EXIT CODE 0 (SUCCESS)**.
