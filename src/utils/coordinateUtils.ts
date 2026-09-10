/**
 * Utility functions for parsing, validating, and estimating GPS coordinates
 * for PLN UPT Madiun Asset Management System.
 */

export interface ParsedCoordinate {
  lat: number;
  lng: number;
  formatted: string;
  isValid: boolean;
}

export interface RegionCoordinatePreset {
  key: string;
  label: string;
  lat: number;
  lng: number;
  formatted: string;
}

export const REGION_PRESETS: Record<string, { lat: number; lng: number; label: string }> = {
  madiun: { lat: -7.6298, lng: 111.5239, label: 'Kota / Kab. Madiun' },
  kediri: { lat: -7.8164, lng: 112.0118, label: 'Kab. / Kota Kediri' },
  babat: { lat: -7.1128, lng: 112.1636, label: 'Babat, Lamongan' },
  lamongan: { lat: -7.1195, lng: 112.4158, label: 'Kab. Lamongan' },
  ngawi: { lat: -7.4039, lng: 111.4462, label: 'Kab. Ngawi' },
  magetan: { lat: -7.6493, lng: 111.3283, label: 'Kab. Magetan' },
  ponorogo: { lat: -7.8697, lng: 111.4623, label: 'Kab. Ponorogo' },
  pacitan: { lat: -8.2045, lng: 111.0921, label: 'Kab. Pacitan' },
  bojonegoro: { lat: -7.1502, lng: 111.8817, label: 'Kab. Bojonegoro' },
  tuban: { lat: -6.8976, lng: 112.0649, label: 'Kab. Tuban' },
  nganjuk: { lat: -7.6049, lng: 111.9009, label: 'Kab. Nganjuk' },
  trenggalek: { lat: -8.0504, lng: 111.7082, label: 'Kab. Trenggalek' },
  tulungagung: { lat: -8.0652, lng: 111.9015, label: 'Kab. Tulungagung' },
  blitar: { lat: -8.0983, lng: 112.1681, label: 'Kab. / Kota Blitar' },
};

/**
 * Converts DMS (Degrees Minutes Seconds) string to Decimal Degrees
 * e.g., 7°37'47.3"S -> -7.6298
 */
function parseDms(dmsStr: string): number | null {
  const match = dmsStr.match(/(\d+)[°\s]+(\d+)['\s]+([0-9.]+)?["\s]*([NSEWnsew])?/);
  if (!match) return null;
  const deg = parseFloat(match[1]);
  const min = parseFloat(match[2]);
  const sec = match[3] ? parseFloat(match[3]) : 0;
  const dir = match[4] ? match[4].toUpperCase() : '';

  let dd = deg + min / 60 + sec / 3600;
  if (dir === 'S' || dir === 'W') {
    dd = -dd;
  }
  return dd;
}

/**
 * Parse any coordinate input, whether it is:
 * - Simple decimal: "-7.6298, 111.5239" or "-7.6298 111.5239"
 * - Google Maps URL: "https://www.google.com/maps?q=-7.6298,111.5239"
 * - Google Maps @ URL: "https://www.google.com/maps/@-7.6298,111.5239,17z"
 * - DMS notation: 7°37'47.3"S 111°31'26.0"E
 */
export function parseCoordinateInput(input: string): ParsedCoordinate | null {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw || raw === '-' || raw === '0') return null;

  // 1. Google Maps URL extraction
  if (raw.includes('google.com/maps') || raw.includes('goo.gl/maps') || raw.includes('maps.app.goo.gl')) {
    const qMatch = raw.match(/[?&]q=([-+]?\d{1,2}(?:\.\d+)?),([-+]?\d{1,3}(?:\.\d+)?)/);
    if (qMatch) {
      return buildParsedResult(parseFloat(qMatch[1]), parseFloat(qMatch[2]));
    }
    const atMatch = raw.match(/@([-+]?\d{1,2}(?:\.\d+)?),([-+]?\d{1,3}(?:\.\d+)?)/);
    if (atMatch) {
      return buildParsedResult(parseFloat(atMatch[1]), parseFloat(atMatch[2]));
    }
    const llMatch = raw.match(/[?&]ll=([-+]?\d{1,2}(?:\.\d+)?),([-+]?\d{1,3}(?:\.\d+)?)/);
    if (llMatch) {
      return buildParsedResult(parseFloat(llMatch[1]), parseFloat(llMatch[2]));
    }
  }

  // 2. Check for DMS pattern
  if (raw.includes('°')) {
    const parts = raw.split(/[,;\s]+(?=[0-9]+°)/);
    if (parts.length >= 2) {
      const latVal = parseDms(parts[0]);
      const lngVal = parseDms(parts[1]);
      if (latVal !== null && lngVal !== null) {
        return buildParsedResult(latVal, lngVal);
      }
    }
  }

  // 3. Clean string and match standard decimals
  const cleaned = raw
    .replace(/latitude/gi, '')
    .replace(/longitude/gi, '')
    .replace(/lat/gi, '')
    .replace(/lng/gi, '')
    .replace(/lon/gi, '')
    .replace(/[^\d.,;-\s]/g, ' ')
    .trim();

  const match = cleaned.match(/([-+]?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*([-+]?\d{1,3}(?:\.\d+)?)/);
  if (match) {
    const val1 = parseFloat(match[1]);
    const val2 = parseFloat(match[2]);
    return buildParsedResult(val1, val2);
  }

  return null;
}

function buildParsedResult(val1: number, val2: number): ParsedCoordinate | null {
  if (isNaN(val1) || isNaN(val2)) return null;

  let lat = val1;
  let lng = val2;

  // Auto-detect swapped coordinates: In Indonesia, Lat is around -6 to -11, Long is around 95 to 141
  if (lat > 50 && lng < 15) {
    const temp = lat;
    lat = lng;
    lng = temp;
  }

  // In Indonesia, latitude is negative (South). If user forgot minus for East Java (e.g. 7.6298 instead of -7.6298)
  if (lat > 0 && lat < 12 && lng >= 95 && lng <= 142) {
    lat = -lat;
  }

  if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    const formatted = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    return {
      lat,
      lng,
      formatted,
      isValid: true,
    };
  }

  return null;
}

/**
 * Get estimated coordinate based on BPN / ULTG / Kecamatan text
 */
export function getEstimatedRegionCoordinate(
  bpn?: string,
  ultg?: string,
  kecamatan?: string
): { lat: number; lng: number; formatted: string; label: string } | null {
  const searchStr = `${bpn || ''} ${ultg || ''} ${kecamatan || ''}`.toLowerCase();

  for (const [key, preset] of Object.entries(REGION_PRESETS)) {
    if (searchStr.includes(key)) {
      return {
        lat: preset.lat,
        lng: preset.lng,
        formatted: `${preset.lat.toFixed(6)}, ${preset.lng.toFixed(6)}`,
        label: preset.label,
      };
    }
  }

  // Default to UPT Madiun center if nothing matches
  const def = REGION_PRESETS.madiun;
  return {
    lat: def.lat,
    lng: def.lng,
    formatted: `${def.lat.toFixed(6)}, ${def.lng.toFixed(6)}`,
    label: def.label,
  };
}

/**
 * Request device GPS coordinates using HTML5 Geolocation API
 */
export function getCurrentDeviceLocation(): Promise<{ lat: number; lng: number; formatted: string }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Peramban Anda tidak mendukung fitur geolokasi GPS.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const formatted = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        resolve({ lat, lng, formatted });
      },
      (error) => {
        let msg = 'Gagal mendeteksi lokasi GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Izin akses lokasi ditolak oleh pengguna/peramban.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Informasi lokasi GPS tidak tersedia pada perangkat.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Waktu permintaan GPS habis.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}
