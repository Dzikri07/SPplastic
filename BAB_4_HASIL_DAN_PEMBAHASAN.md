# BAB IV
# HASIL DAN PEMBAHASAN

---

## 4.1 Implementasi Antarmuka Sistem (Hasil Pengembangan)

Sistem Informasi Distribusi Produk dan Penentuan Rute Optimal pada CV SP Plastik (Saripan Plastik) dibangun menggunakan arsitektur web modern *Single Page Application* (SPA) berbasis klien tanpa server komputasi mandiri (*serverless client-side architecture*). Seluruh proses kalkulasi optimasi rute *Capacitated Vehicle Routing Problem* (CVRP) dijalankan langsung di peramban web (*browser*) pengguna menggunakan bahasa pemrograman TypeScript.

### 4.1.1 Lingkungan Pengembangan dan Arsitektur Perangkat Lunak

Spesifikasi lingkungan perangkat lunak dan pustaka yang digunakan dalam implementasi sistem disajikan pada Tabel 4.1:

**Tabel 4.1 Spesifikasi Lingkungan Pengembangan Sistem**

| Komponen Arsitektur | Teknologi / Pustaka | Versi | Fungsi / Peranan |
|---|---|:---:|---|
| *Framework Frontend* | React (Vite Engine) | 19.3.1 | Fondasi antarmuka reaktif berbasis komponen modular |
| *Bahasa Pemrograman* | TypeScript | 7.0.2 | Penjamin keamanan tipe data (*type safety*) dan keandalan kode |
| *Styling Framework* | Tailwind CSS | 4.3.5 | Penataan antarmuka responsif *mobile-first* |
| *Basis Data & Auth* | Supabase PostgreSQL | 15.x | Penyimpanan relasional, autentikasi pengguna, dan RLS |
| *Penyimpanan Berkas* | Supabase Storage | - | Wadah privat penyimpanan bukti foto dan tanda tangan digital |
| *Pemetaan Interaktif* | Leaflet & React-Leaflet | 1.9.4 | Visualisasi peta open-source tanpa ketergantungan API berbayar |
| *Generator PDF* | jsPDF & AutoTable | 4.2.1 | Pembuatan Surat Jalan dan Laporan Rekapitulasi PDF |
| *Pengolah Spreadsheet*| SheetJS (xlsx) | 0.18.5 | Ekspor laporan berkas Excel dengan formula kalkulasi numerik |
| *Pengujian Otomatis* | Vitest | 5.1.1 | Runner pengujian unit algoritma dan formula matematis |
| *Infrastruktur Hosting*| Vercel | - | Penyedia *hosting* SPA dengan mekanisme *URL rewrite* |

Arsitektur pertukaran data antar komponen sistem dimodelkan melalui diagram alur pada Gambar 4.1:

```mermaid
flowchart TD
    subgraph Klien_Browser [Peramban Web Klien (Vite + React + TS)]
        UI[Antarmuka Pengguna Responsif]
        CW[Modul Clarke-Wright Saving Matrix]
        Canvas[Modul Kompresi Foto & Kanvas TTD]
        Export[Pustaka jsPDF & SheetJS]
    end

    subgraph Backend_Supabase [Layanan Cloud Supabase]
        Auth[Supabase Auth - Pemetaan Email]
        DB[(PostgreSQL Database + RLS)]
        Trg[Security Definer Triggers]
        Storage[Storage Private Bucket 'proofs']
        RT[Realtime Channel Broadcast]
    end

    UI -->|Hitung Rute Mandiri| CW
    UI -->|Kompresi Gambar Lokal| Canvas
    UI -->|Generate Dokumen| Export
    UI -->|Kueri & Mutasi Anon Key| DB
    UI -->|Autentikasi Akun| Auth
    Canvas -->|Unggah Bukti Transaksional| Storage
    DB -->|Eksekusi Trigger Otomatis| Trg
    DB -->|Notifikasi Perubahan Data| RT
    RT -.->|Pembaruan Data Live| UI
```
**Gambar 4.1 Arsitektur Alur Sistem Client-Side Terdistribusi**

---

### 4.1.2 Modul Autentikasi dan Kontrol Akses Berbasis Peran (RBAC)

Modul autentikasi dirancang untuk mengakomodasi kebutuhan lapangan di mana pengguna cukup memasukkan *username* sederhana tanpa harus mengingat alamat email lengkap. Di balik layar, sistem secara transparan memetakan input pengguna menjadi format `<username>@spplastik.app` sebelum dikirimkan ke layanan Supabase Auth.

Sistem membagi hak akses ke dalam 3 peran (*Role-Based Access Control* / RBAC):
1. **Administrasi (Admin)**: Memiliki hak penuh mengelola master data pelanggan, produk, armada kendaraan, pengaturan depot, input pesanan, kalkulasi Saving Matrix, evaluasi rute, serta ekspor laporan rekapitulasi.
2. **Tim Gudang (Gudang)**: Memiliki hak melihat daftar pesanan masuk dan stok komoditas plastik secara *read-only*, serta melakukan verifikasi ketersediaan fisik barang dengan mengubah status pesanan menjadi `siap` atau `belum_siap`.
3. **Driver Armada (Driver)**: Antarmuka *mobile-first* khusus ponsel pintar untuk melihat rute yang ditugaskan hari ini, membuka navigasi Google Maps, melakukan kompresi foto surat jalan, dan merekam tanda tangan digital pelanggan.

Hak akses pengguna dilindungi di tingkat peramban melalui komponen pelindung rute ([src/components/ProtectedRoute.tsx](file:///c:/dwiky/src/components/ProtectedRoute.tsx)) dan di tingkat mesin basis data melalui *Row Level Security* (RLS).

---

### 4.1.3 Modul Master Data dan Integrasi Pemetaan Geografis (Leaflet)

Modul master data menyediakan fasilitas pengelolaan entitas operasional CV SP Plastik:
1. **Master Pelanggan Toko**: Menyimpan data nama toko, alamat, kontak WhatsApp, serta koordinat lintang (*latitude*) dan bujur (*longitude*). Penentuan koordinat toko didukung oleh komponen pemetik lokasi interaktif ([src/components/MapLocationPicker.tsx](file:///c:/dwiky/src/components/MapLocationPicker.tsx)) berbasis Leaflet di mana administrator dapat mengklik titik pada peta atau menggeser pin (*drag-and-drop*) secara presisi di seluruh wilayah Kabupaten Cianjur.
2. **Master Produk Komoditas**: Mencatat katalog kantong plastik PP/PE, tali rafia, dan plastik *bubble wrap* yang memuat informasi harga, stok fisik, dan parameter bobot per kemasan dalam satuan kilogram ($kg$). Parameter bobot ini menjadi acuan utama perhitungan kapasitas angkut armada.
3. **Master Armada Kendaraan**: Mencatat armada truk dan mobil boks pengiriman beserta nomor plat kendaraan dan kapasitas angkut maksimum ($Q$) dalam satuan kilogram ($kg$).
4. **Pengaturan Depot Pusat**: Mengelola koordinat depot utama CV Saripan Plastik di Haurwangi, Cianjur ($-6.827218, 107.291637$), parameter konsumsi BBM rata-rata ($8.0\text{ km/L}$), harga BBM per liter ($\text{Rp}10.000/\text{L}$), kecepatan operasional ($40\text{ km/jam}$), serta faktor koreksi jalan darat ($1.3\times$).

---

### 4.1.4 Modul Manajemen Pesanan dan Pemantauan Kesiapan Gudang

Alur pesanan dirancang berkesinambungan antara bagian administrasi dan tim gudang:
- **Pencatatan Pesanan Dinamis**: Admin membuat pesanan distribusi dengan memilih pelanggan dan menyusun barang belanjaan multi-item. Total muatan dihitung otomatis di level database menggunakan *Stored Procedure* `create_or_update_order` sehingga tidak mengandalkan data mentah dari klien. Sistem secara otomatis memberikan peringatan (*warning*) bila total muatan pesanan melampaui kapasitas armada terbesar ($1000\text{ kg}$).
- **Status Terkunci (*Locked Orders*)**: Pesanan yang telah memasuki status `dalam_pengiriman`, `diterima`, atau `tidak_lengkap` secara otomatis dikunci oleh sistem dan tidak dapat disunting maupun dihapus.
- **Konfirmasi Kesiapan Gudang**: Staf gudang membuka modul kesiapan pesanan ([src/pages/gudang/GudangOrdersPage.tsx](file:///c:/dwiky/src/pages/gudang/GudangOrdersPage.tsx)) untuk memeriksa ketersediaan stok fisik di rak penyimpanan. Jika barang lengkap, staf gudang menekan tombol **"Konfirmasi Siap"** yang mengubah status pesanan menjadi `siap`. Hanya pesanan berstatus `siap` yang dapat ditarik oleh algoritma Saving Matrix ke dalam proses perutean.

---

### 4.1.5 Modul Penentuan Rute Distribusi Optimal (Saving Matrix CVRP)

Halaman Penentuan Rute ([src/pages/admin/RoutingPage.tsx](file:///c:/dwiky/src/pages/admin/RoutingPage.tsx)) merupakan modul sentral optimasi distribusi:
1. **Seleksi Pesanan Terintegrasi**: Administrator memilih tanggal distribusi dan mencentang pesanan-pesanan berstatus `siap`.
2. **Eksekusi Algoritma Satu Klik**: Menekan tombol **"Hitung Rute Optimal"** mengeksekusi fungsi murni `calculateSavingMatrix()` secara lokal dalam durasi waktu di bawah 50 milidetik.
3. **Visualisasi Peta Multi-Warna**: Jalur rute setiap kendaraan digambarkan secara terpisah menggunakan garis polyline dengan palet warna kontras (Biru, Hijau Zamrud, Ungu, Oranye, Merah) lengkap dengan penanda urutan stop bernomor ($1, 2, 3, \dots$).
4. **Penyesuaian Urutan & Transfer Stop Manual**: Administrator diberi keleluasaan melakukan penyesuaian lapangan melalui tombol Naik (*Move Up*), Turun (*Move Down*), atau Memindahkan Stop antar-armada. Setiap pemindahan divalidasi langsung terhadap kapasitas muatan kendaraan ($Q$) secara *real-time*.
5. **Penyimpanan Rute Transaksional**: Melalui prosedur tersimpan `save_route`, sistem menyimpan data ke tabel `routes` dan `route_stops`, serta secara atomik mengubah status seluruh pesanan terkait menjadi `dalam_pengiriman`.

---

### 4.1.6 Modul Lapangan Driver (Mobile-First, Kompresi Foto, & Tanda Tangan)

Dirancang khusus agar nyaman dioperasikan oleh sopir menggunakan ponsel pintar di lapangan:
1. **Daftar Tugas Pengantaran Harian**: Sopir melihat daftar urutan toko yang harus dikunjungi hari ini lengkap dengan nomor kontak telepon dan muatan barang.
2. **Navigasi Cepat Google Maps**: Tombol *Buka Google Maps* secara otomatis membuka aplikasi navigasi peta di HP dengan titik tujuan koordinat toko dan mode berkendara (`&travelmode=driving`).
3. **Komunikasi WhatsApp Terintegrasi**: Tombol *WhatsApp* memanggil tautan `wa.me` dengan nomor HP yang telah dinormalkan ke format internasional `628xxx` beserta draf pesan sapaan otomatis.
4. **Kompresi Foto Adaptif di Klien**: Saat sopir mengambil foto nota atau surat jalan menggunakan kamera HP, sistem memproses foto melalui HTML5 Canvas:
   - Orientasi foto ditegakkan otomatis menggunakan `createImageBitmap` berfitur `{ imageOrientation: 'from-image' }`.
   - Dimensi resolusi diatur maksimal 1280 piksel proporsional.
   - Kualitas JPEG diturunkan bertahap ($0.6 \to 0.5 \to 0.4$) hingga berkas berada di bawah **200 KB** ($< 204.800\text{ bytes}$) demi menghemat kuota internet dan mempercepat unggahan.
5. **Tanda Tangan Digital Layar Sentuh**: Pelanggan toko membubuhkan tanda tangan langsung di atas layar sentuh ponsel menggunakan jari. Kanvas dilengkapi deteksi *anti-blank* sehingga sopir tidak dapat menyimpan bukti jika kanvas masih kosong.
6. **Otomatisasi Status Selesai**: Berkas foto dan tanda tangan diunggah ke *storage* privat `proofs`. Masuknya rekaman ke tabel `delivery_confirmations` memicu database trigger `trg_on_delivery_confirmed` untuk memperbarui status pesanan menjadi `diterima` atau `tidak_lengkap`. Jika seluruh toko pada rute tersebut selesai dikunjungi, status rute armada secara otomatis berubah menjadi `selesai`.

---

### 4.1.7 Modul Evaluasi Rute dan Ekspor Dokumen Resmi (PDF & Excel)

1. **Modul Evaluasi Rute Komparatif ([src/pages/admin/EvaluationPage.tsx](file:///c:/dwiky/src/pages/admin/EvaluationPage.tsx))**:
   Membandingkan rute kebiasaan sopir lama (rute konvensional) dengan rute hasil optimasi Saving Matrix secara adil (*apple-to-apple*). Administrator dapat mengatur urutan toko kebiasaan sopir untuk melihat perbandingan total jarak tempuh, estimasi biaya bahan bakar, dan persentase efisiensi penghematan. Hasil komparasi divisualisasikan pada peta berdampingan (garis putus-putus merah untuk konvensional dan garis biru tegas untuk Saving Matrix).
2. **Ekspor Surat Jalan Pengiriman (PDF)**:
   Mencetak dokumen resmi surat jalan berstandar A4 yang memuat kop surat resmi CV Saripan Plastik, identitas kendaraan dan sopir, daftar rincian barang tiap toko, serta kolom kotak tanda tangan fisik penerima barang yang luas.
3. **Ekspor Laporan Rekapitulasi (Excel .xlsx & PDF)**:
   Menyajikan rekapitulasi data perjalanan distribusi berdasarkan rentang tanggal WIB (UTC+7). Berkas Excel yang dihasilkan menuliskan data angka secara numerik murni dan menyertakan formula Excel `=SUM(...)` pada baris total akumulasi.

---

## 4.2 Validasi Perhitungan Algoritma Clarke-Wright Saving Matrix

Untuk membuktikan keabsahan matematis dari algoritma yang diimplementasikan pada sistem, dilakukan pengujian validasi dengan membandingkan kalkulasi manual (lembar kerja Excel) terhadap keluaran modul algoritma sistem ([src/lib/savingMatrix.ts](file:///c:/dwiky/src/lib/savingMatrix.ts)).

### 4.2.1 Data Parameter Uji dan Koordinat Lokasi

Pengujian validasi manual menggunakan sampel 1 Depot Gudang Pusat dan 3 Toko Pelanggan di wilayah Kabupaten Cianjur dengan parameter armada kendaraan sebagai berikut:
- **Kapasitas Maksimum Armada ($Q$)**: $400\text{ kg}$
- **Konsumsi BBM**: $8.0\text{ km/L}$
- **Harga BBM Pertalite**: $\text{Rp}10.000/\text{L}$
- **Faktor Koreksi Jarak Jalan ($f_k$)**: $1.0$ (Jarak murni Haversine untuk validasi)

Data koordinat geografis dan muatan permintaan disajikan pada Tabel 4.2:

**Tabel 4.2 Data Node Uji Validasi Algoritma**

| Node | Identitas Lokasi | Wilayah Kecamatan | Garis Lintang (*Lat*) | Garis Bujur (*Lng*) | Permintaan ($q_i$) |
|:---:|---|---|:---:|:---:|:---:|
| **$D$** | Depot CV SP Plastik | Haurwangi | $-6.827218$ | $107.291637$ | $0\text{ kg}$ |
| **$C_1$** | Toko Plastik Berkah | Ciranjang | $-6.820000$ | $107.260000$ | $150\text{ kg}$ |
| **$C_2$** | Toko Sinar Makmur | Bojongpicung | $-6.860000$ | $107.250000$ | $180\text{ kg}$ |
| **$C_3$** | Toko Plastik Cianjur | Cianjur Kota | $-6.820000$ | $107.140000$ | $120\text{ kg}$ |

Total permintaan barang dari ketiga toko adalah:
$$\sum_{i=1}^{3} q_i = 150 + 180 + 120 = 450\text{ kg}$$

Karena total permintaan ($450\text{ kg}$) melebihi kapasitas angkut armada ($Q = 400\text{ kg}$), maka secara teoritis sistem wajib membentuk **minimal 2 rute perjalanan kendaraan** yang berbeda.

---

### 4.2.2 Pembentukan Matriks Jarak Geografis (Formula Haversine)

Formula Haversine digunakan untuk menghitung jarak lingkaran besar (*great-circle distance*) antara dua pasang koordinat bola bumi $(\phi_1, \lambda_1)$ dan $(\phi_2, \lambda_2)$ dengan jari-jari bumi $R = 6371.0088\text{ km}$:

$$\Delta \phi = \frac{(\phi_2 - \phi_1) \cdot \pi}{180}, \quad \Delta \lambda = \frac{(\lambda_2 - \lambda_1) \cdot \pi}{180}$$

$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos\left(\frac{\phi_1 \cdot \pi}{180}\right) \cdot \cos\left(\frac{\phi_2 \cdot \pi}{180}\right) \cdot \sin^2\left(\frac{\Delta \lambda}{2}\right)$$

$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$

$$d = R \cdot c$$

**1. Perhitungan Jarak Depot ke Pelanggan $C_1$ ($D \to C_1$):**
- $\phi_D = -6.827218^\circ$, $\lambda_D = 107.291637^\circ$
- $\phi_1 = -6.820000^\circ$, $\lambda_1 = 107.260000^\circ$
- $\Delta \phi = 0.007218^\circ = 0.000125978\text{ rad}$
- $\Delta \lambda = -0.031637^\circ = -0.000552169\text{ rad}$
- $a = \sin^2(0.000062989) + \cos(-0.119157) \cdot \cos(-0.119031) \cdot \sin^2(-0.000276085) = 7.92572 \times 10^{-8}$
- $c = 2 \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a}) = 0.000563053\text{ rad}$
- $d(D, C_1) = 6371.0088 \times 0.000563053 = \mathbf{3.58721\dots\text{ km}} \approx \mathbf{3.59\text{ km}}$

Dengan prosedur matematis yang sama pada nilai pecahan asli (*raw floating point*), diperoleh matriks jarak simetris antar seluruh node sebagaimana disajikan pada Tabel 4.3:

**Tabel 4.3 Matriks Jarak Antar Titik Lokasi ($km$)**

| Titik Asal / Tujuan | Depot ($D$) | Toko $C_1$ | Toko $C_2$ | Toko $C_3$ |
|---|:---:|:---:|:---:|:---:|
| **Depot ($D$)** | $0.00$ | $3.59$ | $5.87$ | $16.76$ |
| **Toko $C_1$** | $3.59$ | $0.00$ | $4.58$ | $13.25$ |
| **Toko $C_2$** | $5.87$ | $4.58$ | $0.00$ | $12.94$ |
| **Toko $C_3$** | $16.76$ | $13.25$ | $12.94$ | $0.00$ |

> **Catatan Penting Akurasi**: Untuk mencegah akumulasi galat pembulatan (*intermediate rounding error*), seluruh kalkulasi penghematan dihitung dari nilai pecahan desimal penuh di memori dan hanya dibulatkan ke 2 desimal saat disajikan ke tabel antarmuka.

---

### 4.2.3 Perhitungan dan Pengurutan Nilai Penghematan (*Saving Matrix*)

Nilai penghematan (*saving value*) $S(i, j)$ merepresentasikan penghematan jarak tempuh yang diperoleh jika pelanggan $i$ dan pelanggan $j$ dilayani secara berurutan dalam satu rute perjalanan yang sama dibandingkan dilayani secara mandiri bolak-balik dari depot:

$$S(i, j) = d(D, i) + d(D, j) - d(i, j)$$

1. **Pasangan Pelanggan $(C_1, C_2)$**:
   $$S(C_1, C_2) = 3.58721\dots + 5.86988\dots - 4.58013\dots = \mathbf{4.87696\dots\text{ km}} \approx \mathbf{4.88\text{ km}}$$

2. **Pasangan Pelanggan $(C_1, C_3)$**:
   $$S(C_1, C_3) = 3.58721\dots + 16.76105\dots - 13.24897\dots = \mathbf{7.09929\dots\text{ km}} \approx \mathbf{7.10\text{ km}}$$

3. **Pasangan Pelanggan $(C_2, C_3)$**:
   $$S(C_2, C_3) = 5.86988\dots + 16.76105\dots - 12.93608\dots = \mathbf{9.69485\dots\text{ km}} \approx \mathbf{9.69\text{ km}}$$

Daftar nilai penghematan diurutkan secara menurun (*descending*) sebagaimana disajikan pada Tabel 4.4:

**Tabel 4.4 Daftar Penghematan Jarak Terurut (*Savings List*)**

| Peringkat | Pasangan Node $(i, j)$ | Formula Perhitungan ($km$) | Nilai Penghematan $S(i, j)$ |
|:---:|:---:|---|:---:|
| 1 | $(C_2, C_3)$ | $5.87 + 16.76 - 12.94$ | **$9.69\text{ km}$** |
| 2 | $(C_1, C_3)$ | $3.59 + 16.76 - 13.25$ | **$7.10\text{ km}$** |
| 3 | $(C_1, C_2)$ | $3.59 + 5.87 - 4.58$ | **$4.88\text{ km}$** |

---

### 4.2.4 Langkah-Langkah Penggabungan Rute (*Iterative Route Merging*)

Kondisi inisial algoritma memodelkan bahwa setiap pelanggan dilayani oleh rute terpisah bolak-balik dari depot ($D \to i \to D$):
- Rute 1: $D \to C_1 \to D$ (Muatan: $150\text{ kg}$)
- Rute 2: $D \to C_2 \to D$ (Muatan: $180\text{ kg}$)
- Rute 3: $D \to C_3 \to D$ (Muatan: $120\text{ kg}$)

Total jarak awal sebelum dioptimasi:
$$d_{\text{awal}} = 2 \cdot d(D, C_1) + 2 \cdot d(D, C_2) + 2 \cdot d(D, C_3) = (2 \times 3.59) + (2 \times 5.87) + (2 \times 16.76) = \mathbf{52.44\text{ km}}$$

Algoritma melakukan iterasi penelusuran pasangan penghematan berurutan:

**Iterasi 1: Evaluasi Pasangan $(C_2, C_3)$ dengan $S = 9.69\text{ km}$**
- Periksa posisi exterior: Node $C_2$ dan node $C_3$ berada pada ujung terluar rute masing-masing.
- Uji kapasitas muatan gabungan:
  $$q_{\text{gabungan}} = q(C_2) + q(C_3) = 180 + 120 = \mathbf{300\text{ kg}}$$
- Karena $300\text{ kg} \le Q\ (400\text{ kg})$, penggabungan **DITERIMA (MERGED)**.
- Rute baru terbentuk: $D \to C_2 \to C_3 \to D$.
- Status Rute Aktif:
  - Rute A: $D \to C_1 \to D$ ($150\text{ kg}$)
  - Rute B: $D \to C_2 \to C_3 \to D$ ($300\text{ kg}$)

**Iterasi 2: Evaluasi Pasangan $(C_1, C_3)$ dengan $S = 7.10\text{ km}$**
- Node $C_1$ berada pada Rute A, sedangkan $C_3$ berada pada Rute B.
- Uji kapasitas muatan jika Rute A digabung dengan Rute B:
  $$q_{\text{gabungan}} = q(\text{Rute A}) + q(\text{Rute B}) = 150 + 300 = \mathbf{450\text{ kg}}$$
- Karena $450\text{ kg} > Q\ (400\text{ kg})$, penggabungan **DITOLAK KARENA MELEBIHI KAPASITAS (`REJECTED_CAPACITY`)**. Rute tidak digabung.

**Iterasi 3: Evaluasi Pasangan $(C_1, C_2)$ dengan $S = 4.88\text{ km}$**
- Node $C_1$ berada pada Rute A, sedangkan $C_2$ berada pada Rute B.
- Uji kapasitas muatan jika digabungkan:
  $$q_{\text{gabungan}} = 150 + 300 = \mathbf{450\text{ kg}}$$
- Karena $450\text{ kg} > Q\ (400\text{ kg})$, penggabungan **DITOLAK KARENA MELEBIHI KAPASITAS (`REJECTED_CAPACITY`)**.

---

### 4.2.5 Hasil Akhir dan Pembuktian Akurasi Sistem

Hasil perutean optimal akhir yang dihasilkan oleh algoritma disajikan pada Tabel 4.5:

**Tabel 4.5 Rincian Rute Optimal Hasil Perhitungan Manual vs Sistem**

| Parameter Hasil | Armada Kendaraan 1 | Armada Kendaraan 2 | Total Akumulasi |
|---|:---:|:---:|:---:|
| **Urutan Kunjungan Stop** | $\text{Depot} \to C_1 \to \text{Depot}$ | $\text{Depot} \to C_2 \to C_3 \to \text{Depot}$ | 3 Toko Terlayani |
| **Total Muatan Angkut** | $150.00\text{ kg}$ | $300.00\text{ kg}$ | $450.00\text{ kg}$ |
| **Status Kapasitas ($Q = 400$)** | Valid ($37.5\%$) | Valid ($75.0\%$) | Tidak Ada Pelanggaran |
| **Jarak Tempuh Manual** | $7.17\text{ km}$ | $35.57\text{ km}$ | $\mathbf{42.74\text{ km}}$ |
| **Jarak Tempuh Sistem** | $7.17\text{ km}$ | $35.57\text{ km}$ | $\mathbf{42.74\text{ km}}$ |
| **Status Kesesuaian** | **100% IDENTIK** | **100% IDENTIK** | **VALID (PASS)** |

Penghematan jarak absolut yang diperoleh adalah:
$$\Delta d = d_{\text{awal}} - d_{\text{akhir}} = 52.44 - 42.74 = \mathbf{9.70\text{ km}}$$

Persentase efisiensi penghematan rute:
$$\text{Efisiensi} = \frac{52.44 - 42.74}{52.44} \times 100\% = \mathbf{18.50\%}$$

Pengujian otomatis melalui Vitest pada berkas [src/lib/__tests__/manualValidation.test.ts](file:///c:/dwiky/src/lib/__tests__/manualValidation.test.ts) menunjukkan hasil **PASS (LULUS 100%)**, membuktikan bahwa implementasi kode algoritma sistem tidak memiliki bias logika matematika.

---

## 4.3 Pengujian Sistem (System Testing)

Pengujian sistem dilakukan secara bertingkat mencakup aspek logika algoritma, keamanan hak akses basis data, dan integritas bundel produksi perangkat lunak.

### 4.3.1 Pengujian Unit Algoritma & Logika Bisnis (Vitest)

Pengujian unit dieksekusi secara terotomatisasi menggunakan *test runner* Vitest v5.1.1. Sebanyak **44 skenario uji** dirancang untuk memverifikasi fungsi murni tanpa ketergantungan antarmuka grafis.

**Tabel 4.6 Matriks Pengujian Unit Otomatis (Vitest)**

| Berkas Pengujian | Cakupan Pengujian | Jumlah Kasus | Status | Waktu Eksekusi |
|---|---|:---:|:---:|:---:|
| `distance.test.ts` | Jarak titik nol, akurasi Haversine, faktor jalan darat | 4 Uji | **PASS** | $6\text{ ms}$ |
| `savingMatrix.test.ts` | Matriks simetris, urutan saving, batasan kapasitas, reject log | 9 Uji | **PASS** | $13\text{ ms}$ |
| `manualValidation.test.ts`| Pembuktian matematis presisi tinggi 3 toko (Bab 4 Proof) | 1 Uji | **PASS** | $7\text{ ms}$ |
| `orderLogic.test.ts` | Akumulasi bobot muatan, order terkunci, deteksi overload | 3 Uji | **PASS** | $5\text{ ms}$ |
| `routeAdjustment.test.ts` | Rekalkulasi metrik rute, swap stop (up/down), transfer muatan | 4 Uji | **PASS** | $4\text{ ms}$ |
| `driverUtils.test.ts` | Deep-link Google Maps, format WhatsApp 62, kompresi foto, kanvas TTD | 13 Uji | **PASS** | $10\text{ ms}$ |
| `evaluationLogic.test.ts` | Apple-to-apple comparison, pembagi nol (-), hasil negatif, zona WIB | 10 Uji | **PASS** | $35\text{ ms}$ |
| **Total Pengujian Unit** | **Seluruh Logika Komputasi Klien** | **44 Uji** | **100% LULUS** | **$< 500\text{ ms}$** |

---

### 4.3.2 Pengujian Keamanan Hak Akses Data (*Row Level Security*)

Pengujian keamanan dilakukan secara langsung (*live execution*) terhadap basis data Supabase PostgreSQL menggunakan skrip penguji [scripts/test-rls.ts](file:///c:/dwiky/scripts/test-rls.ts) dengan Kunci Publik/Anonim (*Anon Key*) untuk menyimulasikan akses nyata dari peramban web pengguna.

**Tabel 4.7 Hasil Pengujian Hak Akses Row Level Security (RLS)**

| No | Peran Pengguna | Operasi / Tabel Sasaran | Ekspektasi Keamanan | Hasil Pengujian | Status |
|:--:|:---:|---|:---:|:---:|:---:|
| 1 | **ADMIN** | Membaca master data pelanggan (`customers`) | Diizinkan (*SUCCESS*) | Berhasil dibaca | **PASS** |
| 2 | **ADMIN** | Memperbarui pengaturan sistem (`app_settings`) | Diizinkan (*SUCCESS*) | Berhasil diperbarui | **PASS** |
| 3 | **ADMIN** | Membaca data evaluasi (`conventional_routes`) | Diizinkan (*SUCCESS*) | Berhasil dibaca | **PASS** |
| 4 | **GUDANG** | Membaca pengaturan sistem (`app_settings`) | Diizinkan (*SUCCESS*) | Berhasil dibaca | **PASS** |
| 5 | **GUDANG** | Mengubah pengaturan sistem (`app_settings`) | **Ditolak (*REJECT*)** | Ditolak oleh RLS Policy | **PASS** |
| 6 | **GUDANG** | Menghapus data pesanan (`orders`) | **Ditolak (*REJECT*)** | Ditolak (Pesanan utuh) | **PASS** |
| 7 | **GUDANG** | Menyunting kolom selain status (mis. muatan $kg$) | **Ditolak (*REJECT*)** | Ditolak Trigger Penjaga | **PASS** |
| 8 | **GUDANG** | Mengubah status pesanan ke `dalam_pengiriman` | **Ditolak (*REJECT*)** | Ditolak Trigger/RLS | **PASS** |
| 9 | **GUDANG** | Mengubah status pesanan ke `diterima` | **Ditolak (*REJECT*)** | Ditolak Trigger/RLS | **PASS** |
| 10 | **GUDANG** | Mengubah status pesanan ke `siap` | Diizinkan (*SUCCESS*) | Status terbarui ke 'siap' | **PASS** |
| 11 | **GUDANG** | Membaca riwayat evaluasi (`conventional_routes`) | **Ditolak (*REJECT*)** | Mengembalikan 0 baris | **PASS** |
| 12 | **DRIVER** | Membaca pengaturan sistem (`app_settings`) | Diizinkan (*SUCCESS*) | Berhasil dibaca | **PASS** |
| 13 | **DRIVER** | Mengubah pengaturan sistem (`app_settings`) | **Ditolak (*REJECT*)** | Ditolak oleh RLS Policy | **PASS** |
| 14 | **DRIVER** | Melakukan penyuntingan langsung ke tabel `orders`| **Ditolak (*REJECT*)** | Ditolak oleh RLS Policy | **PASS** |
| 15 | **DRIVER** | Membaca rute pengiriman milik sopir lain | **Ditolak (*REJECT*)** | Mengembalikan 0 baris | **PASS** |
| 16 | **DRIVER** | Membaca riwayat evaluasi (`conventional_routes`) | **Ditolak (*REJECT*)** | Mengembalikan 0 baris | **PASS** |
| 17 | **DRIVER** | Memasukkan bukti pesanan rute sopir lain | **Ditolak (*REJECT*)** | Ditolak Policy RLS | **PASS** |
| 18 | **DRIVER** | Memasukkan bukti pesanan rutenya sendiri | Diizinkan (*SUCCESS*) | Bukti tersimpan | **PASS** |
| 19 | **TRIGGER**| Otomatisasi status `orders` $\to$ `diterima` | Diizinkan (*SUCCESS*) | Status order berganti | **PASS** |
| 20 | **DRIVER** | Memasukkan konfirmasi ganda (*duplicate order_id*) | **Ditolak (*REJECT*)** | Ditolak UNIQUE constraint | **PASS** |
| 21 | **DRIVER** | Memasukkan konfirmasi status `tidak_lengkap` | Diizinkan (*SUCCESS*) | Bukti tersimpan | **PASS** |
| 22 | **TRIGGER**| Otomatisasi status `orders` $\to$ `tidak_lengkap` | Diizinkan (*SUCCESS*) | Status order berganti | **PASS** |
| 23 | **STORAGE**| Sopir mengunggah berkas bukti ke folder rutenya | Diizinkan (*SUCCESS*) | Berhasil tersimpan | **PASS** |

Dari Tabel 4.7, seluruh **23 skenario keamanan basis data dinyatakan LULUS (100% PASS)** tanpa kebocoran hak akses antarperan.

---

### 4.3.3 Pengujian Integritas Kompilasi dan *Code-Splitting* Produksi

Pengujian build produksi dijalankan menggunakan perintah `npm run build` (`tsc -b && vite build`) untuk memverifikasi keutuhan modul tanpa kesalahan tipe data (*type errors*).

Hasil keluaran kompilasi menunjukkan bahwa seluruh pustaka berukuran besar dipisahkan secara cerdas (*code-splitting*) melalui *dynamic imports*:
- Berkas HTML utama: `dist/index.html` ($0.45\text{ KB}$)
- Gaya CSS gabungan: `dist/assets/index-BDUt9u9T.css` ($63.69\text{ KB}$)
- Chunk PDF Generator: `dist/assets/jspdf.es.min-ka2eiAso.js` ($398.90\text{ KB}$)
- Chunk Spreadsheet Excel: `dist/assets/xlsx-zHa97828.js` ($423.63\text{ KB}$)
- Chunk AutoTable Plugin: `dist/assets/jspdf.plugin.autotable-nHkpJTDV.js` ($30.11\text{ KB}$)
- Bundel Aplikasi Inti: `dist/assets/index-CVBHOj87.js` ($876.18\text{ KB}$)

Pemisahan pustaka ini menjamin waktu inisiasi awal (*First Contentful Paint*) aplikasi pada peramban sopir di lokasi dengan sinyal lemah tetap ringan dan responsif.

---

## 4.4 Analisis Hasil dan Pembahasan (Evaluasi Rute)

Untuk menjawab rumusan masalah mengenai efektivitas penerapan algoritma Clarke-Wright Saving Matrix pada proses distribusi produk CV SP Plastik, dilakukan evaluasi perbandingan antara rute konvensional (kebiasaan sopir lama) dengan rute hasil optimasi sistem.

### 4.4.1 Analisis Komparasi Rute Konvensional vs Rute Optimal

Pengujian evaluasi dilakukan terhadap skenario pengiriman riil harian yang melayani 6 toko pelanggan di wilayah Kabupaten Cianjur dengan menggunakan armada mobil boks Daihatsu Gran Max ($Q = 1000\text{ kg}$).

Data toko pelanggan pada skenario pengujian disajikan pada Tabel 4.8:

**Tabel 4.8 Data Skenario Pengujian Distribusi 6 Toko Pelanggan**

| Kode | Nama Toko Pelanggan | Wilayah Lokasi | Muatan ($kg$) |
|:---:|---|---|:---:|
| **$T_1$** | Toko Berkah Jaya | Ciranjang | $180\text{ kg}$ |
| **$T_2$** | Toko Sinar Plastik | Cipeuyeum | $220\text{ kg}$ |
| **$T_3$** | Toko Makmur Abadi | Bojongpicung | $160\text{ kg}$ |
| **$T_4$** | Toko Sahabat Baru | Sukaluyu | $140\text{ kg}$ |
| **$T_5$** | Toko Rezeki Lancar | Karangtengah | $150\text{ kg}$ |
| **$T_6$** | Toko Plastik Cianjur Kota | Cianjur Kota | $110\text{ kg}$ |
| **Total**| **6 Toko Terlayani** | - | **$960\text{ kg}$** |

Total bobot muatan adalah $960\text{ kg}$, sehingga seluruh pesanan dapat diangkut sekaligus dalam 1 kali trip armada kendaraan ($960\text{ kg} \le 1000\text{ kg}$).

Perbandingan urutan perjalanan rute antara kebiasaan sopir lama dan rekomendasi sistem Saving Matrix adalah:
- **Rute Konvensional (Kebiasaan Sopir Lama)**:
  Sopir cenderung mendatangi toko terjauh terlebih dahulu atau berdasarkan urutan nota pemesanan yang masuk tanpa mempertimbangkan kedekatan geografis:
  $$\text{Depot} \to T_6\ (\text{Cianjur Kota}) \to T_1\ (\text{Ciranjang}) \to T_4\ (\text{Sukaluyu}) \to T_2\ (\text{Cipeuyeum}) \to T_5\ (\text{Karangtengah}) \to T_3\ (\text{Bojongpicung}) \to \text{Depot}$$
  *Pola perjalanan ini menyebabkan kendaraan bergerak bolak-balik melintasi jalur yang sama berkali-kali.*

- **Rute Optimal (Clarke-Wright Saving Matrix)**:
  Sistem menghitung penghematan terbesar dan menyusun rute melingkar (*loop routing*) yang searah jarum jam:
  $$\text{Depot} \to T_2\ (\text{Cipeuyeum}) \to T_1\ (\text{Ciranjang}) \to T_3\ (\text{Bojongpicung}) \to T_4\ (\text{Sukaluyu}) \to T_5\ (\text{Karangtengah}) \to T_6\ (\text{Cianjur Kota}) \to \text{Depot}$$

---

### 4.4.2 Efisiensi Jarak Tempuh Armada

Hasil perhitungan akumulasi jarak tempuh jalan darat (formula Haversine dengan faktor koreksi $1.3\times$) disajikan pada Tabel 4.9:

**Tabel 4.9 Komparasi Jarak Tempuh Rute Konvensional vs Saving Matrix**

| Segmen Perjalanan | Jarak Konvensional ($km$) | Segmen Perjalanan | Jarak Saving Matrix ($km$) |
|---|:---:|---|:---:|
| $\text{Depot} \to T_6$ | $21.79$ | $\text{Depot} \to T_2$ | $5.46$ |
| $T_6 \to T_1$ | $17.22$ | $T_2 \to T_1$ | $4.81$ |
| $T_1 \to T_4$ | $11.35$ | $T_1 \to T_3$ | $5.95$ |
| $T_4 \to T_2$ | $16.48$ | $T_3 \to T_4$ | $6.24$ |
| $T_2 \to T_5$ | $19.82$ | $T_4 \to T_5$ | $5.12$ |
| $T_5 \to T_3$ | $14.15$ | $T_5 \to T_6$ | $7.85$ |
| $T_3 \to \text{Depot}$ | $7.63$ | $T_6 \to \text{Depot}$ | $21.79$ |
| **Total Jarak Tempuh** | **$108.44\text{ km}$** | **Total Jarak Tempuh** | **$57.22\text{ km}$** |

Penghematan jarak tempuh yang berhasil dicapai adalah:
$$\Delta d = d_{\text{conv}} - d_{\text{opt}} = 108.44 - 57.22 = \mathbf{51.22\text{ km}}$$

Persentase efisiensi penghematan jarak tempuh distribusi:
$$\text{Efisiensi Jarak (\%)} = \frac{108.44 - 57.22}{108.44} \times 100\% = \mathbf{47.23\%}$$

Penerapan metode Saving Matrix terbukti memangkas jarak tempuh distribusi sebesar **$47.23\%$** pada skenario 6 toko pelanggan.

---

### 4.4.3 Efisiensi Konsumsi dan Penghematan Biaya Bahan Bakar Minyak (BBM)

Estimasi konsumsi bahan bakar dihitung berdasarkan parameter riil operasional armada Daihatsu Gran Max boks CV SP Plastik dengan rasio konsumsi $8.0\text{ km/liter}$ dan harga bahan bakar minyak jenis Pertalite $\text{Rp}10.000/\text{liter}$.

**1. Biaya BBM Rute Konvensional:**
$$\text{Konsumsi Liter} = \frac{108.44\text{ km}}{8.0\text{ km/L}} = 13.555\text{ Liter}$$
$$\text{Biaya BBM}_{\text{conv}} = 13.555\text{ Liter} \times \text{Rp}10.000 = \mathbf{\text{Rp}135.550}$$

**2. Biaya BBM Rute Optimal Saving Matrix:**
$$\text{Konsumsi Liter} = \frac{57.22\text{ km}}{8.0\text{ km/L}} = 7.1525\text{ Liter}$$
$$\text{Biaya BBM}_{\text{opt}} = 7.1525\text{ Liter} \times \text{Rp}10.000 = \mathbf{\text{Rp}71.525}$$

**3. Selisih Penghematan Biaya BBM per Trip Pengiriman:**
$$\Delta \text{BBM} = \text{Rp}135.550 - \text{Rp}71.525 = \mathbf{\text{Rp}64.025}$$

Persentase penghematan biaya bahan bakar minyak adalah:
$$\text{Efisiensi Biaya BBM (\%)} = \frac{\text{Rp}135.550 - \text{Rp}71.525}{\text{Rp}135.550} \times 100\% = \mathbf{47.23\%}$$

Ringkasan komparasi efisiensi disajikan pada Tabel 4.10:

**Tabel 4.10 Rekapitulasi Efisiensi Distribusi CV SP Plastik**

| Parameter Evaluasi | Rute Konvensional | Rute Saving Matrix | Selisih Penghematan | Persentase Efisiensi |
|---|:---:|:---:|:---:|:---:|
| **Total Jarak Tempuh** | $108.44\text{ km}$ | $57.22\text{ km}$ | $51.22\text{ km}$ | **$+47.23\%$** |
| **Konsumsi Bahan Bakar**| $13.56\text{ Liter}$ | $7.15\text{ Liter}$ | $6.40\text{ Liter}$ | **$+47.23\%$** |
| **Biaya Bahan Bakar (Rp)**| $\text{Rp}135.550$ | $\text{Rp}71.525$ | $\text{Rp}64.025$ | **$+47.23\%$** |
| **Estimasi Durasi Tempuh**| $163\text{ menit}$ | $86\text{ menit}$ | $77\text{ menit}$ | **$+47.24\%$** |

Jika dalam 1 bulan kalender armada melakukan 24 kali siklus pengiriman rute serupa, maka estimasi akumulasi penghematan biaya bahan bakar yang diperoleh perusahaan mencapai:
$$\text{Estimasi Hemat Bulanan} = 24 \times \text{Rp}64.025 = \mathbf{\text{Rp}1.536.600/\text{bulan per armada}}$$

---

### 4.4.4 Implikasi Manajerial dan Operasional bagi CV SP Plastik

Berdasarkan analisis hasil pengujian dan implementasi sistem, penerapan sistem informasi distribusi berbasis Clarke-Wright Saving Matrix memberikan dampak positif nyata bagi operasional CV SP Plastik:
1. **Transparansi Operasional Pengiriman**: Bagian administrasi dan pemilik perusahaan memiliki visibilitas penuh atas status pesanan secara *real-time* tanpa harus melakukan konfirmasi manual berulang kali melalui sambungan telepon kepada sopir.
2. **Akuntabilitas Bukti Penerimaan Barang**: Permasalahan sengketa barang hilang atau selisih kuantitas saat serah terima barang diminimalkan dengan adanya bukti foto fisik dan tanda tangan digital pelanggan yang tersimpan secara terenkripsi pada *storage* privat.
3. **Reduksi Waktu Pengantaran**: Pemotongan jarak perjalanan hingga $47\%$ secara linier menghemat waktu perjalanan sopir hingga $\pm 1.28\text{ jam}$ per hari kerja, sehingga risiko keterlambatan pengiriman ke toko pelanggan berkurang drastis.
4. **Peniadaan Biaya Infrastruktur Server**: Arsitektur *client-side* berbasis Supabase *free tier* dan Vercel memungkinkan CV SP Plastik mengoperasikan sistem informasi canggih tanpa beban biaya rutin sewa peladen (*cloud server*) bulanan.
