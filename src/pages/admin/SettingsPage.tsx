import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Fuel,
  Gauge,
  Sliders,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MapLocationPicker } from '../../components/MapLocationPicker';

export const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [depotNama, setDepotNama] = useState('CV Saripan Plastik (Haurwangi, Cianjur)');
  const [depotLat, setDepotLat] = useState<number>(-6.8272177);
  const [depotLng, setDepotLng] = useState<number>(107.2916367);
  const [konsumsiBbm, setKonsumsiBbm] = useState<number>(8.0);
  const [hargaBbm, setHargaBbm] = useState<number>(10000);
  const [kecepatanRataRata, setKecepatanRataRata] = useState<number>(40.0);
  const [faktorJalan, setFaktorJalan] = useState<number>(1.0);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setDepotNama(data.depot_nama);
        setDepotLat(data.depot_lat);
        setDepotLng(data.depot_lng);
        setKonsumsiBbm(Number(data.konsumsi_bbm_km_per_liter));
        setHargaBbm(Number(data.harga_bbm_per_liter));
        setKecepatanRataRata(Number(data.kecepatan_rata_rata_kmh));
        setFaktorJalan(Number(data.faktor_jalan));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat pengaturan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!depotNama.trim()) {
      setErrorMsg('Nama depot gudang pusat wajib diisi.');
      return;
    }

    if (isNaN(depotLat) || depotLat < -90 || depotLat > 90) {
      setErrorMsg('Latitude depot tidak valid.');
      return;
    }

    if (isNaN(depotLng) || depotLng < -180 || depotLng > 180) {
      setErrorMsg('Longitude depot tidak valid.');
      return;
    }

    if (konsumsiBbm <= 0 || hargaBbm <= 0 || kecepatanRataRata <= 0 || faktorJalan <= 0) {
      setErrorMsg('Parameter biaya, kecepatan, dan faktor jalan harus lebih besar dari 0.');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.from('app_settings').upsert({
        id: 1,
        depot_nama: depotNama.trim(),
        depot_lat: depotLat,
        depot_lng: depotLng,
        konsumsi_bbm_km_per_liter: konsumsiBbm,
        harga_bbm_per_liter: hargaBbm,
        kecepatan_rata_rata_kmh: kecepatanRataRata,
        faktor_jalan: faktorJalan,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      setSuccessMsg('Pengaturan sistem dan lokasi depot berhasil disimpan.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan Depot & Parameter Biaya</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Konfigurasi titik awal/akhir rute pengiriman (Depot CV SP Plastik) dan konstanta perhitungan efisiensi distribusi.
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Memuat pengaturan sistem...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Lokasi Depot Pusat */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <MapPin className="w-5 h-5 text-red-600" />
              <h2 className="text-base font-bold text-slate-900">
                Titik Depot / Gudang Pusat (Node 0)
              </h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Nama Depot / Fasilitas *
              </label>
              <input
                type="text"
                value={depotNama}
                onChange={(e) => setDepotNama(e.target.value)}
                placeholder="CV Saripan Plastik Haurwangi"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Peta Lokasi Depot (Peta Leaflet)
                </label>
                <span className="text-[11px] text-blue-600 font-medium">
                  Titik awal dan akhir seluruh rute kendaraan
                </span>
              </div>
              <MapLocationPicker
                lat={depotLat}
                lng={depotLng}
                onChange={(lat, lng) => {
                  setDepotLat(lat);
                  setDepotLng(lng);
                }}
                height="300px"
                markerLabel={depotNama}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Latitude Depot
                </label>
                <input
                  type="number"
                  step="any"
                  value={depotLat}
                  onChange={(e) => setDepotLat(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Longitude Depot
                </label>
                <input
                  type="number"
                  step="any"
                  value={depotLng}
                  onChange={(e) => setDepotLng(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Card 2: Parameter Operasional & Biaya BBM */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Fuel className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                Parameter Distribusi & Estimasi Biaya
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Konsumsi BBM */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Konsumsi BBM
                  </label>
                  <Fuel className="w-4 h-4 text-slate-400" />
                </div>
                <div className="relative mt-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={konsumsiBbm}
                    onChange={(e) => setKonsumsiBbm(parseFloat(e.target.value) || 0)}
                    className="w-full pl-3 pr-16 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400 text-xs">
                    km/liter
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Jarak tempuh rata-rata kendaraan per liter BBM.
                </p>
              </div>

              {/* Harga BBM */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Harga BBM Per Liter
                  </label>
                  <Sliders className="w-4 h-4 text-slate-400" />
                </div>
                <div className="relative mt-2">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs font-medium">
                    Rp
                  </div>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={hargaBbm}
                    onChange={(e) => setHargaBbm(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Harga bahan bakar acuan (contoh: Pertalite / Bio Solar).
                </p>
              </div>

              {/* Kecepatan Rata-rata */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Kecepatan Rata-Rata
                  </label>
                  <Gauge className="w-4 h-4 text-slate-400" />
                </div>
                <div className="relative mt-2">
                  <input
                    type="number"
                    min="10"
                    step="5"
                    value={kecepatanRataRata}
                    onChange={(e) => setKecepatanRataRata(parseFloat(e.target.value) || 0)}
                    className="w-full pl-3 pr-14 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400 text-xs">
                    km/jam
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Digunakan untuk estimasi durasi tempuh rute pengiriman.
                </p>
              </div>

              {/* Faktor Koreksi Jalan */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Faktor Koreksi Jalan
                  </label>
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                </div>
                <div className="relative mt-2">
                  <input
                    type="number"
                    min="1.0"
                    max="2.0"
                    step="0.05"
                    value={faktorJalan}
                    onChange={(e) => setFaktorJalan(parseFloat(e.target.value) || 1.0)}
                    className="w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400 text-xs">
                    x
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Pengali jarak Haversine garis lurus ke jarak jalan darat (default: 1.0).
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan Pengaturan...' : 'Simpan Semua Pengaturan'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
