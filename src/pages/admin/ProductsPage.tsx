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
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Master Data Produk</h1>
          <p className="text-sm text-muted mt-1">
            Daftar komoditas kantong & perlengkapan plastik CV SP Plastik beserta berat per unit.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="h-11 px-4 inline-flex items-center gap-2 bg-petrol-900 hover:bg-petrol-800 text-white text-[15px] font-semibold rounded-md transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-teal-600/50 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Produk</span>
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
            placeholder="Cari nama produk plastik..."
            className="w-full h-11 pl-9 pr-3.5 bg-white border border-border rounded-md text-[15px] text-ink placeholder:text-subtle focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors"
          />
        </div>

        <div className="text-sm text-muted">
          Total varian: <span className="font-semibold text-ink">{products.length}</span>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-md border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted flex flex-col items-center gap-3">
            <span className="w-5 h-5 rounded-full border-2 border-border-strong border-t-petrol-900 animate-spin motion-reduce:animate-none" />
            <p className="text-sm">Memuat katalog produk...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <Package className="w-10 h-10 text-subtle mx-auto mb-3" />
            <p className="font-semibold text-ink">Belum ada produk</p>
            <p className="text-xs text-muted mt-1">
              Tambahkan produk untuk dapat dimasukkan ke dalam pesanan distribusi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink">
              <thead className="bg-surface-subtle text-muted text-xs font-medium border-b border-border">
                <tr>
                  <th className="py-3 px-4">Nama produk</th>
                  <th className="py-3 px-4 text-center">Stok</th>
                  <th className="py-3 px-4">Harga satuan</th>
                  <th className="py-3 px-4">Berat per unit</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-subtle transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-ink">{p.nama}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-medium text-xs px-2.5 py-1 rounded-md border ${
                          p.stok <= 20
                            ? 'bg-danger-bg text-danger-text border-[#FECDCA]'
                            : p.stok <= 50
                            ? 'bg-[#FEF6E7] text-[#874D00] border-[#FADBA2]'
                            : 'bg-[#E6F4F1] text-[#0F4E4A] border-[#BDE3DB]'
                        }`}
                      >
                        <Boxes className="w-3.5 h-3.5" />
                        {p.stok} unit
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-ink">
                      Rp {p.harga.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 bg-surface-muted text-ink rounded-md border border-border">
                        <Weight className="w-3.5 h-3.5 text-teal-600" />
                        {p.berat_per_unit_kg.toFixed(2)} kg
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(p)}
                          title="Edit produk"
                          className="p-1.5 text-muted hover:text-ink hover:bg-surface-muted rounded-md transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.nama)}
                          title="Hapus produk"
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

      {/* Modal Form Tambah / Edit Produk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-petrol-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-border max-w-md w-full overflow-hidden shadow-sm">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <h2 className="font-display text-lg font-bold tracking-tight text-ink">
                {isEditing ? 'Ubah Produk' : 'Tambah Produk Baru'}
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
                  Nama produk *
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Plastik PE Bening Roll"
                  className="w-full h-11 px-3.5 bg-white border border-border rounded-md text-[15px] text-ink placeholder:text-subtle focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Stok tersedia *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stok}
                    onChange={(e) => setStok(parseInt(e.target.value) || 0)}
                    className="w-full h-11 px-3.5 bg-white border border-border rounded-md text-[15px] text-ink placeholder:text-subtle focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Harga satuan (Rp) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={harga}
                    onChange={(e) => setHarga(parseFloat(e.target.value) || 0)}
                    className="w-full h-11 px-3.5 bg-white border border-border rounded-md text-[15px] text-ink placeholder:text-subtle focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-medium text-ink">
                    Berat per unit (kg) *
                  </label>
                  <span className="text-xs text-muted">
                    Parameter Saving Matrix
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
                    className="w-full h-11 pl-3.5 pr-10 bg-white border border-border rounded-md text-[15px] text-ink placeholder:text-subtle focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors font-mono"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-muted text-xs font-semibold">
                    kg
                  </div>
                </div>
                <p className="text-xs text-muted mt-1.5">
                  Digunakan untuk menghitung total kapasitas muatan kendaraan secara otomatis saat pesanan dibuat.
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
