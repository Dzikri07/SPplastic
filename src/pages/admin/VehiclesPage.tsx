import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Truck,
  Edit2,
  Trash2,
  Weight,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Vehicle } from '../../types/database';

export const VehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form Fields
  const [nama, setNama] = useState('');
  const [plat, setPlat] = useState('');
  const [kapasitasKg, setKapasitasKg] = useState<number>(1000);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('nama', { ascending: true });

      if (error) throw error;
      setVehicles(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat kendaraan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setNama('');
    setPlat('');
    setKapasitasKg(1000);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (v: Vehicle) => {
    setIsEditing(true);
    setCurrentId(v.id);
    setNama(v.nama);
    setPlat(v.plat);
    setKapasitasKg(v.kapasitas_kg);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nama.trim() || !plat.trim()) {
      setFormError('Nama armada dan plat nomor wajib diisi.');
      return;
    }

    if (isNaN(kapasitasKg) || kapasitasKg <= 0) {
      setFormError('Kapasitas muatan (Q) harus lebih besar dari 0 kg.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEditing && currentId) {
        const { error } = await supabase
          .from('vehicles')
          .update({
            nama: nama.trim(),
            plat: plat.trim().toUpperCase(),
            kapasitas_kg: kapasitasKg,
          })
          .eq('id', currentId);

        if (error) throw error;
        setSuccessMsg(`Kendaraan "${nama}" berhasil diperbarui.`);
      } else {
        const { error } = await supabase.from('vehicles').insert({
          nama: nama.trim(),
          plat: plat.trim().toUpperCase(),
          kapasitas_kg: kapasitasKg,
        });

        if (error) throw error;
        setSuccessMsg(`Kendaraan "${nama}" berhasil ditambahkan.`);
      }

      setIsModalOpen(false);
      fetchVehicles();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan armada.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, namaArmada: string) => {
    if (!window.confirm(`Yakin ingin menghapus kendaraan "${namaArmada}"?`)) {
      return;
    }

    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;

      setSuccessMsg(`Kendaraan "${namaArmada}" berhasil dihapus.`);
      setVehicles(vehicles.filter((v) => v.id !== id));
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      if (err.code === '23503' || err.message?.includes('foreign key')) {
        alert('Kendaraan tidak bisa dihapus karena sudah dipakai dalam rute pengiriman.');
      } else {
        alert(`Gagal menghapus kendaraan: ${err.message}`);
      }
    }
  };

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.plat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Master Data Kendaraan</h1>
          <p className="text-sm text-muted mt-1">
            Daftar armada distribusi CV SP Plastik beserta batas kapasitas muatan (Q).
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="h-11 px-4 inline-flex items-center gap-2 bg-petrol-900 hover:bg-petrol-800 text-white text-[15px] font-semibold rounded-md transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-teal-600/50 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kendaraan</span>
        </button>
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-md border border-border flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-subtle absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari armada atau plat nomor..."
            className="w-full h-11 pl-9 pr-3.5 bg-white border border-border rounded-md text-[15px] text-ink placeholder:text-subtle focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors"
          />
        </div>

        <div className="text-sm text-muted">
          Total armada: <span className="font-semibold text-ink">{vehicles.length}</span>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-md border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted flex flex-col items-center gap-3">
            <span className="w-5 h-5 rounded-full border-2 border-border-strong border-t-petrol-900 animate-spin motion-reduce:animate-none" />
            <p className="text-sm">Memuat data armada...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <Truck className="w-10 h-10 text-subtle mx-auto mb-3" />
            <p className="font-semibold text-ink">Belum ada armada terdaftar</p>
            <p className="text-xs text-muted mt-1">
              Tambahkan kendaraan distribusi untuk digunakan dalam penentuan rute Saving Matrix.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink">
              <thead className="bg-surface-subtle text-muted text-xs font-medium border-b border-border">
                <tr>
                  <th className="py-3 px-4">Nama armada</th>
                  <th className="py-3 px-4">Plat nomor polisi</th>
                  <th className="py-3 px-4">Kapasitas maksimal (Q)</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-surface-subtle transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-ink flex items-center gap-2">
                        <Truck className="w-4 h-4 text-petrol-900" />
                        {v.nama}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-surface-muted text-ink rounded-md border border-border">
                        {v.plat}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 bg-teal-50 text-[#0F4E4A] rounded-md border border-teal-200">
                        <Weight className="w-3.5 h-3.5 text-teal-600" />
                        {v.kapasitas_kg.toLocaleString('id-ID')} kg
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(v)}
                          title="Edit kendaraan"
                          className="p-1.5 text-muted hover:text-ink hover:bg-surface-muted rounded-md transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(v.id, v.nama)}
                          title="Hapus kendaraan"
                          className="p-1.5 text-danger-text hover:bg-danger-bg rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Tambah / Edit Kendaraan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-petrol-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-border max-w-md w-full overflow-hidden shadow-sm">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <h2 className="font-display text-lg font-bold tracking-tight text-ink">
                {isEditing ? 'Ubah Kendaraan' : 'Tambah Kendaraan Baru'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-muted hover:text-ink rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div
                  role="alert"
                  className="border-l-2 border-danger bg-danger-bg px-3.5 py-2.5 text-xs text-danger-text flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Nama / jenis armada *
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Armada Pick-Up 01 (L300)"
                  className="w-full h-11 px-3.5 bg-white border border-border rounded-md text-[15px] text-ink placeholder:text-subtle focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Nomor plat polisi *
                </label>
                <input
                  type="text"
                  value={plat}
                  onChange={(e) => setPlat(e.target.value)}
                  placeholder="Contoh: F 8101 WA"
                  className="w-full h-11 px-3.5 bg-white border border-border rounded-md text-[15px] text-ink placeholder:text-subtle focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors uppercase font-mono"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-medium text-ink">
                    Kapasitas muatan maksimal (Q) *
                  </label>
                  <span className="text-xs text-muted">
                    Batasan CVRP (kg)
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="50"
                    value={kapasitasKg}
                    onChange={(e) => setKapasitasKg(parseFloat(e.target.value) || 0)}
                    placeholder="1000"
                    className="w-full h-11 pl-3.5 pr-10 bg-white border border-border rounded-md text-[15px] text-ink placeholder:text-subtle focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors font-mono"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-muted text-xs font-semibold">
                    kg
                  </div>
                </div>
                <p className="text-xs text-muted mt-1.5">
                  Algoritma Saving Matrix memastikan total akumulasi berat pesanan pada rute ini tidak melebihi kapasitas ini.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-border flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-11 px-4 border border-border bg-white text-ink hover:bg-surface-muted font-medium rounded-md text-sm transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 px-5 bg-petrol-900 hover:bg-petrol-800 text-white font-semibold rounded-md text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan perubahan' : 'Tambahkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
