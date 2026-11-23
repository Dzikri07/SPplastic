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
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-line">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-surface-muted text-muted inline-block">
              Dashboard operasional gudang
            </span>
            <RealtimeBadge status={realtimeStatus} />
          </div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Halo, {profile?.nama || 'Tim Gudang'}!
          </h1>
          <p className="mt-1 text-sm text-muted">
            Periksa ketersediaan stok fisik komoditas plastik dan konfirmasikan kesiapan barang untuk pesanan sebelum rute dihitung.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <Link
            to="/gudang/orders"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 min-h-[40px]"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Konfirmasi kesiapan pesanan</span>
          </Link>
          <Link
            to="/gudang/stock"
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-subtle text-ink border border-line text-sm font-medium rounded-md transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent min-h-[40px]"
          >
            <Boxes className="w-4 h-4 text-muted" />
            <span>Lihat stok produk</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Antrean Verifikasi */}
        <Link
          to="/gudang/orders"
          className="bg-surface p-5 rounded-md border border-line hover:border-border-strong transition-colors group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted">
                Perlu disiapkan / konfirmasi
              </p>
              <h3 className="text-2xl font-bold text-ink mt-1">
                {loading ? '...' : pendingOrdersCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-md bg-surface-muted text-muted flex items-center justify-center group-hover:text-ink transition-colors">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-accent font-medium">
            <span>Buka antrean pesanan</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Pesanan Siap */}
        <Link
          to="/gudang/orders"
          className="bg-surface p-5 rounded-md border border-line hover:border-border-strong transition-colors group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted">
                Pesanan telah siap kirim
              </p>
              <h3 className="text-2xl font-bold text-ink mt-1">
                {loading ? '...' : readyOrdersCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-md bg-surface-muted text-muted flex items-center justify-center group-hover:text-ink transition-colors">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-accent font-medium">
            <span>Siap dihitung rute</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Stok Menipis Count */}
        <Link
          to="/gudang/stock"
          className="bg-surface p-5 rounded-md border border-line hover:border-border-strong transition-colors group"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted">
                Varian stok menipis (&le; 50)
              </p>
              <h3 className="text-2xl font-bold text-danger-text mt-1">
                {loading ? '...' : lowStockProducts.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-md bg-danger-bg text-danger flex items-center justify-center transition-colors">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-accent font-medium">
            <span>Periksa inventaris</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Low Stock Warning Card */}
      <div className="bg-surface rounded-md border border-line p-5 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-ink">
              Peringatan produk stok menipis
            </h2>
          </div>
          <Link
            to="/gudang/stock"
            className="text-xs font-medium text-accent hover:underline"
          >
            Lihat semua produk &rarr;
          </Link>
        </div>

        {lowStockProducts.length === 0 ? (
          <p className="text-xs text-muted py-4 text-center">
            Semua produk plastik memiliki stok di atas 50 unit. Aman terkendali.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.map((p) => (
              <div
                key={p.id}
                className="p-3.5 bg-surface-subtle rounded-md border border-line flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-medium text-ink truncate max-w-[160px]">{p.nama}</p>
                  <p className="text-[11px] text-muted mt-0.5">{p.berat_per_unit_kg} kg/unit</p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                    p.stok <= 20 ? 'bg-danger-bg text-danger-text' : 'bg-amber-50 text-amber-900 border border-amber-200'
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
