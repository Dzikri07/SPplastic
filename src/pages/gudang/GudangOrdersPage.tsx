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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Konfirmasi Kesiapan Pesanan</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Periksa fisik pesanan di gudang dan ubah status menjadi "Siap Kirim" atau "Belum Siap".
        </p>
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
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari toko pelanggan..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setStatusFilter('baru')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'baru'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Baru
            </button>
            <button
              onClick={() => setStatusFilter('belum_siap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'belum_siap'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Belum Siap
            </button>
            <button
              onClick={() => setStatusFilter('siap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'siap'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Siap Kirim
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
          Antrean: <span className="font-bold text-slate-800">{filtered.length}</span> pesanan
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Memuat antrean pesanan...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Tidak ada antrean pesanan</p>
            <p className="text-xs text-slate-400 mt-1">
              Seluruh pesanan telah diproses atau belum ada pesanan baru masuk dari tim admin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Toko Pelanggan</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Muatan & Item</th>
                  <th className="py-3.5 px-4 text-right">Aksi Konfirmasi Gudang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((o) => {
                  const isUpdating = updatingId === o.id;

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {o.tanggal}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {o.customers?.nama_toko}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {o.customers?.alamat}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {o.status === 'siap' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Siap Kirim
                          </span>
                        )}
                        {o.status === 'belum_siap' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            Belum Siap
                          </span>
                        )}
                        {o.status === 'baru' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            Baru Masuk
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                            <Package className="w-3 h-3 text-slate-500" />
                            {(o.order_items || []).length} jenis
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                            <Weight className="w-3 h-3 text-blue-600" />
                            {Number(o.total_muatan_kg).toFixed(1)} kg
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            title="Periksa Item Pesanan"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            disabled={isUpdating || o.status === 'siap'}
                            onClick={() => handleStatusChange(o.id, 'siap')}
                            className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Siap</span>
                          </button>

                          <button
                            disabled={isUpdating || o.status === 'belum_siap'}
                            onClick={() => handleStatusChange(o.id, 'belum_siap')}
                            className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Belum Siap</span>
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-scaleIn">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Periksa Barang: {selectedOrder.customers?.nama_toko}
                </h2>
                <p className="text-xs text-slate-500">Tanggal: {selectedOrder.tanggal}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {selectedOrder.catatan && (
                <div className="text-xs text-slate-700 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="font-bold">Catatan Pengiriman:</span> {selectedOrder.catatan}
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Daftar Barang yang Perlu Disiapkan
                </p>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                  {(selectedOrder.order_items || []).map((it) => (
                    <div key={it.id} className="p-3 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-slate-900">{it.products?.nama}</p>
                        <p className="text-slate-500 text-[11px]">
                          Kuantitas Diminta: <span className="font-bold text-slate-800">{it.qty} unit</span> &bull; Stok Gudang: {it.products?.stok} unit
                        </p>
                      </div>
                      <span className="font-mono font-bold text-slate-800">
                        {Number(it.berat_kg).toFixed(1)} kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Muatan */}
              <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-800">
                <span>Total Berat Muatan:</span>
                <span className="text-sm font-bold text-blue-700 font-mono">
                  {Number(selectedOrder.total_muatan_kg).toFixed(2)} kg
                </span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs text-slate-500">Ubah status pesanan ini:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'belum_siap')}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  Tandai Belum Siap
                </button>
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'siap')}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  Tandai Siap Kirim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
