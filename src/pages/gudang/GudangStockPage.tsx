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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-line">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Katalog stok produk</h1>
          <p className="text-sm text-muted mt-1">
            Tampilan stok barang komoditas kantong & perlengkapan plastik CV SP Plastik (hanya lihat).
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface p-4 rounded-md border border-line flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari produk plastik..."
            className="w-full pl-9 pr-3.5 h-11 bg-surface border border-line rounded-md text-sm text-ink placeholder:text-subtle focus:outline-hidden focus:border-accent focus:ring-3 focus:ring-accent/20 transition-colors"
          />
        </div>

        <div className="text-xs text-muted font-medium">
          Total varian: <span className="font-semibold text-ink">{products.length}</span> produk
        </div>
      </div>

      {/* Table Stock */}
      <div className="bg-surface rounded-md border border-line overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Memuat inventaris stok...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <Package className="w-12 h-12 text-subtle mx-auto mb-3" />
            <p className="font-semibold text-ink">Tidak ada produk ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink">
              <thead className="bg-surface-subtle text-muted text-xs font-medium border-b border-line">
                <tr>
                  <th className="py-3 px-4">Nama produk</th>
                  <th className="py-3 px-4 text-center">Status stok fisik</th>
                  <th className="py-3 px-4">Harga satuan</th>
                  <th className="py-3 px-4">Berat / unit</th>
                  <th className="py-3 px-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((p) => {
                  const isCrit = p.stok <= 20;
                  const isLow = p.stok > 20 && p.stok <= 50;

                  return (
                    <tr key={p.id} className="hover:bg-surface-subtle transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-ink">{p.nama}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 font-medium text-xs px-2.5 py-1 rounded-md ${
                            isCrit
                              ? 'bg-danger-bg text-danger-text border border-danger/20'
                              : isLow
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          <Boxes className="w-3.5 h-3.5" />
                          {p.stok} unit
                          {isCrit && <span className="text-[10px] font-semibold text-danger">(Kritis)</span>}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-ink font-medium">
                        Rp {Number(p.harga).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 bg-surface-muted text-muted rounded-md border border-line">
                          <Weight className="w-3 h-3 text-muted" />
                          {p.berat_per_unit_kg} kg
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedProduct(p)}
                          title="Lihat Detail Produk"
                          className="p-1.5 text-muted hover:text-ink hover:bg-surface-muted rounded-md transition-colors"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-md shadow-lg border border-line max-w-sm w-full overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-line">
              <h2 className="text-base font-bold text-ink">Detail produk</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 text-muted hover:text-ink rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div className="text-center pb-3 border-b border-line">
                <div className="w-10 h-10 bg-accent/10 text-accent rounded-md mx-auto flex items-center justify-center mb-2">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-ink">{selectedProduct.nama}</h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-muted">Jumlah stok fisik:</span>
                  <span className="font-semibold text-ink">{selectedProduct.stok} unit</span>
                </div>
                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-muted">Harga satuan:</span>
                  <span className="font-semibold text-ink">Rp {Number(selectedProduct.harga).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-muted">Berat satuan:</span>
                  <span className="font-semibold text-ink">{selectedProduct.berat_per_unit_kg} kg</span>
                </div>
              </div>

              {selectedProduct.stok <= 20 && (
                <div role="alert" className="p-3 bg-danger-bg border border-danger/20 border-l-4 border-l-danger rounded-md text-xs text-danger-text flex items-center gap-2 mt-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-danger" />
                  <span>Stok menipis! Harap lakukan pengecekan fisik atau lapor ke administrasi untuk restock.</span>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-surface-subtle border-t border-line flex justify-end">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-surface border border-line text-ink font-medium rounded-md text-xs hover:bg-surface-subtle transition-colors"
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
