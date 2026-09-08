export interface BpnStageInfo {
  stageNumber: number;
  code: string;
  name: string;
  shortName: string;
  category: 'Pemberkasan' | 'Pengukuran' | 'Pemeriksaan' | 'SK & Pembukuan' | 'Sertifikat Terbit';
  responsibleParty: 'PLN UPT' | 'Kantah BPN' | 'Kanwil BPN';
}

export interface UnitSummaryData {
  unit: string;
  isTotal?: boolean;
  target: number;
  totalAset: number;
  sertifikatTerbit: {
    pre2021: number;
    y2021: number;
    y2022: number;
    y2023: number;
    y2024: number;
    y2025?: number;
    total: number;
    yearly?: Record<number, number>;
  };
  statusSebelumBpn: {
    sph: number;
    tanpaSph: number;
  };
  tahapanBpn: Record<number, number>; // 1 to 16
  jenisAset?: string;
}

export type AlasHakType = 'SPH' | 'Tanpa SPH' | '-' | '';
export type CategoryType =
  | 'TOWER'
  | 'GARDU INDUK'
  | 'RUMAH DINAS'
  | 'TANAH KOSONG'
  | 'KANTOR'
  | 'EX. GARDU INDUK';
export type JenisAsetType = CategoryType;

export interface SpsFee {
  spsNo: string; // Nomor Dokumen SPS (contoh: "SPS.01/12.04/2024/001" atau "012/SPS/2024")
  tanggalSps?: string; // Tanggal Terbit Dokumen SPS (contoh: "14/03/2024" atau "2024-03-14")
  amount?: number;
  isPaid?: boolean;
  paymentDate?: string;
  receiptNumber?: string;
}

export interface AssetItem {
  id: string; // Unique ID, e.g. AST-MDN-0102
  alasHak: AlasHakType;
  tahapan: number; // 0 = Belum Proses, 1-16 = Tahap BPN, 17 = Terbit
  statusDisplay: string; // e.g. 'TERBIT', 'TAHAP 1', 'TAHAP 6'
  upt: string; // e.g. 'UPT MADIUN'
  ultg: string; // e.g. 'ULTG MADIUN', 'ULTG KEDIRI', 'ULTG BABAT'
  penghantar: string; // e.g. 'SUTT 150 kV Manisrejo - Nganjuk'
  asetLapangan: string; // e.g. 'Tapak Tower T.12'
  desa: string;
  kecamatan: string;
  bpn: string; // e.g. 'BPN Kab Madiun'
  luas: number; // m²
  persil: string; // No. Persil e.g. '045.A'
  noSertifikat: string; // e.g. 'HP No. 00124/2023' or '-'
  asset: string; // SAP Asset ID e.g. '300189201'
  nib: string; // e.g. '12.04.05.00124' or '-'
  sps1: SpsFee;
  sps2: SpsFee;
  sps3: SpsFee;
  totalPnbp: number;
  tanggalTerbit: string; // e.g. '12/04/2023' or '-'
  tanggalAkhir: string; // Target target penyelesaian / perkiraan
  kategori: CategoryType;
  tahun: number; // Tahun pendaftaran/terbit
  kendala: string;
  koordinat?: string;
  pic?: string;
  catatan?: string;
}

export interface FilterState {
  search: string;
  upt: string;
  ultg: string;
  penghantar: string;
  desa: string;
  kecamatan: string;
  bpn: string;
  kategori: string;
  kendala: string;
  tahapan: string;
  alasHak: string;
  tahun: string;
}

export type ActiveNavTab =
  | 'HOME'
  | 'DASHBOARD_UPT'
  | 'DASHBOARD_ULTG'
  | 'GLOBAL_REPORT'
  | 'BPN_REPORT'
  | 'MAP_VIEW'
  | 'ADMIN_SETTINGS'
  | 'GOOGLE_DRIVE';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  description?: string;
}

export interface DriveUserInfo {
  displayName?: string;
  emailAddress?: string;
  photoLink?: string;
  limit?: string;
  usage?: string;
  usageInDrive?: string;
  usageInDriveTrash?: string;
}

export interface PicOfficer {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
  unit: string;
  kontak: string;
  email?: string;
  kantahFokus?: string;
  status: 'AKTIF' | 'NONAKTIF';
}

export interface CertificationTargetSettings {
  tahunAnggaran: number;
  uptTarget: number;
  categoryTargets: {
    TOWER: number;
    'GARDU INDUK': number;
    'RUMAH DINAS': number;
    'TANAH KOSONG': number;
    'KANTOR'?: number;
    'EX. GARDU INDUK'?: number;
    [key: string]: number | undefined;
  };
  ultgTargets: {
    'ULTG MADIUN': number;
    'ULTG KEDIRI': number;
    'ULTG BABAT': number;
  };
}
