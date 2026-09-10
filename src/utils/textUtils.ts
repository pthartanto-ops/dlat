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

  return {
    ...asset,
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
    noSertifikat: toUpper(asset.noSertifikat),
    asset: toUpper(asset.asset),
    nib: toUpper(asset.nib),
    statusDisplay: toUpper(asset.statusDisplay),
    kendala: toUpper(asset.kendala),
    catatan: asset.catatan ? toUpper(asset.catatan) : '',
    pic: asset.pic ? toUpper(asset.pic) : '',
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
 * Menormalkan array AssetItem agar seluruh data teks berhuruf besar (UPPERCASE)
 */
export function normalizeAssetsToUpperCase(assets: AssetItem[]): AssetItem[] {
  if (!Array.isArray(assets)) return [];
  return assets.map(normalizeAssetToUpperCase);
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
