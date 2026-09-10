import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { AssetItem, CategoryType, AlasHakType, PicOfficer } from '../types';
import { BPN_STAGES } from '../data/mockData';
import {
  X,
  Plus,
  Save,
  UserCheck,
  FileCheck,
  Paperclip,
  FileText,
  Upload,
  Link as LinkIcon,
  Trash2,
  MapPin,
  Locate,
  Navigation,
  ExternalLink,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Info,
  Building,
  Layers,
  DollarSign,
  Clock,
  Shield,
  Calendar,
  Cloud,
  CloudUpload,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { fileToDataUrl, formatFileSize } from '../services/certificateStorage';
import {
  isGoogleDriveUrl,
  getDrivePreviewUrl,
  TARGET_DRIVE_ACCOUNT,
  CERTIFICATE_FOLDER_NAME,
  formatCertificateFileName,
  uploadCertificateToDrive,
  getDriveAccessToken,
  setDriveAccessToken,
  signInWithGoogleDrive,
  dataUrlToFile,
} from '../services/googleDriveService';
import {
  parseCoordinateInput,
  getEstimatedRegionCoordinate,
  getCurrentDeviceLocation,
} from '../utils/coordinateUtils';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAsset: (newAsset: AssetItem) => void;
  picOfficers?: PicOfficer[];
  googleUser?: User | null;
  googleAccessToken?: string | null;
  onGoogleAuthSuccess?: (user: User, token: string) => void;
}

const EMPTY_FORM_DATA = {
  upt: 'UPT MADIUN',
  ultg: 'ULTG MADIUN',
  penghantar: '',
  asetProperti: '',
  asetLapangan: '',
  asetCbm: '',
  desa: '',
  kecamatan: '',
  bpn: 'BPN KABUPATEN MADIUN',
  alasHak: 'SPH' as AlasHakType,
  tahapan: 1,
  luas: '',
  persil: '',
  noSertifikat: '',
  dokumenSertifikat: '',
  dokumenSertifikatNama: '',
  dokumenSertifikatType: '',
  dokumenSertifikatUkuran: 0,
  asset: '',
  nib: '',
  kategori: 'TOWER' as CategoryType,
  tanggalTerbit: '',
  tanggalAkhir: '',
  tahun: new Date().getFullYear().toString(),
  kendala: 'LANCAR TANPA KENDALA',
  catatan: '',
  koordinat: '',
  pic: '',
  sps1No: '',
  sps1Date: '',
  sps1Paid: false,
  sps1Amount: 1450000,
  sps2No: '',
  sps2Date: '',
  sps2Paid: false,
  sps2Amount: 2850000,
  sps3No: '',
  sps3Date: '',
  sps3Paid: false,
  sps3Amount: 1200000,
};

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  isOpen,
  onClose,
  onAddAsset,
  picOfficers = [],
  googleUser,
  googleAccessToken,
  onGoogleAuthSuccess,
}) => {
  const [formData, setFormData] = useState(EMPTY_FORM_DATA);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [driveUploadStatus, setDriveUploadStatus] = useState<{
    type: 'loading' | 'success' | 'warning' | 'error';
    text: string;
    link?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset all input fields to empty whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setFormData(EMPTY_FORM_DATA);
      setIsLocatingGps(false);
      setGpsMessage(null);
      setIsUploadingDrive(false);
      setDriveUploadStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGetGpsLocation = async () => {
    setIsLocatingGps(true);
    setGpsMessage(null);
    try {
      const loc = await getCurrentDeviceLocation();
      setFormData((prev) => ({ ...prev, koordinat: loc.formatted }));
      setGpsMessage({
        text: `Koordinat GPS berhasil terdeteksi dari perangkat Anda: ${loc.formatted}`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengakses GPS perangkat.';
      setGpsMessage({ text: msg, type: 'error' });
    } finally {
      setIsLocatingGps(false);
    }
  };

  const handleEstimateLocation = () => {
    const estimated = getEstimatedRegionCoordinate(formData.bpn, formData.ultg, formData.kecamatan);
    if (estimated) {
      setFormData((prev) => ({ ...prev, koordinat: estimated.formatted }));
      setGpsMessage({
        text: `Koordinat diisi estimasi titik area ${estimated.label}: ${estimated.formatted}`,
        type: 'info',
      });
    }
  };

  const handleCoordinateChange = (val: string) => {
    const parsed = parseCoordinateInput(val);
    if (parsed && (val.includes('http') || val.includes('maps') || val.includes('°'))) {
      setFormData((prev) => ({ ...prev, koordinat: parsed.formatted }));
      setGpsMessage({
        text: `Tautan/format berhasil dikonversi ke koordinat: ${parsed.formatted}`,
        type: 'success',
      });
    } else {
      setFormData((prev) => ({ ...prev, koordinat: val }));
      setGpsMessage(null);
    }
  };

  const handleNoSertifikatChange = (val: string) => {
    const upper = val.toUpperCase();
    const certTrimmed = upper.trim();
    const hasCert = certTrimmed !== '' && certTrimmed !== '-' && certTrimmed !== '0' && !certTrimmed.startsWith('BELUM');

    setFormData((prev) => {
      let updatedDocName = prev.dokumenSertifikatNama;
      if (prev.dokumenSertifikat && upper) {
        updatedDocName = formatCertificateFileName(upper, prev.dokumenSertifikatNama || 'Sertifikat.pdf', {
          asetProperti: prev.asetProperti,
          asetLapangan: prev.asetLapangan,
          desa: prev.desa,
        });
      }

      if (hasCert && prev.tahapan < 17) {
        return {
          ...prev,
          noSertifikat: upper,
          dokumenSertifikatNama: updatedDocName,
          tahapan: 17,
          sps1Paid: true,
          sps2Paid: true,
          sps3Paid: true,
          tanggalTerbit: prev.tanggalTerbit && prev.tanggalTerbit !== '-' ? prev.tanggalTerbit : '18/09/2024',
        };
      }
      return {
        ...prev,
        noSertifikat: upper,
        dokumenSertifikatNama: updatedDocName,
      };
    });
  };

  const handleTahapanChange = (newTahapan: number) => {
    setFormData((prev) => {
      const isTerbit = newTahapan >= 17;
      return {
        ...prev,
        tahapan: newTahapan,
        sps1Paid: newTahapan >= 5 ? true : prev.sps1Paid,
        sps2Paid: newTahapan >= 9 ? true : prev.sps2Paid,
        sps3Paid: newTahapan >= 14 ? true : prev.sps3Paid,
        tanggalTerbit: isTerbit ? (prev.tanggalTerbit && prev.tanggalTerbit !== '-' ? prev.tanggalTerbit : '18/09/2024') : prev.tanggalTerbit,
        noSertifikat: isTerbit ? (prev.noSertifikat && prev.noSertifikat !== '-' ? prev.noSertifikat : `HP No. 00${Math.floor(100 + Math.random() * 899)}/2024`) : prev.noSertifikat,
      };
    });
  };

  // Auto-upload attached file to Google Drive
  const handleProcessAndUploadFile = async (file: File) => {
    setDriveUploadStatus(null);

    // Limit 35MB
    if (file.size > 35 * 1024 * 1024) {
      setDriveUploadStatus({
        type: 'error',
        text: 'Ukuran berkas melebihi batas maksimum 35 MB',
      });
      return;
    }

    try {
      // 1. Read local data URL immediately so the user gets instant visual confirmation
      const dataUrl = await fileToDataUrl(file);
      const formattedName = formatCertificateFileName(formData.noSertifikat, file.name, {
        asetProperti: formData.asetProperti,
        asetLapangan: formData.asetLapangan,
        desa: formData.desa,
      });

      setFormData((prev) => ({
        ...prev,
        dokumenSertifikat: dataUrl,
        dokumenSertifikatNama: formattedName,
        dokumenSertifikatType: file.type || 'application/pdf',
        dokumenSertifikatUkuran: file.size,
      }));

      // 2. Automated upload to Google Drive
      setIsUploadingDrive(true);
      let token = googleAccessToken || getDriveAccessToken();

      if (!token) {
        setDriveUploadStatus({
          type: 'loading',
          text: 'Menghubungkan akun Google Drive untuk pengunggahan otomatis...',
        });
        try {
          const authResult = await signInWithGoogleDrive();
          token = authResult.accessToken;
          setDriveAccessToken(token);
          if (onGoogleAuthSuccess) {
            onGoogleAuthSuccess(authResult.user, authResult.accessToken);
          }
        } catch (authErr: any) {
          if (authErr?.code === 'auth/popup-closed-by-user') {
            console.info('Google Drive sign-in popup closed by user.');
          } else {
            console.warn('Google Drive sign-in cancelled or failed:', authErr);
          }
          setIsUploadingDrive(false);
          setDriveUploadStatus({
            type: 'warning',
            text: 'Google Drive belum terhubung. Berkas tetap tersimpan aman di aplikasi.',
          });
          return;
        }
      }

      if (!token) {
        setIsUploadingDrive(false);
        setDriveUploadStatus({
          type: 'warning',
          text: 'Token Google Drive tidak tersedia. Berkas tersimpan lokal di aplikasi.',
        });
        return;
      }

      setDriveUploadStatus({
        type: 'loading',
        text: `Mengunggah "${formattedName}" ke Google Drive (${CERTIFICATE_FOLDER_NAME})...`,
      });

      const driveResult = await uploadCertificateToDrive(token, file, {
        noSertifikat: formData.noSertifikat,
        asetProperti: formData.asetProperti,
        asetLapangan: formData.asetLapangan,
        persil: formData.persil,
        desa: formData.desa,
        bpn: formData.bpn,
      });

      setFormData((prev) => ({
        ...prev,
        dokumenSertifikat: driveResult.previewUrl,
        dokumenSertifikatNama: driveResult.fileName,
        dokumenSertifikatType: driveResult.fileType,
        dokumenSertifikatUkuran: driveResult.fileSize,
      }));

      setDriveUploadStatus({
        type: 'success',
        text: `✓ Berkas "${driveResult.fileName}" BERHASIL otomatis diunggah ke Google Drive (${googleUser?.email || TARGET_DRIVE_ACCOUNT})!`,
        link: driveResult.webViewLink,
      });
    } catch (err: any) {
      console.error('Failed to upload file to Google Drive:', err);
      setDriveUploadStatus({
        type: 'error',
        text: `Gagal mengunggah ke Google Drive: ${err?.message || 'Koneksi terputus'}. Berkas tetap tersimpan lokal.`,
      });
    } finally {
      setIsUploadingDrive(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleProcessAndUploadFile(file);
  };

  // Upload currently attached local file to Google Drive
  const handleUploadCurrentDocToDrive = async () => {
    if (!formData.dokumenSertifikat || isGoogleDriveUrl(formData.dokumenSertifikat)) return;
    try {
      setIsUploadingDrive(true);
      setDriveUploadStatus({
        type: 'loading',
        text: 'Menyiapkan berkas untuk diunggah ke Google Drive...',
      });

      let token = googleAccessToken || getDriveAccessToken();
      if (!token) {
        setDriveUploadStatus({
          type: 'loading',
          text: 'Menghubungkan akun Google Drive...',
        });
        const authResult = await signInWithGoogleDrive();
        token = authResult.accessToken;
        setDriveAccessToken(token);
        if (onGoogleAuthSuccess) {
          onGoogleAuthSuccess(authResult.user, authResult.accessToken);
        }
      }

      if (!token) {
        setIsUploadingDrive(false);
        setDriveUploadStatus({
          type: 'warning',
          text: 'Otorisasi Google Drive dibatalkan.',
        });
        return;
      }

      const formattedName = formatCertificateFileName(formData.noSertifikat, formData.dokumenSertifikatNama || 'Sertifikat.pdf', {
        asetProperti: formData.asetProperti,
        asetLapangan: formData.asetLapangan,
        desa: formData.desa,
      });

      let fileToUpload: File;
      if (formData.dokumenSertifikat.startsWith('data:')) {
        fileToUpload = dataUrlToFile(formData.dokumenSertifikat, formattedName);
      } else {
        const res = await fetch(formData.dokumenSertifikat);
        const blob = await res.blob();
        fileToUpload = new File([blob], formattedName, { type: blob.type || formData.dokumenSertifikatType || 'application/pdf' });
      }

      setDriveUploadStatus({
        type: 'loading',
        text: `Mengunggah "${formattedName}" ke Google Drive (${CERTIFICATE_FOLDER_NAME})...`,
      });

      const driveResult = await uploadCertificateToDrive(token, fileToUpload, {
        noSertifikat: formData.noSertifikat,
        asetProperti: formData.asetProperti,
        asetLapangan: formData.asetLapangan,
        persil: formData.persil,
        desa: formData.desa,
        bpn: formData.bpn,
      });

      setFormData((prev) => ({
        ...prev,
        dokumenSertifikat: driveResult.previewUrl,
        dokumenSertifikatNama: driveResult.fileName,
        dokumenSertifikatType: driveResult.fileType,
        dokumenSertifikatUkuran: driveResult.fileSize,
      }));

      setDriveUploadStatus({
        type: 'success',
        text: `✓ Berkas "${driveResult.fileName}" BERHASIL diunggah ke Google Drive!`,
        link: driveResult.webViewLink,
      });
    } catch (err: any) {
      console.error('Failed to upload current doc to Drive:', err);
      setDriveUploadStatus({
        type: 'error',
        text: `Gagal upload ke Drive: ${err?.message || 'Error koneksi'}.`,
      });
    } finally {
      setIsUploadingDrive(false);
    }
  };

  const handleRemoveDokumen = () => {
    setFormData((prev) => ({
      ...prev,
      dokumenSertifikat: '',
      dokumenSertifikatNama: '',
      dokumenSertifikatType: '',
      dokumenSertifikatUkuran: 0,
    }));
    setDriveUploadStatus(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const certTrimmed = formData.noSertifikat.trim().toUpperCase();
    const hasCert = certTrimmed !== '' && certTrimmed !== '-' && certTrimmed !== '0' && !certTrimmed.startsWith('BELUM');
    const finalTahapan = hasCert ? (formData.tahapan >= 17 ? formData.tahapan : 17) : formData.tahapan;
    const isTerbit = finalTahapan >= 17;

    const nowId = `AST-MDN-${Date.now().toString().slice(-4)}`;
    const chosenKategori = (formData.kategori || 'TOWER') as CategoryType;
    const chosenAlasHak = (formData.alasHak || 'SPH') as AlasHakType;
    const chosenUltg = (formData.ultg || 'ULTG MADIUN').toUpperCase().trim();

    const numLuas = Number(formData.luas) || 0;
    const propertiVal = (formData.asetProperti || formData.asetLapangan || '').toUpperCase().trim() || `TAPAK TOWER ${formData.desa || 'PLN'}`;
    const cbmVal = (formData.asetCbm || '-').toUpperCase().trim();

    const totalPnbp =
      (formData.sps1Paid || isTerbit ? Number(formData.sps1Amount) : 0) +
      (formData.sps2Paid || isTerbit ? Number(formData.sps2Amount) : 0) +
      (formData.sps3Paid || isTerbit ? Number(formData.sps3Amount) : 0);

    const rawTglTerbit = formData.tanggalTerbit.trim();
    const finalTglTerbit = rawTglTerbit || (isTerbit ? '18/09/2024' : '-');
    const rawTglAkhir = formData.tanggalAkhir.trim();
    const finalTglAkhir = rawTglAkhir || (isTerbit ? finalTglTerbit : '31/12/2025');

    // Derive year
    let derivedYear = formData.tahun ? Number(formData.tahun) : 0;
    if (!derivedYear && finalTglTerbit && finalTglTerbit !== '-' && finalTglTerbit.includes('/')) {
      const parts = finalTglTerbit.split('/');
      const y = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(y) && y > 1900) derivedYear = y;
    }
    if (!derivedYear) derivedYear = new Date().getFullYear();

    const newItem: AssetItem = {
      id: nowId,
      alasHak: chosenAlasHak,
      tahapan: finalTahapan,
      statusDisplay: isTerbit ? 'TERBIT' : `TAHAP ${finalTahapan}`,
      upt: (formData.upt || 'UPT MADIUN').toUpperCase().trim(),
      ultg: chosenUltg,
      penghantar: (formData.penghantar || '-').toUpperCase().trim(),
      asetProperti: propertiVal,
      asetLapangan: propertiVal,
      asetCbm: cbmVal,
      desa: (formData.desa || '-').toUpperCase().trim(),
      kecamatan: (formData.kecamatan || '-').toUpperCase().trim(),
      bpn: (formData.bpn || 'BPN KABUPATEN MADIUN').toUpperCase().trim(),
      luas: numLuas,
      persil: (formData.persil || '').toUpperCase().trim(),
      noSertifikat: (formData.noSertifikat || (isTerbit ? `HP NO. 00${Math.floor(100 + Math.random() * 800)}/2024` : '-')).toUpperCase().trim(),
      asset: (formData.asset || '-').toUpperCase().trim(),
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
      tanggalTerbit: finalTglTerbit,
      tanggalAkhir: finalTglAkhir,
      kategori: chosenKategori,
      tahun: derivedYear,
      kendala: (formData.kendala.trim() ? formData.kendala.trim() : 'LANCAR TANPA KENDALA').toUpperCase(),
      catatan: formData.catatan ? formData.catatan.toUpperCase().trim() : '',
      koordinat: formData.koordinat.trim() || '',
      pic: (formData.pic.trim() || (picOfficers[0]?.nama ? `${picOfficers[0].nama} (${picOfficers[0].unit})` : 'TIM POKJA SERTIFIKASI UPT')).toUpperCase().trim(),
      dokumenSertifikat: formData.dokumenSertifikat || undefined,
      dokumenSertifikatNama: formData.dokumenSertifikatNama || undefined,
      dokumenSertifikatType: formData.dokumenSertifikatType || undefined,
      dokumenSertifikatUkuran: formData.dokumenSertifikatUkuran || undefined,
    };

    onAddAsset(newItem);
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
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700/80 rounded-xl border border-emerald-400/40 text-white shadow-xs">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Tambah Data Persil / Aset Baru
                </h2>
                <span className="bg-emerald-400 text-slate-950 text-[11px] font-mono font-bold px-2 py-0.5 rounded shadow-xs">
                  ASET BARU
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Input manual rincian teknis, tahapan BPN, sertipikat, pembayaran SPS PNBP, dan berkas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* Top Status & Summary Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Status Sertifikasi:</span>
              <span
                className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${
                  formData.tahapan >= 17
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {formData.tahapan >= 17 ? 'SERTIFIKAT TERBIT' : `TAHAP ${formData.tahapan} DI BPN`}
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
              <span className="text-[11px] text-slate-500 font-sans">Estimasi Total PNBP:</span>
              <strong className="text-emerald-700">{formatRp(calculatedTotalPnbp)}</strong>
            </div>
          </div>

          {/* Section 1: Wilayah Operasi & Identifikasi Transmisi */}
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
                  placeholder="Contoh: BPN KABUPATEN MADIUN"
                  required
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-slate-600 font-semibold mb-1">Penghantar / Jalur Transmisi *</label>
                <input
                  type="text"
                  value={formData.penghantar}
                  onChange={(e) => setFormData({ ...formData, penghantar: e.target.value.toUpperCase() })}
                  className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="SUTT 150 KV MANISREJO - NGANJUK"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Aset Properti (Identitas Lapangan) *</label>
                <input
                  type="text"
                  value={formData.asetProperti}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      asetProperti: e.target.value.toUpperCase(),
                      asetLapangan: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
                  placeholder="TAPAK TOWER T.101"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Aset CBM (Opsional)</label>
                <input
                  type="text"
                  value={formData.asetCbm}
                  onChange={(e) => setFormData({ ...formData, asetCbm: e.target.value.toUpperCase() })}
                  className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  placeholder="CBM-01 ATAU -"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Desa / Kelurahan *</label>
                <input
                  type="text"
                  value={formData.desa}
                  onChange={(e) => setFormData({ ...formData, desa: e.target.value.toUpperCase() })}
                  className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="DESA SUKOMORO"
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
                  placeholder="KECAMATAN SUKOMORO"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-600 font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Koordinat GPS (Latitude, Longitude)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleGetGpsLocation}
                      disabled={isLocatingGps}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded transition-colors disabled:opacity-50 cursor-pointer"
                      title="Deteksi lokasi koordinat perangkat saat ini"
                    >
                      <Locate className={`w-3 h-3 ${isLocatingGps ? 'animate-spin' : ''}`} />
                      {isLocatingGps ? 'Mencari...' : 'Deteksi GPS'}
                    </button>
                    <button
                      type="button"
                      onClick={handleEstimateLocation}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2 py-0.5 rounded transition-colors cursor-pointer"
                      title="Isi otomatis dengan perkiraan titik koordinat wilayah"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Estimasi Area
                    </button>
                    {formData.koordinat && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.koordinat)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 text-[11px] text-blue-600 hover:text-blue-800 hover:underline ml-1"
                        title="Buka titik koordinat di Google Maps"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Peta
                      </a>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={formData.koordinat}
                    onChange={(e) => handleCoordinateChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-xs"
                    placeholder="-7.6298, 111.5239 (atau tempel tautan Google Maps)"
                  />
                </div>

                {gpsMessage && (
                  <div
                    className={`mt-1.5 p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                      gpsMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : gpsMessage.type === 'error'
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {gpsMessage.type === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    ) : gpsMessage.type === 'error' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                    ) : (
                      <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    )}
                    <span>{gpsMessage.text}</span>
                  </div>
                )}
                <p className="text-[10px] text-slate-500 mt-1">
                  * Format: Latitude, Longitude (contoh: <span className="font-mono font-bold">-7.6298, 111.5239</span>). Tautan Google Maps dapat ditempel langsung.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Status Alas Hak & Tahapan Pensertipikatan BPN */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <Shield className="w-4 h-4 text-emerald-700" />
              2. Status Alas Hak, Tahapan BPN & Data Legalitas
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Alas Hak Awal *</label>
                <select
                  value={formData.alasHak}
                  onChange={(e) => setFormData({ ...formData, alasHak: e.target.value as AlasHakType })}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                >
                  <option value="SPH">SPH (Surat Pernyataan Pelepasan Hak)</option>
                  <option value="Tanpa SPH">Tanpa SPH (Sporadik / SK BPN)</option>
                  <option value="">-- Belum Ada --</option>
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
                  <option value={17}>★ SERTIFIKAT TERBIT</option>
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
                  onChange={(e) => setFormData({ ...formData, luas: e.target.value })}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-600 font-semibold">Nomer Sertifikat</label>
                  <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Otomatis Terbit jika terisi
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.noSertifikat}
                  onChange={(e) => handleNoSertifikatChange(e.target.value)}
                  className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  placeholder="HP NO. 00124/2024 ATAU -"
                />
              </div>

              {/* Lampiran Dokumen Sertifikat */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-700 font-semibold flex items-center gap-1.5 text-xs">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                    Lampiran Berkas Sertifikat Tanah (Scan PDF / Gambar)
                  </label>
                  <div className="flex items-center gap-1.5">
                    {googleUser ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200" title={`Akun: ${googleUser.email}`}>
                        <Cloud className="w-3 h-3 text-emerald-600" />
                        Drive Terhubung
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        <Cloud className="w-3 h-3 text-slate-400" />
                        Otomatis Upload ke Google Drive
                      </span>
                    )}
                  </div>
                </div>

                {/* Status / Loading Banner */}
                {isUploadingDrive && (
                  <div className="mb-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-2 animate-pulse">
                    <Loader2 className="w-4 h-4 text-emerald-600 animate-spin flex-shrink-0" />
                    <span className="font-medium">
                      {driveUploadStatus?.text || `Sedang mengunggah berkas ke folder Google Drive (${CERTIFICATE_FOLDER_NAME})...`}
                    </span>
                  </div>
                )}

                {driveUploadStatus && !isUploadingDrive && (
                  <div
                    className={`mb-2 p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 ${
                      driveUploadStatus.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : driveUploadStatus.type === 'warning'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {driveUploadStatus.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      )}
                      <span className="truncate">{driveUploadStatus.text}</span>
                    </div>
                    {driveUploadStatus.link && (
                      <a
                        href={driveUploadStatus.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline flex-shrink-0"
                      >
                        Buka di Drive <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50 hover:bg-slate-100/60 transition-colors">
                  {formData.dokumenSertifikat ? (
                    <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-xs truncate" title={formData.dokumenSertifikatNama}>
                            {formData.dokumenSertifikatNama || 'Dokumen_Sertifikat.pdf'}
                          </p>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
                            {formData.dokumenSertifikatUkuran ? (
                              <span>{formatFileSize(formData.dokumenSertifikatUkuran)}</span>
                            ) : null}
                            {isGoogleDriveUrl(formData.dokumenSertifikat) ? (
                              <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <Cloud className="w-2.5 h-2.5 text-emerald-600" /> Tersimpan di Google Drive
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                Tersimpan Lokal
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!isGoogleDriveUrl(formData.dokumenSertifikat) && (
                          <button
                            type="button"
                            onClick={handleUploadCurrentDocToDrive}
                            disabled={isUploadingDrive}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            title="Unggah berkas lokal ini langsung ke Google Drive"
                          >
                            <CloudUpload className="w-3.5 h-3.5" />
                            Unggah ke Drive
                          </button>
                        )}
                        <a
                          href={getDrivePreviewUrl(formData.dokumenSertifikat)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-700 transition-colors"
                          title="Lihat dokumen"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={handleRemoveDokumen}
                          className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                          title="Hapus berkas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <Upload className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Pilih berkas dari komputer (langsung terunggah ke Google Drive) atau tautkan link:</span>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="btn-add-upload-doc"
                          disabled={isUploadingDrive}
                        />
                        <label
                          htmlFor="btn-add-upload-doc"
                          className={`inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg py-1.5 px-3 text-xs shadow-2xs cursor-pointer transition-colors ${
                            isUploadingDrive ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <CloudUpload className="w-3.5 h-3.5" />
                          Pilih Berkas & Unggah ke Drive
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const link = window.prompt(`Masukkan tautan Google Drive / Cloud berkas sertifikat (${TARGET_DRIVE_ACCOUNT}):`);
                            if (link && link.trim()) {
                              const cleanLink = link.trim();
                              const formatted = isGoogleDriveUrl(cleanLink)
                                ? getDrivePreviewUrl(cleanLink)
                                : cleanLink;
                              const formattedName = formatCertificateFileName(formData.noSertifikat, 'Sertifikat.pdf', {
                                asetProperti: formData.asetProperti,
                                asetLapangan: formData.asetLapangan,
                                desa: formData.desa,
                              });
                              setFormData((prev) => ({
                                ...prev,
                                dokumenSertifikat: formatted,
                                dokumenSertifikatNama: formattedName,
                                dokumenSertifikatType: isGoogleDriveUrl(cleanLink) ? 'application/pdf' : 'text/html',
                                dokumenSertifikatUkuran: 0,
                              }));
                              setDriveUploadStatus({
                                type: 'success',
                                text: 'Tautan Google Drive berhasil ditautkan ke sertifikat.',
                                link: cleanLink,
                              });
                            }
                          }}
                          className="inline-flex items-center justify-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg py-1.5 px-2.5 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          title="Tautkan link Google Drive manual"
                        >
                          <LinkIcon className="w-3 h-3 text-slate-500" />
                          Link Drive
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Asset ID (SAP ERP PLN)</label>
                <input
                  type="text"
                  value={formData.asset}
                  onChange={(e) => setFormData({ ...formData, asset: e.target.value.toUpperCase() })}
                  className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  placeholder="300189201"
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
                <label className="block text-slate-600 font-semibold mb-1">Tgl Akhir / Target Penyelesaian</label>
                <input
                  type="text"
                  value={formData.tanggalAkhir}
                  onChange={(e) => setFormData({ ...formData, tanggalAkhir: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 border-slate-300 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="DD/MM/YYYY (contoh: 31/12/2025)"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tahun Anggaran / Pendaftaran</label>
                <input
                  type="number"
                  value={formData.tahun || ''}
                  onChange={(e) => setFormData({ ...formData, tahun: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Contoh: 2024"
                  min={2000}
                  max={2099}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Dokumen SPS 1 - 3 */}
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
                      className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
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
                      className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
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
                      className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
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

          {/* Section 4: Kendala Lapangan, Petugas PIC & Catatan Mitigasi */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <AlertCircle className="w-4 h-4 text-emerald-700" />
              4. Kendala Lapangan, Petugas PIC & Catatan Mitigasi
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
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 cursor-pointer transition-colors"
                    >
                      + {sample}
                    </button>
                  ))}
                </div>
              </div>

              <div>
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
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
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

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Catatan Tambahan & Mitigasi Teknis</label>
                <textarea
                  rows={2}
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value.toUpperCase() })}
                  className="w-full uppercase border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Tuliskan catatan tindak lanjut, target khusus, atau kendala teknis lapangan..."
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="bg-slate-50 border-t border-slate-200 -mx-6 -mb-6 p-4 flex items-center justify-end gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploadingDrive}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-lg transition-colors cursor-pointer text-xs disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isUploadingDrive}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploadingDrive ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengunggah ke Drive...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan Aset Baru
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
