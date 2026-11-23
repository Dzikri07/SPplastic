import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Upload,
  RefreshCw,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { compressDeliveryPhoto } from '../lib/photoCompression';
import {
  initializeSignatureCanvas,
  isSignatureCanvasBlank,
  exportCanvasToBlob,
} from '../lib/signatureCanvas';

export interface StopOrderForConfirmation {
  orderId: string;
  routeId: string;
  urutan: number;
  namaToko: string;
  alamat: string;
  totalMuatanKg: number;
}

interface DeliveryConfirmationModalProps {
  order: StopOrderForConfirmation;
  driverId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const DeliveryConfirmationModal: React.FC<DeliveryConfirmationModalProps> = ({
  order,
  driverId,
  onSuccess,
  onClose,
}) => {
  // Status Pengiriman
  const [status, setStatus] = useState<'diterima' | 'tidak_lengkap'>('diterima');
  const [catatan, setCatatan] = useState('');

  // Foto State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoSizeKb, setPhotoSizeKb] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Tanda Tangan Canvas State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Upload Progress & State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStepMsg, setUploadStepMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Inisialisasi Canvas saat modal terbuka
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set ukuran fisik kanvas sesuai lebar kontainer
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = 160 * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    initializeSignatureCanvas(canvas);
    setHasSignature(false);
  }, []);

  useEffect(() => {
    // Delay sedikit agar modal selesai me-render DOM
    const timer = setTimeout(() => {
      setupCanvas();
    }, 150);
    return () => clearTimeout(timer);
  }, [setupCanvas]);

  // Handle Event Menggambar (Pointer Events + touch-action: none)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    canvas.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore bila pointer capture sudah lepas
    }

    // Validasi apakah kanvas sudah memiliki goresan
    const isBlank = isSignatureCanvasBlank(canvas);
    setHasSignature(!isBlank);
  };

  const handleClearSignature = () => {
    setupCanvas();
  };

  // Handle Kamera & Kompresi Foto
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      setUploadError(null);

      // Jalankan kompresi adaptif (< 200 KB)
      const compressed = await compressDeliveryPhoto(file);
      setPhotoBlob(compressed.blob);
      setPhotoSizeKb(Math.round(compressed.blob.size / 1024));

      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
      const newPreview = URL.createObjectURL(compressed.blob);
      setPhotoPreviewUrl(newPreview);
    } catch (err: any) {
      setUploadError(err.message || 'Gagal memproses dan mengompres foto.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Submit Konfirmasi Pengiriman (Atomic Upload + Insert)
  const handleSubmitConfirmation = async () => {
    if (!photoBlob) {
      setUploadError('Silakan ambil foto bukti penerimaan/surat jalan terlebih dahulu.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || isSignatureCanvasBlank(canvas)) {
      setUploadError('Tanda tangan digital penerima wajib dibubuhkan.');
      return;
    }

    if (status === 'tidak_lengkap' && !catatan.trim()) {
      setUploadError('Wajib mengisi catatan kendala untuk pengiriman yang Tidak Lengkap.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      // Step 1: Ekspor tanda tangan ke Blob
      setUploadStepMsg('Mengekspor tanda tangan digital...');
      const signatureBlob = await exportCanvasToBlob(canvas, 'image/jpeg', 0.85);

      const timestamp = Date.now();
      const photoFileName = `${order.orderId}/foto_${timestamp}.jpg`;
      const ttdFileName = `${order.orderId}/ttd_${timestamp}.jpg`;

      // Step 2: Upload Foto ke Supabase Storage (Bucket 'proofs')
      setUploadStepMsg('Mengunggah foto bukti ke penyimpanan aman...');
      const { error: photoUploadErr } = await supabase.storage
        .from('proofs')
        .upload(photoFileName, photoBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (photoUploadErr) {
        throw new Error(`Gagal mengunggah foto bukti: ${photoUploadErr.message}`);
      }

      // Step 3: Upload Tanda Tangan ke Supabase Storage
      setUploadStepMsg('Mengunggah tanda tangan digital...');
      const { error: ttdUploadErr } = await supabase.storage
        .from('proofs')
        .upload(ttdFileName, signatureBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (ttdUploadErr) {
        throw new Error(`Gagal mengunggah tanda tangan: ${ttdUploadErr.message}`);
      }

      // Step 4: Simpan ke tabel delivery_confirmations
      // (Trigger trg_on_delivery_confirmed otomatis mengupdate status orders & rute)
      setUploadStepMsg('Menyimpan konfirmasi penerimaan pengiriman...');
      const { error: insertErr } = await supabase.from('delivery_confirmations').insert({
        order_id: order.orderId,
        route_id: order.routeId,
        driver_id: driverId,
        status,
        foto_path: photoFileName,
        ttd_path: ttdFileName,
        catatan: catatan.trim() || null,
        waktu: new Date().toISOString(),
      });

      if (insertErr) {
        throw new Error(`Gagal menyimpan data konfirmasi: ${insertErr.message}`);
      }

      // Berhasil
      onSuccess();
    } catch (err: any) {
      setUploadError(err.message || 'Terjadi kesalahan saat mengunggah bukti.');
    } finally {
      setIsUploading(false);
      setUploadStepMsg(null);
    }
  };

  const isFormValid =
    photoBlob !== null &&
    hasSignature &&
    !isCompressing &&
    !isUploading &&
    (status === 'diterima' || catatan.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-ink/50  flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-md max-w-lg w-full p-5 sm:p-6 shadow-lg space-y-4 my-auto border border-line">
        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-line pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                Stop #{order.urutan}
              </span>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Konfirmasi Penerimaan
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {order.namaToko} &bull; {order.totalMuatanKg} kg
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert with Retry */}
        {uploadError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-md flex items-start gap-3 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Pengunggahan Terkendala</p>
              <p className="mt-0.5">{uploadError}</p>
            </div>
          </div>
        )}

        {/* 1. Pemilihan Status Penerimaan */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Status Penerimaan Barang:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => setStatus('diterima')}
              className={`p-3 rounded-md border text-left flex items-center gap-2.5 transition ${
                status === 'diterima'
                  ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20'
                  : 'border-line hover:border-line text-slate-700'
              }`}
            >
              <CheckCircle2
                className={`w-5 h-5 flex-shrink-0 ${
                  status === 'diterima' ? 'text-emerald-600' : 'text-slate-400'
                }`}
              />
              <div>
                <span className="block text-xs font-bold">Diterima Lengkap</span>
                <span className="block text-[10px] text-slate-500">Sesuai nota pesanan</span>
              </div>
            </button>

            <button
              type="button"
              disabled={isUploading}
              onClick={() => setStatus('tidak_lengkap')}
              className={`p-3 rounded-md border text-left flex items-center gap-2.5 transition ${
                status === 'tidak_lengkap'
                  ? 'border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-500/20'
                  : 'border-line hover:border-line text-slate-700'
              }`}
            >
              <AlertTriangle
                className={`w-5 h-5 flex-shrink-0 ${
                  status === 'tidak_lengkap' ? 'text-amber-600' : 'text-slate-400'
                }`}
              />
              <div>
                <span className="block text-xs font-bold">Tidak Lengkap</span>
                <span className="block text-[10px] text-slate-500">Ada kendala / retur</span>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Pengambilan & Kompresi Foto Bukti */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              <span>Foto Bukti Fisik / Nota Toko:</span>
            </label>
            {photoSizeKb && (
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                Terkompresi: {photoSizeKb} KB (&lt;200 KB)
              </span>
            )}
          </div>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {photoPreviewUrl ? (
            <div className="relative rounded-md overflow-hidden border border-line bg-slate-900 max-h-48 flex items-center justify-center group">
              <img
                src={photoPreviewUrl}
                alt="Bukti Pengiriman"
                className="w-full h-44 object-contain"
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2.5 right-2.5 bg-black/75 hover:bg-black text-white px-3 py-1.5 rounded-md text-xs font-semibold  flex items-center gap-1.5 transition shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Foto Ulang</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isCompressing || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-6 px-4 border-2 border-dashed border-line hover:border-blue-500 rounded-md flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-blue-50/50 transition group disabled:opacity-50"
            >
              {isCompressing ? (
                <>
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                  <span className="text-xs font-semibold text-slate-600">
                    Mengompres foto di perangkat...
                  </span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-slate-800 block">
                      Ambil Foto via Kamera HP
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Resize maks 1280px, kompresi otomatis &lt; 200 KB
                    </span>
                  </div>
                </>
              )}
            </button>
          )}
        </div>

        {/* 3. Tanda Tangan Digital Pelanggan */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Tanda Tangan Penerima di Layar:</span>
            </label>
            <button
              type="button"
              disabled={isUploading}
              onClick={handleClearSignature}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Ulangi / Hapus</span>
            </button>
          </div>

          <div className="rounded-md border border-line overflow-hidden bg-white shadow-inner relative">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="w-full h-40 block cursor-crosshair"
              style={{ touchAction: 'none' }}
            />
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                <span className="text-xs font-semibold text-slate-400">
                  Tanda tangani di sini menggunakan jari
                </span>
              </div>
            )}
          </div>
          {hasSignature ? (
            <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Tanda tangan penerima terisi</span>
            </p>
          ) : (
            <p className="text-[10px] text-slate-400 font-medium">
              * Pemilik toko dapat menandatangani langsung dengan jari di atas layar.
            </p>
          )}
        </div>

        {/* 4. Catatan Driver (Wajib jika Tidak Lengkap) */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">
            Catatan Driver {status === 'tidak_lengkap' && <span className="text-rose-600">*</span>}:
          </label>
          <textarea
            rows={2}
            value={catatan}
            disabled={isUploading}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder={
              status === 'tidak_lengkap'
                ? 'Jelaskan kendala: barang retur, toko tutup, atau jumlah kurang...'
                : 'Catatan tambahan (opsional)...'
            }
            className="w-full px-3 py-2 text-xs rounded-md border border-line focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* Modal Actions */}
        <div className="pt-2 border-t border-line flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="px-4 py-2.5 rounded-md border border-line text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={!isFormValid}
            onClick={handleSubmitConfirmation}
            className="flex-1 py-2.5 px-4 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{uploadStepMsg || 'Menyimpan...'}</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Simpan Konfirmasi Pengiriman</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
