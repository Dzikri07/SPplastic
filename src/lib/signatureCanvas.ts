/**
 * Modul Helper Tanda Tangan Digital Driver & Pelanggan (HTML5 Canvas).
 *
 * Persyaratan:
 * 1. Kanvas diisi latar belakang putih (#ffffff) saat inisialisasi / dibersihkan.
 * 2. Menggunakan Pointer Events (pointerdown, pointermove, pointerup) dengan 'touch-action: none'.
 * 3. Validasi kanvas tidak boleh kosong sebelum tombol simpan aktif.
 */

/**
 * Mengisi kanvas dengan latar belakang putih pekat.
 */
export function initializeSignatureCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#0F172A'; // Slate-900 untuk goresan tanda tangan
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

/**
 * Memeriksa apakah kanvas tanda tangan masih kosong (belum ditandatangani).
 * Mengecek apakah terdapat pixel non-putih yang cukup (threshold) sebagai bukti goresan.
 */
export function isSignatureCanvasBlank(
  canvas: HTMLCanvasElement,
  minStrokePixels: number = 25
): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return true;

  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    let nonWhitePixels = 0;

    // data adalah array RGBA (4 elemen per pixel)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Jika pixel transparan (a < 128) atau bukan warna putih pekat (r < 240, g < 240, b < 240)
      if (a > 100 && (r < 240 || g < 240 || b < 240)) {
        nonWhitePixels++;
        if (nonWhitePixels >= minStrokePixels) {
          return false; // Kanvas terisi goresan yang valid
        }
      }
    }

    return true; // Kanvas dianggap kosong
  } catch {
    // Jika getImageData diblokir karena cross-origin tainted canvas
    return false;
  }
}

/**
 * Mengekspor kanvas menjadi Blob gambar JPEG berkualitas tinggi
 */
export function exportCanvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string = 'image/jpeg',
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Gagal mengekspor tanda tangan menjadi Blob.'));
        }
      },
      mimeType,
      quality
    );
  });
}
