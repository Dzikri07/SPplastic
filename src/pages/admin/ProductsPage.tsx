import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Package,
  Edit2,
  Trash2,
  Weight,
  AlertCircle,
  CheckCircle2,
  X,
  Boxes,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types/database';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
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
  const [stok, setStok] = useState<number>(100);
  const [harga, setHarga] = useState<number>(10000);
  const [beratPerUnitKg, setBeratPerUnitKg] = useState<number>(0.5);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('nama', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat produk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setNama('');
    setStok(100);
    setHarga(15000);
    setBeratPerUnitKg(0.5);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setIsEditing(true);
    setCurrentId(p.id);
    setNama(p.nama);
    setStok(p.stok);
    setHarga(p.harga);
    setBeratPerUnitKg(p.berat_per_unit_kg);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nama.trim()) {
      setFormError('Nama produk wajib diisi.');
      return;
    }

    if (isNaN(stok) || stok < 0) {
      setFormError('Stok harus berupa bilangan bulat positif atau 0.');
      return;
    }

    if (isNaN(harga) || harga < 0) {
      setFormError('Harga harus berupa angka positif.');
      return;
    }

    if (isNaN(beratPerUnitKg) || beratPerUnitKg <= 0) {
      setFormError('Berat per unit harus lebih besar dari 0 kg untuk penentuan muatan rute.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEditing && currentId) {
        const { error } = await supabase
          .from('products')
          .update({
            nama: nama.trim(),
            stok: Math.floor(stok),
            harga,
            berat_per_unit_kg: beratPerUnitKg,
          })
          .eq('id', currentId);

        if (error) throw error;
        setSuccessMsg(`Produk "${nama}" berhasil diperbarui.`);
      } else {
        const { error } = await supabase.from('products').insert({
          nama: nama.trim(),
          stok: Math.floor(stok),
          harga,
          berat_per_unit_kg: beratPerUnitKg,
        });

        if (error) throw error;
        setSuccessMsg(`Produk "${nama}" berhasil ditambahkan.`);
      }

      setIsModalOpen(false);
      fetchProducts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan produk.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, namaProd: string) => {
    if (!window.confirm(`Yakin ingin menghapus produk "${namaProd}"?`)) {
      return;
    }

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;

      setSuccessMsg(`Produk "${namaProd}" berhasil dihapus.`);
      setProducts(products.filter((p) => p.id !== id));
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      if (err.code === '23503' || err.message?.includes('foreign key')) {
        alert('Produk tidak bisa dihapus karena sudah dipakai dalam data pesanan.');
      } else {
        alert(`Gagal menghapus produk: ${err.message}`);
      }
    }
  };

  const filteredProducts = products.filter((p) =>
    p.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Master Data Produk</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Daftar komoditas kantong & perlengkapan plastik CV SP Plastik beserta berat per unit.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm hover:shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Produk</span>
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
            placeholder="Cari nama produk plastik..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total Varian: <span className="font-bold text-slate-800">{products.length}</span>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Memuat katalog produk...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Belum ada produk</p>
            <p className="text-xs text-slate-400 mt-1">
              Tambahkan produk untuk dapat dimasukkan ke dalam pesanan distribusi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Nama Produk</th>
                  <th className="py-3.5 px-4 text-center">Stok</th>
                  <th className="py-3.5 px-4">Harga Satuan</th>
                  <th className="py-3.5 px-4">Berat Per Unit (kg)</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{p.nama}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold text-xs px-2.5 py-1 rounded-full ${
                          p.stok <= 20
                            ? 'bg-red-100 text-red-800'
                            : p.stok <= 50
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        <Boxes className="w-3.5 h-3.5" />
                        {p.stok} unit
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      Rp {p.harga.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-xs font-mono font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        <Weight className="w-3.5 h-3.5 text-blue-500" />
                        {p.berat_per_unit_kg.toFixed(2)} kg
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(p)}
                          title="Edit Produk"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.nama)}
                          title="Hapus Produk"
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

      {/* Modal Form Tambah / Edit Produk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-scaleIn">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? 'Ubah Produk' : 'Tambah Produk Baru'}
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
                  Nama Produk *
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Plastik PE Bening Roll"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Stok Tersedia *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stok}
                    onChange={(e) => setStok(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Harga Satuan (Rp) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={harga}
                    onChange={(e) => setHarga(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Berat Per Unit (kg) *
                  </label>
                  <span className="text-[11px] text-blue-600 font-medium">
                    Kritis untuk Saving Matrix
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={beratPerUnitKg}
                    onChange={(e) => setBeratPerUnitKg(parseFloat(e.target.value) || 0)}
                    placeholder="0.50"
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition font-mono"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                    kg
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Digunakan untuk menghitung total kapasitas muatan kendaraan secara otomatis saat pelanggan memesan produk ini.
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
