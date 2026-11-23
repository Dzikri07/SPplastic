import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Search,
  ShoppingCart,
  Package,
  Weight,
  AlertCircle,
  X,
  Clock,
} from 'lucide-react';
import type { Order } from '../../types/database';
import { fetchOrders, updateOrderStatus } from '../../services/orderService';

export const GudangOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await fetchOrders();
      // Gudang hanya mengonfirmasi pesanan baru, belum_siap, dan siap
      const warehouseOrders = data.filter((o) =>
        ['baru', 'belum_siap', 'siap'].includes(o.status)
      );
      setOrders(warehouseOrders);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat pesanan gudang.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: 'siap' | 'belum_siap') => {
    try {
      setUpdatingId(orderId);
      setErrorMsg(null);
      await updateOrderStatus(orderId, newStatus);

      setSuccessMsg(`Status pesanan berhasil diubah menjadi "${newStatus === 'siap' ? 'Siap Kirim' : 'Belum Siap'}".`);
      setOrders(
        orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memperbarui status pesanan.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter((o) => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchSearch = (o.customers?.nama_toko || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-line">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Konfirmasi kesiapan pesanan</h1>
          <p className="text-sm text-muted mt-1">
            Periksa fisik pesanan di gudang dan ubah status menjadi siap kirim atau belum siap.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div role="alert" className="p-4 bg-emerald-50 border border-emerald-200 border-l-4 border-l-emerald-600 rounded-md flex items-center gap-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="p-4 bg-danger-bg border border-danger/20 border-l-4 border-l-danger rounded-md flex items-center gap-3 text-sm text-danger-text">
          <AlertCircle className="w-5 h-5 shrink-0 text-danger" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-surface p-4 rounded-md border border-line flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari toko pelanggan..."
              className="w-full pl-9 pr-3.5 h-11 bg-surface border border-line rounded-md text-sm text-ink placeholder:text-subtle focus:outline-hidden focus:border-accent focus:ring-3 focus:ring-accent/20 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-ink text-white'
                  : 'bg-surface-subtle text-muted hover:text-ink hover:bg-surface-muted border border-line'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setStatusFilter('baru')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === 'baru'
                  ? 'bg-accent text-white'
                  : 'bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20'
              }`}
            >
              Baru
            </button>
            <button
              onClick={() => setStatusFilter('belum_siap')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === 'belum_siap'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              Belum siap
            </button>
            <button
              onClick={() => setStatusFilter('siap')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === 'siap'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Siap kirim
            </button>
          </div>
        </div>

        <div className="text-xs text-muted whitespace-nowrap">
          Antrean: <span className="font-semibold text-ink">{filtered.length}</span> pesanan
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-surface rounded-md border border-line overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Memuat antrean pesanan...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <ShoppingCart className="w-12 h-12 text-subtle mx-auto mb-3" />
            <p className="font-semibold text-ink">Tidak ada antrean pesanan</p>
            <p className="text-xs text-muted mt-1">
              Seluruh pesanan telah diproses atau belum ada pesanan baru masuk dari tim admin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink">
              <thead className="bg-surface-subtle text-muted text-xs font-medium border-b border-line">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Toko pelanggan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Muatan & item</th>
                  <th className="py-3 px-4 text-right">Aksi konfirmasi gudang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((o) => {
                  const isUpdating = updatingId === o.id;

                  return (
                    <tr key={o.id} className="hover:bg-surface-subtle transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-muted whitespace-nowrap">
                        {o.tanggal}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-ink">
                          {o.customers?.nama_toko}
                        </div>
                        <div className="text-xs text-muted truncate max-w-xs">
                          {o.customers?.alamat}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {o.status === 'siap' && (
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Siap kirim
                          </span>
                        )}
                        {o.status === 'belum_siap' && (
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200">
                            Belum siap
                          </span>
                        )}
                        {o.status === 'baru' && (
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                            Baru masuk
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-surface-muted text-muted rounded-md border border-line">
                            <Package className="w-3 h-3 text-muted" />
                            {(o.order_items || []).length} jenis
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-accent/10 text-accent rounded-md border border-accent/20">
                            <Weight className="w-3 h-3 text-accent" />
                            {Number(o.total_muatan_kg).toFixed(1)} kg
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            title="Periksa Item Pesanan"
                            className="p-1.5 text-muted hover:text-ink hover:bg-surface-muted rounded-md transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            disabled={isUpdating || o.status === 'siap'}
                            onClick={() => handleStatusChange(o.id, 'siap')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-md text-xs font-medium transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Siap</span>
                          </button>

                          <button
                            disabled={isUpdating || o.status === 'belum_siap'}
                            onClick={() => handleStatusChange(o.id, 'belum_siap')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-md text-xs font-medium transition-colors"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Belum siap</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail Item Pesanan untuk Pengecekan Fisik Gudang */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-md shadow-lg border border-line max-w-lg w-full overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-line">
              <div>
                <h2 className="text-base font-bold text-ink">
                  Periksa barang: {selectedOrder.customers?.nama_toko}
                </h2>
                <p className="text-xs text-muted">Tanggal: {selectedOrder.tanggal}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-muted hover:text-ink rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {selectedOrder.catatan && (
                <div className="text-xs text-ink p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <span className="font-semibold">Catatan pengiriman:</span> {selectedOrder.catatan}
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-muted mb-2">
                  Daftar barang yang perlu disiapkan
                </p>
                <div className="border border-line rounded-md overflow-hidden divide-y divide-line text-xs">
                  {(selectedOrder.order_items || []).map((it) => (
                    <div key={it.id} className="p-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-ink">{it.products?.nama}</p>
                        <p className="text-muted text-[11px]">
                          Kuantitas diminta: <span className="font-semibold text-ink">{it.qty} unit</span> &bull; Stok gudang: {it.products?.stok} unit
                        </p>
                      </div>
                      <span className="font-mono font-semibold text-ink">
                        {Number(it.berat_kg).toFixed(1)} kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Muatan */}
              <div className="p-3 bg-surface-subtle border border-line rounded-md flex items-center justify-between text-xs font-medium text-ink">
                <span>Total berat muatan:</span>
                <span className="text-sm font-bold text-accent font-mono">
                  {Number(selectedOrder.total_muatan_kg).toFixed(2)} kg
                </span>
              </div>
            </div>

            <div className="px-6 py-4 bg-surface-subtle border-t border-line flex justify-between items-center">
              <span className="text-xs text-muted">Ubah status pesanan ini:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'belum_siap')}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-medium transition-colors"
                >
                  Tandai belum siap
                </button>
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'siap')}
                  className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-xs font-medium transition-colors"
                >
                  Tandai siap kirim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
