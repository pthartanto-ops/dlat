import { AssetItem, PicOfficer } from '../types';

/**
 * Mengubah teks menjadi huruf besar (UPPERCASE)
 */
export function toUpper(val: string | undefined | null): string {
  if (val === undefined || val === null) return '';
  return String(val).toUpperCase();
}

/**
 * Menormalkan seluruh field teks pada satu AssetItem menjadi huruf besar (UPPERCASE)
 */
export function normalizeAssetToUpperCase(asset: AssetItem): AssetItem {
  if (!asset) return asset;

  const noSertifikat = toUpper(asset.noSertifikat);
  const cleanCert = noSertifikat.trim();
  const hasCert =
    cleanCert !== '' &&
    cleanCert !== '-' &&
    cleanCert !== '0' &&
    !cleanCert.startsWith('BELUM') &&
    !cleanCert.includes('PROSES') &&
    cleanCert !== 'NULL' &&
    cleanCert !== 'UNDEFINED';

  const tahapan = hasCert ? (asset.tahapan >= 17 ? asset.tahapan : 17) : asset.tahapan;
  const statusDisplay = hasCert ? 'TERBIT' : toUpper(asset.statusDisplay);

  const rawCoord = asset.koordinat ? String(asset.koordinat).trim() : '';
  const cleanCoord =
    !rawCoord ||
    rawCoord === '-' ||
    rawCoord === '--' ||
    rawCoord === '0' ||
    rawCoord === '0,0' ||
    rawCoord === '0, 0' ||
    rawCoord.toLowerCase() === 'null' ||
    rawCoord.toLowerCase() === 'undefined' ||
    rawCoord.toLowerCase() === 'n/a' ||
    rawCoord.toLowerCase() === 'na' ||
    rawCoord.toLowerCase() === 'none' ||
    rawCoord.toLowerCase() === 'kosong' ||
    rawCoord.toLowerCase() === 'belum' ||
    rawCoord.toLowerCase() === 'belum ada' ||
    rawCoord.toLowerCase() === 'tidak ada' ||
    rawCoord.toLowerCase() === 'nihil'
      ? ''
      : rawCoord;

  // Aturan bisnis: jika tanggal terbit kosong maka tanggal akhir wajib kosong ('-')
  const rawTglTerbit = asset.tanggalTerbit ? String(asset.tanggalTerbit).trim() : '';
  const hasTglTerbit =
    rawTglTerbit !== '' &&
    rawTglTerbit !== '-' &&
    rawTglTerbit.toLowerCase() !== 'null' &&
    rawTglTerbit.toLowerCase() !== 'undefined';
  const finalTanggalTerbit = hasTglTerbit ? rawTglTerbit : '-';
  const finalTanggalAkhir = hasTglTerbit ? (asset.tanggalAkhir ? String(asset.tanggalAkhir).trim() : '-') : '-';

  return {
    ...asset,
    tahapan,
    statusDisplay,
    tanggalTerbit: finalTanggalTerbit,
    tanggalAkhir: finalTanggalAkhir,
    koordinat: cleanCoord,
    upt: toUpper(asset.upt) || 'UPT MADIUN',
    ultg: toUpper(asset.ultg) || 'ULTG MADIUN',
    penghantar: toUpper(asset.penghantar),
    asetProperti: toUpper(asset.asetProperti || asset.asetLapangan),
    asetLapangan: toUpper(asset.asetLapangan || asset.asetProperti),
    asetCbm: toUpper(asset.asetCbm || ''),
    desa: toUpper(asset.desa),
    kecamatan: toUpper(asset.kecamatan),
    bpn: toUpper(asset.bpn),
    persil: toUpper(asset.persil),
    noSertifikat,
    asset: toUpper(asset.asset),
    nib: toUpper(asset.nib),
    kendala: toUpper(asset.kendala),
    catatan: asset.catatan ? toUpper(asset.catatan) : '',
    pic: asset.pic ? toUpper(asset.pic) : '',
    dokumenSertifikat: asset.dokumenSertifikat,
    dokumenSertifikatNama: asset.dokumenSertifikatNama,
    dokumenSertifikatType: asset.dokumenSertifikatType,
    dokumenSertifikatUkuran: asset.dokumenSertifikatUkuran,
    sps1: asset.sps1
      ? {
          ...asset.sps1,
          spsNo: toUpper(asset.sps1.spsNo),
        }
      : asset.sps1,
    sps2: asset.sps2
      ? {
          ...asset.sps2,
          spsNo: toUpper(asset.sps2.spsNo),
        }
      : asset.sps2,
    sps3: asset.sps3
      ? {
          ...asset.sps3,
          spsNo: toUpper(asset.sps3.spsNo),
        }
      : asset.sps3,
  };
}

/**
 * Komparator untuk mengurutkan data AssetItem secara ascending berdasarkan ASET PROPERTI (Aset Lapangan)
 * Menggunakan natural alphanumeric collation (e.g. T.1, T.2, T.10)
 */
export function compareAssetPropertiAsc(a: AssetItem, b: AssetItem): number {
  const valA = (a.asetProperti || a.asetLapangan || '').trim();
  const valB = (b.asetProperti || b.asetLapangan || '').trim();
  const cmp = valA.localeCompare(valB, 'id', { numeric: true, sensitivity: 'base' });
  if (cmp !== 0) return cmp;

  // Urutan sekunder berdasarkan penghantar
  const pA = (a.penghantar || '').trim();
  const pB = (b.penghantar || '').trim();
  const pCmp = pA.localeCompare(pB, 'id', { numeric: true, sensitivity: 'base' });
  if (pCmp !== 0) return pCmp;

  // Urutan tersier berdasarkan ID
  return (a.id || '').localeCompare(b.id || '', 'id', { numeric: true, sensitivity: 'base' });
}

/**
 * Mengurutkan array AssetItem berdasarkan Aset Properti
 */
export function sortAssetsByAsetProperti(assets: AssetItem[], direction: 'asc' | 'desc' = 'asc'): AssetItem[] {
  if (!Array.isArray(assets)) return [];
  return [...assets].sort((a, b) => {
    const res = compareAssetPropertiAsc(a, b);
    return direction === 'asc' ? res : -res;
  });
}

/**
 * Menormalkan array AssetItem agar seluruh data teks berhuruf besar (UPPERCASE)
 * dan terurut secara ascending berdasarkan ASET PROPERTI.
 */
export function normalizeAssetsToUpperCase(assets: AssetItem[]): AssetItem[] {
  if (!Array.isArray(assets)) return [];
  const normalized = assets.map(normalizeAssetToUpperCase);
  return normalized.sort(compareAssetPropertiAsc);
}

/**
 * Menormalkan field data Petugas PIC ke huruf besar (UPPERCASE)
 */
export function normalizePicOfficerToUpperCase(pic: PicOfficer): PicOfficer {
  if (!pic) return pic;
  return {
    ...pic,
    nama: toUpper(pic.nama),
    nip: toUpper(pic.nip),
    jabatan: toUpper(pic.jabatan),
    unit: toUpper(pic.unit),
    kantahFokus: toUpper(pic.kantahFokus),
    kontak: toUpper(pic.kontak),
  };
}
