import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  Clock,
  PackageCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Product } from '../../types/database';
import { useSupabaseRealtime } from '../../hooks/useSupabaseRealtime';
import { RealtimeBadge } from '../../components/RealtimeBadge';

export const GudangDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [readyOrdersCount, setReadyOrdersCount] = useState<number>(0);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [pendingRes, readyRes, lowStockRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['baru', 'belum_siap']),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'siap'),
        supabase
          .from('products')
          .select('*')
          .lte('stok', 50)
          .order('stok', { ascending: true })
          .limit(5),
      ]);

      setPendingOrdersCount(pendingRes.count || 0);
      setReadyOrdersCount(readyRes.count || 0);
      setLowStockProducts(lowStockRes.data || []);
    } catch (err) {
      console.error('Error loading warehouse dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Langganan Realtime Supabase untuk Gudang
  const { status: realtimeStatus } = useSupabaseRealtime({
    tables: ['orders'],
    onDataChange: fetchDashboardData,
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-xs text-emerald-100 inline-block">
              Dashboard Operasional Gudang
            </span>
            <RealtimeBadge status={realtimeStatus} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Halo, {profile?.nama || 'Tim Gudang'}!
          </h1>
          <p className="mt-2 text-emerald-100 text-sm leading-relaxed">
            Periksa ketersediaan stok fisik komoditas plastik dan konfirmasikan kesiapan barang untuk pesanan yang masuk sebelum rute armada dihitung.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/gudang/orders"
              className="px-4 py-2.5 bg-white text-emerald-800 font-semibold rounded-xl text-xs sm:text-sm hover:bg-emerald-50 transition shadow-sm flex items-center gap-2"
            >
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <span>Konfirmasi Kesiapan Pesanan</span>
            </Link>
            <Link
              to="/gudang/stock"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl text-xs sm:text-sm backdrop-blur-xs transition flex items-center gap-2"
            >
              <Boxes className="w-4 h-4" />
              <span>Lihat Stok Produk</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Antrean Verifikasi */}
        <Link
          to="/gudang/orders"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-300 transition group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Perlu Disiapkan / Konfirmasi
              </p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {loading ? '...' : pendingOrdersCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-amber-600 font-medium">
            <span>Buka Antrean Pesanan</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        {/* Pesanan Siap */}
        <Link
          to="/gudang/orders"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-300 transition group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pesanan Telah Siap Kirim
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {loading ? '...' : readyOrdersCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-600 font-medium">
            <span>Siap Dihitung Rute</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        {/* Stok Menipis Count */}
        <Link
          to="/gudang/stock"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-300 transition group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Varian Stok Menipis (&le; 50)
              </p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">
                {loading ? '...' : lowStockProducts.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-red-600 font-medium">
            <span>Periksa Inventaris</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </Link>
      </div>

      {/* Low Stock Warning Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900">
              Peringatan Produk Stok Menipis
            </h2>
          </div>
          <Link
            to="/gudang/stock"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
          >
            Lihat Semua Produk &rarr;
          </Link>
        </div>

        {lowStockProducts.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            Semua produk plastik memiliki stok di atas 50 unit. Aman terkendali.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.map((p) => (
              <div
                key={p.id}
                className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 truncate max-w-[160px]">{p.nama}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{p.berat_per_unit_kg} kg/unit</p>
                </div>
                <span
                  className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                    p.stok <= 20 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {p.stok} unit
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
