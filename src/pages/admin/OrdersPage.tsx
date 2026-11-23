import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Calendar,
  Filter,
  ShoppingCart,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  Package,
  Weight,
  Lock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Order, Customer, Product, OrderStatus } from '../../types/database';
import { fetchOrders, saveOrder, deleteOrder } from '../../services/orderService';
import { ProofDetailModal } from '../../components/ProofDetailModal';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [maxVehicleCapacity, setMaxVehicleCapacity] = useState<number>(1000);

  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewingProofOrderId, setViewingProofOrderId] = useState<{
    orderId: string;
    namaToko: string;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Form Fields
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [formCatatan, setFormCatatan] = useState('');
  const [formItems, setFormItems] = useState<Array<{ product_id: string; qty: number }>>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ambil data pesanan, pelanggan, produk, dan armada terbesar
  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [ordersData, custRes, prodRes, vehRes] = await Promise.all([
        fetchOrders({ status: statusFilter, tanggal: dateFilter || undefined }),
        supabase.from('customers').select('*').order('nama_toko', { ascending: true }),
        supabase.from('products').select('*').order('nama', { ascending: true }),
        supabase.from('vehicles').select('kapasitas_kg').order('kapasitas_kg', { ascending: false }).limit(1),
      ]);

      setOrders(ordersData);
      setCustomers(custRes.data || []);
      setProducts(prodRes.data || []);
      if (vehRes.data && vehRes.data.length > 0) {
        setMaxVehicleCapacity(Number(vehRes.data[0].kapasitas_kg));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat data pesanan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, dateFilter]);

  // Buka Modal Tambah Pesanan
  const openAddModal = () => {
    setIsEditing(false);
    setEditingOrderId(null);
    setFormCustomerId(customers[0]?.id || '');
    setFormTanggal(new Date().toISOString().split('T')[0]);
    setFormCatatan('');
    // Default 1 item baris pertama jika produk ada
    if (products.length > 0) {
      setFormItems([{ product_id: products[0].id, qty: 10 }]);
    } else {
      setFormItems([]);
    }
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Buka Modal Edit Pesanan
  const openEditModal = (order: Order) => {
    if (['dalam_pengiriman', 'diterima', 'tidak_lengkap'].includes(order.status)) {
      alert(`Pesanan dengan status "${order.status}" tidak dapat diedit karena rute pengiriman telah diproses.`);
      return;
    }

    setIsEditing(true);
    setEditingOrderId(order.id);
    setFormCustomerId(order.customer_id);
    setFormTanggal(order.tanggal);
    setFormCatatan(order.catatan || '');
    const mappedItems = (order.order_items || []).map((it) => ({
      product_id: it.product_id,
      qty: it.qty,
    }));
    setFormItems(mappedItems.length > 0 ? mappedItems : [{ product_id: products[0]?.id || '', qty: 10 }]);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Buka Detail Modal
  const openDetailModal = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  // Manipulasi baris item
  const handleAddItemRow = () => {
    if (products.length === 0) return;
    setFormItems([...formItems, { product_id: products[0].id, qty: 10 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (formItems.length === 1) {
      alert('Pesanan harus memiliki minimal satu item produk.');
      return;
    }
    setFormItems(formItems.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: 'product_id' | 'qty', value: any) => {
    const updated = [...formItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormItems(updated);
  };

  // Perhitungan total muatan estimasi di client (sebelum divalidasi dan dihitung ulang di server)
  const calculatedClientPayload = formItems.reduce((sum, item) => {
    const p = products.find((prod) => prod.id === item.product_id);
    const weight = p ? p.berat_per_unit_kg * (item.qty || 0) : 0;
    return sum + weight;
  }, 0);

  // Submit Simpan Pesanan via RPC
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formCustomerId) {
      setFormError('Harap pilih pelanggan pemesan.');
      return;
    }

    if (formItems.length === 0) {
      setFormError('Pesanan harus memiliki minimal satu item produk.');
      return;
    }

    for (const item of formItems) {
      if (!item.product_id || isNaN(item.qty) || item.qty <= 0) {
        setFormError('Setiap item produk harus memiliki kuantitas (qty) > 0.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await saveOrder({
        orderId: isEditing ? editingOrderId : null,
        customerId: formCustomerId,
        tanggal: formTanggal,
        catatan: formCatatan,
        items: formItems,
      });

      setSuccessMsg(isEditing ? 'Pesanan berhasil diperbarui.' : 'Pesanan baru berhasil dibuat.');
      setIsFormModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan pesanan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hapus Pesanan via RPC
  const handleDeleteOrder = async (order: Order) => {
    if (['dalam_pengiriman', 'diterima', 'tidak_lengkap'].includes(order.status)) {
      alert(`Pesanan dengan status "${order.status}" tidak dapat dihapus karena sudah dalam pengiriman atau selesai.`);
      return;
    }

    if (!window.confirm(`Yakin ingin menghapus pesanan toko "${order.customers?.nama_toko || 'Pelanggan'}"?`)) {
      return;
    }

    try {
      await deleteOrder(order.id);
      setSuccessMsg('Pesanan berhasil dihapus.');
      setOrders(orders.filter((o) => o.id !== order.id));
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Gagal menghapus pesanan: ${err.message}`);
    }
  };

  // Helper Badge Status
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'baru':
        return <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#EBF5FB] text-[#134E5E] border border-[#BCE1EE]">Baru</span>;
      case 'belum_siap':
        return <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#FEF6E7] text-[#874D00] border border-[#FADBA2]">Belum siap</span>;
      case 'siap':
        return <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#E6F4F1] text-[#0F4E4A] border border-[#BDE3DB]">Siap kirim</span>;
      case 'dalam_pengiriman':
        return <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-surface-muted text-ink border border-border">Dalam pengiriman</span>;
      case 'diterima':
        return <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#E6F4F1] text-[#0F4E4A] border border-[#BDE3DB]">Diterima</span>;
      case 'tidak_lengkap':
        return <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-danger-bg text-danger-text border border-[#FECDCA]">Tidak lengkap</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-surface-muted text-ink border border-border">{status}</span>;
    }
  };

  const filteredOrders = orders.filter((o) => {
    const tokoName = o.customers?.nama_toko || '';
    return tokoName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Manajemen Pesanan Distribusi</h1>
          <p className="text-sm text-muted mt-1">
            Daftar pesanan produk plastik pelanggan beserta muatan beban (kg) untuk penentuan rute.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="h-11 px-4 inline-flex items-center gap-2 bg-petrol-900 hover:bg-petrol-800 text-white text-[15px] font-semibold rounded-md transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-teal-600/50 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat pesanan baru</span>
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
      <div className="bg-white p-4 rounded-md border border-border flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Toko */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-subtle absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari toko pelanggan..."
              className="w-full h-11 pl-9 pr-3.5 bg-white border border-border rounded-md text-[15px] text-ink placeholder:text-subtle focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors"
            />
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1.5 bg-white border border-border rounded-md px-3 h-11">
            <Filter className="w-3.5 h-3.5 text-subtle" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-ink focus:outline-none cursor-pointer"
            >
              <option value="all">Semua status</option>
              <option value="baru">Baru</option>
              <option value="belum_siap">Belum siap</option>
              <option value="siap">Siap kirim</option>
              <option value="dalam_pengiriman">Dalam pengiriman</option>
              <option value="diterima">Diterima</option>
              <option value="tidak_lengkap">Tidak lengkap</option>
            </select>
          </div>

          {/* Filter Tanggal */}
          <div className="flex items-center gap-1.5 bg-white border border-border rounded-md px-3 h-11">
            <Calendar className="w-3.5 h-3.5 text-subtle" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-ink focus:outline-none"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                title="Hapus filter tanggal"
                className="text-subtle hover:text-ink ml-1 text-xs"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        <div className="text-sm text-muted whitespace-nowrap">
          Ditemukan: <span className="font-semibold text-ink">{filteredOrders.length}</span> pesanan
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-md border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted flex flex-col items-center gap-3">
            <span className="w-5 h-5 rounded-full border-2 border-border-strong border-t-petrol-900 animate-spin motion-reduce:animate-none" />
            <p className="text-sm">Memuat pesanan...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <ShoppingCart className="w-10 h-10 text-subtle mx-auto mb-3" />
            <p className="font-semibold text-ink">Tidak ada pesanan yang sesuai filter</p>
            <p className="text-xs text-muted mt-1">
              Buat pesanan baru untuk mulai mengalokasikan stok produk dan rute armada.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink">
              <thead className="bg-surface-subtle text-muted text-xs font-medium border-b border-border">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Toko pelanggan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Item & muatan (kg)</th>
                  <th className="py-3 px-4">Catatan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((o) => {
                  const isLocked = ['dalam_pengiriman', 'diterima', 'tidak_lengkap'].includes(o.status);
                  const itemCount = (o.order_items || []).length;

                  return (
                    <tr key={o.id} className="hover:bg-surface-subtle transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-muted whitespace-nowrap">
                        {o.tanggal}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-ink">
                          {o.customers?.nama_toko || 'Toko Pelanggan'}
                        </div>
                        <div className="text-xs text-muted truncate max-w-xs mt-0.5">
                          {o.customers?.alamat}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(o.status)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-surface-muted text-ink rounded-md border border-border">
                            <Package className="w-3 h-3 text-muted" />
                            {itemCount} item
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 bg-teal-50 text-[#0F4E4A] rounded-md border border-teal-200">
                            <Weight className="w-3 h-3 text-teal-600" />
                            {Number(o.total_muatan_kg).toFixed(1)} kg
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted max-w-xs truncate">
                        {o.catatan || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openDetailModal(o)}
                            title="Lihat detail pesanan"
                            className="p-1.5 text-muted hover:text-ink hover:bg-surface-muted rounded-md transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isLocked ? (
                            <span
                              title="Terkunci: Pesanan sedang dikirim atau selesai"
                              className="p-1.5 text-subtle cursor-not-allowed"
                            >
                              <Lock className="w-4 h-4" />
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => openEditModal(o)}
                                title="Edit pesanan"
                                className="p-1.5 text-muted hover:text-ink hover:bg-surface-muted rounded-md transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(o)}
                                title="Hapus pesanan"
                                className="p-1.5 text-danger-text hover:bg-danger-bg rounded-md transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
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

      {/* Modal 1: Form Tambah / Edit Pesanan */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-petrol-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-border max-w-2xl w-full overflow-hidden shadow-sm">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <h2 className="font-display text-lg font-bold tracking-tight text-ink">
                {isEditing ? 'Ubah Pesanan' : 'Buat Pesanan Distribusi Baru'}
              </h2>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 text-muted hover:text-ink rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="p-6 space-y-4">
              {formError && (
                <div
                  role="alert"
                  className="border-l-2 border-danger bg-danger-bg px-3.5 py-2.5 text-xs text-danger-text flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Warning jika kapasitas melebihi armada terbesar */}
              {calculatedClientPayload > maxVehicleCapacity && (
                <div
                  role="alert"
                  className="border-l-2 border-amber-400 bg-amber-50 px-3.5 py-2.5 text-xs text-[#7A4B06] flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <span className="font-semibold">Peringatan kapasitas armada:</span> Total muatan pesanan ini ({calculatedClientPayload.toFixed(1)} kg) melebihi kapasitas kendaraan terbesar yang tersedia ({maxVehicleCapacity} kg).
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pelanggan */}
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Toko pelanggan *
                  </label>
                  <select
                    value={formCustomerId}
                    onChange={(e) => setFormCustomerId(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white border border-border rounded-md text-[15px] text-ink focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors"
                    required
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama_toko} ({c.alamat})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tanggal */}
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Tanggal pengiriman *
                  </label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white border border-border rounded-md text-[15px] text-ink focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Catatan pengiriman (opsional)
                </label>
                <input
                  type="text"
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  placeholder="Contoh: Titipkan di kasir utama..."
                  className="w-full h-11 px-3.5 bg-white border border-border rounded-md text-[15px] text-ink placeholder:text-subtle focus:outline-none focus:border-teal-600 focus:ring-[3px] focus:ring-teal-600/20 transition-colors"
                />
              </div>

              {/* Dynamic Items List */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-ink">
                    Daftar item produk plastik
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-petrol-800 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah baris produk</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {formItems.map((item, index) => {
                    const prod = products.find((p) => p.id === item.product_id);
                    const isOverStock = prod && item.qty > prod.stok;
                    const itemWeight = prod ? (prod.berat_per_unit_kg * item.qty).toFixed(1) : '0';

                    return (
                      <div key={index} className="p-3 bg-surface-subtle rounded-md border border-border space-y-2">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          {/* Pilih Produk */}
                          <div className="flex-1 w-full sm:w-auto">
                            <select
                              value={item.product_id}
                              onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                              className="w-full h-9 px-2.5 bg-white border border-border rounded-md text-xs font-medium text-ink focus:outline-none focus:border-teal-600"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nama} ({p.berat_per_unit_kg} kg/unit, stok: {p.stok})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Qty Input */}
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted">Qty:</span>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={item.qty}
                                onChange={(e) => handleItemChange(index, 'qty', parseInt(e.target.value) || 0)}
                                className="w-20 h-9 px-2 bg-white border border-border rounded-md text-xs font-semibold text-center text-ink focus:outline-none focus:border-teal-600"
                                required
                              />
                            </div>

                            {/* Subtotal Berat */}
                            <span className="text-xs font-mono font-medium text-muted whitespace-nowrap">
                              = {itemWeight} kg
                            </span>

                            {/* Tombol Hapus Baris */}
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(index)}
                              className="p-1 text-subtle hover:text-danger transition-colors cursor-pointer"
                              title="Hapus item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Peringatan Stok Menipis/Kurang */}
                        {isOverStock && (
                          <div className="text-xs text-[#874D00] bg-[#FEF6E7] border border-[#FADBA2] px-2 py-1 rounded-md flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>Kuantitas ({item.qty}) melebihi stok yang tersedia saat ini ({prod?.stok} unit).</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Muatan Summary Box */}
              <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-md flex items-center justify-between text-xs">
                <span className="font-semibold text-[#0F4E4A]">Total muatan dihitung:</span>
                <span className="font-bold text-sm text-[#0F4E4A] font-mono">
                  {calculatedClientPayload.toFixed(2)} kg
                </span>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-border flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="h-11 px-4 border border-border bg-white text-ink hover:bg-surface-muted font-medium rounded-md text-sm transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 px-5 bg-petrol-900 hover:bg-petrol-800 text-white font-semibold rounded-md text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? 'Memproses...' : isEditing ? 'Simpan perubahan' : 'Buat pesanan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Detail Pesanan */}
      {isDetailModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-petrol-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-border max-w-lg w-full overflow-hidden shadow-sm">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight text-ink">
                  Detail Pesanan #{selectedOrder.id.slice(0, 8)}
                </h2>
                <p className="text-xs text-muted mt-0.5">Tanggal: {selectedOrder.tanggal}</p>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 text-muted hover:text-ink rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Info Pelanggan */}
              <div className="p-3.5 bg-surface-subtle rounded-md border border-border">
                <p className="text-xs font-semibold text-muted">Pelanggan</p>
                <p className="font-bold text-ink text-sm mt-0.5">{selectedOrder.customers?.nama_toko}</p>
                <p className="text-xs text-muted mt-0.5">{selectedOrder.customers?.alamat}</p>
                <p className="text-xs text-muted mt-0.5">Kontak: {selectedOrder.customers?.no_hp}</p>
              </div>

              {/* Status & Catatan */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted">Status saat ini:</span>
                {getStatusBadge(selectedOrder.status)}
              </div>
              {selectedOrder.catatan && (
                <div className="text-xs text-muted p-2.5 bg-surface-muted rounded-md border border-border">
                  <span className="font-semibold text-ink">Catatan:</span> {selectedOrder.catatan}
                </div>
              )}

              {/* Daftar Barang */}
              <div>
                <p className="text-xs font-semibold text-muted mb-2">Item produk pesanan</p>
                <div className="border border-border rounded-md overflow-hidden divide-y divide-border text-xs">
                  {(selectedOrder.order_items || []).map((it) => (
                    <div key={it.id} className="p-3 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-ink">{it.products?.nama || 'Produk'}</p>
                        <p className="text-muted text-xs mt-0.5">{it.qty} unit &times; {it.products?.berat_per_unit_kg} kg</p>
                      </div>
                      <span className="font-mono font-semibold text-ink">{Number(it.berat_kg).toFixed(1)} kg</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Muatan */}
              <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-md flex items-center justify-between">
                <span className="text-xs font-semibold text-[#0F4E4A]">Total muatan terverifikasi:</span>
                <span className="text-base font-bold text-[#0F4E4A] font-mono">
                  {Number(selectedOrder.total_muatan_kg).toFixed(2)} kg
                </span>
              </div>

              {/* Bukti Pengiriman Button jika status diterima / tidak_lengkap */}
              {(selectedOrder.status === 'diterima' || selectedOrder.status === 'tidak_lengkap') && (
                <button
                  type="button"
                  onClick={() => {
                    setViewingProofOrderId({
                      orderId: selectedOrder.id,
                      namaToko: selectedOrder.customers?.nama_toko || 'Toko Pelanggan',
                    });
                  }}
                  className="w-full h-11 px-4 bg-white text-ink border border-border hover:bg-surface-muted rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-teal-600" />
                  <span>Lihat bukti foto & tanda tangan penerima</span>
                </button>
              )}
            </div>

            <div className="px-6 py-3.5 bg-surface-subtle border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="h-9 px-4 bg-white border border-border text-ink font-medium rounded-md text-xs hover:bg-surface-muted transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal 3: Bukti Penerimaan Pengiriman */}
      {viewingProofOrderId && (
        <ProofDetailModal
          orderId={viewingProofOrderId.orderId}
          namaToko={viewingProofOrderId.namaToko}
          onClose={() => setViewingProofOrderId(null)}
        />
      )}
    </div>
  );
};
