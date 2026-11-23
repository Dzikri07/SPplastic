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
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Pengaturan Depot & Parameter Biaya</h1>
        <p className="text-sm text-muted mt-1">
          Konfigurasi titik awal/akhir rute pengiriman (Depot CV SP Plastik) dan konstanta perhitungan efisiensi distribusi.
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div
          role="alert"
          className="border-l-2 border-teal-600 bg-[#EDFAF7] px-3.5 py-2.5 text-sm text-[#0F4E4A] flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="border-l-2 border-danger bg-danger-bg px-3.5 py-2.5 text-sm text-danger-text flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-muted flex flex-col items-center gap-3 bg-white rounded-md border border-border">
          <span className="w-5 h-5 rounded-full border-2 border-border-strong border-t-petrol-900 animate-spin motion-reduce:animate-none" />
          <p className="text-sm">Memuat pengaturan sistem...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Lokasi Depot Pusat */}
          <div className="bg-white p-6 rounded-md border border-border space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <MapPin className="w-5 h-5 text-amber-400" />
              <h2 className="font-display text-base font-bold text-ink">
                Titik Depot / Gudang Pusat (Node 0)
              </h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Nama depot / fasilitas *
              </label>
              <input
                type="text"
                value={depotNama}
                onChange={(e) => setDepotNama(e.target.value)}
                placeholder="CV Saripan Plastik Haurwangi"
                className="w-full h-11 px-3.5 bg-white border border-border rounded-md text-[15px] text-ink placeholder:text-subtle focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-ink">
                  Peta lokasi depot (Peta Leaflet)
                </label>
                <span className="text-xs text-muted">
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
                <label className="block text-xs font-medium text-muted mb-1">
                  Latitude depot
                </label>
                <input
                  type="number"
                  step="any"
                  value={depotLat}
                  onChange={(e) => setDepotLat(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 bg-white border border-border rounded-md text-xs font-mono text-ink focus:outline-none focus:border-teal-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Longitude depot
                </label>
                <input
                  type="number"
                  step="any"
                  value={depotLng}
                  onChange={(e) => setDepotLng(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 bg-white border border-border rounded-md text-xs font-mono text-ink focus:outline-none focus:border-teal-600"
                  required
                />
              </div>
            </div>
          </div>

          {/* Card 2: Parameter Operasional & Biaya BBM */}
          <div className="bg-white p-6 rounded-md border border-border space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Fuel className="w-5 h-5 text-teal-600" />
              <h2 className="font-display text-base font-bold text-ink">
                Parameter Distribusi & Estimasi Biaya
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Konsumsi BBM */}
              <div className="p-4 bg-surface-subtle rounded-md border border-border">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-ink">
                    Konsumsi BBM
                  </label>
                  <Fuel className="w-4 h-4 text-muted" />
                </div>
                <div className="relative mt-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={konsumsiBbm}
                    onChange={(e) => setKonsumsiBbm(parseFloat(e.target.value) || 0)}
                    className="w-full h-11 pl-3 pr-16 bg-white border border-border rounded-md text-sm font-semibold text-ink focus:outline-none focus:border-teal-600"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-muted text-xs">
                    km/liter
                  </div>
                </div>
                <p className="text-[11px] text-muted mt-1.5">
                  Jarak tempuh rata-rata kendaraan per liter BBM.
                </p>
              </div>

              {/* Harga BBM */}
              <div className="p-4 bg-surface-subtle rounded-md border border-border">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-ink">
                    Harga BBM per liter
                  </label>
                  <Sliders className="w-4 h-4 text-muted" />
                </div>
                <div className="relative mt-2">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-muted text-xs font-medium">
                    Rp
                  </div>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={hargaBbm}
                    onChange={(e) => setHargaBbm(parseFloat(e.target.value) || 0)}
                    className="w-full h-11 pl-8 pr-3 bg-white border border-border rounded-md text-sm font-semibold text-ink focus:outline-none focus:border-teal-600"
                    required
                  />
                </div>
                <p className="text-[11px] text-muted mt-1.5">
                  Harga bahan bakar acuan (contoh: Pertalite / Bio Solar).
                </p>
              </div>

              {/* Kecepatan Rata-rata */}
              <div className="p-4 bg-surface-subtle rounded-md border border-border">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-ink">
                    Kecepatan rata-rata
                  </label>
                  <Gauge className="w-4 h-4 text-muted" />
                </div>
                <div className="relative mt-2">
                  <input
                    type="number"
                    min="10"
                    step="5"
                    value={kecepatanRataRata}
                    onChange={(e) => setKecepatanRataRata(parseFloat(e.target.value) || 0)}
                    className="w-full h-11 pl-3 pr-16 bg-white border border-border rounded-md text-sm font-semibold text-ink focus:outline-none focus:border-teal-600"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-muted text-xs">
                    km/jam
                  </div>
                </div>
                <p className="text-[11px] text-muted mt-1.5">
                  Digunakan untuk estimasi durasi tempuh rute pengiriman.
                </p>
              </div>

              {/* Faktor Koreksi Jalan */}
              <div className="p-4 bg-surface-subtle rounded-md border border-border">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-ink">
                    Faktor koreksi jalan
                  </label>
                  <HelpCircle className="w-4 h-4 text-muted" />
                </div>
                <div className="relative mt-2">
                  <input
                    type="number"
                    min="1.0"
                    max="2.0"
                    step="0.05"
                    value={faktorJalan}
                    onChange={(e) => setFaktorJalan(parseFloat(e.target.value) || 1.0)}
                    className="w-full h-11 pl-3 pr-10 bg-white border border-border rounded-md text-sm font-semibold text-ink focus:outline-none focus:border-teal-600"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-muted text-xs">
                    x
                  </div>
                </div>
                <p className="text-[11px] text-muted mt-1.5">
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
              className="h-11 px-5 inline-flex items-center gap-2 bg-petrol-900 hover:bg-petrol-800 text-white font-semibold rounded-md text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan semua perubahan'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
