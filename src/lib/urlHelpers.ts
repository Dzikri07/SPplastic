/**
 * Helper fungsi untuk integrasi navigasi Google Maps dan WhatsApp Driver.
 */

/**
 * Menghasilkan link deep-link ke Google Maps Direction dengan mode berkendara (driving).
 * Parameter destination di-encode dengan encodeURIComponent secara aman.
 */
export function generateGoogleMapsNavigationUrl(lat: number, lng: number): string {
  const destination = encodeURIComponent(`${lat},${lng}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
}

/**
 * Menormalkan nomor telepon pelanggan Indonesia ke format internasional '628xxx'
 * untuk digunakan pada tautan WhatsApp API (wa.me).
 *
 * Contoh:
 * - '0812-3456-7890' -> '6281234567890'
 * - '+62 812 3456 7890' -> '6281234567890'
 * - '81234567890' -> '6281234567890'
 * - '6281234567890' -> '6281234567890'
 */
export function normalizeWhatsAppPhone(rawPhone: string): string {
  if (!rawPhone) return '';

  // Hapus semua karakter selain angka dan simbol '+'
  let cleaned = rawPhone.replace(/[^\d+]/g, '');

  // Hapus tanda '+' di depan jika ada
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Jika diawali '08', ganti '0' dengan '62'
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (!cleaned.startsWith('62')) {
    // Jika tidak diawali '62' dan tidak diawali '0' (mis. langsung '812...'), tambahkan '62'
    cleaned = '62' + cleaned;
  }

  return cleaned;
}

/**
 * Menghasilkan link tautan langsung ke obrolan WhatsApp pelanggan
 */
export function generateWhatsAppUrl(phone: string, message?: string): string {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return '';

  if (message) {
    return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/${normalized}`;
}
