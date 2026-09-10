import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
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
  Paperclip,
  FileText,
  Upload,
  Link as LinkIcon,
  Trash2,
  Locate,
  Navigation,
  ExternalLink,
  Sparkles,
  Info,
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

interface EditAssetModalProps {
  isOpen: boolean;
  asset: AssetItem | null;
  onClose: () => void;
  onSaveAsset: (updatedAsset: AssetItem) => void;
  picOfficers?: PicOfficer[];
  googleUser?: User | null;
  googleAccessToken?: string | null;
  onGoogleAuthSuccess?: (user: User, token: string) => void;
}

export const EditAssetModal: React.FC<EditAssetModalProps> = ({
  isOpen,
  asset,
  onClose,
  onSaveAsset,
  picOfficers = [],
  googleUser,
  googleAccessToken,
  onGoogleAuthSuccess,
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
    dokumenSertifikat: '',
    dokumenSertifikatNama: '',
    dokumenSertifikatType: '',
    dokumenSertifikatUkuran: 0,
    asset: '',
    nib: '',
    kategori: 'TOWER' as CategoryType,
    tahun: '' as any,
    tanggalTerbit: '',
    tanggalAkhir: '',
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

  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [driveUploadStatus, setDriveUploadStatus] = useState<{
    type: 'loading' | 'success' | 'warning' | 'error';
    text: string;
    link?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Synchronize state when selected asset changes
  useEffect(() => {
    if (asset) {
      setIsLocatingGps(false);
      setGpsMessage(null);
      const rawAssetTerbit = asset.tanggalTerbit || '';
      const hasTglTerbit = Boolean(
        rawAssetTerbit &&
        rawAssetTerbit !== '-' &&
        rawAssetTerbit.trim() !== '' &&
        rawAssetTerbit.toLowerCase() !== 'null'
      );

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
        dokumenSertifikat: asset.dokumenSertifikat || '',
        dokumenSertifikatNama: asset.dokumenSertifikatNama || '',
        dokumenSertifikatType: asset.dokumenSertifikatType || '',
        dokumenSertifikatUkuran: asset.dokumenSertifikatUkuran || 0,
        asset: asset.asset || '',
        nib: asset.nib || '',
        kategori: asset.kategori || 'SUTT 150 kV',
        tahun: asset.tahun ? asset.tahun : ('' as any),
        tanggalTerbit: rawAssetTerbit,
        tanggalAkhir: hasTglTerbit ? (asset.tanggalAkhir && asset.tanggalAkhir !== '-' ? asset.tanggalAkhir : '') : '',
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
      setIsUploadingDrive(false);
      setDriveUploadStatus(null);
    }
  }, [asset]);

  if (!isOpen || !asset) return null;

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
      // 1. Read local data URL immediately so user gets instant confirmation
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

  const handleNoSertifikatChange = (val: string) => {
    const upper = val.toUpperCase();
    const clean = upper.trim();
    const isFilled = clean !== '' && clean !== '-' && clean !== '0' && !clean.startsWith('BELUM');
    setFormData((prev) => {
      const updatedDocName = prev.dokumenSertifikat
        ? formatCertificateFileName(upper, prev.dokumenSertifikatNama, {
            asetProperti: prev.asetProperti,
            asetLapangan: prev.asetLapangan,
            desa: prev.desa,
          })
        : prev.dokumenSertifikatNama;

      if (isFilled && prev.tahapan < 17) {
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
        sps1Paid: newTahapan >= 5,
        sps2Paid: newTahapan >= 9,
        sps3Paid: newTahapan >= 14,
        tanggalTerbit: isTerbit ? (prev.tanggalTerbit && prev.tanggalTerbit !== '-' ? prev.tanggalTerbit : '18/09/2024') : '-',
        tanggalAkhir: isTerbit ? prev.tanggalAkhir : '',
        noSertifikat: isTerbit ? (prev.noSertifikat && prev.noSertifikat !== '-' ? prev.noSertifikat : `HP No. 00${Math.floor(100 + Math.random() * 899)}/2024`) : '-',
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const certTrimmed = formData.noSertifikat.trim().toUpperCase();
    const hasCert = certTrimmed !== '' && certTrimmed !== '-' && certTrimmed !== '0' && !certTrimmed.startsWith('BELUM');
    const finalTahapan = hasCert ? (formData.tahapan >= 17 ? formData.tahapan : 17) : formData.tahapan;
    const isTerbit = finalTahapan >= 17;
    const statusDisplay = isTerbit ? 'TERBIT' : `TAHAP ${finalTahapan}`;

    const totalPnbp =
      (formData.sps1Paid || isTerbit ? Number(formData.sps1Amount) : 0) +
      (formData.sps2Paid || isTerbit ? Number(formData.sps2Amount) : 0) +
      (formData.sps3Paid || isTerbit ? Number(formData.sps3Amount) : 0);

    const propertiVal = (formData.asetProperti || formData.asetLapangan || '').toUpperCase().trim();
    const cbmVal = (formData.asetCbm || '-').toUpperCase().trim();

    const updatedItem: AssetItem = {
      ...asset,
      id: formData.id,
      alasHak: formData.alasHak || '',
      tahapan: finalTahapan,
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
      tanggalTerbit: (() => {
        const tgl = isTerbit
          ? (formData.tanggalTerbit && formData.tanggalTerbit !== '-' ? formData.tanggalTerbit.trim() : '18/09/2024')
          : (formData.tanggalTerbit.trim() || '-');
        return tgl;
      })(),
      tanggalAkhir: (() => {
        if (formData.tanggalAkhir && formData.tanggalAkhir.trim()) {
          return formData.tanggalAkhir.trim();
        }
        return isTerbit ? (formData.tanggalTerbit.trim() || '18/09/2024') : '31/12/2025';
      })(),
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
      dokumenSertifikat: formData.dokumenSertifikat || undefined,
      dokumenSertifikatNama: formData.dokumenSertifikatNama || undefined,
      dokumenSertifikatType: formData.dokumenSertifikatType || undefined,
      dokumenSertifikatUkuran: formData.dokumenSertifikatUkuran || undefined,
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

                <div className="sm:col-span-2 lg:col-span-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Koordinat GPS (Latitude, Longitude)</span>
                    </label>
                    {formData.koordinat && formData.koordinat.trim() !== '' && (
                      <a
                        href={`https://www.google.com/maps?q=${encodeURIComponent(formData.koordinat.replace(/\s+/g, ''))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                        title="Buka titik koordinat di Google Maps"
                      >
                        <span>Uji di Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <input
                    type="text"
                    value={formData.koordinat}
                    onChange={(e) => handleCoordinateChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-xs shadow-2xs"
                    placeholder="Contoh: -7.625000, 111.530000 atau tempel tautan Google Maps"
                  />

                  {/* Quick Action Buttons */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleGetGpsLocation}
                      disabled={isLocatingGps}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg transition-colors shadow-2xs cursor-pointer"
                      title="Gunakan sensor GPS perangkat untuk mengambil koordinat saat ini"
                    >
                      <Locate className={`w-3.5 h-3.5 ${isLocatingGps ? 'animate-spin' : ''}`} />
                      <span>{isLocatingGps ? 'Mendeteksi Lokasi...' : 'Deteksi GPS Sekarang'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleEstimateLocation}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
                      title="Isi otomatis koordinat perkiraan sesuai Kantah BPN atau ULTG"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Estimasi dari BPN / ULTG</span>
                    </button>

                    {formData.koordinat && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, koordinat: '' }));
                          setGpsMessage(null);
                        }}
                        className="px-2 py-1 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  {/* Status Message */}
                  {gpsMessage && (
                    <div
                      className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${
                        gpsMessage.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : gpsMessage.type === 'error'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-amber-50 text-amber-900 border border-amber-200'
                      }`}
                    >
                      {gpsMessage.type === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : gpsMessage.type === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      ) : (
                        <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                      <span>{gpsMessage.text}</span>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 mt-1.5 leading-tight">
                    * Titik koordinat menentukan posisi aset pada <strong>Peta Sebaran GIS</strong>. Anda juga dapat langsung menempelkan tautan dari Google Maps.
                  </p>
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

                  {/* Lampiran Dokumen Sertifikat */}
                  <div className="mt-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                        Lampiran Dokumen Sertifikat (Scan PDF / Gambar)
                      </span>
                      <div className="flex items-center gap-1.5">
                        {googleUser ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200" title={`Akun: ${googleUser.email}`}>
                            <Cloud className="w-3 h-3 text-emerald-600" />
                            Drive Terhubung
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
                            <Cloud className="w-3 h-3 text-slate-400" />
                            Otomatis Upload ke Google Drive
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status / Loading Banner */}
                    {isUploadingDrive && (
                      <div className="mb-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-2 animate-pulse">
                        <Loader2 className="w-4 h-4 text-emerald-600 animate-spin flex-shrink-0" />
                        <span className="font-medium">
                          {driveUploadStatus?.text || `Sedang mengunggah berkas ke Google Drive (${CERTIFICATE_FOLDER_NAME})...`}
                        </span>
                      </div>
                    )}

                    {driveUploadStatus && !isUploadingDrive && (
                      <div
                        className={`mb-2.5 p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 ${
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
                            title="Hapus lampiran"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                          <Upload className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>Pilih berkas baru (otomatis terunggah ke Google Drive):</span>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,image/png,image/jpeg,image/webp"
                            className="hidden"
                            id="btn-edit-upload-doc"
                            disabled={isUploadingDrive}
                            onChange={handleFileUpload}
                          />
                          <label
                            htmlFor="btn-edit-upload-doc"
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
                              const link = prompt(`Masukkan tautan Google Drive / Cloud Dokumen Sertifikat (${TARGET_DRIVE_ACCOUNT}):`);
                              if (link && link.trim()) {
                                const cleanLink = link.trim();
                                const formatted = isGoogleDriveUrl(cleanLink) ? getDrivePreviewUrl(cleanLink) : cleanLink;
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
                disabled={isUploadingDrive}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isUploadingDrive}
                className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isUploadingDrive ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengunggah ke Drive...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan Perubahan Data
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
