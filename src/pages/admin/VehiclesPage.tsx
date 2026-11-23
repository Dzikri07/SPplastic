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
          <h1 className="text-2xl font-bold text-slate-900">Master Data Kendaraan</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Daftar armada distribusi CV SP Plastik beserta batas kapasitas muatan (Q).
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm hover:shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kendaraan</span>
        </button>
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari armada atau plat nomor..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total Armada: <span className="font-bold text-slate-800">{vehicles.length}</span>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Memuat data armada...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Belum ada armada terdaftar</p>
            <p className="text-xs text-slate-400 mt-1">
              Tambahkan kendaraan distribusi untuk digunakan dalam penentuan rute Saving Matrix.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Nama Armada</th>
                  <th className="py-3.5 px-4">Plat Nomor Polisi</th>
                  <th className="py-3.5 px-4">Kapasitas Maksimal (Q)</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-600" />
                        {v.nama}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-800 text-white rounded-md tracking-wider">
                        {v.plat}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-800 rounded-lg">
                        <Weight className="w-3.5 h-3.5 text-blue-600" />
                        {v.kapasitas_kg.toLocaleString('id-ID')} kg
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(v)}
                          title="Edit Kendaraan"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(v.id, v.nama)}
                          title="Hapus Kendaraan"
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-scaleIn">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? 'Ubah Kendaraan' : 'Tambah Kendaraan Baru'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nama / Jenis Armada *
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Armada Pick-Up 01 (L300)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nomor Plat Polisi *
                </label>
                <input
                  type="text"
                  value={plat}
                  onChange={(e) => setPlat(e.target.value)}
                  placeholder="Contoh: F 8101 WA"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition uppercase font-mono"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Kapasitas Muatan Maksimal (Q) *
                  </label>
                  <span className="text-[11px] text-blue-600 font-medium">
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
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition font-mono"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                    kg
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Algoritma Saving Matrix memastikan total akumulasi berat pesanan pada rute ini tidak melebihi kapasitas ini.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-xl text-sm transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm text-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambahkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
