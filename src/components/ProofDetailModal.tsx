import React, { useEffect, useState } from 'react';
import { X, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProofDetailModalProps {
  orderId: string;
  namaToko: string;
  onClose: () => void;
}

interface DeliveryConfirmationData {
  order_id: string;
  route_id: string;
  driver_id: string;
  status: 'diterima' | 'tidak_lengkap';
  foto_path: string | null;
  ttd_path: string | null;
  catatan: string | null;
  waktu: string;
  driverProfile?: { nama: string; username: string };
}

export const ProofDetailModal: React.FC<ProofDetailModalProps> = ({
  orderId,
  namaToko,
  onClose,
}) => {
  const [data, setData] = useState<DeliveryConfirmationData | null>(null);
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null);
  const [ttdSignedUrl, setTtdSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchProof = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        // Ambil data konfirmasi penerimaan
        const { data: conf, error: confErr } = await supabase
          .from('delivery_confirmations')
          .select('*, driverProfile:profiles!driver_id(nama, username)')
          .eq('order_id', orderId)
          .single();

        if (confErr) {
          throw new Error(`Gagal memuat bukti: ${confErr.message}`);
        }

        setData(conf as DeliveryConfirmationData);

        // Generate Signed URLs untuk foto dan tanda tangan
        if (conf.foto_path) {
          const { data: photoData } = await supabase.storage
            .from('proofs')
            .createSignedUrl(conf.foto_path, 3600);
          if (photoData) {
            setPhotoSignedUrl(photoData.signedUrl);
          }
        }

        if (conf.ttd_path) {
          const { data: ttdData } = await supabase.storage
            .from('proofs')
            .createSignedUrl(conf.ttd_path, 3600);
          if (ttdData) {
            setTtdSignedUrl(ttdData.signedUrl);
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Gagal memuat detail bukti penerimaan.');
      } finally {
        setLoading(false);
      }
    };

    fetchProof();
  }, [orderId]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto border border-slate-100">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  data?.status === 'diterima'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {data?.status === 'diterima' ? 'Diterima Lengkap' : 'Tidak Lengkap'}
              </span>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Bukti Penerimaan Barang
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">{namaToko}</p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="mt-3 text-xs font-medium text-slate-500">Memuat berkas bukti...</p>
          </div>
        ) : errorMsg ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Metadata Info */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl text-xs border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                  Driver Pengantar
                </span>
                <span className="font-bold text-slate-800">
                  {data?.driverProfile?.nama || 'Driver CV SP'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                  Waktu Konfirmasi
                </span>
                <span className="font-bold text-slate-800">
                  {data?.waktu
                    ? new Date(data.waktu).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : '-'}
                </span>
              </div>
            </div>

            {/* Foto Bukti Fisik */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-1.5">
                Foto Bukti / Nota Penerimaan:
              </span>
              {photoSignedUrl ? (
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center">
                  <img
                    src={photoSignedUrl}
                    alt="Foto Bukti"
                    className="max-h-56 w-full object-contain"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Foto tidak tersedia.</p>
              )}
            </div>

            {/* Tanda Tangan Pelanggan */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-1.5">
                Tanda Tangan Digital Penerima:
              </span>
              {ttdSignedUrl ? (
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white p-2 flex items-center justify-center">
                  <img
                    src={ttdSignedUrl}
                    alt="Tanda Tangan Digital"
                    className="h-28 object-contain"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Tanda tangan tidak tersedia.</p>
              )}
            </div>

            {/* Catatan Driver */}
            {data?.catatan && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900">
                <span className="font-bold block text-[10px] uppercase text-amber-700">
                  Catatan Driver di Lapangan:
                </span>
                <p className="mt-0.5">{data.catatan}</p>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
