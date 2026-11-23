import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Download,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Truck,
  ArrowUp,
  ArrowDown,
  Info,
  Layers,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { HaversineDistanceService } from '../../lib/distance';
import {
  calculateConventionalRouteDistance,
  compareRoutesMetrics,
  formatRupiah,
  formatEfficiencyLabel,
  formatTanggalWIB,
  type EvaluationComparisonResult,
} from '../../lib/evaluationLogic';
import { exportEvaluasiPdf } from '../../services/exportService';
import { depotIcon } from '../../lib/leafletIcons';
import { createNumberedIcon } from '../../components/RouteMap';

interface RouteOption {
  id: string;
  tanggal: string;
  vehicle_id: string;
  driver_id: string;
  total_jarak_km: number;
  total_muatan_kg: number;
  estimasi_biaya_bbm: number;
  vehicle?: { nama: string; plat: string };
  driver?: { nama: string };
  stops: Array<{
    id: string;
    urutan: number;
    order_id: string;
    customer_id: string;
    customer?: {
      id: string;
      nama_toko: string;
      alamat: string;
      latitude: number;
      longitude: number;
    };
  }>;
}

interface ConventionalStopItem {
  customerId: string;
  namaToko: string;
  alamat: string;
  lat: number;
  lng: number;
}

export const EvaluationPage: React.FC = () => {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [appSettings, setAppSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State Urutan Stop Konvensional yang dapat diatur ulang
  const [conventionalStops, setConventionalStops] = useState<ConventionalStopItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [routesRes, settingsRes] = await Promise.all([
        supabase
          .from('routes')
          .select(`
            *,
            vehicle:vehicles(nama, plat),
            driver:profiles!driver_id(nama),
            stops:route_stops(
              id, urutan, order_id, customer_id,
              customer:customers(id, nama_toko, alamat, latitude, longitude)
            )
          `)
          .order('tanggal', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('app_settings').select('*').eq('id', 1).single(),
      ]);

      if (routesRes.error) throw routesRes.error;

      const loadedRoutes = (routesRes.data || []) as RouteOption[];
      setRoutes(loadedRoutes);
      if (settingsRes.data) {
        setAppSettings(settingsRes.data);
      }

      if (loadedRoutes.length > 0 && !selectedRouteId) {
        setSelectedRouteId(loadedRoutes[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat data rute untuk evaluasi.');
    } finally {
      setLoading(false);
    }
  }, [selectedRouteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Rute Optimal terpilih
  const currentRoute = useMemo(() => {
    return routes.find((r) => r.id === selectedRouteId) || null;
  }, [routes, selectedRouteId]);

  // Inisialisasi urutan konvensional saat rute terpilih berubah
  useEffect(() => {
    if (!currentRoute) {
      setConventionalStops([]);
      return;
    }

    const stopsSorted = [...(currentRoute.stops || [])].sort((a, b) => a.urutan - b.urutan);
    const mapped: ConventionalStopItem[] = stopsSorted
      .filter((s) => s.customer)
      .map((s) => ({
        customerId: s.customer!.id,
        namaToko: s.customer!.nama_toko,
        alamat: s.customer!.alamat,
        lat: Number(s.customer!.latitude),
        lng: Number(s.customer!.longitude),
      }));

    // Secara default, balik urutan toko pertama dan terakhir untuk simulasi rute kebiasaan sebelum dioptimasi
    if (mapped.length > 2) {
      const reversed = [...mapped];
      const temp = reversed[0];
      reversed[0] = reversed[reversed.length - 1];
      reversed[reversed.length - 1] = temp;
      setConventionalStops(reversed);
    } else {
      setConventionalStops(mapped);
    }
  }, [currentRoute]);

  // Jarak Service dengan faktor jalan yang sama
  const distanceService = useMemo(() => {
    const factor = appSettings ? Number(appSettings.faktor_jalan) : 1.3;
    return new HaversineDistanceService(factor, 4);
  }, [appSettings]);

  const costParams = useMemo(() => {
    return {
      konsumsiBbmKmPerLiter: appSettings ? Number(appSettings.konsumsi_bbm_km_per_liter) : 8,
      hargaBbmPerLiter: appSettings ? Number(appSettings.harga_bbm_per_liter) : 10000,
    };
  }, [appSettings]);

  const depotCoord = useMemo(() => {
    return {
      lat: appSettings ? Number(appSettings.depot_lat) : -6.827218,
      lng: appSettings ? Number(appSettings.depot_lng) : 107.291637,
    };
  }, [appSettings]);

  // Hitung Metrik Komparasi Apple-to-Apple
  const evaluationResult: EvaluationComparisonResult | null = useMemo(() => {
    if (!currentRoute || conventionalStops.length === 0) return null;

    const dConv = calculateConventionalRouteDistance(
      depotCoord,
      conventionalStops.map((s) => ({ lat: s.lat, lng: s.lng })),
      distanceService
    );

    const dOpt = Number(currentRoute.total_jarak_km);

    return compareRoutesMetrics(dConv, dOpt, costParams);
  }, [currentRoute, conventionalStops, depotCoord, distanceService, costParams]);

  // Manipulasi Urutan Toko Konvensional (Move Up / Down)
  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= conventionalStops.length) return;

    const updated = [...conventionalStops];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setConventionalStops(updated);
  };

  // Balik Urutan Toko Konvensional
  const handleReverseConventionalStops = () => {
    setConventionalStops([...conventionalStops].reverse());
  };

  // Simpan Snapshot Evaluasi ke Database (Tabel conventional_routes)
  const handleSaveSnapshot = async () => {
    if (!currentRoute || !evaluationResult) return;

    try {
      setIsSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const snapshotSettings = {
        depot_lat: depotCoord.lat,
        depot_lng: depotCoord.lng,
        depot_nama: appSettings?.depot_nama || 'CV Saripan Plastik',
        faktor_jalan: appSettings?.faktor_jalan || 1.3,
        konsumsi_bbm_km_per_liter: costParams.konsumsiBbmKmPerLiter,
        harga_bbm_per_liter: costParams.hargaBbmPerLiter,
      };

      const payload = {
        tanggal: currentRoute.tanggal,
        urutan_customer_ids: conventionalStops.map((s) => s.customerId),
        total_jarak_km: evaluationResult.jarakKonvensionalKm,
        biaya_bbm: evaluationResult.biayaBbmKonvensionalRp,
        optimal_route_id: currentRoute.id,
        vehicle_id: currentRoute.vehicle_id || null,
        optimal_jarak_km: evaluationResult.jarakOptimalKm,
        optimal_biaya_bbm: evaluationResult.biayaBbmOptimalRp,
        selisih_jarak_km: evaluationResult.selisihJarakKm,
        persentase_penghematan_jarak: evaluationResult.persentasePenghematanJarak,
        selisih_biaya_bbm: evaluationResult.selisihBiayaBbmRp,
        snapshot_settings: snapshotSettings,
        created_by: user?.id || null,
      };

      const { error } = await supabase.from('conventional_routes').insert(payload);
      if (error) throw error;

      setSuccessMsg('Snapshot perbandingan rute berhasil disimpan ke riwayat evaluasi!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan snapshot evaluasi.');
    } finally {
      setIsSaving(false);
    }
  };

  // Ekspor PDF Komparasi Bab 4
  const handleExportPdf = async () => {
    if (!currentRoute || !evaluationResult) return;

    const optStopsSorted = [...currentRoute.stops].sort((a, b) => a.urutan - b.urutan);

    await exportEvaluasiPdf(
      {
        tanggal: currentRoute.tanggal,
        armadaPlat: `${currentRoute.vehicle?.plat || '-'} (${currentRoute.vehicle?.nama || 'Armada'})`,
        namaDriver: currentRoute.driver?.nama || 'Driver CV SP',
        jarakKonvensionalKm: evaluationResult.jarakKonvensionalKm,
        biayaBbmKonvensionalRp: evaluationResult.biayaBbmKonvensionalRp,
        jarakOptimalKm: evaluationResult.jarakOptimalKm,
        biayaBbmOptimalRp: evaluationResult.biayaBbmOptimalRp,
        selisihJarakKm: evaluationResult.selisihJarakKm,
        persentaseHemat: evaluationResult.persentasePenghematanJarak,
        selisihBbmRp: evaluationResult.selisihBiayaBbmRp,
        urutanTokoKonvensional: conventionalStops.map((s) => s.namaToko),
        urutanTokoOptimal: optStopsSorted.map((s) => s.customer?.nama_toko || 'Toko'),
      },
      appSettings?.depot_nama || 'CV Saripan Plastik'
    );
  };

  // Polyline Koordinat untuk Peta Komparasi
  const conventionalPolylineCoords: [number, number][] = useMemo(() => {
    if (conventionalStops.length === 0) return [];
    const coords: [number, number][] = [[depotCoord.lat, depotCoord.lng]];
    conventionalStops.forEach((s) => coords.push([s.lat, s.lng]));
    coords.push([depotCoord.lat, depotCoord.lng]);
    return coords;
  }, [conventionalStops, depotCoord]);

  const optimalPolylineCoords: [number, number][] = useMemo(() => {
    if (!currentRoute || !currentRoute.stops) return [];
    const sorted = [...currentRoute.stops].sort((a, b) => a.urutan - b.urutan);
    const coords: [number, number][] = [[depotCoord.lat, depotCoord.lng]];
    sorted.forEach((s) => {
      if (s.customer) {
        coords.push([Number(s.customer.latitude), Number(s.customer.longitude)]);
      }
    });
    coords.push([depotCoord.lat, depotCoord.lng]);
    return coords;
  }, [currentRoute, depotCoord]);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Bab 4 &bull; Analisis & Evaluasi
            </span>
            <h1 className="text-2xl font-bold text-slate-900">
              Evaluasi Rute Konvensional vs Saving Matrix
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Perbandingan efisiensi jarak tempuh dan biaya bahan bakar armada antara kebiasaan sopir lama vs metode Saving Matrix.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={!evaluationResult}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Ekspor PDF Evaluasi (Bab 4)</span>
          </button>

          <button
            onClick={handleSaveSnapshot}
            disabled={isSaving || !evaluationResult}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Riwayat Evaluasi'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-800">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Catatan Metodologi Apple-to-Apple */}
      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block">
            Prinsip Perbandingan Adil (Apple-to-Apple Comparison):
          </span>
          <p className="leading-relaxed">
            Perbandingan menggunakan kumpulan toko yang sama, konsumsi BBM yang sama (
            <strong>{costParams.konsumsiBbmKmPerLiter} km/liter</strong>), dan harga BBM yang sama (
            <strong>{formatRupiah(costParams.hargaBbmPerLiter)}/liter</strong>). Jarak tempuh merupakan{' '}
            <strong>estimasi jarak jalan darat</strong> (formula Haversine &times; faktor jalan{' '}
            {appSettings?.faktor_jalan || 1.3}&times;), bukan jarak odometer speedometer kendaraan.
          </p>
        </div>
      </div>

      {/* Panel 1: Pemilihan Rute Hasil Saving Matrix */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Pilih Rute Armada untuk Dievaluasi:</h2>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full sm:w-80 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {formatTanggalWIB(r.tanggal)} &bull; {r.vehicle?.plat || 'No Plat'} &bull;{' '}
                  {r.stops.length} Toko ({r.total_jarak_km} km)
                </option>
              ))}
            </select>

            <button
              onClick={loadData}
              disabled={loading}
              title="Muat Ulang"
              className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-600 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Panel 2: Kartu Komparasi Hasil Efisiensi */}
      {evaluationResult && currentRoute && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Jarak Konvensional */}
          <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs space-y-1">
            <div className="flex justify-between items-center text-xs text-rose-700 font-semibold">
              <span>Rute Konvensional</span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900">
              {evaluationResult.jarakKonvensionalKm.toFixed(2)}{' '}
              <span className="text-sm font-semibold text-slate-500">km</span>
            </h3>
            <p className="text-xs text-slate-500">
              Biaya BBM: {formatRupiah(evaluationResult.biayaBbmKonvensionalRp)}
            </p>
          </div>

          {/* Card 2: Jarak Saving Matrix */}
          <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs space-y-1">
            <div className="flex justify-between items-center text-xs text-blue-700 font-semibold">
              <span>Rute Saving Matrix</span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            </div>
            <h3 className="text-2xl font-extrabold text-blue-700">
              {evaluationResult.jarakOptimalKm.toFixed(2)}{' '}
              <span className="text-sm font-semibold text-slate-500">km</span>
            </h3>
            <p className="text-xs text-slate-500">
              Biaya BBM: {formatRupiah(evaluationResult.biayaBbmOptimalRp)}
            </p>
          </div>

          {/* Card 3: Selisih Jarak Hemat */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-1">
            <div className="flex justify-between items-center text-xs text-emerald-700 font-semibold">
              <span>Penghematan Jarak</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            </div>
            <h3 className="text-2xl font-extrabold text-emerald-700">
              {evaluationResult.selisihJarakKm >= 0 ? '+' : ''}
              {evaluationResult.selisihJarakKm.toFixed(2)}{' '}
              <span className="text-sm font-semibold text-slate-500">km</span>
            </h3>
            <p className="text-xs text-slate-500">
              Hemat BBM: {formatRupiah(evaluationResult.selisihBiayaBbmRp)}
            </p>
          </div>

          {/* Card 4: Persentase Efisiensi */}
          <div className="bg-gradient-to-br from-blue-700 to-indigo-800 p-5 rounded-2xl shadow-md text-white space-y-1">
            <span className="text-xs font-bold text-blue-200 block uppercase tracking-wider">
              Persentase Efisiensi (%)
            </span>
            <h3 className="text-2xl font-black">
              {formatEfficiencyLabel(evaluationResult.persentasePenghematanJarak)}
            </h3>
            <p className="text-[11px] text-blue-100/90 leading-tight">
              {evaluationResult.persentasePenghematanJarak &&
              evaluationResult.persentasePenghematanJarak > 0
                ? 'Rute Saving Matrix lebih pendek dan menghemat biaya operasional.'
                : 'Evaluasi berdasarkan urutan stop yang ditentukan.'}
            </p>
          </div>
        </div>
      )}

      {/* Grid: Form Atur Urutan Konvensional & Peta Komparasi */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Form Urutan Toko Konvensional (4 Kolom) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Urutan Rute Konvensional</h3>
              <p className="text-[11px] text-slate-500">
                Atur urutan kebiasaan driver lama dengan tombol panah:
              </p>
            </div>
            <button
              onClick={handleReverseConventionalStops}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition border border-rose-200"
            >
              Balik Urutan
            </button>
          </div>

          {/* Depot Awal */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs">
            <div className="w-6 h-6 rounded-lg bg-red-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
              D
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-red-900 block truncate">
                Depot CV Saripan Plastik (Awal)
              </span>
              <span className="text-[10px] text-red-700">Haurwangi, Cianjur</span>
            </div>
          </div>

          {/* List Stops Konvensional */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {conventionalStops.map((stop, idx) => (
              <div
                key={stop.customerId}
                className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-rose-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 block truncate">
                      {stop.namaToko}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {stop.alamat}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    disabled={idx === 0}
                    onClick={() => handleMoveStop(idx, 'up')}
                    className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 text-slate-600"
                    title="Pindahkan Lebih Awal"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === conventionalStops.length - 1}
                    onClick={() => handleMoveStop(idx, 'down')}
                    className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 text-slate-600"
                    title="Pindahkan Lebih Akhir"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Depot Akhir */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs">
            <div className="w-6 h-6 rounded-lg bg-red-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
              D
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-red-900 block truncate">
                Kembali ke Depot CV Saripan Plastik (Selesai)
              </span>
              <span className="text-[10px] text-red-700">Haurwangi, Cianjur</span>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Peta Komparasi Jalur Berwarna (7 Kolom) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Visualisasi Jalur Rute pada Peta:
              </h3>
            </div>

            {/* Legenda Warna Peta */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-rose-700">
                <span className="w-5 h-0.5 border-t-2 border-dashed border-rose-600 inline-block"></span>
                <span>Konvensional</span>
              </div>
              <div className="flex items-center gap-1.5 text-blue-700">
                <span className="w-5 h-1 bg-blue-600 rounded-full inline-block"></span>
                <span>Saving Matrix</span>
              </div>
            </div>
          </div>

          {/* Peta Leaflet Berdampingan */}
          <div className="h-[480px] w-full rounded-2xl overflow-hidden border border-slate-200 relative">
            <MapContainer
              center={[depotCoord.lat, depotCoord.lng]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Pin Depot */}
              <Marker position={[depotCoord.lat, depotCoord.lng]} icon={depotIcon}>
                <Popup>
                  <div className="font-sans text-xs">
                    <strong className="text-red-700 block">Depot CV Saripan Plastik</strong>
                    <span>Haurwangi, Kabupaten Cianjur</span>
                  </div>
                </Popup>
              </Marker>

              {/* Pin Toko Pelanggan */}
              {conventionalStops.map((stop, i) => (
                <Marker
                  key={stop.customerId}
                  position={[stop.lat, stop.lng]}
                  icon={createNumberedIcon(i + 1, '#1e3a8a')}
                >
                  <Popup>
                    <div className="font-sans text-xs">
                      <strong className="block text-slate-900">{stop.namaToko}</strong>
                      <span className="text-slate-600">{stop.alamat}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Jalur Rute Konvensional: Garis Putus-putus Merah */}
              {conventionalPolylineCoords.length > 1 && (
                <Polyline
                  positions={conventionalPolylineCoords}
                  pathOptions={{
                    color: '#e11d48', // Rose-600
                    weight: 3.5,
                    dashArray: '8, 8',
                    opacity: 0.85,
                  }}
                />
              )}

              {/* Jalur Rute Saving Matrix: Garis Tegas Biru */}
              {optimalPolylineCoords.length > 1 && (
                <Polyline
                  positions={optimalPolylineCoords}
                  pathOptions={{
                    color: '#2563eb', // Blue-600
                    weight: 4,
                    opacity: 0.9,
                  }}
                />
              )}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
