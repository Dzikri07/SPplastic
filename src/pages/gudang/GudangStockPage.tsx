import React, { useEffect, useState } from 'react';
import {
  Search,
  Package,
  Boxes,
  Weight,
  Eye,
  AlertTriangle,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types/database';

export const GudangStockPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('stok', { ascending: true }); // Prioritaskan stok paling sedikit di atas

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching stock:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = products.filter((p) =>
    p.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Informasi Stok Produk Gudang</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Tampilan stok barang komoditas kantong & perlengkapan plastik CV SP Plastik (Read-Only).
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari produk plastik..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total Varian: <span className="font-bold text-slate-800">{products.length}</span> produk
        </div>
      </div>

      {/* Table Stock */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Memuat inventaris stok...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Tidak ada produk ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Nama Produk</th>
                  <th className="py-3.5 px-4 text-center">Status Stok Fisik</th>
                  <th className="py-3.5 px-4">Harga Satuan</th>
                  <th className="py-3.5 px-4">Berat / Unit</th>
                  <th className="py-3.5 px-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const isCrit = p.stok <= 20;
                  const isLow = p.stok > 20 && p.stok <= 50;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{p.nama}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 font-bold text-xs px-3 py-1 rounded-full ${
                            isCrit
                              ? 'bg-red-100 text-red-800 animate-pulse'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          <Boxes className="w-3.5 h-3.5" />
                          {p.stok} unit
                          {isCrit && <span className="text-[10px] uppercase font-extrabold">(Kritis)</span>}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        Rp {Number(p.harga).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                          <Weight className="w-3 h-3 text-slate-500" />
                          {p.berat_per_unit_kg} kg
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedProduct(p)}
                          title="Lihat Detail Produk"
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail Produk */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden animate-scaleIn">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Detail Produk</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div className="text-center pb-3 border-b border-slate-100">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center mb-2">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900">{selectedProduct.nama}</h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Jumlah Stok Fisik:</span>
                  <span className="font-bold text-slate-800">{selectedProduct.stok} unit</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Harga Satuan:</span>
                  <span className="font-bold text-slate-800">Rp {Number(selectedProduct.harga).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Berat Satuan:</span>
                  <span className="font-bold text-slate-800">{selectedProduct.berat_per_unit_kg} kg</span>
                </div>
              </div>

              {selectedProduct.stok <= 20 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 mt-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>Stok menipis! Harap lakukan pengecekan fisik atau lapor ke administrasi untuk restock.</span>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl text-xs hover:bg-slate-100 transition"
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
