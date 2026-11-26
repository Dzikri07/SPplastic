/**
 * Service untuk mengambil geometri rute jalan raya riil dari OSRM (Open Source Routing Machine).
 * 100% Gratis, open-source menggunakan jaringan jalan OpenStreetMap tanpa perlu API Key.
 */

// In-memory cache agar request dengan koordinat identik tidak dipanggil ulang
const routeCache = new Map<string, [number, number][]>();

/**
 * Mengambil array koordinat [latitude, longitude] yang menempel pada jalan aspal asli.
 * Jika koneksi gagal / timeout, fungsi otomatis mengembalikan titik lurus awal (fallback aman).
 *
 * @param waypoints Daftar titik koordinat [latitude, longitude] urut (mulai dari depot -> stops -> kembali ke depot)
 * @returns Array koordinat [lat, lng] yang membentuk geometri lekukan jalan
 */
export async function getRoadGeometry(
  waypoints: [number, number][]
): Promise<[number, number][]> {
  if (!waypoints || waypoints.length < 2) {
    return waypoints;
  }

  // Generate cache key
  const cacheKey = waypoints
    .map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`)
    .join(';');

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  try {
    // Format OSRM: lon,lat;lon,lat;...
    const coordString = waypoints
      .map(([lat, lng]) => `${lng.toFixed(6)},${lat.toFixed(6)}`)
      .join(';');

    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

    // Timeout 6 detik agar UI tetap responsif jika koneksi publik lambat
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OSRM API response status: ${res.status}`);
    }

    const data = await res.json();

    if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
      // OSRM GeoJSON format: [longitude, latitude] -> convert to Leaflet [latitude, longitude]
      const roadCoords: [number, number][] = data.routes[0].geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng]
      );

      // Simpan di cache
      routeCache.set(cacheKey, roadCoords);
      return roadCoords;
    }

    return waypoints;
  } catch (error) {
    console.warn('[OSRM Routing] Gagal memuat rute jalan raya, fallback ke garis lurus:', error);
    return waypoints;
  }
}
