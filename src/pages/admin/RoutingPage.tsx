import React, { useEffect, useState, useMemo } from 'react';
import {
  Route as RouteIcon,
  Play,
  Save,
  ArrowUp,
  ArrowDown,
  Clock,
  Fuel,
  Layers,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Order, Vehicle, Profile, AppSettings } from '../../types/database';
import type { CustomerDemand, DepotConfig, SavingMatrixResult } from '../../types/routing';
import { HaversineDistanceService } from '../../lib/distance';
import { calculateSavingMatrix } from '../../lib/savingMatrix';
import type {
  EditableRoute,
  EditableStop,
  MetricSettings,
} from '../../services/routingService';
import {
  recalculateRouteMetrics,
  saveFinalRoutes,
} from '../../services/routingService';
import { RouteMap, ROUTE_COLORS } from '../../components/RouteMap';
import { exportSuratJalanPdf } from '../../services/exportService';

export const RoutingPage: React.FC = () => {
  // Master & Raw Data
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Solving Configuration
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedCapacityKg, setSelectedCapacityKg] = useState<number>(1000);
  const [isSolving, setIsSolving] = useState(false);

  // Calculation Results & State
  const [routes, setRoutes] = useState<EditableRoute[]>([]);
  const [calculationLogs, setCalculationLogs] = useState<SavingMatrixResult['logs'] | null>(null);
  const [activeRouteIndex, setActiveRouteIndex] = useState<number | null>(null);
  const [isDetailLogModalOpen, setIsDetailLogModalOpen] = useState(false);

  // UI Notification & Saving State
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Ambil data pesanan siap, armada, driver, dan app_settings
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [ordersRes, vehRes, driverRes, settingsRes] = await Promise.all([
        supabase
          .from('orders')
          .select(`
            *,
            customers (id, nama_toko, alamat, no_hp, latitude, longitude)
          `)
          .eq('status', 'siap')
          .order('tanggal', { ascending: true }),
        supabase.from('vehicles').select('*').order('kapasitas_kg', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'driver').order('nama', { ascending: true }),
        supabase.from('app_settings').select('*').eq('id', 1).single(),
      ]);

      const readyData = (ordersRes.data || []) as Order[];
      setReadyOrders(readyData);
      // Pilih semua pesanan siap secara default
      setSelectedOrderIds(readyData.map((o) => o.id));

      const vehData = (vehRes.data || []) as Vehicle[];
      setVehicles(vehData);
      if (vehData.length > 0) {
        setSelectedCapacityKg(Number(vehData[0].kapasitas_kg));
      }

      setDrivers((driverRes.data || []) as Profile[]);
      if (settingsRes.data) {
        setAppSettings(settingsRes.data as AppSettings);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat data persiapan rute.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Distance Service instansiasi berdasarkan faktor jalan di settings
  const distanceService = useMemo(() => {
    const factor = appSettings ? Number(appSettings.faktor_jalan) : 1.0;
    return new HaversineDistanceService(factor, 4);
  }, [appSettings]);

  const metricSettings: MetricSettings = useMemo(() => {
    return {
      kecepatanRataRataKmh: appSettings ? Number(appSettings.kecepatan_rata_rata_kmh) : 40,
      konsumsiBbmKmPerLiter: appSettings ? Number(appSettings.konsumsi_bbm_km_per_liter) : 8,
      hargaBbmPerLiter: appSettings ? Number(appSettings.harga_bbm_per_liter) : 10000,
    };
  }, [appSettings]);

  const depotConfig: DepotConfig = useMemo(() => {
    return {
      nama: appSettings?.depot_nama || 'CV Saripan Plastik (Haurwangi, Cianjur)',
      lat: appSettings ? Number(appSettings.depot_lat) : -6.8272177,
      lng: appSettings ? Number(appSettings.depot_lng) : 107.2916367,
    };
  }, [appSettings]);

  // Toggle seleksi pesanan
  const handleToggleOrder = (orderId: string) => {
    if (selectedOrderIds.includes(orderId)) {
      setSelectedOrderIds(selectedOrderIds.filter((id) => id !== orderId));
    } else {
      setSelectedOrderIds([...selectedOrderIds, orderId]);
    }
  };

  const handleSelectAllOrders = () => {
    if (selectedOrderIds.length === readyOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(readyOrders.map((o) => o.id));
    }
  };

  // 2. Eksekusi Algoritma Saving Matrix (Client-Side)
  const handleSolveRoutes = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetOrders = readyOrders.filter((o) => selectedOrderIds.includes(o.id));
    if (targetOrders.length === 0) {
      setErrorMsg('Pilih minimal satu pesanan berstatus "siap" untuk dihitung rutenya.');
      return;
    }

    // Siapkan input customer demand
    const customerDemands: CustomerDemand[] = targetOrders.map((o) => ({
      id: o.customer_id,
      namaToko: o.customers?.nama_toko,
      lat: Number(o.customers?.latitude),
      lng: Number(o.customers?.longitude),
      demandKg: Number(o.total_muatan_kg),
    }));

    try {
      setIsSolving(true);

      const result = calculateSavingMatrix(
        depotConfig,
        customerDemands,
        selectedCapacityKg,
        { distanceService }
      );

      setCalculationLogs(result.logs);

      // Petakan rute hasil saving matrix ke EditableRoute
      const formattedRoutes: EditableRoute[] = result.routes.map((resRoute, rIdx) => {
        // Cocokkan armada dan driver default berurutan
        const defaultVeh = vehicles[rIdx % vehicles.length];
        const defaultDriver = drivers[rIdx % drivers.length];

        const initialStops: EditableStop[] = resRoute.urutanCustomerIds.map((custId, sIdx) => {
          const ord = targetOrders.find((o) => o.customer_id === custId)!;
          return {
            urutan: sIdx + 1,
            orderId: ord.id,
            customerId: custId,
            namaToko: ord.customers?.nama_toko || 'Toko Pelanggan',
            alamat: ord.customers?.alamat || '',
            lat: Number(ord.customers?.latitude),
            lng: Number(ord.customers?.longitude),
            muatanKg: Number(ord.total_muatan_kg),
            jarakDariSebelumnyaKm: 0,
          };
        });

        const initialRoute: EditableRoute = {
          tempId: `route-${rIdx + 1}-${Date.now()}`,
          vehicleId: defaultVeh?.id || '',
          driverId: defaultDriver?.id || '',
          stops: initialStops,
          totalJarakKm: 0,
          totalMuatanKg: 0,
          estimasiWaktuMenit: 0,
          estimasiBiayaBbm: 0,
          kapasitasMaksKg: selectedCapacityKg,
        };

        return recalculateRouteMetrics(
          initialRoute,
          depotConfig,
          distanceService,
          metricSettings
        );
      });

      setRoutes(formattedRoutes);
      setSuccessMsg(
        `Algoritma Saving Matrix berhasil menghitung ${formattedRoutes.length} rute optimal untuk ${targetOrders.length} toko.`
      );
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghitung rute Saving Matrix.');
    } finally {
      setIsSolving(false);
    }
  };

  // 3. Penyesuaian Interaktif: Naikkan Urutan Stop
  const handleMoveStopUp = (routeIndex: number, stopIndex: number) => {
    if (stopIndex === 0) return;
    const targetRoute = routes[routeIndex];
    const newStops = [...targetRoute.stops];
    const temp = newStops[stopIndex - 1];
    newStops[stopIndex - 1] = newStops[stopIndex];
    newStops[stopIndex] = temp;

    const updatedRoute = recalculateRouteMetrics(
      { ...targetRoute, stops: newStops },
      depotConfig,
      distanceService,
      metricSettings
    );

    const updatedRoutes = [...routes];
    updatedRoutes[routeIndex] = updatedRoute;
    setRoutes(updatedRoutes);
  };

  // Penyesuaian Interaktif: Turunkan Urutan Stop
  const handleMoveStopDown = (routeIndex: number, stopIndex: number) => {
    const targetRoute = routes[routeIndex];
    if (stopIndex === targetRoute.stops.length - 1) return;
    const newStops = [...targetRoute.stops];
    const temp = newStops[stopIndex + 1];
    newStops[stopIndex + 1] = newStops[stopIndex];
    newStops[stopIndex] = temp;

    const updatedRoute = recalculateRouteMetrics(
      { ...targetRoute, stops: newStops },
      depotConfig,
      distanceService,
      metricSettings
    );

    const updatedRoutes = [...routes];
    updatedRoutes[routeIndex] = updatedRoute;
    setRoutes(updatedRoutes);
  };

  // Penyesuaian Interaktif: Pindahkan Stop Antar Rute dengan Validasi Kapasitas
  const handleTransferStop = (
    fromRouteIdx: number,
    toRouteIdx: number,
    stopIdx: number
  ) => {
    if (fromRouteIdx === toRouteIdx) return;
    setErrorMsg(null);

    const fromRoute = routes[fromRouteIdx];
    const toRoute = routes[toRouteIdx];
    const stopToMove = fromRoute.stops[stopIdx];

    // Validasi Kapasitas Rute Tujuan
    const potentialWeight = toRoute.totalMuatanKg + stopToMove.muatanKg;
    const toRouteCapacity = toRoute.kapasitasMaksKg || selectedCapacityKg;

    if (potentialWeight > toRouteCapacity) {
      setErrorMsg(
        `Gagal memindahkan toko "${stopToMove.namaToko}": total muatan rute tujuan (${potentialWeight.toFixed(
          1
        )} kg) melebihi kapasitas kendaraan (${toRouteCapacity} kg).`
      );
      return;
    }

    // Jalankan pemindahan
    const newFromStops = fromRoute.stops.filter((_, idx) => idx !== stopIdx);
    const newToStops = [...toRoute.stops, stopToMove];

    const updatedFrom = recalculateRouteMetrics(
      { ...fromRoute, stops: newFromStops },
      depotConfig,
      distanceService,
      metricSettings
    );

    const updatedTo = recalculateRouteMetrics(
      { ...toRoute, stops: newToStops },
      depotConfig,
      distanceService,
      metricSettings
    );

    const updatedRoutes = [...routes];
    updatedRoutes[fromRouteIdx] = updatedFrom;
    updatedRoutes[toRouteIdx] = updatedTo;

    // Bersihkan rute yang menjadi kosong
    const finalRoutes = updatedRoutes.filter((r) => r.stops.length > 0);
    setRoutes(finalRoutes);
    setSuccessMsg(`Toko "${stopToMove.namaToko}" berhasil dipindahkan ke Rute #${toRouteIdx + 1}.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Perbarui Armada / Driver untuk rute tertentu
  const handleAssignVehicle = (routeIdx: number, vehicleId: string) => {
    const veh = vehicles.find((v) => v.id === vehicleId);
    const updated = [...routes];
    updated[routeIdx] = {
      ...updated[routeIdx],
      vehicleId,
      kapasitasMaksKg: veh ? Number(veh.kapasitas_kg) : selectedCapacityKg,
    };
    setRoutes(updated);
  };

  const handleAssignDriver = (routeIdx: number, driverId: string) => {
    const updated = [...routes];
    updated[routeIdx] = {
      ...updated[routeIdx],
      driverId,
    };
    setRoutes(updated);
  };

  // 4. Simpan Rute Final via RPC save_route Transaksional
  const handleSaveAllFinalRoutes = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (routes.length === 0) {
      setErrorMsg('Belum ada rute optimal yang dihitung.');
      return;
    }

    // Validasi setiap rute harus memiliki armada dan driver yang dipilih
    for (let i = 0; i < routes.length; i++) {
      const r = routes[i];
      if (!r.vehicleId) {
        setErrorMsg(`Harap pilih kendaraan armada untuk Rute #${i + 1}.`);
        return;
      }
      if (!r.driverId) {
        setErrorMsg(`Harap pilih driver untuk Rute #${i + 1}.`);
        return;
      }
      if (r.totalMuatanKg > r.kapasitasMaksKg) {
        setErrorMsg(
          `Muatan Rute #${i + 1} (${r.totalMuatanKg} kg) melebihi kapasitas kendaraan (${r.kapasitasMaksKg} kg). Sesuaikan urutan stop terlebih dahulu.`
        );
        return;
      }
    }

    try {
      setIsSaving(true);
      const createdIds = await saveFinalRoutes(routes, deliveryDate);

      setSuccessMsg(
        `Sukses! ${createdIds.length} rute pengiriman telah disimpan secara transaksional ke database. Pesanan di dalamnya otomatis berstatus "dalam_pengiriman".`
      );
      setRoutes([]);
      setCalculationLogs(null);
      // Muat ulang daftar pesanan siap
      loadInitialData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan rute ke database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadSuratJalan = async (route: EditableRoute, index: number) => {
    const veh = vehicles.find((v) => v.id === route.vehicleId);
    const drv = drivers.find((d) => d.id === route.driverId);
    await exportSuratJalanPdf(
      {
        routeId: route.tempId,
        tanggal: deliveryDate,
        platKendaraan: veh?.plat || 'No Plat',
        namaKendaraan: veh?.nama || `Armada #${index + 1}`,
        namaDriver: drv?.nama || 'Driver CV SP',
        totalJarakKm: route.totalJarakKm,
        totalMuatanKg: route.totalMuatanKg,
        stops: route.stops.map((s) => ({
          urutan: s.urutan,
          namaToko: s.namaToko,
          alamat: s.alamat,
          noHp: '',
          totalMuatanKg: s.muatanKg,
          items: [{ namaProduk: 'Produk Plastik', qty: 1, beratKg: s.muatanKg }],
        })),
      },
      appSettings?.depot_nama || 'CV Saripan Plastik'
    );
  };

  // Metrik Kumulatif Keseluruhan Rute
  const totalCumulative = useMemo(() => {
    return routes.reduce(
      (acc, r) => ({
        distanceKm: acc.distanceKm + r.totalJarakKm,
        payloadKg: acc.payloadKg + r.totalMuatanKg,
        timeMin: acc.timeMin + r.estimasiWaktuMenit,
        fuelCostRp: acc.fuelCostRp + r.estimasiBiayaBbm,
      }),
      { distanceKm: 0, payloadKg: 0, timeMin: 0, fuelCostRp: 0 }
    );
  }, [routes]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-xs text-muted font-medium">Memuat data persiapan rute...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Metode Saving Matrix (CVRP)
            </span>
            <h1 className="text-2xl font-bold text-ink">Penentuan Rute Distribusi Optimal</h1>
          </div>
          <p className="text-sm text-muted mt-0.5">
            Optimasi urutan pengiriman barang CV SP Plastik ke toko-toko pelanggan untuk meminimalkan jarak dan biaya BBM.
          </p>
        </div>

        {calculationLogs && (
          <button
            onClick={() => setIsDetailLogModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-line hover:bg-surface-subtle text-ink rounded-md text-xs font-semibold shadow-xs transition"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Detail Perhitungan (Bahan Bab 4)</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-3 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Panel 1: Konfigurasi & Seleksi Pesanan Siap */}
      <div className="bg-white p-6 rounded-md border border-line shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-ink">
              1. Pilih Pesanan Siap Kirim ({readyOrders.length} Pesanan)
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAllOrders}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              {selectedOrderIds.length === readyOrders.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
            </button>
            <span className="text-xs text-subtle">|</span>
            <button
              onClick={loadInitialData}
              title="Refresh pesanan"
              className="text-xs text-muted hover:text-ink flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang</span>
            </button>
          </div>
        </div>

        {readyOrders.length === 0 ? (
          <div className="p-8 text-center bg-surface-subtle rounded-md border border-dashed border-line text-muted text-xs">
            <RouteIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-ink">Tidak ada pesanan berstatus "Siap Kirim"</p>
            <p className="text-subtle mt-1">
              Tim gudang perlu mengonfirmasi kesiapan pesanan terlebih dahulu di dashboard gudang.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {readyOrders.map((ord) => {
              const isSelected = selectedOrderIds.includes(ord.id);
              return (
                <div
                  key={ord.id}
                  onClick={() => handleToggleOrder(ord.id)}
                  className={`p-3 rounded-md border text-xs cursor-pointer transition flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-300 text-blue-900 shadow-xs'
                      : 'bg-surface-subtle border-line text-muted hover:bg-surface-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // handled by parent div
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{ord.customers?.nama_toko}</p>
                    <p className="text-[11px] text-muted truncate">{ord.customers?.alamat}</p>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-muted">
                        {ord.customers?.latitude.toFixed(4)}, {ord.customers?.longitude.toFixed(4)}
                      </span>
                      <span className="font-bold text-blue-700 font-mono">
                        {ord.total_muatan_kg} kg
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Baris Parameter Solving */}
        <div className="pt-3 border-t border-line flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {/* Kapasitas Q */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">Kapasitas Armada ($Q$):</span>
              <div className="relative">
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={selectedCapacityKg}
                  onChange={(e) => setSelectedCapacityKg(parseFloat(e.target.value) || 1000)}
                  className="w-24 pl-2 pr-7 py-1.5 bg-surface-subtle border border-line rounded-lg text-xs font-mono font-bold text-center"
                />
                <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-subtle text-[10px]">
                  kg
                </span>
              </div>
            </div>

            {/* Info Depot */}
            <div className="text-muted flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>Depot: <strong className="text-ink">{depotConfig.nama}</strong></span>
            </div>
          </div>

          <button
            onClick={handleSolveRoutes}
            disabled={isSolving || readyOrders.length === 0 || selectedOrderIds.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-md text-sm shadow-md hover:shadow-lg transition"
          >
            {isSolving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menghitung Matriks...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Hitung Rute Optimal</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Panel 2: Hasil Perhitungan Rute & Visualisasi Peta Leaflet */}
      {routes.length > 0 && (
        <div className="space-y-6 animate-fadeIn">
          {/* Summary Metrik Rute Keseluruhan */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-md border border-line shadow-xs">
              <span className="text-[11px] font-semibold text-muted ">Total Rute</span>
              <p className="text-xl font-extrabold text-blue-700 mt-1">{routes.length} Armada</p>
            </div>
            <div className="p-4 bg-white rounded-md border border-line shadow-xs">
              <span className="text-[11px] font-semibold text-muted ">Total Jarak Tempuh</span>
              <p className="text-xl font-extrabold text-ink mt-1">{totalCumulative.distanceKm.toFixed(2)} km</p>
            </div>
            <div className="p-4 bg-white rounded-md border border-line shadow-xs">
              <span className="text-[11px] font-semibold text-muted ">Estimasi Waktu</span>
              <p className="text-xl font-extrabold text-emerald-600 mt-1">{totalCumulative.timeMin} menit</p>
            </div>
            <div className="p-4 bg-white rounded-md border border-line shadow-xs">
              <span className="text-[11px] font-semibold text-muted ">Estimasi Biaya BBM</span>
              <p className="text-xl font-extrabold text-amber-600 mt-1">
                Rp {totalCumulative.fuelCostRp.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Visualisasi Polyline Peta Leaflet */}
          <div className="bg-white p-4 rounded-md border border-line shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-ink text-sm">
                  Peta Rute Distribusi (OpenStreetMap + Leaflet Polyline)
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted">Sorot rute:</span>
                <select
                  value={activeRouteIndex === null ? 'all' : activeRouteIndex}
                  onChange={(e) =>
                    setActiveRouteIndex(e.target.value === 'all' ? null : parseInt(e.target.value))
                  }
                  className="px-2.5 py-1 bg-surface-subtle border border-line rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="all">Tampilkan Semua Rute</option>
                  {routes.map((_, idx) => (
                    <option key={idx} value={idx}>
                      Hanya Rute #{idx + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <RouteMap
              depot={depotConfig as any}
              routes={routes}
              selectedRouteIndex={activeRouteIndex}
              height="440px"
            />
          </div>

          {/* Panel Rincian Rute & Penyesuaian Stop */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink text-base">
                2. Rincian & Penyesuaian Urutan Stop per Armada
              </h3>
              <span className="text-xs text-muted">
                Gunakan tombol naik/turun atau pindah rute untuk penyesuaian manual.
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {routes.map((r, rIdx) => {
                const color = ROUTE_COLORS[rIdx % ROUTE_COLORS.length];
                const isOverCap = r.totalMuatanKg > r.kapasitasMaksKg;

                return (
                  <div
                    key={r.tempId}
                    className="bg-white rounded-md border border-line shadow-xs overflow-hidden flex flex-col justify-between"
                  >
                    {/* Header Rute */}
                    <div
                      className="p-4 border-b border-line flex items-center justify-between"
                      style={{ borderTop: `4px solid ${color}` }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <h4 className="font-extrabold text-ink text-sm">
                          Rute #{rIdx + 1} ({r.stops.length} Stop Toko)
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="px-2 py-0.5 bg-surface-muted rounded text-ink font-bold">
                          {r.totalJarakKm} km
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            isOverCap
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-50 text-blue-800'
                          }`}
                        >
                          {r.totalMuatanKg} / {r.kapasitasMaksKg} kg
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDownloadSuratJalan(r, rIdx)}
                          className="p-1 px-2 rounded bg-white hover:bg-surface-muted text-ink border border-line transition flex items-center gap-1 font-sans font-semibold text-[11px]"
                          title="Unduh Surat Jalan PDF"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>

                    {/* Penugasan Armada & Driver */}
                    <div className="p-4 bg-surface-subtle/60 border-b border-line grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-muted mb-1">
                          Armada Kendaraan *
                        </label>
                        <select
                          value={r.vehicleId}
                          onChange={(e) => handleAssignVehicle(rIdx, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-line rounded-lg text-xs font-medium text-ink focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="">-- Pilih Kendaraan --</option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.nama} ({v.plat}) &bull; {v.kapasitas_kg} kg
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-muted mb-1">
                          Driver Pengiriman *
                        </label>
                        <select
                          value={r.driverId}
                          onChange={(e) => handleAssignDriver(rIdx, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-line rounded-lg text-xs font-medium text-ink focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="">-- Pilih Driver --</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.nama} (@{d.username})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Tabel Stop Toko */}
                    <div className="p-4 divide-y divide-slate-100 flex-1">
                      {r.stops.map((stop, sIdx) => (
                        <div
                          key={stop.orderId}
                          className="py-2.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-[10px] flex-shrink-0"
                              style={{ backgroundColor: color }}
                            >
                              {stop.urutan}
                            </span>
                            <div className="truncate">
                              <p className="font-bold text-ink truncate">{stop.namaToko}</p>
                              <p className="text-[11px] text-muted font-mono">
                                +{stop.jarakDariSebelumnyaKm} km &bull; {stop.muatanKg} kg
                              </p>
                            </div>
                          </div>

                          {/* Tombol Reorder & Move */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              disabled={sIdx === 0}
                              onClick={() => handleMoveStopUp(rIdx, sIdx)}
                              title="Pindah ke urutan sebelumnya"
                              className="p-1 text-subtle hover:text-ink disabled:opacity-20"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={sIdx === r.stops.length - 1}
                              onClick={() => handleMoveStopDown(rIdx, sIdx)}
                              title="Pindah ke urutan berikutnya"
                              className="p-1 text-subtle hover:text-ink disabled:opacity-20"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown Pindah Antar Rute */}
                            {routes.length > 1 && (
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleTransferStop(rIdx, parseInt(e.target.value), sIdx);
                                  }
                                }}
                                title="Pindahkan toko ini ke rute armada lain"
                                className="ml-1 text-[10px] bg-surface-muted hover:bg-slate-200 text-ink rounded px-1.5 py-0.5 border border-line font-semibold"
                              >
                                <option value="">Pindah...</option>
                                {routes.map((_, otherIdx) =>
                                  otherIdx !== rIdx ? (
                                    <option key={otherIdx} value={otherIdx}>
                                      Ke Rute #{otherIdx + 1}
                                    </option>
                                  ) : null
                                )}
                              </select>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Estimasi Operasional Rute */}
                    <div className="p-3 bg-surface-subtle border-t border-line flex items-center justify-between text-[11px] text-muted">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-subtle" />
                        <span>Estimasi: <strong>{r.estimasiWaktuMenit} menit</strong></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Fuel className="w-3.5 h-3.5 text-subtle" />
                        <span>BBM: <strong>Rp {r.estimasiBiayaBbm.toLocaleString('id-ID')}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel 3: Finalisasi & Simpan ke Database */}
          <div className="p-6 bg-ink rounded-md text-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold">3. Finalisasi Rute Pengiriman</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Rute akan disimpan ke database secara transaksional (ACID). Driver akan menerima penugasan di dashboard masing-masing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div>
                <label className="block text-[10px] text-slate-300  font-semibold mb-0.5">
                  Tanggal Pengiriman:
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-md text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <button
                onClick={handleSaveAllFinalRoutes}
                disabled={isSaving}
                className="mt-3 sm:mt-0 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-md text-xs sm:text-sm shadow-md transition flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan Rute...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan & Terbitkan Rute</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Detail Perhitungan Algoritma untuk Bahan Laporan Bab 4 */}
      {isDetailLogModalOpen && calculationLogs && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50  flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-md border border-line max-w-4xl w-full overflow-hidden animate-scaleIn">
            <div className="flex justify-between items-center px-6 py-4 border-b border-line">
              <div>
                <h2 className="text-base font-bold text-ink">
                  Detail Log Algoritma Clarke-Wright Saving Matrix
                </h2>
                <p className="text-xs text-muted">
                  Data pembuktian matematis untuk Lampiran dan Bab 4 Laporan Kerja Praktek.
                </p>
              </div>
              <button
                onClick={() => setIsDetailLogModalOpen(false)}
                className="p-1.5 text-subtle hover:text-ink rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
              {/* Bagian A: Matriks Penghematan Terurut (Savings List) */}
              <div>
                <h3 className="font-bold text-ink text-sm mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">
                    1
                  </span>
                  Tabel Nilai Penghematan Terurut (Sorted Savings)
                </h3>
                <p className="text-muted mb-2">
                  Dihitung menggunakan rumus $S(i, j) = d(0, i) + d(0, j) - d(i, j)$ dan diurutkan menurun. Nilai $\le 0$ dibuang.
                </p>
                <div className="border border-line rounded-md overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface-subtle font-semibold text-ink border-b border-line">
                      <tr>
                        <th className="py-2 px-3">No</th>
                        <th className="py-2 px-3">Pasangan Node (i, j)</th>
                        <th className="py-2 px-3 text-right">Nilai Saving S(i, j)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {calculationLogs.savingsList.slice(0, 15).map((s, idx) => (
                        <tr key={idx} className="hover:bg-surface-subtle">
                          <td className="py-1.5 px-3 text-subtle">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-semibold text-ink">
                            Node {s.i} &mdash; Node {s.j}
                          </td>
                          <td className="py-1.5 px-3 text-right text-blue-700 font-bold">
                            {s.savingKm.toFixed(2)} km
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {calculationLogs.savingsList.length > 15 && (
                    <div className="p-2 text-center text-subtle bg-surface-subtle text-[11px]">
                      ... dan {calculationLogs.savingsList.length - 15} pasangan saving lainnya.
                    </div>
                  )}
                </div>
              </div>

              {/* Bagian B: Log Langkah Penggabungan (Trace Merging) */}
              <div>
                <h3 className="font-bold text-ink text-sm mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">
                    2
                  </span>
                  Riwayat Penggabungan Rute (Merge Steps Trace)
                </h3>
                <p className="text-muted mb-2">
                  Pencatatan keputusan algoritma: MERGED (gabung), REJECTED_CAPACITY (muatan melebihi $Q$), atau REJECTED_NOT_EXTERIOR (bukan di ujung rute).
                </p>
                <div className="border border-line rounded-md overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface-subtle font-semibold text-ink border-b border-line">
                      <tr>
                        <th className="py-2 px-3">Step</th>
                        <th className="py-2 px-3">Pasangan</th>
                        <th className="py-2 px-3">Saving</th>
                        <th className="py-2 px-3">Keputusan</th>
                        <th className="py-2 px-3">Keterangan / Hasil Rute</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {calculationLogs.mergeSteps.map((m) => (
                        <tr key={m.step} className="hover:bg-surface-subtle">
                          <td className="py-1.5 px-3 font-mono text-subtle">{m.step}</td>
                          <td className="py-1.5 px-3 font-mono font-semibold text-ink">
                            ({m.pair[0]}, {m.pair[1]})
                          </td>
                          <td className="py-1.5 px-3 font-mono text-blue-600">{m.savingKm} km</td>
                          <td className="py-1.5 px-3">
                            {m.action === 'MERGED' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                MERGED
                              </span>
                            )}
                            {m.action === 'REJECTED_CAPACITY' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                REJECT (Kapasitas)
                              </span>
                            )}
                            {m.action === 'REJECTED_NOT_EXTERIOR' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-muted text-ink">
                                REJECT (Bukan Ujung)
                              </span>
                            )}
                            {m.action === 'REJECTED_SAME_ROUTE' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-muted text-ink">
                                REJECT (Rute Sama)
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-[11px] text-muted">
                            {m.action === 'MERGED'
                              ? `Rute Baru: [${m.resultRoute?.join(' → ')}]`
                              : m.reason || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-surface-subtle border-t border-line flex justify-end">
              <button
                onClick={() => setIsDetailLogModalOpen(false)}
                className="px-4 py-2 bg-white border border-line text-ink font-medium rounded-md text-xs hover:bg-surface-muted transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
