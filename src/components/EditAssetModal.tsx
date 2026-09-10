import React, { useState, useEffect } from 'react';
import { AssetItem, CategoryType, AlasHakType, PicOfficer } from '../types';
import { BPN_STAGES } from '../data/mockData';
import {
  X,
  Save,
  Building,
  MapPin,
  FileCheck,
  DollarSign,
  AlertCircle,
  Clock,
  Layers,
  Edit3,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface EditAssetModalProps {
  isOpen: boolean;
  asset: AssetItem | null;
  onClose: () => void;
  onSaveAsset: (updatedAsset: AssetItem) => void;
  picOfficers?: PicOfficer[];
}

export const EditAssetModal: React.FC<EditAssetModalProps> = ({
  isOpen,
  asset,
  onClose,
  onSaveAsset,
  picOfficers = [],
}) => {
  const [formData, setFormData] = useState({
    id: '',
    upt: 'UPT MADIUN',
    ultg: 'ULTG MADIUN',
    penghantar: '',
    asetProperti: '',
    asetLapangan: '',
    asetCbm: '',
    desa: '',
    kecamatan: '',
    bpn: 'BPN Kab Madiun',
    alasHak: '' as AlasHakType,
    tahapan: 1,
    luas: 250,
    persil: '',
    noSertifikat: '',
    asset: '',
    nib: '',
    kategori: 'TOWER' as CategoryType,
    tahun: '' as any,
    tanggalTerbit: '',
    tanggalAkhir: '31/12/2025',
    kendala: 'Lancar tanpa kendala',
    catatan: '',
    pic: 'Tim Pokja Sertifikasi UPT',
    koordinat: '',
    sps1No: '',
    sps1Date: '',
    sps1Amount: 1450000,
    sps1Paid: false,
    sps2No: '',
    sps2Date: '',
    sps2Amount: 2200000,
    sps2Paid: false,
    sps3No: '',
    sps3Date: '',
    sps3Amount: 850000,
    sps3Paid: false,
  });

  // Synchronize state when selected asset changes
  useEffect(() => {
    if (asset) {
      setFormData({
        id: asset.id,
        upt: asset.upt || 'UPT MADIUN',
        ultg: asset.ultg || 'ULTG MADIUN',
        penghantar: asset.penghantar || '',
        asetProperti: asset.asetProperti || asset.asetLapangan || '',
        asetLapangan: asset.asetProperti || asset.asetLapangan || '',
        asetCbm: asset.asetCbm || '',
        desa: asset.desa || '',
        kecamatan: asset.kecamatan || '',
        bpn: asset.bpn || 'BPN Kab Madiun',
        alasHak: (asset.alasHak || '') as AlasHakType,
        tahapan: asset.tahapan,
        luas: asset.luas || 250,
        persil: asset.persil || '',
        noSertifikat: asset.noSertifikat || '',
        asset: asset.asset || '',
        nib: asset.nib || '',
        kategori: asset.kategori || 'SUTT 150 kV',
        tahun: asset.tahun ? asset.tahun : ('' as any),
        tanggalTerbit: asset.tanggalTerbit || '',
        tanggalAkhir: asset.tanggalAkhir || '31/12/2025',
        kendala: asset.kendala || 'Lancar tanpa kendala',
        catatan: asset.catatan || '',
        pic: asset.pic || 'Tim Pokja Sertifikasi UPT',
        koordinat: asset.koordinat || '',
        sps1No: asset.sps1?.spsNo && asset.sps1.spsNo !== '-' ? asset.sps1.spsNo : '',
        sps1Date: asset.sps1?.tanggalSps && asset.sps1.tanggalSps !== '-' ? asset.sps1.tanggalSps : asset.sps1?.paymentDate || '',
        sps1Amount: asset.sps1?.amount || 1450000,
        sps1Paid: asset.sps1?.isPaid ?? Boolean(asset.sps1?.tanggalSps || asset.tahapan >= 5),
        sps2No: asset.sps2?.spsNo && asset.sps2.spsNo !== '-' ? asset.sps2.spsNo : '',
        sps2Date: asset.sps2?.tanggalSps && asset.sps2.tanggalSps !== '-' ? asset.sps2.tanggalSps : asset.sps2?.paymentDate || '',
        sps2Amount: asset.sps2?.amount || 2200000,
        sps2Paid: asset.sps2?.isPaid ?? Boolean(asset.sps2?.tanggalSps || asset.tahapan >= 9),
        sps3No: asset.sps3?.spsNo && asset.sps3.spsNo !== '-' ? asset.sps3.spsNo : '',
        sps3Date: asset.sps3?.tanggalSps && asset.sps3.tanggalSps !== '-' ? asset.sps3.tanggalSps : asset.sps3?.paymentDate || '',
        sps3Amount: asset.sps3?.amount || 850000,
        sps3Paid: asset.sps3?.isPaid ?? Boolean(asset.sps3?.tanggalSps || asset.tahapan >= 14),
      });
    }
  }, [asset]);

  if (!isOpen || !asset) return null;

  const handleTahapanChange = (newTahapan: number) => {
    setFormData((prev) => {
      const isTerbit = newTahapan >= 17;
      return {
        ...prev,
        tahapan: newTahapan,
        sps1Paid: newTahapan >= 5,
        sps2Paid: newTahapan >= 9,
        sps3Paid: newTahapan >= 14,
        tanggalTerbit: isTerbit ? (prev.tanggalTerbit && prev.tanggalTerbit !== '-' ? prev.tanggalTerbit : '18/09/2024') : '-',
        noSertifikat: isTerbit ? (prev.noSertifikat && prev.noSertifikat !== '-' ? prev.noSertifikat : `HP No. 00${Math.floor(100 + Math.random() * 899)}/2024`) : '-',
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isTerbit = formData.tahapan >= 17;
    const statusDisplay = isTerbit ? 'TERBIT' : `TAHAP ${formData.tahapan}`;

    const totalPnbp =
      (formData.sps1Paid ? Number(formData.sps1Amount) : 0) +
      (formData.sps2Paid ? Number(formData.sps2Amount) : 0) +
      (formData.sps3Paid ? Number(formData.sps3Amount) : 0);

    const propertiVal = (formData.asetProperti || formData.asetLapangan || '').toUpperCase().trim();
    const cbmVal = (formData.asetCbm || '-').toUpperCase().trim();

    const updatedItem: AssetItem = {
      ...asset,
      id: formData.id,
      alasHak: formData.alasHak || '',
      tahapan: formData.tahapan,
      statusDisplay,
      upt: (formData.upt || 'UPT MADIUN').toUpperCase().trim(),
      ultg: (formData.ultg || 'ULTG MADIUN').toUpperCase().trim(),
      penghantar: formData.penghantar.toUpperCase().trim(),
      asetProperti: propertiVal,
      asetLapangan: propertiVal,
      asetCbm: cbmVal,
      desa: formData.desa.toUpperCase().trim(),
      kecamatan: formData.kecamatan.toUpperCase().trim(),
      bpn: formData.bpn.toUpperCase().trim(),
      luas: Number(formData.luas),
      persil: (formData.persil || '').toUpperCase().trim(),
      noSertifikat: (formData.noSertifikat || (isTerbit ? `HP NO. 00${Math.floor(100 + Math.random() * 800)}/2024` : '-')).toUpperCase().trim(),
      asset: formData.asset.toUpperCase().trim(),
      nib: (formData.nib || '-').toUpperCase().trim(),
      sps1: {
        spsNo: (formData.sps1No.trim() || (formData.sps1Paid ? `SPS.01/BPN/2024/01` : '-')).toUpperCase(),
        tanggalSps: formData.sps1Date.trim() || (formData.sps1Paid ? '15/02/2024' : '-'),
        amount: Number(formData.sps1Amount) || 0,
        isPaid: formData.sps1Paid || Boolean(formData.sps1Date.trim()),
        paymentDate: formData.sps1Date.trim() || undefined,
      },
      sps2: {
        spsNo: (formData.sps2No.trim() || (formData.sps2Paid ? `SPS.02/BPN/2024/01` : '-')).toUpperCase(),
        tanggalSps: formData.sps2Date.trim() || (formData.sps2Paid ? '10/04/2024' : '-'),
        amount: Number(formData.sps2Amount) || 0,
        isPaid: formData.sps2Paid || Boolean(formData.sps2Date.trim()),
        paymentDate: formData.sps2Date.trim() || undefined,
      },
      sps3: {
        spsNo: (formData.sps3No.trim() || (formData.sps3Paid ? `SPS.03/BPN/2024/01` : '-')).toUpperCase(),
        tanggalSps: formData.sps3Date.trim() || (formData.sps3Paid ? '20/07/2024' : '-'),
        amount: Number(formData.sps3Amount) || 0,
        isPaid: formData.sps3Paid || Boolean(formData.sps3Date.trim()),
        paymentDate: formData.sps3Date.trim() || undefined,
      },
      totalPnbp,
      tanggalTerbit: isTerbit ? (formData.tanggalTerbit && formData.tanggalTerbit !== '-' ? formData.tanggalTerbit.trim() : '18/09/2024') : (formData.tanggalTerbit.trim() || '-'),
      tanggalAkhir: formData.tanggalAkhir.trim() || '31/12/2025',
      kategori: formData.kategori,
      tahun: (() => {
        if (formData.tanggalTerbit && formData.tanggalTerbit.includes('/')) {
          const parts = formData.tanggalTerbit.split('/');
          const y = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(y) && y > 1900) return y;
        }
        return formData.tahun ? Number(formData.tahun) : 0;
      })(),
      kendala: formData.kendala.toUpperCase().trim(),
      catatan: formData.catatan ? formData.catatan.toUpperCase().trim() : '',
      koordinat: formData.koordinat,
      pic: formData.pic.toUpperCase().trim(),
    };

    onSaveAsset(updatedItem);
    onClose();
  };

  const formatRp = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const calculatedTotalPnbp =
    (formData.sps1Paid ? Number(formData.sps1Amount) : 0) +
    (formData.sps2Paid ? Number(formData.sps2Amount) : 0) +
    (formData.sps3Paid ? Number(formData.sps3Amount) : 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-emerald-900 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/80 rounded-xl border border-amber-400/40 text-white shadow-xs">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Edit Data Aset Persil Tanah
                </h2>
                <span className="bg-amber-400 text-slate-950 text-[11px] font-mono font-bold px-2 py-0.5 rounded shadow-xs">
                  {formData.id}
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                Perbarui rincian yuridis, tahapan BPN, sertipikat, atau pembayaran SPS PNBP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-amber-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-700">
            {/* Quick Status Bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Status Saat Ini:</span>
                <span
                  className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                    formData.tahapan >= 17
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {formData.tahapan >= 17 ? 'TERBIT (SHP SELESAI)' : `TAHAP ${formData.tahapan} DI BPN`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Alas Hak:</span>
                {formData.alasHak && formData.alasHak !== '-' ? (
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                      formData.alasHak === 'SPH' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {formData.alasHak}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">Belum ditentukan</span>
                )}
              </div>

              <div className="flex items-center gap-1 font-mono text-slate-700">
                <span className="text-[11px] text-slate-500 font-sans">Total PNBP:</span>
                <strong className="text-emerald-700">{formatRp(calculatedTotalPnbp)}</strong>
              </div>
            </div>

            {/* Section 1: Lokasi & Transmisi */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <Building className="w-4 h-4 text-emerald-700" />
                1. Wilayah Operasi & Identifikasi Transmisi
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Unit Pelaksana (ULTG) *</label>
                  <select
                    value={formData.ultg}
                    onChange={(e) => setFormData({ ...formData, ultg: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  >
                    <option value="ULTG MADIUN">ULTG MADIUN</option>
                    <option value="ULTG KEDIRI">ULTG KEDIRI</option>
                    <option value="ULTG BABAT">ULTG BABAT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Jenis Aset *</label>
                  <select
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value as CategoryType })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  >
                    <option value="TOWER">TOWER</option>
                    <option value="GARDU INDUK">GARDU INDUK</option>
                    <option value="RUMAH DINAS">RUMAH DINAS</option>
                    <option value="TANAH KOSONG">TANAH KOSONG</option>
                    <option value="KANTOR">KANTOR</option>
                    <option value="EX. GARDU INDUK">EX. GARDU INDUK</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Kantah ATR / BPN *</label>
                  <input
                    type="text"
                    value={formData.bpn}
                    onChange={(e) => setFormData({ ...formData, bpn: e.target.value.toUpperCase() })}
                    className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: BPN KAB MADIUN"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-semibold mb-1">Penghantar / Jalur Transmisi *</label>
                  <input
                    type="text"
                    value={formData.penghantar}
                    onChange={(e) => setFormData({ ...formData, penghantar: e.target.value.toUpperCase() })}
                    className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
                    placeholder="Contoh: SUTT 150 KV MANISREJO - NGANJUK"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Aset Properti *</label>
                  <input
                    type="text"
                    value={formData.asetProperti || formData.asetLapangan}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setFormData({ ...formData, asetProperti: val, asetLapangan: val });
                    }}
                    className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
                    placeholder="Contoh: TAPAK TOWER T.14"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Aset CBM (Opsional)</label>
                  <input
                    type="text"
                    value={formData.asetCbm}
                    onChange={(e) => setFormData({ ...formData, asetCbm: e.target.value.toUpperCase() })}
                    className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: CBM-01"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Desa / Kelurahan *</label>
                  <input
                    type="text"
                    value={formData.desa}
                    onChange={(e) => setFormData({ ...formData, desa: e.target.value.toUpperCase() })}
                    className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="DESA"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Kecamatan *</label>
                  <input
                    type="text"
                    value={formData.kecamatan}
                    onChange={(e) => setFormData({ ...formData, kecamatan: e.target.value.toUpperCase() })}
                    className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="KECAMATAN"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Koordinat (Latitude, Longitude)</label>
                  <input
                    type="text"
                    value={formData.koordinat}
                    onChange={(e) => setFormData({ ...formData, koordinat: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    placeholder="-7.6250, 111.5300"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Yuridis & 16 Tahapan BPN */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <FileCheck className="w-4 h-4 text-emerald-700" />
                2. Status Alas Hak & Tahapan Pensertipikatan BPN
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Alas Hak Awal (Opsional)</label>
                  <select
                    value={formData.alasHak}
                    onChange={(e) => setFormData({ ...formData, alasHak: e.target.value as AlasHakType })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Kosong / Belum Ada --</option>
                    <option value="SPH">SPH (Surat Pernyataan Pelepasan Hak)</option>
                    <option value="Tanpa SPH">Tanpa SPH (Sporadik / SK BPN)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-semibold mb-1">
                    Tahapan Proses di Kantor Pertanahan (ATR/BPN) *
                  </label>
                  <select
                    value={formData.tahapan}
                    onChange={(e) => handleTahapanChange(Number(e.target.value))}
                    className={`w-full border rounded-lg p-2 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                      formData.tahapan >= 17
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : 'bg-amber-50 text-amber-900 border-amber-300'
                    }`}
                    required
                  >
                    <option value={17}>★ SERTIPIKAT TERBIT (SHP Selesai)</option>
                    <optgroup label="16 Tahapan Proses BPN">
                      {BPN_STAGES.map((s) => (
                        <option key={s.stageNumber} value={s.stageNumber}>
                          {s.name} ({s.category})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Luas Tanah (m²) *</label>
                  <input
                    type="number"
                    value={formData.luas}
                    onChange={(e) => setFormData({ ...formData, luas: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="250"
                    min={1}
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Jumlah Persil (Opsional)</label>
                  <input
                    type="text"
                    value={formData.persil}
                    onChange={(e) => setFormData({ ...formData, persil: e.target.value.toUpperCase() })}
                    className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: 1 (jumlah persil)"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nomor Induk Bidang (NIB)</label>
                  <input
                    type="text"
                    value={formData.nib}
                    onChange={(e) => setFormData({ ...formData, nib: e.target.value.toUpperCase() })}
                    className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    placeholder="12.04.05.00124 ATAU -"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">No. Sertifikat Hak Pakai</label>
                  <input
                    type="text"
                    value={formData.noSertifikat}
                    onChange={(e) => setFormData({ ...formData, noSertifikat: e.target.value.toUpperCase() })}
                    className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    placeholder="HP NO. 00124/2024 ATAU -"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Asset ID (SAP ERP PLN) *</label>
                  <input
                    type="text"
                    value={formData.asset}
                    onChange={(e) => setFormData({ ...formData, asset: e.target.value.toUpperCase() })}
                    className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    placeholder="300189201"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Tgl Terbit (Format Lengkap)</label>
                  <input
                    type="text"
                    value={formData.tanggalTerbit}
                    onChange={(e) => setFormData({ ...formData, tanggalTerbit: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="DD/MM/YYYY (contoh: 15/09/2024)"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Tgl Akhir / Target</label>
                  <input
                    type="text"
                    value={formData.tanggalAkhir}
                    onChange={(e) => setFormData({ ...formData, tanggalAkhir: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="DD/MM/YYYY (contoh: 31/12/2025)"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Dokumen SPS & Tanggal Terbit */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <FileCheck className="w-4 h-4 text-emerald-700" />
                3. Dokumen Surat Perintah Setor (SPS 1 - 3) BPN
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* SPS 1 */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800">SPS 1: Pengukuran</span>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sps1Paid}
                        onChange={(e) => setFormData({ ...formData, sps1Paid: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-[10px] font-bold text-emerald-800">Terbit / Selesai</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Nomor Dokumen SPS 1</label>
                    <input
                      type="text"
                      value={formData.sps1No}
                      onChange={(e) => setFormData({ ...formData, sps1No: e.target.value.toUpperCase() })}
                      className="w-full uppercase border border-slate-300 rounded p-1.5 bg-white text-slate-800 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      placeholder="Contoh: SPS.01/12.04/2024/001"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Tanggal Terbit SPS 1</label>
                    <input
                      type="text"
                      value={formData.sps1Date}
                      onChange={(e) => setFormData({ ...formData, sps1Date: e.target.value })}
                      className="w-full border border-slate-300 rounded p-1.5 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      placeholder="DD/MM/YYYY (contoh: 15/02/2024)"
                    />
                  </div>
                </div>

                {/* SPS 2 */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800">SPS 2: Panitia A</span>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sps2Paid}
                        onChange={(e) => setFormData({ ...formData, sps2Paid: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-[10px] font-bold text-emerald-800">Terbit / Selesai</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Nomor Dokumen SPS 2</label>
                    <input
                      type="text"
                      value={formData.sps2No}
                      onChange={(e) => setFormData({ ...formData, sps2No: e.target.value.toUpperCase() })}
                      className="w-full uppercase border border-slate-300 rounded p-1.5 bg-white text-slate-800 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      placeholder="Contoh: SPS.02/12.04/2024/001"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Tanggal Terbit SPS 2</label>
                    <input
                      type="text"
                      value={formData.sps2Date}
                      onChange={(e) => setFormData({ ...formData, sps2Date: e.target.value })}
                      className="w-full border border-slate-300 rounded p-1.5 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      placeholder="DD/MM/YYYY (contoh: 14/03/2024)"
                    />
                  </div>
                </div>

                {/* SPS 3 */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800">SPS 3: Pendaftaran Hak</span>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sps3Paid}
                        onChange={(e) => setFormData({ ...formData, sps3Paid: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-[10px] font-bold text-emerald-800">Terbit / Selesai</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Nomor Dokumen SPS 3</label>
                    <input
                      type="text"
                      value={formData.sps3No}
                      onChange={(e) => setFormData({ ...formData, sps3No: e.target.value.toUpperCase() })}
                      className="w-full uppercase border border-slate-300 rounded p-1.5 bg-white text-slate-800 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      placeholder="Contoh: SPS.03/12.04/2024/001"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Tanggal Terbit SPS 3</label>
                    <input
                      type="text"
                      value={formData.sps3Date}
                      onChange={(e) => setFormData({ ...formData, sps3Date: e.target.value })}
                      className="w-full border border-slate-300 rounded p-1.5 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      placeholder="DD/MM/YYYY (contoh: 25/05/2024)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Kendala & Catatan */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                <AlertCircle className="w-4 h-4 text-emerald-700" />
                4. Kendala Lapangan & Catatan Mitigasi
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status Kendala Lapangan</label>
                  <input
                    type="text"
                    value={formData.kendala}
                    onChange={(e) => setFormData({ ...formData, kendala: e.target.value.toUpperCase() })}
                    className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Contoh: LANCAR TANPA KENDALA / MENUNGGU RISALAH PANITIA A"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      'LANCAR TANPA KENDALA',
                      'MENUNGGU RISALAH PANITIA A BPN',
                      'MEDIASI BATAS TANAH DENGAN WARGA',
                      'SERTIFIKAT TERBIT DAN TERSIMPAN DI BRANKAS UPT',
                    ].map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={() => setFormData({ ...formData, kendala: sample })}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                      >
                        + {sample}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-semibold mb-1">
                    Petugas PIC Pokja Sertifikasi
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={formData.pic}
                      onChange={(e) => setFormData({ ...formData, pic: e.target.value.toUpperCase() })}
                      className="flex-1 uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
                      placeholder="NAMA PIC POKJA (CONTOH: BUDI SANTOSO / TIM POKJA UPT)"
                    />
                    {picOfficers.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) setFormData({ ...formData, pic: e.target.value.toUpperCase() });
                        }}
                        className="border border-slate-300 rounded-lg px-2 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        <option value="">Pilih dari Master PIC...</option>
                        {picOfficers.map((p) => (
                          <option key={p.id} value={`${p.nama} (${p.unit})`}>
                            {p.nama} ({p.unit})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {picOfficers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] text-slate-400 self-center">Pilihan Cepat:</span>
                      {picOfficers.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, pic: `${p.nama} (${p.unit})`.toUpperCase() })}
                          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                            formData.pic.includes(p.nama)
                              ? 'bg-emerald-600 text-white border-emerald-700 font-bold'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                        >
                          {p.nama.split(' ')[0]} ({p.unit.replace('ULTG ', '')})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Catatan Tambahan</label>
                  <textarea
                    rows={2}
                    value={formData.catatan}
                    onChange={(e) => setFormData({ ...formData, catatan: e.target.value.toUpperCase() })}
                    className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Tuliskan catatan tindak lanjut atau kendala teknis..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
            <div className="text-xs text-slate-500">
              Aset: <strong className="text-slate-800">{formData.asetLapangan}</strong> ({formData.penghantar})
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <Save className="w-4 h-4" />
                Simpan Perubahan Data
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
