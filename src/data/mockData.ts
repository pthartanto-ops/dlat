import { AssetItem, BpnStageInfo, UnitSummaryData, PicOfficer, CertificationTargetSettings } from '../types';
import { compareAssetPropertiAsc } from '../utils/textUtils';

export const DEFAULT_TARGET_SETTINGS: CertificationTargetSettings = {
  tahunAnggaran: 2024,
  uptTarget: 0,
  categoryTargets: {
    TOWER: 0,
    'GARDU INDUK': 0,
    'RUMAH DINAS': 0,
    'TANAH KOSONG': 0,
    KANTOR: 0,
    'EX. GARDU INDUK': 0,
  },
  ultgTargets: {
    'ULTG MADIUN': 0,
    'ULTG KEDIRI': 0,
    'ULTG BABAT': 0,
  },
};

export const DEFAULT_PIC_OFFICERS: PicOfficer[] = [
  {
    id: 'PIC-001',
    nama: 'Bpk. P.T. Hartanto, S.T.',
    nip: '198403152009121002',
    jabatan: 'Asisten Manajer Fasilitas & Sertifikasi',
    unit: 'UPT MADIUN',
    kontak: '0812-3456-7890',
    email: 'PTHartanto@gmail.com',
    kantahFokus: 'Koordinator Pokja Seluruh Wilayah & Kanwil BPN',
    status: 'AKTIF',
  },
  {
    id: 'PIC-002',
    nama: 'Bpk. Budi Santoso',
    nip: '198807212012111003',
    jabatan: 'Supervisor Pertanahan & ROW',
    unit: 'ULTG MADIUN',
    kontak: '0813-9876-5432',
    email: 'budi.santoso@pln.co.id',
    kantahFokus: 'BPN Kota Madiun, Kab Madiun, Magetan, Ngawi',
    status: 'AKTIF',
  },
  {
    id: 'PIC-003',
    nama: 'Bpk. Rian Pratama',
    nip: '199104192015021004',
    jabatan: 'Officer Legal & Sertifikasi',
    unit: 'ULTG KEDIRI',
    kontak: '0821-4567-8901',
    email: 'rian.pratama@pln.co.id',
    kantahFokus: 'BPN Kota Kediri, Kab Kediri, Nganjuk, Blitar',
    status: 'AKTIF',
  },
  {
    id: 'PIC-004',
    nama: 'Sdr. Dwi Nugroho',
    nip: '199312052018011005',
    jabatan: 'Junior Specialist Pengukuran & Peta Lapangan',
    unit: 'ULTG BABAT',
    kontak: '0852-3344-5566',
    email: 'dwi.nugroho@pln.co.id',
    kantahFokus: 'BPN Lamongan, Bojonegoro, Tuban',
    status: 'AKTIF',
  },
  {
    id: 'PIC-005',
    nama: 'Ibu Siti Rahayu',
    nip: '199009102014032001',
    jabatan: 'Staf Administrasi Berkas & SPS BPN',
    unit: 'UPT MADIUN',
    kontak: '0812-7788-9900',
    email: 'siti.rahayu@pln.co.id',
    kantahFokus: 'Pengawalan PNBP & Verifikasi Dokumen Kantah',
    status: 'AKTIF',
  },
];

export const BPN_STAGES: BpnStageInfo[] = [
  { stageNumber: 1, code: 'T1', name: '1. Proses Validasi SPH', shortName: '1. Validasi SPH', category: 'Pemberkasan', responsibleParty: 'PLN UPT' },
  { stageNumber: 2, code: 'T2', name: '2. Proses Pemberkasan di UPT', shortName: '2. Pemberkasan UPT', category: 'Pemberkasan', responsibleParty: 'PLN UPT' },
  { stageNumber: 3, code: 'T3', name: '3. Pendaftaran Berkas di Kantah BPN', shortName: '3. Pendaftaran Kantah', category: 'Pemberkasan', responsibleParty: 'Kantah BPN' },
  { stageNumber: 4, code: 'T4', name: '4. Penerbitan SPS 1 (Pengukuran)', shortName: '4. Terbit SPS 1', category: 'Pengukuran', responsibleParty: 'Kantah BPN' },
  { stageNumber: 5, code: 'T5', name: '5. Pembayaran SPS 1 (PNBP Pengukuran)', shortName: '5. Bayar SPS 1', category: 'Pengukuran', responsibleParty: 'PLN UPT' },
  { stageNumber: 6, code: 'T6', name: '6. Pengukuran Lapangan oleh BPN', shortName: '6. Pengukuran Lapangan', category: 'Pengukuran', responsibleParty: 'Kantah BPN' },
  { stageNumber: 7, code: 'T7', name: '7. Pengolahan Data & Penerbitan PBT', shortName: '7. Terbit PBT', category: 'Pengukuran', responsibleParty: 'Kantah BPN' },
  { stageNumber: 8, code: 'T8', name: '8. Penerbitan SPS 2 (Pemeriksaan Tanah)', shortName: '8. Terbit SPS 2', category: 'Pemeriksaan', responsibleParty: 'Kantah BPN' },
  { stageNumber: 9, code: 'T9', name: '9. Pembayaran SPS 2 (PNBP Pemeriksaan)', shortName: '9. Bayar SPS 2', category: 'Pemeriksaan', responsibleParty: 'PLN UPT' },
  { stageNumber: 10, code: 'T10', name: '10. Sidang Panitia A / Pemeriksaan Lapang', shortName: '10. Sidang Panitia A', category: 'Pemeriksaan', responsibleParty: 'Kantah BPN' },
  { stageNumber: 11, code: 'T11', name: '11. Risalah Panitia A', shortName: '11. Risalah Panitia A', category: 'Pemeriksaan', responsibleParty: 'Kantah BPN' },
  { stageNumber: 12, code: 'T12', name: '12. Penerbitan SK Hak (Kakan / Kanwil)', shortName: '12. Terbit SK Hak', category: 'SK & Pembukuan', responsibleParty: 'Kanwil BPN' },
  { stageNumber: 13, code: 'T13', name: '13. Penerbitan SPS 3 (Pendaftaran SK)', shortName: '13. Terbit SPS 3', category: 'SK & Pembukuan', responsibleParty: 'Kantah BPN' },
  { stageNumber: 14, code: 'T14', name: '14. Pembayaran SPS 3 (PNBP Pembukuan)', shortName: '14. Bayar SPS 3', category: 'SK & Pembukuan', responsibleParty: 'PLN UPT' },
  { stageNumber: 15, code: 'T15', name: '15. Pembukuan Hak & Buku Tanah', shortName: '15. Pembukuan Hak', category: 'SK & Pembukuan', responsibleParty: 'Kantah BPN' },
  { stageNumber: 16, code: 'T16', name: '16. Pembayaran Penerbitan Sertifikat - PNBP 3', shortName: '16. Bayar Terbit PNBP 3', category: 'Sertifikat Terbit', responsibleParty: 'PLN UPT' },
];

export const INITIAL_UNIT_SUMMARIES: UnitSummaryData[] = [
  {
    unit: 'TOWER',
    jenisAset: 'TOWER',
    target: 0,
    totalAset: 345,
    sertifikatTerbit: {
      pre2021: 42,
      y2021: 35,
      y2022: 48,
      y2023: 56,
      y2024: 38,
      total: 219,
    },
    statusSebelumBpn: {
      sph: 102,
      tanpaSph: 24,
    },
    tahapanBpn: {
      1: 14,
      2: 9,
      3: 11,
      4: 8,
      5: 6,
      6: 12,
      7: 15,
      8: 7,
      9: 5,
      10: 9,
      11: 8,
      12: 6,
      13: 4,
      14: 3,
      15: 5,
      16: 4,
    },
  },
  {
    unit: 'GARDU INDUK',
    jenisAset: 'GARDU INDUK',
    target: 0,
    totalAset: 75,
    sertifikatTerbit: {
      pre2021: 15,
      y2021: 9,
      y2022: 12,
      y2023: 8,
      y2024: 6,
      total: 50,
    },
    statusSebelumBpn: {
      sph: 21,
      tanpaSph: 4,
    },
    tahapanBpn: {
      1: 2,
      2: 2,
      3: 1,
      4: 2,
      5: 1,
      6: 2,
      7: 3,
      8: 2,
      9: 1,
      10: 2,
      11: 1,
      12: 2,
      13: 1,
      14: 1,
      15: 1,
      16: 1,
    },
  },
  {
    unit: 'RUMAH DINAS',
    jenisAset: 'RUMAH DINAS',
    target: 0,
    totalAset: 42,
    sertifikatTerbit: {
      pre2021: 8,
      y2021: 6,
      y2022: 7,
      y2023: 4,
      y2024: 3,
      total: 28,
    },
    statusSebelumBpn: {
      sph: 11,
      tanpaSph: 3,
    },
    tahapanBpn: {
      1: 2,
      2: 1,
      3: 1,
      4: 1,
      5: 1,
      6: 1,
      7: 2,
      8: 1,
      9: 1,
      10: 1,
      11: 0,
      12: 1,
      13: 0,
      14: 0,
      15: 1,
      16: 0,
    },
  },
  {
    unit: 'TANAH KOSONG',
    jenisAset: 'TANAH KOSONG',
    target: 0,
    totalAset: 30,
    sertifikatTerbit: {
      pre2021: 4,
      y2021: 3,
      y2022: 3,
      y2023: 3,
      y2024: 2,
      total: 15,
    },
    statusSebelumBpn: {
      sph: 12,
      tanpaSph: 3,
    },
    tahapanBpn: {
      1: 3,
      2: 2,
      3: 1,
      4: 1,
      5: 0,
      6: 1,
      7: 2,
      8: 1,
      9: 0,
      10: 1,
      11: 1,
      12: 1,
      13: 0,
      14: 0,
      15: 0,
      16: 1,
    },
  },
  {
    unit: 'KANTOR',
    jenisAset: 'KANTOR',
    target: 0,
    totalAset: 12,
    sertifikatTerbit: {
      pre2021: 4,
      y2021: 2,
      y2022: 2,
      y2023: 1,
      y2024: 1,
      total: 10,
    },
    statusSebelumBpn: {
      sph: 2,
      tanpaSph: 0,
    },
    tahapanBpn: {
      1: 1,
      2: 0,
      3: 0,
      4: 1,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
      9: 0,
      10: 0,
      11: 0,
      12: 0,
      13: 0,
      14: 0,
      15: 0,
      16: 0,
    },
  },
  {
    unit: 'EX. GARDU INDUK',
    jenisAset: 'EX. GARDU INDUK',
    target: 0,
    totalAset: 8,
    sertifikatTerbit: {
      pre2021: 2,
      y2021: 1,
      y2022: 1,
      y2023: 1,
      y2024: 0,
      total: 5,
    },
    statusSebelumBpn: {
      sph: 2,
      tanpaSph: 1,
    },
    tahapanBpn: {
      1: 1,
      2: 1,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 1,
      8: 0,
      9: 0,
      10: 0,
      11: 0,
      12: 0,
      13: 0,
      14: 0,
      15: 0,
      16: 0,
    },
  },
];

// Helper to generate comprehensive realistic PLN asset records
const rawPenthantarList = [
  { name: 'SUTT 150 kV Manisrejo - Nganjuk', ultg: 'ULTG MADIUN', bpn: 'BPN Kab Nganjuk', kec: 'Sukomoro', desa: 'Sukomoro' },
  { name: 'SUTT 150 kV Manisrejo - Krapyak', ultg: 'ULTG MADIUN', bpn: 'BPN Kota Madiun', kec: 'Taman', desa: 'Manisrejo' },
  { name: 'SUTT 150 kV Ponorogo - Slahung', ultg: 'ULTG MADIUN', bpn: 'BPN Kab Ponorogo', kec: 'Slahung', desa: 'Broto' },
  { name: 'SUTT 150 kV Kediri - Pare', ultg: 'ULTG KEDIRI', bpn: 'BPN Kab Kediri', kec: 'Pare', desa: 'Tulungrejo' },
  { name: 'SUTT 150 kV Kediri - Sambirejo', ultg: 'ULTG KEDIRI', bpn: 'BPN Kab Kediri', kec: 'Gampengrejo', desa: 'Ngebrak' },
  { name: 'SUTET 500 kV Krian - Ungaran (Madiun Section)', ultg: 'ULTG MADIUN', bpn: 'BPN Kab Madiun', kec: 'Wungu', desa: 'Banjarsari' },
  { name: 'SUTT 150 kV Babat - Tuban', ultg: 'ULTG BABAT', bpn: 'BPN Kab Lamongan', kec: 'Babat', desa: 'Babat Kota' },
  { name: 'SUTT 150 kV Babat - Bojonegoro', ultg: 'ULTG BABAT', bpn: 'BPN Kab Bojonegoro', kec: 'Baureno', desa: 'Gunungsari' },
  { name: 'GI 150 kV Kediri', ultg: 'ULTG KEDIRI', bpn: 'BPN Kota Kediri', kec: 'Kota', desa: 'Ngronggo' },
  { name: 'GI 150 kV Manisrejo', ultg: 'ULTG MADIUN', bpn: 'BPN Kota Madiun', kec: 'Taman', desa: 'Banjarejo' },
  { name: 'GI 150 kV Babat', ultg: 'ULTG BABAT', bpn: 'BPN Kab Lamongan', kec: 'Babat', desa: 'Plaosan' },
  { name: 'SUTT 150 kV Nganjuk - Kertosono', ultg: 'ULTG MADIUN', bpn: 'BPN Kab Nganjuk', kec: 'Kertosono', desa: 'Banaran' },
  { name: 'SUTT 150 kV Tulungagung - Trenggalek', ultg: 'ULTG KEDIRI', bpn: 'BPN Kab Tulungagung', kec: 'Kedungwaru', desa: 'Ketanon' },
  { name: 'SUTET 500 kV Kediri - Grati', ultg: 'ULTG KEDIRI', bpn: 'BPN Kab Blitar', kec: 'Nglegok', desa: 'Modangan' },
  { name: 'GI 150 kV Tuban', ultg: 'ULTG BABAT', bpn: 'BPN Kab Tuban', kec: 'Semanding', desa: 'Kowang' },
];

const kendalaList = [
  'Lancar tanpa kendala',
  'Lancar, verifikasi berkas Kantah',
  'Tumpang tindih batas tanah kas desa (TKD), mediasi Muspika',
  'Menunggu penandatanganan PBT oleh Kasi Survei BPN',
  'Sengketa batas warga di kaki tower C, koordinasi desa',
  'Dokumen alas hak sporadik belum ttd Kades definitif',
  'Menunggu penetapan SK Hak dari Kanwil BPN Jatim',
  'Jadwal sidang Panitia A mundur karena agenda internal BPN',
  'Menunggu penerbitan nomor berkas dan SPS 2 dari loket BPN',
  'Revisi batas peta bidang tanah karena pergeseran patok',
  'Lancar, menunggu cetak blanko sertifikat elektronik',
  'Penyerahan berkas fisik asli ke loket pelayanan prioritas BPN',
];

export function generateRealisticAssets(): AssetItem[] {
  const assets: AssetItem[] = [];
  let counter = 1;

  for (let i = 0; i < 75; i++) {
    const pIndex = i % rawPenthantarList.length;
    const p = rawPenthantarList[pIndex];
    const isGI = p.name.startsWith('GI');

    let kategori: AssetItem['kategori'] = 'TOWER';
    let asetLapangan = '';
    let penghantar = '';
    let luasM2 = 225 + ((i % 8) * 64);

    if (i % 10 === 7) {
      kategori = 'RUMAH DINAS';
      penghantar = `Komplek Perumahan Dinas PLN ${p.ultg}`;
      asetLapangan = [
        'Rumah Dinas Pejabat UPT Madiun',
        'Rumah Dinas Spv ULTG Kediri No. 3',
        'Mess Operator GI Babat',
        'Rumah Dinas Jabatan ULTG Madiun',
        'Perumahan Dinas Pegawai Kediri Lot B',
        'Wisma Transit Pegawai UPT Babat',
      ][i % 6];
      luasM2 = 350 + ((i % 5) * 80);
    } else if (i % 10 === 8) {
      kategori = 'TANAH KOSONG';
      penghantar = `Lahan Cadangan Kelistrikan ${p.ultg}`;
      asetLapangan = [
        'Lahan Cadangan Perluasan GITET Kediri',
        'Tanah Kosong Rencana Gardu Induk Sukomoro',
        'Lahan Buffer Zone Gardu Induk Babat',
        'Tanah Cadangan ROW Jalur Transmisi Ponorogo',
        'Lahan Kosong Eks-Trafo Manisrejo',
        'Tanah Cadangan SUTT 150 kV Babat',
      ][i % 6];
      luasM2 = 2500 + ((i % 6) * 1200);
    } else if (isGI || i % 10 === 3) {
      kategori = 'GARDU INDUK';
      penghantar = isGI ? p.name : `GI 150 kV ${p.desa}`;
      asetLapangan = `Switchyard ${penghantar} Area ${((i % 4) + 1)}`;
      luasM2 = 15400 + (i * 250);
    } else {
      kategori = 'TOWER';
      const towerNo = `T.${(i * 3) % 180 + 1}`;
      penghantar = `${p.name} ${towerNo}`;
      asetLapangan = `Tapak Tower ${towerNo}`;
      luasM2 = 225 + ((i % 8) * 64);
    }
    
    // Status distribution
    const isTerbit = i % 3 === 0;
    const tahapanNum = isTerbit ? 17 : (i % 16) + 1;
    const statusDisplay = isTerbit ? 'TERBIT' : `TAHAP ${tahapanNum}`;
    const alasHak: AssetItem['alasHak'] = i % 5 === 0 ? 'Tanpa SPH' : 'SPH';

    const sps1Paid = tahapanNum >= 5;
    const sps2Paid = tahapanNum >= 9;
    const sps3Paid = tahapanNum >= 14;

    const isLarge = kategori === 'GARDU INDUK' || kategori === 'TANAH KOSONG';
    const sps1Amt = isLarge ? 8500000 : 1250000 + ((i * 12345) % 850000);
    const sps2Amt = isLarge ? 14200000 : 2100000 + ((i * 23456) % 1150000);
    const sps3Amt = isLarge ? 5000000 : 750000 + ((i * 11111) % 450000);

    const totalPnbp = (sps1Paid ? sps1Amt : 0) + (sps2Paid ? sps2Amt : 0) + (sps3Paid ? sps3Amt : 0);

    const yearPublished = 2020 + (i % 5); // 2020 - 2024
    const certNumber = isTerbit
      ? `HP No. 00${100 + i}/${yearPublished}`
      : '-';
    const nibNumber = tahapanNum >= 7 ? `12.${(10 + (i % 8))}.${(100 + (i % 900))}.${(10000 + i)}` : '-';
    const tanggalTerbit = isTerbit ? `${((i % 28) + 1).toString().padStart(2, '0')}/${((i % 12) + 1).toString().padStart(2, '0')}/${yearPublished}` : '-';
    const tanggalAkhir = isTerbit ? `${((i % 28) + 1).toString().padStart(2, '0')}/${((i % 12) + 1).toString().padStart(2, '0')}/2025` : '-';

    const kendala = isTerbit ? 'Telah Terbit & Tersimpan di UPT' : kendalaList[i % kendalaList.length];

    assets.push({
      id: `AST-MDN-${String(counter).padStart(4, '0')}`,
      alasHak,
      tahapan: tahapanNum,
      statusDisplay,
      upt: 'UPT MADIUN',
      ultg: p.ultg,
      penghantar,
      asetLapangan,
      desa: `${p.desa} ${i % 3 === 0 ? 'Selatan' : ''}`.trim(),
      kecamatan: p.kec,
      bpn: p.bpn,
      luas: luasM2,
      persil: `${String((i * 17) % 99 + 1).padStart(3, '0')}.${String.fromCharCode(65 + (i % 4))}`,
      noSertifikat: certNumber,
      asset: `10098${String(1000 + i)}`,
      nib: nibNumber,
      sps1: {
        spsNo: tahapanNum >= 3 ? `SPS1/${p.bpn.split(' ')[1] || 'MDN'}/2024/${String(100 + i)}` : '-',
        tanggalSps: tahapanNum >= 3 ? `14/02/2024` : '-',
        amount: sps1Amt,
        isPaid: sps1Paid,
        paymentDate: tahapanNum >= 3 ? `14/02/2024` : undefined,
      },
      sps2: {
        spsNo: tahapanNum >= 8 ? `SPS2/${p.bpn.split(' ')[1] || 'MDN'}/2024/${String(100 + i)}` : '-',
        tanggalSps: tahapanNum >= 8 ? `18/05/2024` : '-',
        amount: sps2Amt,
        isPaid: sps2Paid,
        paymentDate: tahapanNum >= 8 ? `18/05/2024` : undefined,
      },
      sps3: {
        spsNo: tahapanNum >= 13 ? `SPS3/${p.bpn.split(' ')[1] || 'MDN'}/2024/${String(100 + i)}` : '-',
        tanggalSps: tahapanNum >= 13 ? `22/09/2024` : '-',
        amount: sps3Amt,
        isPaid: sps3Paid,
        paymentDate: tahapanNum >= 13 ? `22/09/2024` : undefined,
      },
      totalPnbp,
      tanggalTerbit,
      tanggalAkhir,
      kategori,
      tahun: isTerbit ? yearPublished : 2024,
      kendala,
      koordinat: `-7.${6000 + (i * 27)}, 111.${5000 + (i * 31)}`,
      pic: ['Budi Santoso (Asman Fasilitas)', 'Rian Pratama (Spv Tanah)', 'Dwi Nugroho (Officer Legal)', 'Siti Rahayu (Staf Perizinan)'][i % 4],
      catatan: isTerbit ? 'Sertifikat fisik telah diserahkan dan diarsipkan di brankas UPT Madiun' : 'Dalam pemantauan berkala Pokja Sertifikasi PLN - Kantah BPN',
      dokumenSertifikat: isTerbit && i % 6 === 0 ? 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80' : undefined,
      dokumenSertifikatNama: isTerbit && i % 6 === 0 ? `Scan_${certNumber.replace(/[\/\s]/g, '_')}.jpg` : undefined,
      dokumenSertifikatType: isTerbit && i % 6 === 0 ? 'image/jpeg' : undefined,
      dokumenSertifikatUkuran: isTerbit && i % 6 === 0 ? 1420500 : undefined,
    });

    counter++;
  }

  return assets.sort(compareAssetPropertiAsc);
}
