import React, { useState, useEffect } from 'react';
import { AssetItem, CategoryType, AlasHakType, PicOfficer } from '../types';
import { X, Plus, Save, UserCheck, FileCheck } from 'lucide-react';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAsset: (newAsset: AssetItem) => void;
  picOfficers?: PicOfficer[];
}

const EMPTY_FORM_DATA = {
  upt: 'UPT MADIUN',
  ultg: '',
  penghantar: '',
  asetProperti: '',
  asetLapangan: '',
  asetCbm: '',
  desa: '',
  kecamatan: '',
  bpn: '',
  alasHak: '' as AlasHakType,
  tahapan: 1,
  luas: '',
  persil: '',
  noSertifikat: '',
  asset: '',
  nib: '',
  kategori: '' as CategoryType | '',
  tanggalTerbit: '',
  tanggalAkhir: '',
  tahun: '',
  kendala: '',
  koordinat: '',
  pic: '',
  sps1No: '',
  sps1Date: '',
  sps2No: '',
  sps2Date: '',
  sps3No: '',
  sps3Date: '',
};

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  isOpen,
  onClose,
  onAddAsset,
  picOfficers = [],
}) => {
  const [formData, setFormData] = useState(EMPTY_FORM_DATA);

  // Reset all input fields to empty whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setFormData(EMPTY_FORM_DATA);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isTerbit = formData.tahapan >= 17;
    const nowId = `AST-MDN-${Math.floor(1000 + Math.random() * 9000)}`;

    const chosenAlasHak: AlasHakType = (formData.alasHak as AlasHakType) || '';
    const chosenKategori: CategoryType = (formData.kategori as CategoryType) || 'TOWER';
    const chosenUltg = formData.ultg || 'ULTG MADIUN';
    const numLuas = formData.luas !== '' ? Number(formData.luas) : 0;
    const parsedTahun = formData.tahun ? Number(formData.tahun) : 0;

    const propertiVal = (formData.asetProperti || formData.asetLapangan || '-').toUpperCase().trim();
    const cbmVal = (formData.asetCbm || '-').toUpperCase().trim();

    // Format tanggal terbit dan tanggal akhir lengkap (DD/MM/YYYY)
    const rawTglTerbit = formData.tanggalTerbit.trim();
    const finalTglTerbit = rawTglTerbit || (isTerbit ? '15/09/2024' : '-');
    const rawTglAkhir = formData.tanggalAkhir.trim();
    const finalTglAkhir = rawTglAkhir || '31/12/2025';

    // Derive year from tanggalTerbit or explicit tahun
    let derivedYear = 0;
    if (finalTglTerbit && finalTglTerbit !== '-' && finalTglTerbit.includes('/')) {
      const parts = finalTglTerbit.split('/');
      const y = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(y) && y > 1900) derivedYear = y;
    }
    if (derivedYear === 0 && !isNaN(parsedTahun) && parsedTahun > 0) {
      derivedYear = parsedTahun;
    }

    const newItem: AssetItem = {
      id: nowId,
      alasHak: chosenAlasHak,
      tahapan: formData.tahapan,
      statusDisplay: isTerbit ? 'TERBIT' : `TAHAP ${formData.tahapan}`,
      upt: (formData.upt || 'UPT MADIUN').toUpperCase().trim(),
      ultg: chosenUltg.toUpperCase().trim(),
      penghantar: (formData.penghantar || '-').toUpperCase().trim(),
      asetProperti: propertiVal,
      asetLapangan: propertiVal,
      asetCbm: cbmVal,
      desa: (formData.desa || '-').toUpperCase().trim(),
      kecamatan: (formData.kecamatan || '-').toUpperCase().trim(),
      bpn: (formData.bpn || '-').toUpperCase().trim(),
      luas: numLuas,
      persil: (formData.persil || '').toUpperCase().trim(),
      noSertifikat: (formData.noSertifikat || (isTerbit ? `HP NO. 00${Math.floor(100 + Math.random() * 800)}/2024` : '-')).toUpperCase().trim(),
      asset: (formData.asset || '-').toUpperCase().trim(),
      nib: (formData.nib || '-').toUpperCase().trim(),
      sps1: {
        spsNo: (formData.sps1No.trim() || '-').toUpperCase(),
        tanggalSps: formData.sps1Date.trim() || '-',
        amount: 0,
        isPaid: Boolean(formData.sps1Date.trim() || formData.tahapan >= 5),
        paymentDate: formData.sps1Date.trim() || undefined,
      },
      sps2: {
        spsNo: (formData.sps2No.trim() || '-').toUpperCase(),
        tanggalSps: formData.sps2Date.trim() || '-',
        amount: 0,
        isPaid: Boolean(formData.sps2Date.trim() || formData.tahapan >= 9),
        paymentDate: formData.sps2Date.trim() || undefined,
      },
      sps3: {
        spsNo: (formData.sps3No.trim() || '-').toUpperCase(),
        tanggalSps: formData.sps3Date.trim() || '-',
        amount: 0,
        isPaid: Boolean(formData.sps3Date.trim() || formData.tahapan >= 14),
        paymentDate: formData.sps3Date.trim() || undefined,
      },
      totalPnbp: 0,
      tanggalTerbit: finalTglTerbit,
      tanggalAkhir: finalTglAkhir,
      kategori: chosenKategori,
      tahun: derivedYear,
      kendala: (formData.kendala.trim() ? formData.kendala.trim() : 'LANCAR TANPA KENDALA').toUpperCase(),
      koordinat: formData.koordinat.trim() || '',
      pic: (formData.pic.trim() || (picOfficers[0]?.nama ? `${picOfficers[0].nama} (${picOfficers[0].unit})` : 'TIM POKJA SERTIFIKASI UPT')).toUpperCase().trim(),
    };

    onAddAsset(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-emerald-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-sm">Tambah Data Persil / Aset Baru</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10 text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Unit Pengelola (ULTG) <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.ultg}
                onChange={(e) => setFormData({ ...formData, ultg: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              >
                <option value="">-- Pilih Unit Pengelola (ULTG) --</option>
                <option value="ULTG MADIUN">ULTG MADIUN</option>
                <option value="ULTG KEDIRI">ULTG KEDIRI</option>
                <option value="ULTG BABAT">ULTG BABAT</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Jenis Aset <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.kategori}
                onChange={(e) => setFormData({ ...formData, kategori: e.target.value as CategoryType })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              >
                <option value="">-- Pilih Jenis Aset --</option>
                <option value="TOWER">TOWER</option>
                <option value="GARDU INDUK">GARDU INDUK</option>
                <option value="RUMAH DINAS">RUMAH DINAS</option>
                <option value="TANAH KOSONG">TANAH KOSONG</option>
                <option value="KANTOR">KANTOR</option>
                <option value="EX. GARDU INDUK">EX. GARDU INDUK</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Penghantar / Jalur Transmisi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.penghantar}
                onChange={(e) => setFormData({ ...formData, penghantar: e.target.value.toUpperCase() })}
                placeholder="Contoh: SUTT 150 KV MANISREJO - NGANJUK"
                className="w-full uppercase bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Aset Properti <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.asetProperti || formData.asetLapangan}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setFormData({ ...formData, asetProperti: val, asetLapangan: val });
                }}
                placeholder="Contoh: TAPAK TOWER T.45 / GI MANISREJO"
                className="w-full uppercase bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Aset CBM (Opsional)
              </label>
              <input
                type="text"
                value={formData.asetCbm}
                onChange={(e) => setFormData({ ...formData, asetCbm: e.target.value.toUpperCase() })}
                placeholder="Contoh: CBM-01 (kosongkan jika tidak ada)"
                className="w-full uppercase bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Kantah BPN Terkait <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.bpn}
                onChange={(e) => setFormData({ ...formData, bpn: e.target.value.toUpperCase() })}
                placeholder="Contoh: BPN KAB MADIUN"
                className="w-full uppercase bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Desa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.desa}
                onChange={(e) => setFormData({ ...formData, desa: e.target.value.toUpperCase() })}
                placeholder="MASUKKAN NAMA DESA"
                className="w-full uppercase bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Kecamatan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.kecamatan}
                onChange={(e) => setFormData({ ...formData, kecamatan: e.target.value.toUpperCase() })}
                placeholder="MASUKKAN NAMA KECAMATAN"
                className="w-full uppercase bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Alas Hak Awal (Opsional)
              </label>
              <select
                value={formData.alasHak}
                onChange={(e) => setFormData({ ...formData, alasHak: e.target.value as AlasHakType })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              >
                <option value="">-- Kosong (Belum Ditentukan) --</option>
                <option value="SPH">SPH (Surat Pengakuan Hak)</option>
                <option value="Tanpa SPH">Tanpa SPH</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tahapan BPN</label>
              <select
                value={formData.tahapan}
                onChange={(e) => setFormData({ ...formData, tahapan: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-medium focus:bg-white focus:border-emerald-600 focus:outline-none"
              >
                <option value={1}>1. Proses Validasi SPH</option>
                <option value={2}>2. Proses Pemberkasan di UPT</option>
                <option value={3}>3. Pendaftaran Berkas di Kantah</option>
                <option value={4}>4. Penerbitan SPS 1 (Pengukuran)</option>
                <option value={5}>5. Pembayaran SPS 1</option>
                <option value={6}>6. Pengukuran Lapangan</option>
                <option value={7}>7. Penerbitan PBT</option>
                <option value={8}>8. Penerbitan SPS 2</option>
                <option value={9}>9. Pembayaran SPS 2</option>
                <option value={10}>10. Sidang Panitia A</option>
                <option value={11}>11. Risalah Panitia A</option>
                <option value={12}>12. Penerbitan SK Hak</option>
                <option value={13}>13. Penerbitan SPS 3</option>
                <option value={14}>14. Pembayaran SPS 3</option>
                <option value={15}>15. Pembukuan Hak</option>
                <option value={16}>16. Pembayaran PNBP 3</option>
                <option value={17}>17. SUDAH TERBIT (Sertifikat Selesai)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Luas Tanah (m²) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.luas}
                onChange={(e) => setFormData({ ...formData, luas: e.target.value })}
                placeholder="Contoh: 250"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Jumlah Persil (Opsional)
              </label>
              <input
                type="text"
                value={formData.persil}
                onChange={(e) => setFormData({ ...formData, persil: e.target.value.toUpperCase() })}
                placeholder="Contoh: 1 (jumlah persil)"
                className="w-full uppercase bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tgl Terbit (Format Lengkap: DD/MM/YYYY)
              </label>
              <input
                type="text"
                value={formData.tanggalTerbit}
                onChange={(e) => setFormData({ ...formData, tanggalTerbit: e.target.value })}
                placeholder="Contoh: 15/09/2024"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-mono focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tgl Akhir / Target (Format Lengkap: DD/MM/YYYY)
              </label>
              <input
                type="text"
                value={formData.tanggalAkhir}
                onChange={(e) => setFormData({ ...formData, tanggalAkhir: e.target.value })}
                placeholder="Contoh: 31/12/2025"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-mono focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Koordinat GPS (Lat, Long)</label>
              <input
                type="text"
                value={formData.koordinat}
                onChange={(e) => setFormData({ ...formData, koordinat: e.target.value })}
                placeholder="Contoh: -7.6250, 111.5300"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-mono focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nomor SAP / Aset (Opsional)</label>
              <input
                type="text"
                value={formData.asset}
                onChange={(e) => setFormData({ ...formData, asset: e.target.value.toUpperCase() })}
                placeholder="Contoh: 300189201"
                className="w-full uppercase bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nomor Identifikasi Bidang / NIB (Opsional)</label>
              <input
                type="text"
                value={formData.nib}
                onChange={(e) => setFormData({ ...formData, nib: e.target.value.toUpperCase() })}
                placeholder="Contoh: 12.04.05.00999"
                className="w-full uppercase bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>

            {/* Dokumen & Tanggal Terbit SPS 1-3 (Opsional) */}
            <div className="sm:col-span-2 border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-3">
              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <FileCheck className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-900 uppercase">Dokumen Surat Perintah Setor BPN (SPS 1 - 3)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* SPS 1 */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="font-bold text-xs text-slate-800">SPS 1 (Pengukuran)</div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">No. Dokumen SPS 1</label>
                    <input
                      type="text"
                      value={formData.sps1No}
                      onChange={(e) => setFormData({ ...formData, sps1No: e.target.value.toUpperCase() })}
                      placeholder="No. SPS Pengukuran"
                      className="w-full uppercase bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Tgl. Terbit SPS 1</label>
                    <input
                      type="text"
                      value={formData.sps1Date}
                      onChange={(e) => setFormData({ ...formData, sps1Date: e.target.value })}
                      placeholder="DD/MM/YYYY"
                      className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* SPS 2 */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="font-bold text-xs text-slate-800">SPS 2 (Panitia A)</div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">No. Dokumen SPS 2</label>
                    <input
                      type="text"
                      value={formData.sps2No}
                      onChange={(e) => setFormData({ ...formData, sps2No: e.target.value.toUpperCase() })}
                      placeholder="No. SPS Panitia A"
                      className="w-full uppercase bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Tgl. Terbit SPS 2</label>
                    <input
                      type="text"
                      value={formData.sps2Date}
                      onChange={(e) => setFormData({ ...formData, sps2Date: e.target.value })}
                      placeholder="DD/MM/YYYY"
                      className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* SPS 3 */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="font-bold text-xs text-slate-800">SPS 3 (Pendaftaran Hak)</div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">No. Dokumen SPS 3</label>
                    <input
                      type="text"
                      value={formData.sps3No}
                      onChange={(e) => setFormData({ ...formData, sps3No: e.target.value.toUpperCase() })}
                      placeholder="No. SPS Pendaftaran"
                      className="w-full uppercase bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Tgl. Terbit SPS 3</label>
                    <input
                      type="text"
                      value={formData.sps3Date}
                      onChange={(e) => setFormData({ ...formData, sps3Date: e.target.value })}
                      placeholder="DD/MM/YYYY"
                      className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Petugas PIC Pokja Sertifikasi
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.pic}
                  onChange={(e) => setFormData({ ...formData, pic: e.target.value.toUpperCase() })}
                  placeholder="Contoh: BUDI SANTOSO / TIM POKJA ULTG"
                  className="flex-1 uppercase bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
                {picOfficers.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) setFormData({ ...formData, pic: e.target.value.toUpperCase() });
                    }}
                    className="bg-slate-100 border border-slate-300 rounded-lg px-2 text-xs text-slate-700 cursor-pointer"
                  >
                    <option value="">Pilih dari Master PIC...</option>
                    {picOfficers.map((p) => (
                      <option key={p.id} value={`${p.nama} (${p.unit})`}>
                        {p.nama} - {p.unit}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Catatan Kendala Lapangan</label>
              <input
                type="text"
                value={formData.kendala}
                onChange={(e) => setFormData({ ...formData, kendala: e.target.value.toUpperCase() })}
                placeholder="Kosongkan jika proses lancar tanpa kendala"
                className="w-full uppercase bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Simpan Aset Baru
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
