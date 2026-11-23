/**
 * Modul Kompresi Foto Bukti Pengiriman di Sisi Klien (Client-Side HTML5 Canvas).
 *
 * Persyaratan:
 * 1. Resize proporsional dengan dimensi maksimal 1280px.
 * 2. Menggunakan createImageBitmap({ imageOrientation: 'from-image' }) agar orientasi foto HP otomatis tegak.
 * 3. Kompresi JPEG bertahap mulai dari kualitas 0.6 -> 0.5 -> 0.4 hingga ukuran file < 200 KB (204.800 bytes).
 */

export const MAX_IMAGE_DIMENSION = 1280;
export const MAX_FILE_SIZE_BYTES = 200 * 1024; // 200 KB = 204.800 bytes
export const QUALITY_STEPS = [0.6, 0.5, 0.4, 0.3];

/**
 * Menghitung dimensi target dengan mempertahankan rasio aspek asli
 * agar tidak melebihi dimensi batas maksimum (1280px).
 */
export function calculateTargetDimensions(
  origWidth: number,
  origHeight: number,
  maxDimension: number = MAX_IMAGE_DIMENSION
): { width: number; height: number } {
  if (origWidth <= 0 || origHeight <= 0) {
    return { width: maxDimension, height: maxDimension };
  }

  if (origWidth <= maxDimension && origHeight <= maxDimension) {
    return { width: origWidth, height: origHeight };
  }

  if (origWidth > origHeight) {
    const width = maxDimension;
    const height = Math.round((origHeight * maxDimension) / origWidth);
    return { width, height };
  } else {
    const height = maxDimension;
    const width = Math.round((origWidth * maxDimension) / origHeight);
    return { width, height };
  }
}

/**
 * Mengubah Canvas menjadi Blob dengan kualitas JPEG tertentu
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Gagal mengonversi canvas ke Blob JPEG.'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Melakukan kompresi adaptif bertahap pada foto bukti pengiriman.
 */
export async function compressDeliveryPhoto(
  fileOrBlob: File | Blob
): Promise<{ blob: Blob; width: number; height: number; qualityUsed: number }> {
  let imageSource: ImageBitmap | HTMLImageElement;
  let origWidth: number;
  let origHeight: number;

  // 1. Dapatkan sumber gambar dan orientasi kamera
  if (typeof createImageBitmap !== 'undefined') {
    try {
      // Gunakan imageOrientation: 'from-image' untuk mengoreksi orientasi EXIF kamera HP
      imageSource = await createImageBitmap(fileOrBlob, {
        imageOrientation: 'from-image',
      });
      origWidth = imageSource.width;
      origHeight = imageSource.height;
    } catch {
      // Fallback bila createImageBitmap gagal membaca format tertentu
      imageSource = await loadImageElement(fileOrBlob);
      origWidth = imageSource.width;
      origHeight = imageSource.height;
    }
  } else {
    imageSource = await loadImageElement(fileOrBlob);
    origWidth = imageSource.width;
    origHeight = imageSource.height;
  }

  // 2. Hitung dimensi target maksimal 1280px
  const { width: targetWidth, height: targetHeight } = calculateTargetDimensions(
    origWidth,
    origHeight,
    MAX_IMAGE_DIMENSION
  );

  // 3. Gambar ke HTML5 Canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D Context tidak didukung oleh browser.');
  }

  // Isi latar putih sebelum menggambar untuk mencegah artefak transparan pada JPEG
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);

  // 4. Kompresi JPEG bertahap: mulai 0.6 -> 0.5 -> 0.4 hingga < 200 KB
  let finalBlob: Blob | null = null;
  let chosenQuality = QUALITY_STEPS[0];

  for (const quality of QUALITY_STEPS) {
    chosenQuality = quality;
    const blob = await canvasToBlob(canvas, quality);
    finalBlob = blob;

    if (blob.size <= MAX_FILE_SIZE_BYTES) {
      break; // Berhenti jika sudah di bawah batas 200 KB
    }
  }

  if (!finalBlob) {
    throw new Error('Gagal menghasilkan blob gambar terkompresi.');
  }

  return {
    blob: finalBlob,
    width: targetWidth,
    height: targetHeight,
    qualityUsed: chosenQuality,
  };
}

function loadImageElement(fileOrBlob: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gagal membaca data file gambar.'));
    };
    img.src = url;
  });
}
