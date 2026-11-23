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
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Master Data Pelanggan</h1>
          <p className="text-sm text-muted mt-1">
            Kelola toko/pelanggan dan koordinat geografis untuk penentuan rute optimal.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="h-11 px-4 inline-flex items-center gap-2 bg-petrol-900 hover:bg-petrol-800 text-white text-[15px] font-semibold rounded-md transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-teal-600/50 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pelanggan</span>
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

      {/* Search & Stats Bar */}
      <div className="bg-white p-4 rounded-md border border-border flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-subtle absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari toko, alamat, atau nomor HP..."
            className="w-full h-11 pl-9 pr-3.5 bg-white border border-border rounded-md text-[15px] text-ink placeholder:text-subtle focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors"
          />
        </div>

        <div className="text-sm text-muted">
          Total pelanggan: <span className="font-semibold text-ink">{customers.length}</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-md border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted flex flex-col items-center gap-3">
            <span className="w-5 h-5 rounded-full border-2 border-border-strong border-t-petrol-900 animate-spin motion-reduce:animate-none" />
            <p className="text-sm">Memuat data pelanggan...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <MapPin className="w-10 h-10 text-subtle mx-auto mb-3" />
            <p className="font-semibold text-ink">Belum ada pelanggan ditemukan</p>
            <p className="text-xs text-muted mt-1">
              Tambahkan pelanggan baru untuk mulai menghitung rute distribusi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink">
              <thead className="bg-surface-subtle text-muted text-xs font-medium border-b border-border">
                <tr>
                  <th className="py-3 px-4">Nama toko</th>
                  <th className="py-3 px-4">Alamat</th>
                  <th className="py-3 px-4">Kontak</th>
                  <th className="py-3 px-4">Koordinat GPS</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-subtle transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-ink">{c.nama_toko}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-muted" title={c.alamat}>
                      {c.alamat}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-muted">
                        <Phone className="w-3.5 h-3.5 text-subtle" />
                        <span>{c.no_hp}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 bg-surface-muted text-ink rounded-md border border-border">
                        <MapPin className="w-3 h-3 text-teal-600" />
                        {c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(c)}
                          title="Edit pelanggan"
                          className="p-1.5 text-muted hover:text-ink hover:bg-surface-muted rounded-md transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.nama_toko)}
                          title="Hapus pelanggan"
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

      {/* Modal Form Tambah / Edit Pelanggan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-petrol-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-border max-w-2xl w-full overflow-hidden shadow-sm">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <h2 className="font-display text-lg font-bold tracking-tight text-ink">
                {isEditing ? 'Ubah Data Pelanggan' : 'Tambah Pelanggan Baru'}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Nama toko / pelanggan *
                  </label>
                  <input
                    type="text"
                    value={namaToko}
                    onChange={(e) => setNamaToko(e.target.value)}
                    placeholder="Contoh: Toko Berkah Ciranjang"
                    className="w-full h-11 px-3.5 bg-white border border-border rounded-md text-[15px] text-ink placeholder:text-subtle focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Nomor HP / WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full h-11 px-3.5 bg-white border border-border rounded-md text-[15px] text-ink placeholder:text-subtle focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Alamat lengkap *
                </label>
                <textarea
                  rows={2}
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Jl. Raya Ciranjang No. 45, Cianjur..."
                  className="w-full p-3 bg-white border border-border rounded-md text-[15px] text-ink placeholder:text-subtle focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors resize-none"
                  required
                />
              </div>

              {/* Peta Interaktif Leaflet */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-medium text-ink">
                    Titik lokasi pengiriman (Peta Leaflet)
                  </label>
                  <span className="text-xs text-muted">
                    Klik peta atau geser pin
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
                  <label className="block text-xs font-medium text-muted mb-1">
                    Latitude (-90 s/d 90)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 px-3 bg-white border border-border rounded-md text-xs font-mono text-ink focus:outline-none focus:border-teal-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Longitude (-180 s/d 180)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 px-3 bg-white border border-border rounded-md text-xs font-mono text-ink focus:outline-none focus:border-teal-600"
                    required
                  />
                </div>
              </div>

              {/* Modal Actions */}
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
