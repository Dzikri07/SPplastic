import { formatRupiah, formatTanggalWIB } from '../lib/evaluationLogic';

export interface SuratJalanItem {
  namaProduk: string;
  qty: number;
  beratKg: number;
}

export interface SuratJalanStop {
  urutan: number;
  namaToko: string;
  alamat: string;
  noHp: string;
  totalMuatanKg: number;
  items: SuratJalanItem[];
}

export interface SuratJalanData {
  routeId: string;
  tanggal: string;
  platKendaraan: string;
  namaKendaraan: string;
  namaDriver: string;
  totalJarakKm: number;
  totalMuatanKg: number;
  stops: SuratJalanStop[];
}

export interface RekapitulasiRow {
  no: number;
  tanggal: string;
  platKendaraan: string;
  namaDriver: string;
  jumlahToko: number;
  totalJarakKm: number;
  totalMuatanKg: number;
  biayaBbmRp: number;
  status: string;
}

export interface EvaluasiExportData {
  tanggal: string;
  armadaPlat: string;
  namaDriver: string;
  jarakKonvensionalKm: number;
  biayaBbmKonvensionalRp: number;
  jarakOptimalKm: number;
  biayaBbmOptimalRp: number;
  selisihJarakKm: number;
  persentaseHemat: number | null;
  selisihBbmRp: number;
  urutanTokoKonvensional: string[];
  urutanTokoOptimal: string[];
}

/**
 * Mengekspor Surat Jalan Pengiriman per Rute dalam format PDF (A4).
 * Menggunakan dynamic import untuk jspdf dan jspdf-autotable (code splitting).
 */
export async function exportSuratJalanPdf(
  data: SuratJalanData,
  companyName: string = 'CV Saripan Plastik'
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // KOP SURAT RESMI PERUSAHAAN (Sesuai app_settings.depot_nama)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(companyName.toUpperCase(), pageWidth / 2, 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    'Distribusi Produk Plastik & Penentuan Rute Optimal (CVRP)',
    pageWidth / 2,
    21,
    { align: 'center' }
  );
  doc.text(
    'Alamat Gudang / Depot: Haurwangi, Kabupaten Cianjur - Jawa Barat',
    pageWidth / 2,
    26,
    { align: 'center' }
  );

  // Garis Pembatas KOP
  doc.setLineWidth(0.8);
  doc.line(14, 29, pageWidth - 14, 29);
  doc.setLineWidth(0.2);
  doc.line(14, 30, pageWidth - 14, 30);

  // JUDUL DOKUMEN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('SURAT JALAN PENGIRIMAN BARANG', pageWidth / 2, 38, { align: 'center' });

  // METADATA PENGIRIMAN
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const leftX = 14;
  const rightX = 115;
  let curY = 46;

  doc.text(`Tanggal Pengiriman : ${formatTanggalWIB(data.tanggal)}`, leftX, curY);
  doc.text(`No. Plat Armada     : ${data.platKendaraan} (${data.namaKendaraan})`, rightX, curY);

  curY += 5;
  doc.text(`Driver Pengantar    : ${data.namaDriver}`, leftX, curY);
  doc.text(
    `Total Beban Muat   : ${data.totalMuatanKg.toLocaleString('id-ID')} kg`,
    rightX,
    curY
  );

  curY += 5;
  doc.text(`Estimasi Jarak Rute : ${data.totalJarakKm.toLocaleString('id-ID')} km (Bolak-balik)`, leftX, curY);
  doc.text(`Jumlah Perhentian  : ${data.stops.length} Toko Pelanggan`, rightX, curY);

  // TABEL STOPS PENGIRIMAN
  const tableRows = data.stops.map((stop) => {
    const itemsText = stop.items
      .map((it) => `• ${it.namaProduk} (${it.qty} pack / ${it.beratKg} kg)`)
      .join('\n');

    return [
      `#${stop.urutan}`,
      `${stop.namaToko}\n${stop.alamat}\nTelp: ${stop.noHp || '-'}`,
      itemsText || 'Item terdaftar dalam sistem',
      `${stop.totalMuatanKg.toLocaleString('id-ID')} kg`,
      '', // Kolom kosong untuk tanda tangan dan cap fisik toko
    ];
  });

  autoTable(doc, {
    startY: curY + 6,
    head: [
      [
        'No',
        'Toko Pelanggan & Alamat',
        'Rincian Produk & Kuantitas',
        'Total Bobot',
        'Tanda Tangan / Cap Toko',
      ],
    ],
    body: tableRows,
    showHead: 'everyPage',
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138], // Blue-900
      textColor: 255,
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 50 },
      2: { cellWidth: 65 },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 35, minCellHeight: 22 }, // Tinggi cukup untuk tanda tangan basah
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer Nomor Halaman
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount}`,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      );
      doc.text(
        `Dicetak otomatis oleh Sistem Distribusi CV SP Plastik (WIB)`,
        14,
        doc.internal.pageSize.getHeight() - 10
      );
    },
  });

  // Tanda tangan admin & pengirim di halaman terakhir
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  if (finalY + 35 < doc.internal.pageSize.getHeight()) {
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text('Petugas Administrasi,', 25, finalY);
    doc.text('( .................................... )', 20, finalY + 22);

    doc.text('Driver Pengirim,', pageWidth - 55, finalY);
    doc.text(`( ${data.namaDriver} )`, pageWidth - 60, finalY + 22);
  }

  const safePlat = data.platKendaraan.replace(/\s+/g, '_');
  doc.save(`Surat_Jalan_${safePlat}_${data.tanggal}.pdf`);
}

/**
 * Mengekspor Rekapitulasi Distribusi dalam format Excel (.xlsx) dengan SheetJS.
 * Menulis angka sebagai numeric values dan menggunakan formula Excel SUM.
 */
export async function exportRekapitulasiExcel(
  rows: RekapitulasiRow[],
  periodTitle: string,
  companyName: string = 'CV Saripan Plastik'
): Promise<void> {
  const XLSX = await import('xlsx');

  // Siapkan data matriks baris
  const sheetData: any[][] = [
    [companyName.toUpperCase()],
    ['LAPORAN REKAPITULASI DISTRIBUSI PENGIRIMAN PRODUK'],
    [`Periode: ${periodTitle}`],
    [], // Baris kosong
    [
      'No',
      'Tanggal',
      'Plat Mobil',
      'Nama Driver',
      'Jumlah Toko',
      'Total Jarak (km)',
      'Total Muatan (kg)',
      'Biaya BBM (Rp)',
      'Status',
    ],
  ];

  // Baris data dengan tipe angka numerik asli (bukan string)
  rows.forEach((r) => {
    sheetData.push([
      r.no,
      r.tanggal,
      r.platKendaraan,
      r.namaDriver,
      r.jumlahToko,
      r.totalJarakKm,
      r.totalMuatanKg,
      r.biayaBbmRp,
      r.status,
    ]);
  });

  const startRow = 6; // Baris data pertama (1-indexed) di Excel
  const endRow = startRow + rows.length - 1;

  // Baris Total dengan Formula Excel SUM asli
  if (rows.length > 0) {
    sheetData.push([
      'TOTAL',
      '',
      '',
      '',
      { t: 'n', f: `SUM(E${startRow}:E${endRow})` },
      { t: 'n', f: `SUM(F${startRow}:F${endRow})` },
      { t: 'n', f: `SUM(G${startRow}:G${endRow})` },
      { t: 'n', f: `SUM(H${startRow}:H${endRow})` },
      '',
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Atur lebar kolom (wch)
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 14 }, // Tanggal
    { wch: 15 }, // Plat
    { wch: 20 }, // Driver
    { wch: 14 }, // Jumlah Toko
    { wch: 16 }, // Total Jarak
    { wch: 18 }, // Total Muatan
    { wch: 18 }, // Biaya BBM
    { wch: 16 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Distribusi');

  const safeDate = periodTitle.replace(/[^\w-]/g, '_');
  XLSX.writeFile(wb, `Rekap_Distribusi_${safeDate}.xlsx`);
}

/**
 * Mengekspor Rekapitulasi Distribusi dalam format PDF lanskap.
 */
export async function exportRekapitulasiPdf(
  rows: RekapitulasiRow[],
  periodTitle: string,
  companyName: string = 'CV Saripan Plastik'
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(companyName.toUpperCase(), pageWidth / 2, 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('LAPORAN REKAPITULASI PENGIRIMAN & DISTRIBUSI ARMADA', pageWidth / 2, 20, {
    align: 'center',
  });
  doc.setFontSize(9);
  doc.text(`Periode Laporan: ${periodTitle}`, pageWidth / 2, 25, { align: 'center' });

  doc.setLineWidth(0.4);
  doc.line(14, 28, pageWidth - 14, 28);

  const tableRows = rows.map((r) => [
    r.no,
    r.tanggal,
    r.platKendaraan,
    r.namaDriver,
    `${r.jumlahToko} Toko`,
    `${r.totalJarakKm.toFixed(2)} km`,
    `${r.totalMuatanKg.toFixed(2)} kg`,
    formatRupiah(r.biayaBbmRp),
    r.status,
  ]);

  // Hitung total akumulasi
  const totalToko = rows.reduce((s, r) => s + r.jumlahToko, 0);
  const totalJarak = rows.reduce((s, r) => s + r.totalJarakKm, 0);
  const totalMuatan = rows.reduce((s, r) => s + r.totalMuatanKg, 0);
  const totalBiaya = rows.reduce((s, r) => s + r.biayaBbmRp, 0);

  const footRow = [
    'TOTAL',
    '',
    '',
    '',
    `${totalToko} Toko`,
    `${totalJarak.toFixed(2)} km`,
    `${totalMuatan.toFixed(2)} kg`,
    formatRupiah(totalBiaya),
    '',
  ];

  autoTable(doc, {
    startY: 32,
    head: [
      [
        'No',
        'Tanggal',
        'Plat Armada',
        'Driver',
        'Jml Toko',
        'Total Jarak',
        'Total Muatan',
        'Biaya BBM (Rp)',
        'Status',
      ],
    ],
    body: tableRows,
    foot: [footRow],
    showHead: 'everyPage',
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26, halign: 'center' },
      2: { cellWidth: 32 },
      3: { cellWidth: 42 },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 30, halign: 'right' },
      6: { cellWidth: 32, halign: 'right' },
      7: { cellWidth: 36, halign: 'right' },
      8: { cellWidth: 28, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });

  const safeDate = periodTitle.replace(/[^\w-]/g, '_');
  doc.save(`Laporan_Distribusi_${safeDate}.pdf`);
}

/**
 * Mengekspor Hasil Evaluasi Rute Konvensional vs Saving Matrix dalam format PDF
 * khusus lampiran Bab 4 Skripsi / Kerja Praktek.
 */
export async function exportEvaluasiPdf(
  data: EvaluasiExportData,
  companyName: string = 'CV Saripan Plastik'
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(companyName.toUpperCase(), pageWidth / 2, 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    'EVALUASI PERBANDINGAN RUTE DISTRIBUSI (BAB 4 LAPORAN KP)',
    pageWidth / 2,
    21,
    { align: 'center' }
  );
  doc.setFontSize(8.5);
  doc.text(
    `Metode Clarke-Wright Saving Matrix vs Rute Konvensional Kebiasaan Driver`,
    pageWidth / 2,
    26,
    { align: 'center' }
  );

  doc.setLineWidth(0.4);
  doc.line(14, 29, pageWidth - 14, 29);

  doc.setFontSize(9);
  doc.text(`Tanggal Distribusi : ${formatTanggalWIB(data.tanggal)}`, 14, 36);
  doc.text(`Armada Kendaraan   : ${data.armadaPlat}`, 14, 41);
  doc.text(`Driver Pengantar   : ${data.namaDriver}`, 14, 46);

  // Catatan Metodologi Apple-to-Apple
  doc.setFontSize(8);
  doc.setTextColor(90);
  doc.text(
    '* Catatan Metodologi: Jarak tempuh merupakan estimasi jarak jalan darat (Haversine x faktor koreksi 1.3),',
    14,
    52
  );
  doc.text(
    '  bukan jarak aktual odometer kendaraan, dihitung dengan kumpulan toko & konsumsi BBM yang sama.',
    14,
    56
  );
  doc.setTextColor(0);

  // TABEL KOMPARASI METRIK
  const hematPersenText =
    data.persentaseHemat !== null
      ? `${data.persentaseHemat.toFixed(2)}%`
      : '-';

  autoTable(doc, {
    startY: 61,
    head: [['Parameter Pengujian', 'Rute Konvensional', 'Rute Saving Matrix', 'Selisih Penghematan']],
    body: [
      [
        'Total Jarak Tempuh (km)',
        `${data.jarakKonvensionalKm.toFixed(2)} km`,
        `${data.jarakOptimalKm.toFixed(2)} km`,
        `${data.selisihJarakKm.toFixed(2)} km`,
      ],
      [
        'Estimasi Biaya BBM (Rp)',
        formatRupiah(data.biayaBbmKonvensionalRp),
        formatRupiah(data.biayaBbmOptimalRp),
        formatRupiah(data.selisihBbmRp),
      ],
      [
        'Efisiensi Penghematan (%)',
        'Acuan (100%)',
        '-',
        hematPersenText,
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 55 },
    },
    margin: { left: 14, right: 14 },
  });

  const afterTableY = (doc as any).lastAutoTable.finalY + 8;

  // URUTAN KUNJUNGAN TOKO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Urutan Kunjungan Toko:', 14, afterTableY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `1. Rute Konvensional : Depot -> ${data.urutanTokoKonvensional.join(' -> ')} -> Depot`,
    14,
    afterTableY + 6
  );
  doc.text(
    `2. Rute Saving Matrix: Depot -> ${data.urutanTokoOptimal.join(' -> ')} -> Depot`,
    14,
    afterTableY + 12
  );

  doc.save(`Evaluasi_Rute_${data.tanggal}.pdf`);
}
