import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  FileText,
  Calendar,
  RefreshCw,
  Search,
  Layers,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  formatRupiah,
  formatTanggalWIB,
  isDateInWIBRange,
} from '../../lib/evaluationLogic';
import {
  exportRekapitulasiExcel,
  exportRekapitulasiPdf,
  exportSuratJalanPdf,
  type RekapitulasiRow,
  type SuratJalanData,
} from '../../services/exportService';

interface ReportRouteItem {
  id: string;
  tanggal: string;
  vehicle_id: string;
  driver_id: string;
  total_jarak_km: number;
  total_muatan_kg: number;
  estimasi_biaya_bbm: number;
  status: string;
  vehicle?: { nama: string; plat: string };
  driver?: { nama: string };
  stops?: Array<{
    id: string;
    urutan: number;
    order_id: string;
    customer_id: string;
    customer?: { nama_toko: string; alamat: string; no_hp: string };
    order?: {
      id: string;
      total_muatan_kg: number;
      order_items?: Array<{
        id: string;
        qty: number;
        berat_kg: number;
        product?: { nama: string };
      }>;
    };
  }>;
}

export const ReportsPage: React.FC = () => {
  const [routes, setRoutes] = useState<ReportRouteItem[]>([]);
  const [appSettings, setAppSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter State (WIB timezone based)
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState<string>(currentMonthStart);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchDriverOrPlat, setSearchDriverOrPlat] = useState<string>('');

  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);

      const [routesRes, settingsRes] = await Promise.all([
        supabase
          .from('routes')
          .select(`
            *,
            vehicle:vehicles(nama, plat),
            driver:profiles!driver_id(nama),
            stops:route_stops(
              id, urutan, order_id, customer_id,
              customer:customers(nama_toko, alamat, no_hp),
              order:orders(
                id, total_muatan_kg,
                order_items(id, qty, berat_kg, product:products(nama))
              )
            )
          `)
          .order('tanggal', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('app_settings').select('*').eq('id', 1).single(),
      ]);

      if (routesRes.error) throw routesRes.error;

      setRoutes((routesRes.data || []) as ReportRouteItem[]);
      if (settingsRes.data) {
        setAppSettings(settingsRes.data);
      }
    } catch (err: any) {
      console.error('Gagal memuat data laporan distribusi:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Filter Data Rute Berdasarkan Rentang Tanggal WIB dan Status
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      // 1. Filter Tanggal WIB
      const inDateRange = isDateInWIBRange(r.tanggal, startDate, endDate);
      if (!inDateRange) return false;

      // 2. Filter Status
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }

      // 3. Filter Pencarian Driver / Plat Kendaraan
      if (searchDriverOrPlat.trim()) {
        const query = searchDriverOrPlat.toLowerCase();
        const plat = (r.vehicle?.plat || '').toLowerCase();
        const driver = (r.driver?.nama || '').toLowerCase();
        if (!plat.includes(query) && !driver.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [routes, startDate, endDate, statusFilter, searchDriverOrPlat]);

  // Baris Rekapitulasi Standar untuk Ekspor
  const recapRows: RekapitulasiRow[] = useMemo(() => {
    return filteredRoutes.map((r, idx) => ({
      no: idx + 1,
      tanggal: r.tanggal,
      platKendaraan: r.vehicle?.plat || '-',
      namaDriver: r.driver?.nama || '-',
      jumlahToko: r.stops?.length || 0,
      totalJarakKm: Number(r.total_jarak_km || 0),
      totalMuatanKg: Number(r.total_muatan_kg || 0),
      biayaBbmRp: Number(r.estimasi_biaya_bbm || 0),
      status:
        r.status === 'selesai'
          ? 'Selesai'
          : r.status === 'dalam_pengiriman'
          ? 'Dalam Pengiriman'
          : 'Dibuat',
    }));
  }, [filteredRoutes]);

  // Hitung Akumulasi Total KPI
  const cumulativeStats = useMemo(() => {
    return filteredRoutes.reduce(
      (acc, r) => ({
        totalJarakKm: acc.totalJarakKm + Number(r.total_jarak_km || 0),
        totalMuatanKg: acc.totalMuatanKg + Number(r.total_muatan_kg || 0),
        totalBiayaBbmRp: acc.totalBiayaBbmRp + Number(r.estimasi_biaya_bbm || 0),
        completedRoutes: acc.completedRoutes + (r.status === 'selesai' ? 1 : 0),
      }),
      { totalJarakKm: 0, totalMuatanKg: 0, totalBiayaBbmRp: 0, completedRoutes: 0 }
    );
  }, [filteredRoutes]);

  const periodTitle = `${formatTanggalWIB(startDate)} s/d ${formatTanggalWIB(endDate)}`;
  const companyName = appSettings?.depot_nama || 'CV Saripan Plastik';

  // Ekspor Rekap Excel
  const handleExportExcel = async () => {
    if (recapRows.length === 0) {
      alert('Tidak ada data distribusi pada rentang tanggal yang dipilih.');
      return;
    }
    await exportRekapitulasiExcel(recapRows, periodTitle, companyName);
  };

  // Ekspor Rekap PDF
  const handleExportPdf = async () => {
    if (recapRows.length === 0) {
      alert('Tidak ada data distribusi pada rentang tanggal yang dipilih.');
      return;
    }
    await exportRekapitulasiPdf(recapRows, periodTitle, companyName);
  };

  // Cetak Surat Jalan Per Rute
  const handlePrintSuratJalan = async (r: ReportRouteItem) => {
    const stopsSorted = [...(r.stops || [])].sort((a, b) => a.urutan - b.urutan);

    const suratJalanData: SuratJalanData = {
      routeId: r.id,
      tanggal: r.tanggal,
      platKendaraan: r.vehicle?.plat || 'No Plat',
      namaKendaraan: r.vehicle?.nama || 'Armada Box',
      namaDriver: r.driver?.nama || 'Driver CV SP',
      totalJarakKm: Number(r.total_jarak_km),
      totalMuatanKg: Number(r.total_muatan_kg),
      stops: stopsSorted.map((s) => ({
        urutan: s.urutan,
        namaToko: s.customer?.nama_toko || 'Toko',
        alamat: s.customer?.alamat || '-',
        noHp: s.customer?.no_hp || '-',
        totalMuatanKg: Number(s.order?.total_muatan_kg || 0),
        items: (s.order?.order_items || []).map((it) => ({
          namaProduk: it.product?.nama || 'Produk',
          qty: it.qty,
          beratKg: Number(it.berat_kg),
        })),
      })),
    };

    await exportSuratJalanPdf(suratJalanData, companyName);
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Modul Pelaporan
            </span>
            <h1 className="text-2xl font-bold text-slate-900">
              Laporan Rekapitulasi Distribusi Armada
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Rekapitulasi rute pengiriman harian, cetak surat jalan PDF, dan ekspor laporan ke Excel (XLSX).
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={filteredRoutes.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={filteredRoutes.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor PDF (A4)</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block uppercase">
            Total Rute Terjadwal
          </span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
            {filteredRoutes.length}{' '}
            <span className="text-sm font-semibold text-slate-500">Rute</span>
          </h3>
          <p className="text-xs text-emerald-600 font-semibold mt-1">
            {cumulativeStats.completedRoutes} Rute Selesai
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block uppercase">
            Total Jarak Tempuh
          </span>
          <h3 className="text-2xl font-extrabold text-blue-700 mt-1">
            {cumulativeStats.totalJarakKm.toFixed(2)}{' '}
            <span className="text-sm font-semibold text-slate-500">km</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">Bolak-balik depot Haurwangi</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block uppercase">
            Total Muatan Terdistribusi
          </span>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
            {cumulativeStats.totalMuatanKg.toLocaleString('id-ID')}{' '}
            <span className="text-sm font-semibold text-slate-500">kg</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">Produk kantong & tali plastik</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block uppercase">
            Estimasi Biaya Bahan Bakar
          </span>
          <h3 className="text-2xl font-extrabold text-emerald-700 mt-1">
            {formatRupiah(cumulativeStats.totalBiayaBbmRp)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {appSettings?.konsumsi_bbm_km_per_liter || 8} km/liter
          </p>
        </div>
      </div>

      {/* Filter Bar (WIB Range) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-700">Periode (WIB):</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 font-semibold text-slate-700 bg-white"
            />
            <span className="text-slate-400 font-semibold">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 font-semibold text-slate-700 bg-white"
            />
          </div>

          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 font-semibold text-slate-700 bg-white"
            >
              <option value="all">Semua Status</option>
              <option value="selesai">Selesai</option>
              <option value="dalam_pengiriman">Dalam Pengiriman</option>
              <option value="dibuat">Dibuat</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari driver / plat..."
              value={searchDriverOrPlat}
              onChange={(e) => setSearchDriverOrPlat(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button
            onClick={loadReportData}
            title="Muat Ulang Data"
            className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-600 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabel Data Rekapitulasi */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4 text-center">No</th>
                <th className="py-3 px-4">Tanggal (WIB)</th>
                <th className="py-3 px-4">Plat Armada</th>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4 text-center">Jumlah Toko</th>
                <th className="py-3 px-4 text-right">Jarak (km)</th>
                <th className="py-3 px-4 text-right">Muatan (kg)</th>
                <th className="py-3 px-4 text-right">Biaya BBM</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Surat Jalan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <span>Memuat data rekapitulasi distribusi...</span>
                  </td>
                </tr>
              ) : filteredRoutes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <span className="font-semibold block text-slate-600">
                      Tidak Ada Data Rute pada Periode Ini
                    </span>
                    <span className="text-xs text-slate-400">
                      Silakan sesuaikan tanggal mulai atau status filter di atas.
                    </span>
                  </td>
                </tr>
              ) : (
                filteredRoutes.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {formatTanggalWIB(r.tanggal, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block">{r.vehicle?.plat || '-'}</span>
                      <span className="text-[10px] text-slate-500">{r.vehicle?.nama || 'Armada'}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {r.driver?.nama || '-'}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-800">
                      {r.stops?.length || 0} Toko
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-blue-700 whitespace-nowrap">
                      {Number(r.total_jarak_km).toFixed(2)} km
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {Number(r.total_muatan_kg).toLocaleString('id-ID')} kg
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                      {formatRupiah(r.estimasi_biaya_bbm)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          r.status === 'selesai'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'dalam_pengiriman'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.status === 'selesai'
                          ? 'Selesai'
                          : r.status === 'dalam_pengiriman'
                          ? 'Pengiriman'
                          : 'Dibuat'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handlePrintSuratJalan(r)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 transition inline-flex items-center gap-1 font-semibold"
                        title="Unduh Surat Jalan PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="text-[11px]">PDF</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Total Row */}
            {filteredRoutes.length > 0 && (
              <tfoot className="bg-slate-100 border-t-2 border-slate-200 font-bold text-slate-900 text-xs">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-center uppercase tracking-wider">
                    Total Akumulasi Periode
                  </td>
                  <td className="py-3 px-4 text-center">
                    {filteredRoutes.reduce((s, r) => s + (r.stops?.length || 0), 0)} Toko
                  </td>
                  <td className="py-3 px-4 text-right text-blue-800 font-mono">
                    {cumulativeStats.totalJarakKm.toFixed(2)} km
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {cumulativeStats.totalMuatanKg.toLocaleString('id-ID')} kg
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-800">
                    {formatRupiah(cumulativeStats.totalBiayaBbmRp)}
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-center text-slate-500">
                    {cumulativeStats.completedRoutes} Selesai
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
