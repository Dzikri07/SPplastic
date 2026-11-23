import React, { useEffect, useState, useCallback } from 'react';
import {
  Navigation,
  LogOut,
  MapPin,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Truck,
  RefreshCw,
  Eye,
  Check,
  Package,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  generateGoogleMapsNavigationUrl,
  generateWhatsAppUrl,
} from '../../lib/urlHelpers';
import {
  DeliveryConfirmationModal,
  type StopOrderForConfirmation,
} from '../../components/DeliveryConfirmationModal';
import { ProofDetailModal } from '../../components/ProofDetailModal';

interface RouteStopDetail {
  id: string;
  route_id: string;
  urutan: number;
  order_id: string;
  customer_id: string;
  jarak_dari_sebelumnya_km: number;
  customer?: {
    id: string;
    nama_toko: string;
    alamat: string;
    no_hp: string;
    latitude: number;
    longitude: number;
  };
  order?: {
    id: string;
    total_muatan_kg: number;
    status: string;
    catatan?: string;
    order_items?: Array<{
      id: string;
      qty: number;
      berat_kg: number;
      product?: { nama: string };
    }>;
  };
}

interface AssignedRoute {
  id: string;
  tanggal: string;
  vehicle_id: string;
  driver_id: string;
  total_jarak_km: number;
  total_muatan_kg: number;
  estimasi_waktu_menit: number;
  estimasi_biaya_bbm: number;
  status: 'dibuat' | 'dalam_pengiriman' | 'selesai';
  vehicle?: { nama: string; plat: string; kapasitas_kg: number };
  stops: RouteStopDetail[];
}

export const DriverDashboard: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const [routes, setRoutes] = useState<AssignedRoute[]>([]);
  const [activeRouteIndex, setActiveRouteIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal State
  const [confirmingOrder, setConfirmingOrder] = useState<StopOrderForConfirmation | null>(null);
  const [viewingProofOrderId, setViewingProofOrderId] = useState<{
    orderId: string;
    namaToko: string;
  } | null>(null);

  const fetchAssignedRoutes = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setErrorMsg(null);

      // Ambil rute yang ditugaskan ke driver yang sedang login
      const { data: routeData, error: routeErr } = await supabase
        .from('routes')
        .select(`
          *,
          vehicle:vehicles(nama, plat, kapasitas_kg)
        `)
        .eq('driver_id', user.id)
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false });

      if (routeErr) throw routeErr;

      const rawRoutes = routeData || [];
      const enrichedRoutes: AssignedRoute[] = [];

      for (const r of rawRoutes) {
        // Ambil stops untuk rute ini
        const { data: stopsData, error: stopsErr } = await supabase
          .from('route_stops')
          .select(`
            *,
            customer:customers(id, nama_toko, alamat, no_hp, latitude, longitude),
            order:orders(
              id, total_muatan_kg, status, catatan,
              order_items(id, qty, berat_kg, product:products(nama))
            )
          `)
          .eq('route_id', r.id)
          .order('urutan', { ascending: true });

        if (stopsErr) throw stopsErr;

        enrichedRoutes.push({
          ...r,
          stops: (stopsData || []) as RouteStopDetail[],
        });
      }

      setRoutes(enrichedRoutes);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat rute penugasan driver.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAssignedRoutes();
  }, [fetchAssignedRoutes]);

  const activeRoute = routes[activeRouteIndex] || null;

  // Hitung progres stop yang sudah selesai dikonfirmasi
  const completedStopsCount =
    activeRoute?.stops.filter(
      (s) => s.order?.status === 'diterima' || s.order?.status === 'tidak_lengkap'
    ).length || 0;
  const totalStopsCount = activeRoute?.stops.length || 0;
  const progressPercent =
    totalStopsCount > 0 ? Math.round((completedStopsCount / totalStopsCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Mobile Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                Driver CV SP Plastik
              </span>
              <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                {profile?.nama || profile?.username || 'Driver'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAssignedRoutes}
              disabled={loading}
              title="Perbarui Data"
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => logout()}
              title="Keluar"
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Max width Mobile/Tablet) */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-4">
        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-800">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-xs font-semibold text-slate-500">Memuat rute pengiriman...</p>
          </div>
        ) : routes.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-xs space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Navigation className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Belum Ada Rute yang Ditugaskan</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Admin belum menugaskan rute pengiriman baru untuk Anda. Silakan hubungi bagian administrasi distribusi.
            </p>
            <button
              onClick={fetchAssignedRoutes}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              Periksa Kembali
            </button>
          </div>
        ) : (
          <>
            {/* Multiple Routes Tabs (bila driver punya lebih dari 1 rute hari ini) */}
            {routes.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {routes.map((r, idx) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveRouteIndex(idx)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                      activeRouteIndex === idx
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Rute #{idx + 1} ({r.stops.length} Toko)
                  </button>
                ))}
              </div>
            )}

            {/* Active Route Summary Card */}
            {activeRoute && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Armada Pengiriman
                    </span>
                    <h2 className="text-base font-extrabold text-slate-900 mt-0.5">
                      {activeRoute.vehicle?.nama || 'Armada Box'}
                      <span className="ml-2 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        {activeRoute.vehicle?.plat || 'No Plat'}
                      </span>
                    </h2>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      activeRoute.status === 'selesai'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {activeRoute.status === 'selesai' ? 'Rute Selesai' : 'Dalam Pengiriman'}
                  </span>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">
                      Total Toko
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {totalStopsCount} Toko
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">
                      Total Jarak
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {activeRoute.total_jarak_km} km
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">
                      Total Muatan
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {activeRoute.total_muatan_kg} kg
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">Progres Pengantaran:</span>
                    <span className="text-blue-700">
                      {completedStopsCount} dari {totalStopsCount} Toko ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stop List Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                Urutan Perhentian Toko ({totalStopsCount} Stop):
              </h3>

              {activeRoute?.stops.map((stop) => {
                const isConfirmed =
                  stop.order?.status === 'diterima' || stop.order?.status === 'tidak_lengkap';
                const isDiterima = stop.order?.status === 'diterima';
                const isTidakLengkap = stop.order?.status === 'tidak_lengkap';

                const lat = stop.customer?.latitude || 0;
                const lng = stop.customer?.longitude || 0;
                const mapsUrl = generateGoogleMapsNavigationUrl(lat, lng);
                const waUrl = stop.customer?.no_hp
                  ? generateWhatsAppUrl(
                      stop.customer.no_hp,
                      `Halo ${stop.customer.nama_toko}, saya driver CV SP Plastik sedang dalam perjalanan mengirim pesanan Anda.`
                    )
                  : '';

                return (
                  <div
                    key={stop.id}
                    className={`bg-white rounded-3xl p-4 sm:p-5 border transition shadow-xs space-y-3 ${
                      isConfirmed
                        ? isDiterima
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : 'border-amber-200 bg-amber-50/20'
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {/* Header Stop */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isConfirmed
                              ? isDiterima
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-amber-500 text-white shadow-sm'
                              : 'bg-blue-600 text-white shadow-sm'
                          }`}
                        >
                          {isConfirmed ? (
                            isDiterima ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                            )
                          ) : (
                            `#${stop.urutan}`
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                            {stop.customer?.nama_toko || 'Toko Pelanggan'}
                          </h4>
                          <p className="text-xs text-slate-500 flex items-start gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 mt-0.5" />
                            <span>{stop.customer?.alamat || 'Alamat tidak tersedia'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0 ${
                          isDiterima
                            ? 'bg-emerald-100 text-emerald-800'
                            : isTidakLengkap
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {isDiterima
                          ? 'Diterima'
                          : isTidakLengkap
                          ? 'Tidak Lengkap'
                          : 'Menunggu'}
                      </span>
                    </div>

                    {/* Order Items Info */}
                    <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1.5 border border-slate-100">
                      <div className="flex justify-between items-center text-slate-600">
                        <span className="font-semibold flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-blue-600" />
                          <span>Daftar Muatan:</span>
                        </span>
                        <span className="font-bold text-slate-900">
                          {stop.order?.total_muatan_kg || 0} kg
                        </span>
                      </div>
                      <div className="space-y-0.5 pl-5 text-[11px] text-slate-600">
                        {stop.order?.order_items?.map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span>{item.product?.nama || 'Produk'}</span>
                            <span className="font-medium text-slate-700">
                              {item.qty} pack ({item.berat_kg} kg)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Navigation & Communication Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-blue-200"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Buka Google Maps</span>
                      </a>

                      {stop.customer?.no_hp && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-emerald-200"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>

                    {/* Delivery Confirmation Trigger */}
                    <div className="pt-1 border-t border-slate-100">
                      {isConfirmed ? (
                        <button
                          type="button"
                          onClick={() =>
                            setViewingProofOrderId({
                              orderId: stop.order_id,
                              namaToko: stop.customer?.nama_toko || 'Toko',
                            })
                          }
                          className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Lihat Bukti Foto & TTD</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmingOrder({
                              orderId: stop.order_id,
                              routeId: stop.route_id,
                              urutan: stop.urutan,
                              namaToko: stop.customer?.nama_toko || 'Toko',
                              alamat: stop.customer?.alamat || '',
                              totalMuatanKg: stop.order?.total_muatan_kg || 0,
                            })
                          }
                          className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Konfirmasi Penerimaan Barang</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Confirmation Modal */}
      {confirmingOrder && user && (
        <DeliveryConfirmationModal
          order={confirmingOrder}
          driverId={user.id}
          onSuccess={() => {
            setConfirmingOrder(null);
            fetchAssignedRoutes();
          }}
          onClose={() => setConfirmingOrder(null)}
        />
      )}

      {/* Proof Viewer Modal */}
      {viewingProofOrderId && (
        <ProofDetailModal
          orderId={viewingProofOrderId.orderId}
          namaToko={viewingProofOrderId.namaToko}
          onClose={() => setViewingProofOrderId(null)}
        />
      )}
    </div>
  );
};
