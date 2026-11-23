import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  MapPin,
  Edit2,
  Trash2,
  Phone,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Customer } from '../../types/database';
import { MapLocationPicker } from '../../components/MapLocationPicker';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form Fields
  const [namaToko, setNamaToko] = useState('');
  const [alamat, setAlamat] = useState('');
  const [noHp, setNoHp] = useState('');
  const [latitude, setLatitude] = useState<number>(-6.827218);
  const [longitude, setLongitude] = useState<number>(107.291637);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ambil daftar pelanggan dari Supabase
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setCustomers(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat data pelanggan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setNamaToko('');
    setAlamat('');
    setNoHp('');
    // Default di sekitar Cianjur
    setLatitude(-6.8200);
    setLongitude(107.2600);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setIsEditing(true);
    setCurrentId(c.id);
    setNamaToko(c.nama_toko);
    setAlamat(c.alamat);
    setNoHp(c.no_hp);
    setLatitude(c.latitude);
    setLongitude(c.longitude);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validasi
    if (!namaToko.trim() || !alamat.trim() || !noHp.trim()) {
      setFormError('Harap lengkapi nama toko, alamat, dan nomor HP.');
      return;
    }

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      setFormError('Latitude tidak valid (harus berada di antara -90 dan 90).');
      return;
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      setFormError('Longitude tidak valid (harus berada di antara -180 dan 180).');
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEditing && currentId) {
        const { error } = await supabase
          .from('customers')
          .update({
            nama_toko: namaToko.trim(),
            alamat: alamat.trim(),
            no_hp: noHp.trim(),
            latitude,
            longitude,
          })
          .eq('id', currentId);

        if (error) throw error;
        setSuccessMsg(`Pelanggan "${namaToko}" berhasil diperbarui.`);
      } else {
        const { error } = await supabase.from('customers').insert({
          nama_toko: namaToko.trim(),
          alamat: alamat.trim(),
          no_hp: noHp.trim(),
          latitude,
          longitude,
        });

        if (error) throw error;
        setSuccessMsg(`Pelanggan "${namaToko}" berhasil ditambahkan.`);
      }

      setIsModalOpen(false);
      fetchCustomers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data pelanggan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!window.confirm(`Yakin ingin menghapus pelanggan "${nama}"?`)) {
      return;
    }

    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;

      setSuccessMsg(`Pelanggan "${nama}" berhasil dihapus.`);
      setCustomers(customers.filter((c) => c.id !== id));
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      if (err.code === '23503' || err.message?.includes('foreign key')) {
        alert('Pelanggan tidak bisa dihapus karena sudah dipakai dalam riwayat pesanan/rute.');
      } else {
        alert(`Gagal menghapus pelanggan: ${err.message}`);
      }
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.nama_toko.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.alamat.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.no_hp.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Master Data Pelanggan</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola toko/pelanggan dan koordinat geografis untuk penentuan rute optimal.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm hover:shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pelanggan</span>
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

      {/* Search & Stats Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari toko, alamat, atau no HP..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total Pelanggan: <span className="font-bold text-slate-800">{customers.length}</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Memuat data pelanggan...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Belum ada pelanggan ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">
              Tambahkan pelanggan baru untuk mulai menghitung rute distribusi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Nama Toko</th>
                  <th className="py-3.5 px-4">Alamat</th>
                  <th className="py-3.5 px-4">Kontak</th>
                  <th className="py-3.5 px-4">Koordinat GPS</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{c.nama_toko}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-600" title={c.alamat}>
                      {c.alamat}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.no_hp}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-mono text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                        <MapPin className="w-3 h-3 text-blue-500" />
                        {c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(c)}
                          title="Edit Pelanggan"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.nama_toko)}
                          title="Hapus Pelanggan"
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

      {/* Modal Form Tambah / Edit Pelanggan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-scaleIn">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? 'Ubah Data Pelanggan' : 'Tambah Pelanggan Baru'}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Toko / Pelanggan *
                  </label>
                  <input
                    type="text"
                    value={namaToko}
                    onChange={(e) => setNamaToko(e.target.value)}
                    placeholder="Contoh: Toko Berkah Ciranjang"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Nomor HP / WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Alamat Lengkap *
                </label>
                <textarea
                  rows={2}
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Jl. Raya Ciranjang No. 45, Cianjur..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition resize-none"
                  required
                />
              </div>

              {/* Peta Interaktif Leaflet (Klik Peta atau Drag Pin) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Titik Lokasi Pengiriman (Peta Leaflet)
                  </label>
                  <span className="text-[11px] text-blue-600 font-medium">
                    Klik peta atau geser pin emas
                  </span>
                </div>

                <MapLocationPicker
                  lat={latitude}
                  lng={longitude}
                  onChange={(newLat, newLng) => {
                    setLatitude(newLat);
                    setLongitude(newLng);
                  }}
                  height="260px"
                  markerLabel={namaToko || 'Lokasi Toko'}
                />
              </div>

              {/* Input Manual Koordinat */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Latitude (-90 s/d 90)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Longitude (-180 s/d 180)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
              </div>

              {/* Modal Actions */}
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
