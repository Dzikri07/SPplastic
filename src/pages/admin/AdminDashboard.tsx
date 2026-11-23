import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Truck,
  ArrowRight,
  TrendingUp,
  ShoppingCart,
  CheckCircle2,
  Route as RouteIcon,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseRealtime } from '../../hooks/useSupabaseRealtime';
import { RealtimeBadge } from '../../components/RealtimeBadge';

export const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [ordersTodayCount, setOrdersTodayCount] = useState(0);
  const [readyOrdersCount, setReadyOrdersCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const [todayOrdersRes, readyOrdersRes, custRes, vehRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tanggal', todayStr),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'siap'),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }),
      ]);

      setOrdersTodayCount(todayOrdersRes.count || 0);
      setReadyOrdersCount(readyOrdersRes.count || 0);
      setCustomerCount(custRes.count || 0);
      setVehicleCount(vehRes.count || 0);
    } catch (err) {
      console.error('Error fetching dashboard counts:', err);
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Langganan Realtime Supabase
  const { status: realtimeStatus } = useSupabaseRealtime({
    tables: ['orders', 'routes', 'delivery_confirmations'],
    onDataChange: fetchStats,
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-xs text-blue-100 inline-block">
              Sistem Informasi Distribusi & Rute Optimal (CVRP)
            </span>
            <RealtimeBadge status={realtimeStatus} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang, {profile?.nama || 'Administrator'}!
          </h1>
          <p className="mt-2 text-blue-100 text-sm leading-relaxed">
            Kelola pesanan pelanggan CV Saripan Plastik, pantau status kesiapan pengiriman gudang, dan tentukan rute distribusi optimal armada menggunakan metode Clarke-Wright Saving Matrix.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/admin/routing"
              className="px-4 py-2.5 bg-white text-blue-800 font-semibold rounded-xl text-xs sm:text-sm hover:bg-blue-50 transition shadow-sm flex items-center gap-2"
            >
              <RouteIcon className="w-4 h-4 text-blue-600" />
              <span>Hitung Rute Optimal</span>
            </Link>
            <Link
              to="/admin/evaluation"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-xs sm:text-sm backdrop-blur-xs transition flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Evaluasi Rute (Bab 4)</span>
            </Link>
            <Link
              to="/admin/reports"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-xs sm:text-sm backdrop-blur-xs transition flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Rekapitulasi Laporan</span>
            </Link>
            <Link
              to="/admin/orders"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-xs sm:text-sm backdrop-blur-xs transition flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Pesanan</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards - Pesanan Hari Ini & Pesanan Siap Kirim */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pesanan Hari Ini */}
        <Link
          to="/admin/orders"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pesanan Hari Ini
              </p>
              <h3 className="text-2xl font-bold text-blue-700 mt-1">
                {loading ? '...' : ordersTodayCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-medium">
            <span>Lihat Pesanan</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        {/* Pesanan Siap Kirim */}
        <Link
          to="/admin/routing"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-300 transition group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pesanan Berstatus "Siap"
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {loading ? '...' : readyOrdersCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-600 font-medium">
            <span>Siap Dihitung Rute</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        {/* Pelanggan */}
        <Link
          to="/admin/customers"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Pelanggan Toko
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? '...' : customerCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>Master Pelanggan</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        {/* Kendaraan */}
        <Link
          to="/admin/vehicles"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Armada Distribusi
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? '...' : vehicleCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-medium">
            <span>Master Kendaraan</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </Link>
      </div>

      {/* Progress Information for KP Report */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Status Modul Sistem Informasi Distribusi
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Kesiapan modul sistem sesuai alur penelitian Kerja Praktek (KP):
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Fase 1 &bull; Selesai
            </span>
            <h4 className="font-semibold text-sm text-slate-900 mt-2">Algoritma Saving Matrix</h4>
            <p className="text-xs text-slate-600 mt-1">
              Clarke-Wright CVRP & validasi matematis Bab 4.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Fase 2 &bull; Selesai
            </span>
            <h4 className="font-semibold text-sm text-slate-900 mt-2">Autentikasi & RLS</h4>
            <p className="text-xs text-slate-600 mt-1">
              Role guard, trigger keamanan DB, & bucket proofs.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Fase 3 &bull; Selesai
            </span>
            <h4 className="font-semibold text-sm text-slate-900 mt-2">Master Data & Leaflet</h4>
            <p className="text-xs text-slate-600 mt-1">
              Pelanggan toko, produk, armada, & depot Haurwangi.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Fase 4 &bull; Selesai
            </span>
            <h4 className="font-semibold text-sm text-slate-900 mt-2">Pesanan & Gudang</h4>
            <p className="text-xs text-slate-600 mt-1">
              Order RPC transaksional & konfirmasi kesiapan.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Fase 5 &bull; Selesai
            </span>
            <h4 className="font-semibold text-sm text-slate-900 mt-2">Penentuan Rute Optimal</h4>
            <p className="text-xs text-slate-600 mt-1">
              Peta rute multi-warna, swap stop, & simpan rute.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Fase 6 &bull; Selesai
            </span>
            <h4 className="font-semibold text-sm text-slate-900 mt-2">Alur Driver & Bukti HP</h4>
            <p className="text-xs text-slate-600 mt-1">
              Navigasi Maps, kompresi foto &lt;200KB, & tanda tangan.
            </p>
          </div>

          <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-300 col-span-1 md:col-span-2">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-200/80 px-2.5 py-0.5 rounded-full">
              Fase 7 &bull; Fase Akhir (Final)
            </span>
            <h4 className="font-semibold text-sm text-slate-900 mt-2">
              Evaluasi Efisiensi, Laporan PDF/Excel, Realtime & Vercel
            </h4>
            <p className="text-xs text-slate-600 mt-1">
              Komparasi konvensional vs Saving Matrix, surat jalan PDF, rekap Excel formula SUM, dan live subscription.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
