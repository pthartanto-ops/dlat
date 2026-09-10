import * as XLSX from 'xlsx';
import { AssetItem, AlasHakType, CategoryType, UnitSummaryData } from '../types';
import { normalizeAssetToUpperCase } from './textUtils';

export interface ParsedRowResult {
  raw: any;
  item: AssetItem;
  isValid: boolean;
  warnings: string[];
}

/**
 * Normalizes coordinate string into standard "latitude, longitude" format.
 * Supports decimal degrees (e.g. "-7.6298, 111.5239"), DMS (e.g. 7°37'47.3"S 111°31'26.0"E),
 * and automatically corrects missing negative signs for Indonesian latitudes.
 */
export function normalizeCoordinateString(raw: any): string {
  if (raw === undefined || raw === null) return '';
  const trimmed = String(raw).trim();
  if (
    !trimmed ||
    trimmed === '-' ||
    trimmed === '--' ||
    trimmed === '0' ||
    trimmed === '0,0' ||
    trimmed === '0, 0' ||
    trimmed === '0.0, 0.0' ||
    trimmed === '0.0,0.0' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'n/a' ||
    trimmed.toLowerCase() === 'na' ||
    trimmed.toLowerCase() === 'none' ||
    trimmed.toLowerCase() === 'kosong' ||
    trimmed.toLowerCase() === 'nihil' ||
    trimmed.toLowerCase() === 'belum' ||
    trimmed.toLowerCase() === 'belum ada' ||
    trimmed.toLowerCase() === 'tidak ada' ||
    trimmed.toLowerCase() === 'tbd'
  ) {
    return '';
  }

  // 1. Check for DMS (Degrees Minutes Seconds), e.g. 7°37'47.3"S 111°31'26.0"E
  const dmsRegex = /(\d+)[°\s]+(\d+)['\s]+([\d.]+)"?\s*([NSEWnsew])/g;
  const dmsMatches = [...trimmed.matchAll(dmsRegex)];
  if (dmsMatches.length === 2) {
    let lat = 0;
    let lng = 0;
    for (const m of dmsMatches) {
      const deg = parseFloat(m[1]);
      const min = parseFloat(m[2]);
      const sec = parseFloat(m[3]);
      const dir = m[4].toUpperCase();
      let dec = deg + min / 60 + sec / 3600;
      if (dir === 'S' || dir === 'W') dec = -dec;
      if (dir === 'N' || dir === 'S') lat = dec;
      else if (dir === 'E' || dir === 'W') lng = dec;
    }
    if (lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng)) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }

  // 2. Clean common labels like "Latitude:", "Lat:", "Lng:", etc.
  const cleaned = trimmed
    .replace(/latitude\s*[:=]?/gi, '')
    .replace(/longitude\s*[:=]?/gi, '')
    .replace(/lat\s*[:=]?/gi, '')
    .replace(/lng\s*[:=]?/gi, '')
    .replace(/lon\s*[:=]?/gi, '')
    .replace(/[()[\]{}]/g, '')
    .trim();

  // 3. Match 2 numbers (latitude, longitude)
  const match = cleaned.match(/([-+]?\d+(?:\.\d+)?)\s*[,;\s/]\s*([-+]?\d+(?:\.\d+)?)/);
  if (match) {
    let lat = parseFloat(match[1]);
    let lng = parseFloat(match[2]);

    if (isNaN(lat) || isNaN(lng)) return '';

    // If both 0, treat as empty (Null Island)
    if (lat === 0 && lng === 0) return '';

    // Detect swapped coordinates: Longitude (~110-115) placed before Latitude (-7)
    if (lat > 90 && lng <= 90) {
      const temp = lat;
      lat = lng;
      lng = temp;
    }

    // Indonesia (Java / East Java) is in the Southern hemisphere: Lat is negative (~ -6 to -11)
    // If entered as positive (e.g. 7.6298 instead of -7.6298) and Lng is ~95 to 142
    if (lat > 5 && lat < 12 && lng > 95 && lng < 142) {
      lat = -lat;
    }

    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }

  // If not a valid coordinate or empty, default to empty string
  return '';
}

/**
 * Extracts coordinate from raw Excel row supporting both combined columns
 * (e.g. "Koordinat", "Titik Koordinat", "GPS", "Lat Long")
 * and separate columns (e.g. "Latitude" & "Longitude", "Lintang" & "Bujur").
 * If coordinates are empty or absent, returns empty string ''.
 */
export function extractCoordinatesFromRow(
  findVal: (keys: string[]) => any
): string {
  // Check for separate Latitude and Longitude columns first
  const rawLat = findVal(['latitude', 'lintang', 'posisilat', 'coordy', 'ycoord']);
  const rawLng = findVal(['longitude', 'bujur', 'posisilong', 'coordx', 'xcoord']);

  const latStr = rawLat !== undefined && rawLat !== null ? String(rawLat).trim() : '';
  const lngStr = rawLng !== undefined && rawLng !== null ? String(rawLng).trim() : '';

  let rawCoord = '';
  if (
    latStr !== '' &&
    latStr !== '-' &&
    latStr !== '0' &&
    lngStr !== '' &&
    lngStr !== '-' &&
    lngStr !== '0'
  ) {
    rawCoord = `${latStr}, ${lngStr}`;
  } else {
    // Check for combined coordinate column
    // NOTE: Avoid loose keywords like 'titik' alone, because in PLN transmission grids
    // 'Titik Lapangan' / 'Titik Tower' refers to the tower identifier (e.g. T.12), NOT coordinates!
    rawCoord = String(
      findVal([
        'koordinatgps',
        'titikkoordinat',
        'titik_koordinat',
        'koordinattapak',
        'koordinattower',
        'koordinat',
        'latlong',
        'latlng',
        'lokasigps',
        'posisigps',
        'gpscoordinate',
        'coordinates',
        'coordinate',
        'gps',
      ]) || ''
    ).trim();
  }

  return normalizeCoordinateString(rawCoord);
}

export function formatExcelDateString(val: any): string {
  if (val === undefined || val === null || val === '') return '-';

  // 1. Instance of Date
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '-';
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // 2. Number: Excel serial date
  // Serial 1 = 1900-01-01, Serial 25569 = 1970-01-01, Serial 2958465 = 9999-12-31
  if (typeof val === 'number') {
    if (val >= 1 && val <= 2958465) {
      // Offset from Unix epoch 1970-01-01
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
      }
    }
    return String(val);
  }

  // 3. String date variations
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (
      trimmed === '' ||
      trimmed === '-' ||
      trimmed.toLowerCase() === 'null' ||
      trimmed.toLowerCase() === 'undefined'
    ) {
      return '-';
    }

    // Numeric Excel serial as string (e.g. "2958465" for 31/12/9999 or "45550")
    if (/^\d{5,7}$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      if (num >= 25569 && num <= 2958465) {
        const date = new Date(Math.round((num - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) {
          const day = String(date.getUTCDate()).padStart(2, '0');
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const year = date.getUTCFullYear();
          return `${day}/${month}/${year}`;
        }
      }
    }

    // ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
    const isoMatch = trimmed.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[T\s].*)?$/);
    if (isoMatch) {
      const y = isoMatch[1];
      const m = isoMatch[2].padStart(2, '0');
      const d = isoMatch[3].padStart(2, '0');
      return `${d}/${m}/${y}`;
    }

    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (dmyMatch) {
      let p1 = parseInt(dmyMatch[1], 10);
      let p2 = parseInt(dmyMatch[2], 10);
      const y = dmyMatch[3];
      // Swap if formatted as MM/DD/YYYY
      if (p1 <= 12 && p2 > 12) {
        const tmp = p1;
        p1 = p2;
        p2 = tmp;
      }
      return `${String(p1).padStart(2, '0')}/${String(p2).padStart(2, '0')}/${y}`;
    }

    // 4-digit year only: e.g. "9999" or "2024"
    if (/^\d{4}$/.test(trimmed)) {
      return `31/12/${trimmed}`;
    }

    return trimmed;
  }

  return String(val).trim() || '-';
}

export function downloadSampleExcelTemplate() {
  const sampleHeaders = [
    'No',
    'Jenis Aset',
    'ULTG',
    'Penghantar / Jalur',
    'Aset Properti',
    'Aset CBM',
    'Desa',
    'Kecamatan',
    'Kantah BPN',
    'Alas Hak (SPH / Tanpa SPH)',
    'Tahapan BPN (1-16 atau TERBIT)',
    'Luas Tanah (m2)',
    'Jumlah Persil',
    'Nomer Sertifikat (jika terbit)',
    'No Asset SAP',
    'NIB',
    'Tgl Terbit (DD/MM/YYYY)',
    'Tgl Akhir (DD/MM/YYYY)',
    'Koordinat GPS (Lat, Long)',
    'PIC Petugas Pokja',
    'No Dokumen SPS 1 (Pengukuran)',
    'Tgl Terbit SPS 1',
    'No Dokumen SPS 2 (Pemeriksaan)',
    'Tgl Terbit SPS 2',
    'No Dokumen SPS 3 (Pendaftaran Hak)',
    'Tgl Terbit SPS 3',
    'Kendala / Keterangan',
  ];

  const sampleRows = [
    [
      1,
      'TOWER',
      'ULTG MADIUN',
      'SUTT 150 kV Manisrejo - Nganjuk T.101',
      'Tapak Tower T.101',
      'CBM-01',
      'Sukomoro',
      'Sukomoro',
      'BPN Kab Nganjuk',
      'SPH',
      '6',
      256,
      1,
      '-',
      '300189201',
      '12.04.05.00124',
      '-',
      '31/12/2024',
      '-7.6298, 111.5239',
      'Bpk. Budi Santoso (ULTG Madiun)',
      'SPS.01/12.04/2024/0012',
      '15/02/2024',
      '-',
      '-',
      '-',
      '-',
      'Lancar tanpa kendala',
    ],
    [
      2,
      'TOWER',
      'ULTG MADIUN',
      'SUTT 150 kV Manisrejo - Krapyak T.24',
      'Tapak Tower T.24',
      'CBM-02',
      'Manisrejo',
      'Taman',
      'BPN Kota Madiun',
      'SPH',
      'TERBIT',
      310,
      1,
      'HP No. 00345/2024',
      '300189202',
      '12.04.05.00125',
      '18/06/2024',
      '31/12/2024',
      '-7.6412, 111.5301',
      'Ibu Siti Rahayu (UPT Madiun)',
      'SPS.01/12.01/2024/0045',
      '10/01/2024',
      'SPS.02/12.01/2024/0038',
      '14/03/2024',
      'SPS.03/12.01/2024/0029',
      '25/05/2024',
      'Sertifikat elektronik terbit dan tersimpan di brankas UPT',
    ],
    [
      3,
      'GARDU INDUK',
      'ULTG KEDIRI',
      'GI 150 kV Kediri',
      'Switchyard Bay Trafo 3',
      '-',
      'Ngronggo',
      'Kota',
      'BPN Kota Kediri',
      'SPH',
      '14',
      8500,
      2,
      '-',
      '300189204',
      '12.04.05.00127',
      '-',
      '31/12/2024',
      '-7.8164, 112.0118',
      'Bpk. Ahmad Fauzi (ULTG Kediri)',
      'SPS.01/12.05/2024/0078',
      '05/02/2024',
      'SPS.02/12.05/2024/0065',
      '22/04/2024',
      'SPS.03/12.05/2024/0041',
      '18/07/2024',
      'Menunggu penerbitan SK Hak Pakai',
    ],
    [
      4,
      'RUMAH DINAS',
      'ULTG MADIUN',
      'Komplek Perumahan Dinas UPT Madiun',
      'Rumah Dinas Jabatan Manajer UPT',
      '-',
      'Banjarejo',
      'Taman',
      'BPN Kota Madiun',
      'SPH',
      'TERBIT',
      420,
      1,
      'HP No. 00210/2023',
      '300189206',
      '12.04.05.00130',
      '15/08/2023',
      '31/12/2023',
      '-7.6321, 111.5298',
      'Bpk. Eko Prasetyo (Pokja UPT)',
      'SPS.01/12.01/2023/0019',
      '12/02/2023',
      'SPS.02/12.01/2023/0015',
      '08/04/2023',
      'SPS.03/12.01/2023/0011',
      '20/07/2023',
      'Sertifikat telah terbit',
    ],
    [
      5,
      'TANAH KOSONG',
      'ULTG BABAT',
      'Lahan Cadangan GITET Babat',
      'Tanah Kosong Buffer Zone GI',
      '-',
      'Plaosan',
      'Babat',
      'BPN Kab Lamongan',
      'Tanpa SPH',
      '4',
      3800,
      '',
      '-',
      '300189207',
      '12.04.05.00131',
      '-',
      '31/12/2025',
      '-7.1128, 112.1636',
      'Bpk. Dwi Cahyono (ULTG Babat)',
      'SPS.01/12.07/2024/0091',
      '18/04/2024',
      '-',
      '-',
      '-',
      '-',
      'Menunggu koordinasi pengukuran batas desa',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleRows]);

  // Set column widths
  ws['!cols'] = [
    { wch: 5 },  // No
    { wch: 16 }, // Jenis Aset
    { wch: 16 }, // ULTG
    { wch: 34 }, // Penghantar
    { wch: 24 }, // Aset Properti
    { wch: 16 }, // Aset CBM
    { wch: 18 }, // Desa
    { wch: 18 }, // Kecamatan
    { wch: 20 }, // BPN
    { wch: 22 }, // Alas Hak
    { wch: 26 }, // Tahapan
    { wch: 16 }, // Luas
    { wch: 14 }, // Jumlah Persil
    { wch: 22 }, // No Sertifikat
    { wch: 16 }, // SAP
    { wch: 18 }, // NIB
    { wch: 16 }, // Tgl Terbit
    { wch: 16 }, // Tgl Akhir
    { wch: 24 }, // Koordinat GPS
    { wch: 28 }, // PIC Petugas Pokja
    { wch: 26 }, // No Dokumen SPS 1
    { wch: 18 }, // Tgl Terbit SPS 1
    { wch: 26 }, // No Dokumen SPS 2
    { wch: 18 }, // Tgl Terbit SPS 2
    { wch: 26 }, // No Dokumen SPS 3
    { wch: 18 }, // Tgl Terbit SPS 3
    { wch: 40 }, // Kendala
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Import Aset');
  XLSX.writeFile(wb, 'Template_Import_Aset_Tanah_PLN_UPT_Madiun.xlsx');
}

export function parseExcelFile(
  fileData: ArrayBuffer
): { rows: ParsedRowResult[]; totalCount: number; validCount: number; error?: string } {
  try {
    const workbook = XLSX.read(fileData, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { rows: [], totalCount: 0, validCount: 0, error: 'File Excel tidak memiliki lembar kerja (worksheet).' };
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawJson || rawJson.length === 0) {
      return { rows: [], totalCount: 0, validCount: 0, error: 'File Excel kosong atau tidak memiliki baris data.' };
    }

    const parsedResults: ParsedRowResult[] = [];

    rawJson.forEach((row, index) => {
      const warnings: string[] = [];

      // Check if entire row is empty / blank
      if (!row || typeof row !== 'object') return;
      const rowValues = Object.values(row).map((val) => (val === null || val === undefined ? '' : String(val).trim()));
      const hasAnyData = rowValues.some((val) => val !== '');
      if (!hasAnyData) {
        return; // Skip completely empty row
      }

      // Flexible key lookup
      const findVal = (keys: string[]) => {
        for (const k of keys) {
          for (const rowKey of Object.keys(row)) {
            const cleanKey = rowKey.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanTarget = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanKey.includes(cleanTarget)) {
              const val = row[rowKey];
              if (val !== undefined && val !== null) {
                return val;
              }
            }
          }
        }
        return '';
      };

      // Extract raw fields without generating fake placeholder data
      const rawUltg = String(findVal(['ultg', 'unit', 'wilayah']) || '').trim();
      let ultg = '';
      if (rawUltg.toUpperCase().includes('KEDIRI')) {
        ultg = 'ULTG KEDIRI';
      } else if (rawUltg.toUpperCase().includes('BABAT') || rawUltg.toUpperCase().includes('LAMONGAN')) {
        ultg = 'ULTG BABAT';
      } else if (rawUltg.toUpperCase().includes('MADIUN')) {
        ultg = 'ULTG MADIUN';
      } else {
        ultg = rawUltg;
      }

      const penghantar = String(findVal(['penghantar', 'jalur', 'transmisi']) || '').trim();
      const asetProperti = String(
        findVal(['asetproperti', 'properti', 'asetlapang', 'lapangan', 'tapak', 'tower', 'lokasi']) || ''
      ).trim();
      const asetCbm = String(findVal(['asetcbm', 'cbm', 'kodecbm', 'nocbm']) || '').trim();
      const desa = String(findVal(['desa', 'kelurahan']) || '').trim();
      const kecamatan = String(findVal(['kecamatan']) || '').trim();
      const bpn = String(findVal(['bpn', 'kantah', 'pertanahan']) || '').trim();

      // If all critical identifying fields are empty, skip this row
      if (!penghantar && !asetProperti && !desa && !kecamatan && !bpn && !rawUltg) {
        return;
      }

      // Alas Hak (default kosong jika tidak ada / belum diisi)
      const rawAlasHak = String(findVal(['alashak', 'sph', 'statussebelum']) || '').trim().toUpperCase();
      let alasHak: AlasHakType = '';
      if (rawAlasHak.includes('SPH') && !rawAlasHak.includes('TANPA') && !rawAlasHak.includes('NON')) {
        alasHak = 'SPH';
      } else if (rawAlasHak.includes('TANPA') || rawAlasHak.includes('NON')) {
        alasHak = 'Tanpa SPH';
      } else if (rawAlasHak && rawAlasHak !== '-' && rawAlasHak !== '0') {
        alasHak = (rawAlasHak as AlasHakType) || '';
      } else {
        alasHak = '';
      }

      // Tahapan
      const rawTahap = String(findVal(['tahapan', 'tahap', 'statusbpn']) || '').trim().toUpperCase();
      let tahapan = 0;
      let statusDisplay = '-';

      if (rawTahap) {
        if (rawTahap.includes('TERBIT') || rawTahap === '17' || rawTahap.includes('SELESAI')) {
          tahapan = 17;
          statusDisplay = 'TERBIT';
        } else {
          const numMatch = rawTahap.match(/\d+/);
          if (numMatch) {
            const parsedNum = parseInt(numMatch[0], 10);
            if (parsedNum >= 1 && parsedNum <= 16) {
              tahapan = parsedNum;
              statusDisplay = `TAHAP ${parsedNum}`;
            } else if (parsedNum >= 17) {
              tahapan = 17;
              statusDisplay = 'TERBIT';
            }
          } else {
            statusDisplay = rawTahap;
          }
        }
      }

      // Luas (jika kosong, tetap 0 bukan 250)
      const rawLuas = findVal(['luas', 'm2', 'area']);
      let luas = 0;
      if (typeof rawLuas === 'number') {
        luas = isNaN(rawLuas) ? 0 : rawLuas;
      } else if (rawLuas) {
        const parsed = parseFloat(String(rawLuas).replace(/[^0-9.]/g, ''));
        luas = isNaN(parsed) ? 0 : parsed;
      }

      // Jumlah Persil (tidak wajib diisi, berupa jumlah persil e.g. 1, 2)
      const rawPersil = String(findVal(['jumlahpersil', 'jmlpersil', 'persil', 'nopersil']) || '').trim();
      const persil = rawPersil || '';

      // Nomer Sertifikat (jika kosong, tetap '-')
      const rawNoSertif = String(findVal(['sertifikat', 'nosertifikat', 'nomersertifikat', 'nomorsertifikat', 'sertipikat', 'nomorsertipikat', 'nomersertipikat']) || '').trim();
      const noSertifikat = rawNoSertif || '-';

      // Otomatis jika nomer sertifikat terisi maka Tahapan otomatis terisi Terbit
      const cleanCert = noSertifikat.toUpperCase().trim();
      const hasValidCert = cleanCert !== '' && cleanCert !== '-' && cleanCert !== '0' && !cleanCert.startsWith('BELUM') && !cleanCert.includes('PROSES') && cleanCert !== 'NULL' && cleanCert !== 'UNDEFINED';

      if (hasValidCert) {
        tahapan = 17;
        statusDisplay = 'TERBIT';
      }

      // SAP Asset (jika kosong, tetap '-')
      const rawAsset = String(findVal(['sap', 'asset', 'noasset', 'assetid']) || '').trim();
      const asset = rawAsset || '-';

      // NIB (jika kosong, tetap '-')
      const rawNib = String(findVal(['nib', 'nomorinduk']) || '').trim();
      const nib = rawNib || '-';

      // Kategori / Jenis Aset
      let kategori: CategoryType = 'TOWER';
      const rawKat = String(findVal(['jenisaset', 'jenis_aset', 'kategori', 'jenis', 'namaunit', 'tipeaset', 'tipe', 'tegangan']) || '').toUpperCase().trim();
      if (
        rawKat.includes('EX') ||
        rawKat.includes('EKS') ||
        rawKat.includes('BEKAS') ||
        rawKat.includes('EX. GI') ||
        rawKat.includes('EX. GARDU')
      ) {
        kategori = 'EX. GARDU INDUK';
      } else if (
        rawKat.includes('KANTOR') ||
        rawKat.includes('OFFICE') ||
        rawKat.includes('GEDUNG')
      ) {
        kategori = 'KANTOR';
      } else if (rawKat.includes('GARDU') || rawKat.includes('GI') || rawKat.includes('GITET') || rawKat.includes('GIS')) {
        kategori = 'GARDU INDUK';
      } else if (rawKat.includes('RUMAH') || rawKat.includes('DINAS') || rawKat.includes('MESS') || rawKat.includes('PERUMAHAN')) {
        kategori = 'RUMAH DINAS';
      } else if (rawKat.includes('KOSONG') || rawKat.includes('LAHAN') || rawKat.includes('KAVLING')) {
        kategori = 'TANAH KOSONG';
      } else {
        kategori = 'TOWER';
      }

      // Tahun (jika kosong, tetap 0)
      const rawTahun = findVal(['tahun', 'thn']);
      let tahun = 0;
      if (typeof rawTahun === 'number') {
        // If rawTahun is an Excel date serial (e.g. 2958465 for 31/12/9999 or 45550 for 2024)
        if (rawTahun >= 25569 && rawTahun <= 2958465) {
          const d = new Date(Math.round((rawTahun - 25569) * 86400 * 1000));
          tahun = d.getUTCFullYear();
        } else {
          tahun = isNaN(rawTahun) ? 0 : Math.floor(rawTahun);
        }
      } else if (rawTahun) {
        const strTahun = String(rawTahun).trim();
        // Check if string contains a 4-digit year like 9999, 2024, etc.
        const yearMatch = strTahun.match(/\b(19\d\d|20\d\d|9999)\b/);
        if (yearMatch) {
          tahun = parseInt(yearMatch[1], 10);
        } else {
          const parsed = parseInt(strTahun.replace(/[^0-9]/g, ''), 10);
          tahun = isNaN(parsed) ? 0 : parsed;
        }
      }

      // Dokumen & Tanggal Terbit SPS 1, 2, 3 (Surat Perintah Setor BPN)
      const rawSps1No = String(
        findVal(['nodokumensps1', 'nosps1', 'sps1no', 'nomorsps1', 'dokumensps1', 'nodoksps1', 'nomordokumensps1']) || ''
      ).trim();
      const rawSps1DateVal = findVal([
        'tglterbitsps1',
        'tanggalsps1',
        'tglsps1',
        'tanggaldokumensps1',
        'tgldokumensps1',
        'tglterbit1',
        'tanggalsps1terbit',
        'sps1date',
        'terbitsps1',
      ]);
      const rawSps1Date = formatExcelDateString(rawSps1DateVal);

      const rawSps2No = String(
        findVal(['nodokumensps2', 'nosps2', 'sps2no', 'nomorsps2', 'dokumensps2', 'nodoksps2', 'nomordokumensps2']) || ''
      ).trim();
      const rawSps2DateVal = findVal([
        'tglterbitsps2',
        'tanggalsps2',
        'tglsps2',
        'tanggaldokumensps2',
        'tgldokumensps2',
        'tglterbit2',
        'tanggalsps2terbit',
        'sps2date',
        'terbitsps2',
      ]);
      const rawSps2Date = formatExcelDateString(rawSps2DateVal);

      const rawSps3No = String(
        findVal(['nodokumensps3', 'nosps3', 'sps3no', 'nomorsps3', 'dokumensps3', 'nodoksps3', 'nomordokumensps3']) || ''
      ).trim();
      const rawSps3DateVal = findVal([
        'tglterbitsps3',
        'tanggalsps3',
        'tglsps3',
        'tanggaldokumensps3',
        'tgldokumensps3',
        'tglterbit3',
        'tanggalsps3terbit',
        'sps3date',
        'terbitsps3',
      ]);
      const rawSps3Date = formatExcelDateString(rawSps3DateVal);

      // Legacy fees support (jika ada nilai nominal di excel lama)
      const rawSps1 = findVal(['biayasps1', 'pengukuran', 'sps1amt']);
      let sps1Amt = 0;
      if (typeof rawSps1 === 'number') {
        sps1Amt = isNaN(rawSps1) ? 0 : rawSps1;
      } else if (rawSps1) {
        const parsed = parseFloat(String(rawSps1).replace(/[^0-9.]/g, ''));
        sps1Amt = isNaN(parsed) ? 0 : parsed;
      }

      const rawSps2 = findVal(['biayasps2', 'pemeriksaan', 'sps2amt']);
      let sps2Amt = 0;
      if (typeof rawSps2 === 'number') {
        sps2Amt = isNaN(rawSps2) ? 0 : rawSps2;
      } else if (rawSps2) {
        const parsed = parseFloat(String(rawSps2).replace(/[^0-9.]/g, ''));
        sps2Amt = isNaN(parsed) ? 0 : parsed;
      }

      const rawSps3 = findVal(['biayasps3', 'pembukuan', 'sps3amt']);
      let sps3Amt = 0;
      if (typeof rawSps3 === 'number') {
        sps3Amt = isNaN(rawSps3) ? 0 : rawSps3;
      } else if (rawSps3) {
        const parsed = parseFloat(String(rawSps3).replace(/[^0-9.]/g, ''));
        sps3Amt = isNaN(parsed) ? 0 : parsed;
      }

      const rawPaid1 = String(findVal(['bayarsps1', 'lunassps1', 'statusbayar1']) || '').toUpperCase();
      const rawPaid2 = String(findVal(['bayarsps2', 'lunassps2', 'statusbayar2']) || '').toUpperCase();
      const rawPaid3 = String(findVal(['bayarsps3', 'lunassps3', 'statusbayar3']) || '').toUpperCase();

      const sps1Paid = rawPaid1.includes('LUNAS') || rawPaid1.includes('YA') || rawPaid1.includes('PAID') || rawPaid1 === 'TRUE' || (rawSps1Date !== '-' && Boolean(rawSps1Date));
      const sps2Paid = rawPaid2.includes('LUNAS') || rawPaid2.includes('YA') || rawPaid2.includes('PAID') || rawPaid2 === 'TRUE' || (rawSps2Date !== '-' && Boolean(rawSps2Date));
      const sps3Paid = rawPaid3.includes('LUNAS') || rawPaid3.includes('YA') || rawPaid3.includes('PAID') || rawPaid3 === 'TRUE' || (rawSps3Date !== '-' && Boolean(rawSps3Date));

      const totalPnbp = (sps1Paid ? sps1Amt : 0) + (sps2Paid ? sps2Amt : 0) + (sps3Paid ? sps3Amt : 0);

      // Kendala (jika kosong, tetap kosong)
      const kendala = String(findVal(['kendala', 'keterangan', 'catatan', 'hambatan']) || '').trim();

      // Tanggal & Metadata (Format Tanggal Lengkap DD/MM/YYYY)
      const rawTglTerbitVal = findVal([
        'tanggalterbit',
        'tglterbit',
        'tgl_terbit',
        'tglterbitsertifikat',
        'terbit',
        'thnterbit',
        'tanggalsertifikat',
        'tglsertifikat',
        'tglterbitsertipikat',
        'terbitsertifikat',
      ]);
      const formattedTglTerbit = formatExcelDateString(rawTglTerbitVal);
      const tanggalTerbit = (
        formattedTglTerbit !== '-'
          ? formattedTglTerbit
          : tahapan >= 17
          ? tahun > 0
            ? `31/12/${tahun}`
            : '15/09/2024'
          : '-'
      ).trim();

      const rawTglAkhirVal = findVal([
        'tanggalakhir',
        'tglakhir',
        'tgl_akhir',
        'target',
        'tanggaltarget',
        'tgltarget',
        'masaberlaku',
        'berlakusd',
        'berlakusampai',
        'berlakushingga',
        'jatuhtempo',
        'tglberakhir',
        'tanggalberakhir',
        'tglselesai',
        'tanggalselesai',
        'expired',
        'expire',
        'tglkadaluarsa',
        'kadaluarsa',
      ]);
      const formattedTglAkhir = formatExcelDateString(rawTglAkhirVal);
      // Aturan bisnis: jika tanggal terbit kosong maka tanggal akhir wajib kosong ('-')
      const hasValidTglTerbit =
        tanggalTerbit !== '' &&
        tanggalTerbit !== '-' &&
        tanggalTerbit.toLowerCase() !== 'null' &&
        tanggalTerbit.toLowerCase() !== 'undefined';
      const tanggalAkhir = !hasValidTglTerbit
        ? '-'
        : (formattedTglAkhir !== '-' ? formattedTglAkhir : '31/12/2025').trim();

      // Jika tahun belum didapat dari kolom tahun, ekstrak dari tanggal terbit
      if (tahun === 0 && tanggalTerbit && tanggalTerbit !== '-' && tanggalTerbit.includes('/')) {
        const parts = tanggalTerbit.split('/');
        const parsedY = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(parsedY) && parsedY > 1900) tahun = parsedY;
      }
      const koordinat = extractCoordinatesFromRow(findVal);
      const pic = String(
        findVal([
          'pic',
          'petugas',
          'petugaspokja',
          'picpokja',
          'picsertifikasi',
          'picaset',
          'penanggungjawab',
          'picpetugas',
          'officer',
        ]) || ''
      ).trim();
      const catatan = String(findVal(['catatan', 'memo']) || '').trim();

      // ID
      const rawId = String(findVal(['id', 'idaset', 'kodeaset']) || '').trim();
      const prefix = ultg.includes('KEDIRI') ? 'KDR' : ultg.includes('BABAT') ? 'BBT' : 'MDN';
      const id = rawId || `AST-${prefix}-${String(index + 1).padStart(4, '0')}`;

      const item: AssetItem = {
        id,
        alasHak,
        tahapan,
        statusDisplay,
        upt: 'UPT MADIUN',
        ultg: ultg || 'ULTG MADIUN',
        penghantar,
        asetProperti: asetProperti || '-',
        asetLapangan: asetProperti || '-',
        asetCbm: asetCbm || '-',
        desa,
        kecamatan,
        bpn,
        luas,
        persil,
        noSertifikat,
        asset,
        nib,
        sps1: {
          spsNo: rawSps1No || (rawSps1Date && rawSps1Date !== '-' ? `SPS.01/BPN/2024/${String(index + 1).padStart(3, '0')}` : '-'),
          tanggalSps: rawSps1Date || '-',
          amount: sps1Amt,
          isPaid: sps1Paid || (rawSps1Date !== '-' && Boolean(rawSps1Date)),
          paymentDate: rawSps1Date !== '-' ? rawSps1Date : undefined,
        },
        sps2: {
          spsNo: rawSps2No || (rawSps2Date && rawSps2Date !== '-' ? `SPS.02/BPN/2024/${String(index + 1).padStart(3, '0')}` : '-'),
          tanggalSps: rawSps2Date || '-',
          amount: sps2Amt,
          isPaid: sps2Paid || (rawSps2Date !== '-' && Boolean(rawSps2Date)),
          paymentDate: rawSps2Date !== '-' ? rawSps2Date : undefined,
        },
        sps3: {
          spsNo: rawSps3No || (rawSps3Date && rawSps3Date !== '-' ? `SPS.03/BPN/2024/${String(index + 1).padStart(3, '0')}` : '-'),
          tanggalSps: rawSps3Date || '-',
          amount: sps3Amt,
          isPaid: sps3Paid || (rawSps3Date !== '-' && Boolean(rawSps3Date)),
          paymentDate: rawSps3Date !== '-' ? rawSps3Date : undefined,
        },
        totalPnbp,
        tanggalTerbit,
        tanggalAkhir,
        kategori,
        tahun,
        kendala,
        koordinat,
        pic,
        catatan,
      };

      parsedResults.push({
        raw: row,
        item: normalizeAssetToUpperCase(item),
        isValid: true,
        warnings,
      });
    });

    return {
      rows: parsedResults,
      totalCount: parsedResults.length,
      validCount: parsedResults.filter((r) => r.isValid).length,
    };
  } catch (err: any) {
    return {
      rows: [],
      totalCount: 0,
      validCount: 0,
      error: err?.message || 'Gagal membaca berkas Excel. Pastikan format file valid (.xlsx, .xls, .csv).',
    };
  }
}

// Function to recalculate summaries by Jenis Aset (TOWER, GARDU INDUK, RUMAH DINAS, TANAH KOSONG, KANTOR, EX. GARDU INDUK)
export function recalculateAllUnitSummaries(
  assets: AssetItem[],
  currentSummaries?: UnitSummaryData[],
  customCategoryTargets?: Record<string, number>
): UnitSummaryData[] {
  const categories: CategoryType[] = [
    'TOWER',
    'GARDU INDUK',
    'RUMAH DINAS',
    'TANAH KOSONG',
    'KANTOR',
    'EX. GARDU INDUK',
  ];

  return categories.map((catName) => {
    const existing = currentSummaries?.find((s) => s.unit === catName || s.jenisAset === catName);
    const defaultTarget = 0;
    const target = customCategoryTargets?.[catName] ?? (existing ? existing.target : defaultTarget);

    const catAssets = assets.filter((a) => {
      const k = (a.kategori || '').trim().toUpperCase();
      if (catName === 'TOWER') {
        return k === 'TOWER' || k.includes('TOWER') || k.includes('TAPAK') || k.includes('SUTT') || k.includes('SUTET');
      }
      if (catName === 'EX. GARDU INDUK') {
        return (
          k === 'EX. GARDU INDUK' ||
          k === 'EX GARDU INDUK' ||
          k.includes('EX. GI') ||
          k.includes('EX. GARDU') ||
          k.includes('EKS GI') ||
          k.includes('BEKAS GI') ||
          ((k.includes('EX') || k.includes('EKS') || k.includes('BEKAS')) && (k.includes('GARDU') || k.includes('GI')))
        );
      }
      if (catName === 'KANTOR') {
        return k === 'KANTOR' || k.includes('KANTOR') || k.includes('GEDUNG') || k.includes('OFFICE');
      }
      if (catName === 'GARDU INDUK') {
        // Exclude EX. GARDU INDUK
        if (k.includes('EX') || k.includes('EKS') || k.includes('BEKAS')) return false;
        return k === 'GARDU INDUK' || k.includes('GARDU') || k.includes('GI') || k.includes('GITET') || k.includes('GIS');
      }
      if (catName === 'RUMAH DINAS') {
        return k === 'RUMAH DINAS' || k.includes('RUMAH') || k.includes('DINAS') || k.includes('MESS') || k.includes('PERUMAHAN');
      }
      if (catName === 'TANAH KOSONG') {
        return k === 'TANAH KOSONG' || k.includes('KOSONG') || k.includes('LAHAN') || k.includes('KAVLING');
      }
      return k === catName;
    });

    const totalAset = catAssets.length;
    const terbitAssets = catAssets.filter((a) => a.tahapan >= 17 || a.statusDisplay === 'TERBIT');
    const totalTerbit = terbitAssets.length;

    let pre2021 = 0;
    let y2021 = 0;
    let y2022 = 0;
    let y2023 = 0;
    let y2024 = 0;
    let y2025 = 0;
    const yearly: Record<number, number> = {};

    terbitAssets.forEach((a) => {
      if (a.tahun > 0) {
        yearly[a.tahun] = (yearly[a.tahun] || 0) + 1;
      }
      if (a.tahun > 0 && a.tahun < 2021) pre2021++;
      else if (a.tahun === 2021) y2021++;
      else if (a.tahun === 2022) y2022++;
      else if (a.tahun === 2023) y2023++;
      else if (a.tahun === 2024) y2024++;
      else if (a.tahun === 2025) y2025++;
    });

    const sphCount = catAssets.filter((a) => a.alasHak === 'SPH').length;
    const tanpaSphCount = catAssets.filter((a) => a.alasHak === 'Tanpa SPH').length;

    const tahapanBpn: Record<number, number> = {};
    for (let s = 1; s <= 16; s++) {
      tahapanBpn[s] = catAssets.filter((a) => a.tahapan === s).length;
    }

    return {
      unit: catName,
      jenisAset: catName,
      target,
      totalAset,
      sertifikatTerbit: {
        pre2021,
        y2021,
        y2022,
        y2023,
        y2024,
        y2025,
        total: totalTerbit,
        yearly,
      },
      statusSebelumBpn: {
        sph: sphCount,
        tanpaSph: tanpaSphCount,
      },
      tahapanBpn,
    };
  });
}

// Function to recalculate ULTG summaries for ULTG monitoring dashboards
export function recalculateAllUltgSummaries(
  assets: AssetItem[],
  currentSummaries?: UnitSummaryData[],
  customUltgTargets?: Record<string, number>
): UnitSummaryData[] {
  const units = ['ULTG MADIUN', 'ULTG KEDIRI', 'ULTG BABAT'];

  return units.map((uName) => {
    const existing = currentSummaries?.find((s) => s.unit === uName);
    const target = customUltgTargets?.[uName] ?? (existing ? existing.target : 0);

    const unitAssets = assets.filter((a) => a.ultg === uName);
    const totalAset = unitAssets.length;

    const terbitAssets = unitAssets.filter((a) => a.tahapan >= 17 || a.statusDisplay === 'TERBIT');
    const totalTerbit = terbitAssets.length;

    let pre2021 = 0;
    let y2021 = 0;
    let y2022 = 0;
    let y2023 = 0;
    let y2024 = 0;
    let y2025 = 0;
    const yearly: Record<number, number> = {};

    terbitAssets.forEach((a) => {
      if (a.tahun > 0) {
        yearly[a.tahun] = (yearly[a.tahun] || 0) + 1;
      }
      if (a.tahun > 0 && a.tahun < 2021) pre2021++;
      else if (a.tahun === 2021) y2021++;
      else if (a.tahun === 2022) y2022++;
      else if (a.tahun === 2023) y2023++;
      else if (a.tahun === 2024) y2024++;
      else if (a.tahun === 2025) y2025++;
    });

    const sphCount = unitAssets.filter((a) => a.alasHak === 'SPH').length;
    const tanpaSphCount = unitAssets.filter((a) => a.alasHak === 'Tanpa SPH').length;

    const tahapanBpn: Record<number, number> = {};
    for (let s = 1; s <= 16; s++) {
      tahapanBpn[s] = unitAssets.filter((a) => a.tahapan === s).length;
    }

    return {
      unit: uName,
      target,
      totalAset,
      sertifikatTerbit: {
        pre2021,
        y2021,
        y2022,
        y2023,
        y2024,
        y2025,
        total: totalTerbit,
        yearly,
      },
      statusSebelumBpn: {
        sph: sphCount,
        tanpaSph: tanpaSphCount,
      },
      tahapanBpn,
    };
  });
}
