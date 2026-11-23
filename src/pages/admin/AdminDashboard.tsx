import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSupabaseRealtime } from '../../hooks/useSupabaseRealtime';
import { RealtimeBadge } from '../../components/RealtimeBadge';

export const AdminDashboard: React.FC = () => {
  const [ordersTodayCount, setOrdersTodayCount] = useState<number | null>(null);
  const [readyOrdersCount, setReadyOrdersCount] = useState<number | null>(null);
  const [customerCount, setCustomerCount] = useState<number | null>(null);
  const [vehicleCount, setVehicleCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [todayOrdersRes, readyOrdersRes, custRes, vehRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tanggal', todayStr),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'siap'),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }),
      ]);

      if (todayOrdersRes.error) throw todayOrdersRes.error;
      if (readyOrdersRes.error) throw readyOrdersRes.error;
      if (custRes.error) throw custRes.error;
      if (vehRes.error) throw vehRes.error;

      setOrdersTodayCount(todayOrdersRes.count || 0);
      setReadyOrdersCount(readyOrdersRes.count || 0);
      setCustomerCount(custRes.count || 0);
      setVehicleCount(vehRes.count || 0);
    } catch (err: unknown) {
      console.error('Error fetching dashboard counts:', err);
      const msg = err instanceof Error ? err.message : 'Gagal memuat ringkasan data dari server.';
      setError(msg);
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

  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const renderMetric = (value: number | null) => {
    if (loading) {
      return (
        <span
          className="inline-block h-7 w-12 bg-surface-muted rounded motion-safe:animate-pulse"
          aria-hidden="true"
        />
      );
    }
    if (error || value === null) {
      return <span className="text-muted">—</span>;
    }
    return value;
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman: h1 + Tanggal + Indikator Realtime */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-line">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted mt-1">{formattedDate}</p>
        </div>
        <div className="flex items-center">
          <RealtimeBadge status={realtimeStatus} />
        </div>
      </div>

      {/* Banner Error jika Fetch Gagal */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-surface border border-rose-200 text-ink flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-700">Gagal memuat data statistik</p>
              <p className="text-xs text-muted mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => fetchStats()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-line rounded-md text-xs font-medium text-ink hover:bg-surface-muted transition-colors disabled:opacity-50 shrink-0 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent min-h-[36px]"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Coba lagi</span>
          </button>
        </div>
      )}

      {/* Blok Utama: Perlu Tindakan */}
      <section aria-labelledby="action-needed-heading" className="p-5 bg-surface border border-line rounded-lg">
        <h2 id="action-needed-heading" className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
          Perlu tindakan
        </h2>
        {loading ? (
          <div className="flex items-center justify-between gap-4 py-1">
            <div className="h-6 w-64 bg-surface-muted rounded motion-safe:animate-pulse" />
            <div className="h-9 w-36 bg-surface-muted rounded motion-safe:animate-pulse" />
          </div>
        ) : (readyOrdersCount ?? 0) > 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-ink">
                {readyOrdersCount} pesanan siap dihitung rutenya
              </p>
              <p className="text-sm text-muted mt-0.5">
                Pesanan terkonfirmasi gudang dapat dialokasikan ke armada pengiriman.
              </p>
            </div>
            <Link
              to="/admin/routing"
              className="inline-flex items-center justify-center px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 shrink-0 min-h-[40px]"
            >
              Hitung rute optimal
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-ink">Belum ada pesanan yang siap dihitung rutenya</p>
              <p className="text-xs text-muted mt-0.5">
                Tunggu konfirmasi kesiapan pesanan dari gudang sebelum membuat rute.
              </p>
            </div>
            <Link
              to="/admin/orders"
              className="inline-flex items-center text-sm font-medium text-accent hover:underline focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent rounded-md py-1"
            >
              Lihat pesanan
            </Link>
          </div>
        )}
      </section>

      {/* Ringkasan Angka: Satu Strip Tunggal dengan 4 Item */}
      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="sr-only">
          Ringkasan operasional
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-line rounded-lg bg-surface divide-y sm:divide-y-0 sm:divide-x divide-line">
          <Link
            to="/admin/orders"
            className="p-5 hover:bg-surface-subtle transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <div className="text-2xl font-bold text-ink">
              {renderMetric(ordersTodayCount)}
            </div>
            <p className="text-sm text-muted mt-1">Pesanan hari ini</p>
          </Link>
          <Link
            to="/admin/routing"
            className="p-5 hover:bg-surface-subtle transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <div className="text-2xl font-bold text-ink">
              {renderMetric(readyOrdersCount)}
            </div>
            <p className="text-sm text-muted mt-1">Pesanan siap</p>
          </Link>
          <Link
            to="/admin/customers"
            className="p-5 hover:bg-surface-subtle transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <div className="text-2xl font-bold text-ink">
              {renderMetric(customerCount)}
            </div>
            <p className="text-sm text-muted mt-1">Total pelanggan</p>
          </Link>
          <Link
            to="/admin/vehicles"
            className="p-5 hover:bg-surface-subtle transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <div className="text-2xl font-bold text-ink">
              {renderMetric(vehicleCount)}
            </div>
            <p className="text-sm text-muted mt-1">Armada</p>
          </Link>
        </div>
      </section>

      {/* Tentang Sistem: Details tertutup secara default */}
      <details className="border border-line rounded-lg bg-surface p-4 group">
        <summary className="text-sm font-semibold text-ink cursor-pointer select-none focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent rounded-md">
          Tentang sistem
        </summary>
        <div className="mt-3 pt-3 border-t border-line text-sm text-muted space-y-2.5">
          <p className="text-xs text-muted mb-2">
            Kesiapan modul sistem sesuai alur penelitian Kerja Praktek (KP):
          </p>
          <ul className="divide-y divide-line">
            <li className="py-2 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <span className="font-medium text-ink shrink-0">Fase 1: Algoritma Saving Matrix</span>
              <span className="text-muted text-xs sm:text-sm">Clarke-Wright CVRP & validasi matematis Bab 4.</span>
            </li>
            <li className="py-2 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <span className="font-medium text-ink shrink-0">Fase 2: Autentikasi & RLS</span>
              <span className="text-muted text-xs sm:text-sm">Role guard, trigger keamanan DB, & bucket proofs.</span>
            </li>
            <li className="py-2 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <span className="font-medium text-ink shrink-0">Fase 3: Master Data & Leaflet</span>
              <span className="text-muted text-xs sm:text-sm">Pelanggan toko, produk, armada, & depot Haurwangi.</span>
            </li>
            <li className="py-2 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <span className="font-medium text-ink shrink-0">Fase 4: Pesanan & Gudang</span>
              <span className="text-muted text-xs sm:text-sm">Order RPC transaksional & konfirmasi kesiapan.</span>
            </li>
            <li className="py-2 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <span className="font-medium text-ink shrink-0">Fase 5: Penentuan Rute Optimal</span>
              <span className="text-muted text-xs sm:text-sm">Peta rute multi-warna, swap stop, & simpan rute.</span>
            </li>
            <li className="py-2 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <span className="font-medium text-ink shrink-0">Fase 6: Alur Driver & Bukti HP</span>
              <span className="text-muted text-xs sm:text-sm">Navigasi Maps, kompresi foto &lt;200KB, & tanda tangan.</span>
            </li>
            <li className="py-2 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <span className="font-medium text-ink shrink-0">Fase 7: Evaluasi Efisiensi, Laporan PDF/Excel, Realtime & Vercel</span>
              <span className="text-muted text-xs sm:text-sm">Komparasi konvensional vs Saving Matrix, surat jalan PDF, rekap Excel formula SUM, dan live subscription.</span>
            </li>
          </ul>
        </div>
      </details>
    </div>
  );
};

