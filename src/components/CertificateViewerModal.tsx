import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Upload,
  Download,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Building2,
  MapPin,
  Calendar,
  Layers,
  Link as LinkIcon,
  Eye,
  ShieldCheck,
  RotateCw,
  RefreshCw,
  Maximize2,
  Sparkles,
  Cloud,
  Check,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AssetItem } from '../types';
import {
  saveCertificateDocument,
  getCertificateDocument,
  deleteCertificateDocument,
  formatFileSize,
} from '../services/certificateStorage';
import {
  TARGET_DRIVE_ACCOUNT,
  CERTIFICATE_FOLDER_NAME,
  uploadCertificateToDrive,
  getDrivePreviewUrl,
  isGoogleDriveUrl,
  extractDriveFileId,
  getDriveAccessToken,
  signInWithGoogleDrive,
  setDriveAccessToken,
} from '../services/googleDriveService';

interface CertificateViewerModalProps {
  isOpen: boolean;
  asset: AssetItem | null;
  onClose: () => void;
  onSaveAsset: (updatedAsset: AssetItem) => void;
  googleUser?: User | null;
  googleAccessToken?: string | null;
  onGoogleAuthSuccess?: (user: User, token: string) => void;
}

export const CertificateViewerModal: React.FC<CertificateViewerModalProps> = ({
  isOpen,
  asset,
  onClose,
  onSaveAsset,
  googleUser,
  googleAccessToken,
  onGoogleAuthSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'VIEW' | 'UPLOAD' | 'LINK'>('VIEW');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [docUrl, setDocUrl] = useState<string>('');
  const [docName, setDocName] = useState<string>('');
  const [docType, setDocType] = useState<string>('');
  const [docSize, setDocSize] = useState<number>(0);
  const [inputUrl, setInputUrl] = useState('');
  const [inputName, setInputName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState<number>(100);
  const [imageRotate, setImageRotate] = useState<number>(0);
  const [iframeKey, setIframeKey] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load document from asset or IndexedDB
  useEffect(() => {
    if (isOpen && asset) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setImageZoom(100);
      setImageRotate(0);
      setIsLoading(true);

      const loadDoc = async () => {
        // 1. Cek properti asset
        if (asset.dokumenSertifikat) {
          setDocUrl(asset.dokumenSertifikat);
          setDocName(
            asset.dokumenSertifikatNama ||
              `Sertifikat_${(asset.noSertifikat || 'PLN').replace(/[^a-zA-Z0-9]/g, '_')}`
          );
          setDocType(
            asset.dokumenSertifikatType ||
              (isGoogleDriveUrl(asset.dokumenSertifikat)
                ? 'application/pdf'
                : asset.dokumenSertifikat.startsWith('data:image')
                ? 'image/jpeg'
                : 'application/pdf')
          );
          setDocSize(asset.dokumenSertifikatUkuran || 0);
          setActiveTab('VIEW');
          setIsLoading(false);
          return;
        }

        // 2. Cek IndexedDB
        try {
          const stored = await getCertificateDocument(asset.id);
          if (stored && stored.dataUrl) {
            setDocUrl(stored.dataUrl);
            setDocName(stored.fileName);
            setDocType(stored.fileType);
            setDocSize(stored.fileSize);
            setActiveTab('VIEW');
          } else {
            setDocUrl('');
            setDocName('');
            setDocType('');
            setDocSize(0);
            setActiveTab('VIEW');
          }
        } catch (e) {
          console.error('Error loading certificate document:', e);
        } finally {
          setIsLoading(false);
        }
      };

      loadDoc();
    }
  }, [isOpen, asset]);

  if (!isOpen || !asset) return null;

  // Resolve token
  const effectiveToken = googleAccessToken || getDriveAccessToken();
  const isConnectedToDrive = Boolean(effectiveToken);

  const isGdrive = isGoogleDriveUrl(docUrl) || Boolean(extractDriveFileId(docUrl));
  const previewGdriveUrl = isGdrive ? getDrivePreviewUrl(docUrl) : '';
  const isPdf =
    !isGdrive &&
    (docType.includes('pdf') ||
      docUrl.toLowerCase().endsWith('.pdf') ||
      docUrl.startsWith('data:application/pdf'));
  const isImage =
    !isGdrive &&
    (docType.startsWith('image/') ||
      docUrl.startsWith('data:image/') ||
      /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(docUrl));
  const isWebUrl = !isGdrive && (docUrl.startsWith('http://') || docUrl.startsWith('https://'));

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFileUpload(e.dataTransfer.files[0], true);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFileUpload(e.target.files[0], true);
    }
  };

  /**
   * Process file upload directly to Google Drive (admumuptmadiun@gmail.com)
   */
  const processFileUpload = async (file: File, preferDrive: boolean = true) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Limit 35MB
    if (file.size > 35 * 1024 * 1024) {
      setErrorMsg('Ukuran berkas melebihi batas maksimum 35 MB');
      return;
    }

    try {
      setIsLoading(true);

      let token = effectiveToken;

      // If user wants to save to Google Drive but not authenticated yet
      if (preferDrive && !token) {
        setIsUploadingDrive(true);
        try {
          const authResult = await signInWithGoogleDrive();
          token = authResult.accessToken;
          setDriveAccessToken(token);
          if (onGoogleAuthSuccess) {
            onGoogleAuthSuccess(authResult.user, authResult.accessToken);
          }
        } catch (authErr: any) {
          console.warn('Google Drive sign in bypassed or failed:', authErr);
          // If popup cancelled, fallback to local storage
          setErrorMsg(
            `Koneksi Google Drive dibatalkan. Berkas akan disimpan secara lokal di peramban ini.`
          );
        }
      }

      // If token is available, upload directly to Google Drive
      if (token) {
        setIsUploadingDrive(true);
        const driveResult = await uploadCertificateToDrive(token, file, {
          noSertifikat: asset.noSertifikat,
          asetProperti: asset.asetProperti,
          asetLapangan: asset.asetLapangan,
          persil: asset.persil,
          desa: asset.desa,
          bpn: asset.bpn,
        });

        const updatedAsset: AssetItem = {
          ...asset,
          dokumenSertifikat: driveResult.previewUrl,
          dokumenSertifikatNama: driveResult.fileName,
          dokumenSertifikatType: driveResult.fileType,
          dokumenSertifikatUkuran: driveResult.fileSize,
        };

        // Also save in local indexedDB as redundant cache
        try {
          await saveCertificateDocument(asset.id, asset.noSertifikat, {
            name: driveResult.fileName,
            type: driveResult.fileType,
            size: driveResult.fileSize,
            dataUrl: driveResult.previewUrl,
          });
        } catch (e) {
          // ignore cache error
        }

        setDocUrl(driveResult.previewUrl);
        setDocName(driveResult.fileName);
        setDocType(driveResult.fileType);
        setDocSize(driveResult.fileSize);
        setIframeKey((prev) => prev + 1);

        onSaveAsset(updatedAsset);
        setSuccessMsg(
          `Dokumen "${driveResult.fileName}" berhasil disimpan di Google Drive (${TARGET_DRIVE_ACCOUNT}) dalam folder "${CERTIFICATE_FOLDER_NAME}" dan siap dipratinjau langsung!`
        );
        setActiveTab('VIEW');
        return;
      }

      // Fallback: Local IndexedDB
      const stored = await saveCertificateDocument(asset.id, asset.noSertifikat, file);
      setDocUrl(stored.dataUrl);
      setDocName(stored.fileName);
      setDocType(stored.fileType);
      setDocSize(stored.fileSize);

      const updatedAsset: AssetItem = {
        ...asset,
        dokumenSertifikat: stored.dataUrl,
        dokumenSertifikatNama: stored.fileName,
        dokumenSertifikatType: stored.fileType,
        dokumenSertifikatUkuran: stored.fileSize,
      };

      onSaveAsset(updatedAsset);
      setSuccessMsg(
        `Dokumen "${file.name}" berhasil disimpan secara lokal dan siap dipratinjau langsung.`
      );
      setActiveTab('VIEW');
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMsg(err.message || 'Gagal mengunggah dokumen sertifikat.');
    } finally {
      setIsLoading(false);
      setIsUploadingDrive(false);
    }
  };

  /**
   * Save manual URL (Google Drive link or web document)
   */
  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanUrl = inputUrl.trim();
    if (!cleanUrl) {
      setErrorMsg('Tautan dokumen tidak boleh kosong.');
      return;
    }

    const defaultName =
      inputName.trim() ||
      `Dokumen_Sertifikat_${(asset.noSertifikat || 'PLN').replace(/[^a-zA-Z0-9]/g, '_')}`;
    const fileType = isGoogleDriveUrl(cleanUrl)
      ? 'application/pdf'
      : cleanUrl.toLowerCase().includes('.pdf')
      ? 'application/pdf'
      : 'text/html';

    // If it's a Google Drive URL, automatically format preview URL
    const formattedUrl = isGoogleDriveUrl(cleanUrl) ? getDrivePreviewUrl(cleanUrl) : cleanUrl;

    try {
      setIsLoading(true);
      await saveCertificateDocument(asset.id, asset.noSertifikat, {
        name: defaultName,
        type: fileType,
        size: 0,
        dataUrl: formattedUrl,
      });

      setDocUrl(formattedUrl);
      setDocName(defaultName);
      setDocType(fileType);
      setDocSize(0);
      setIframeKey((prev) => prev + 1);

      const updatedAsset: AssetItem = {
        ...asset,
        dokumenSertifikat: formattedUrl,
        dokumenSertifikatNama: defaultName,
        dokumenSertifikatType: fileType,
        dokumenSertifikatUkuran: 0,
      };

      onSaveAsset(updatedAsset);
      setSuccessMsg(
        'Tautan dokumen Google Drive berhasil disimpan dan dapat dipratinjau langsung tanpa diunduh.'
      );
      setInputUrl('');
      setInputName('');
      setActiveTab('VIEW');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan tautan dokumen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (
      !confirm(
        'Apakah Anda yakin ingin menghapus lampiran berkas dokumen sertifikat ini dari aplikasi?'
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);
      await deleteCertificateDocument(asset.id);
      setDocUrl('');
      setDocName('');
      setDocType('');
      setDocSize(0);

      const updatedAsset: AssetItem = {
        ...asset,
        dokumenSertifikat: undefined,
        dokumenSertifikatNama: undefined,
        dokumenSertifikatType: undefined,
        dokumenSertifikatUkuran: undefined,
      };

      onSaveAsset(updatedAsset);
      setSuccessMsg('Lampiran berkas dokumen sertifikat berhasil dihapus.');
      setActiveTab('VIEW');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus dokumen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!docUrl) return;
    const cleanFileName =
      docName || `Sertifikat_${(asset.noSertifikat || 'PLN').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const a = document.createElement('a');
    a.href = docUrl;
    a.download = cleanFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const driveFileId = extractDriveFileId(docUrl);
  const openInDriveUrl = driveFileId
    ? `https://drive.google.com/file/d/${driveFileId}/view`
    : docUrl;

  return (
    <div
      id="certificate-viewer-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="certificate-viewer-modal-content"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-inner">
              <FileCheck className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30">
                  Pratinjau Dokumen Sertifikat
                </span>
                {docUrl ? (
                  isGdrive ? (
                    <span className="text-[10px] font-bold bg-emerald-400 text-emerald-950 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <Cloud className="w-3 h-3 text-emerald-900" /> Google Drive
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-teal-300 text-teal-950 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Berkas Terlampir
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-semibold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> E-Sertifikat Digital
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2 mt-0.5">
                <span>
                  {asset.noSertifikat && asset.noSertifikat !== '-'
                    ? asset.noSertifikat
                    : 'ASET BELUM BERSERTIFIKAT'}
                </span>
                <span className="text-xs sm:text-sm font-normal text-emerald-200">
                  ({asset.asetProperti || asset.asetLapangan})
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {docUrl && (
              <>
                {isGdrive ? (
                  <a
                    href={openInDriveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold border border-emerald-400/40 shadow-xs transition-colors"
                    title="Buka Dokumen di Tab Google Drive"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Buka di Google Drive</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                ) : isWebUrl ? (
                  <a
                    href={docUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold border border-white/20 transition-colors"
                    title="Buka Tautan Dokumen"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Tautan</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold border border-white/20 transition-colors"
                    title="Unduh Berkas Salinan"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              id="btn-close-cert-modal"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-4 text-slate-600">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-semibold text-slate-800">{asset.bpn}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                Desa {asset.desa}, Kec. {asset.kecamatan}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                Luas:{' '}
                <strong className="text-slate-800 font-mono">
                  {asset.luas.toLocaleString('id-ID')} m²
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                Tgl Terbit: <strong className="text-slate-800">{asset.tanggalTerbit || '-'}</strong>
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-lg">
            <button
              type="button"
              id="tab-btn-view"
              onClick={() => setActiveTab('VIEW')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'VIEW'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Pratinjau Dokumen</span>
            </button>
            <button
              type="button"
              id="tab-btn-upload"
              onClick={() => setActiveTab('UPLOAD')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'UPLOAD'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{docUrl ? 'Ganti / Unggah Berkas' : 'Unggah ke Google Drive'}</span>
            </button>
            <button
              type="button"
              id="tab-btn-link"
              onClick={() => setActiveTab('LINK')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'LINK'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Tautkan Link Drive</span>
            </button>
          </div>
        </div>

        {/* Success & Error Banners */}
        {successMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border-b border-red-200 px-5 py-2 text-xs text-red-900 flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-red-700 hover:text-red-900 font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="flex-1 overflow-hidden p-4 sm:p-5 flex flex-col bg-slate-100/70">
          {/* TAB 1: VIEW */}
          {activeTab === 'VIEW' && (
            <div className="h-full flex flex-col">
              {docUrl ? (
                <div className="h-full flex flex-col bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                  {/* Document Control Bar */}
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isGdrive ? (
                        <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-800">
                          <Cloud className="w-4 h-4" />
                        </div>
                      ) : (
                        <FileText className="w-5 h-5 text-emerald-700 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div
                          className="font-bold text-slate-800 text-xs sm:text-sm truncate flex items-center gap-1.5"
                          title={docName}
                        >
                          <span>{docName}</span>
                          {isGdrive && (
                            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-sans">
                              Google Drive ({TARGET_DRIVE_ACCOUNT})
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span>{docType.toUpperCase() || 'DOKUMEN SERTIFIKAT'}</span>
                          {docSize > 0 && <span>• {formatFileSize(docSize)}</span>}
                          <span>• Pratinjau Langsung (Tanpa Unduh)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isGdrive && (
                        <button
                          type="button"
                          onClick={() => setIframeKey((prev) => prev + 1)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                          title="Muat Ulang Pratinjau"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isImage && (
                        <>
                          <div className="flex items-center bg-slate-200/80 rounded-lg p-0.5 mr-1">
                            <button
                              type="button"
                              onClick={() => setImageZoom(Math.max(50, imageZoom - 25))}
                              className="px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-white rounded transition-colors"
                              title="Perkecil"
                            >
                              -
                            </button>
                            <span className="px-2 text-[10px] font-mono text-slate-600 font-semibold">
                              {imageZoom}%
                            </span>
                            <button
                              type="button"
                              onClick={() => setImageZoom(Math.min(250, imageZoom + 25))}
                              className="px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-white rounded transition-colors"
                              title="Perbesar"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setImageRotate((prev) => (prev + 90) % 360)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
                            title="Putar Gambar 90 Derajat"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => setActiveTab('UPLOAD')}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Ganti berkas ini dengan berkas baru"
                      >
                        <Upload className="w-3 h-3" />
                        <span className="hidden sm:inline">Ganti Berkas</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteDocument}
                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title="Hapus Dokumen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Viewer Container (Preview langsung tanpa harus download) */}
                  <div className="flex-1 bg-slate-900/5 p-2 overflow-hidden flex items-center justify-center min-h-[450px]">
                    {isGdrive ? (
                      /* Embed Google Drive Interactive Viewer */
                      <div className="w-full h-full flex flex-col relative rounded-lg overflow-hidden border border-slate-300 bg-white">
                        <iframe
                          key={iframeKey}
                          src={previewGdriveUrl}
                          title="Pratinjau Dokumen Sertifikat Google Drive"
                          className="w-full h-full flex-1 border-0"
                          allow="autoplay; fullscreen"
                          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
                        />
                        <div className="bg-slate-50 border-t border-slate-200 px-3 py-1.5 text-[11px] text-slate-600 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Cloud className="w-3.5 h-3.5 text-emerald-700" />
                            <span>
                              Pratinjau langsung Google Drive ({TARGET_DRIVE_ACCOUNT}). Folder:{' '}
                              <strong>{CERTIFICATE_FOLDER_NAME}</strong>
                            </span>
                          </div>
                          <a
                            href={openInDriveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 hover:underline"
                          >
                            <span>Buka di tab baru Google Drive</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ) : isPdf ? (
                      /* Direct PDF Viewer */
                      <iframe
                        src={`${docUrl}#toolbar=1&navpanes=0`}
                        title="Pratinjau Dokumen Sertifikat PDF"
                        className="w-full h-full min-h-[500px] rounded-lg border border-slate-300 bg-white"
                      />
                    ) : isImage ? (
                      /* Direct Image Viewer */
                      <div className="overflow-auto w-full h-full flex items-center justify-center p-4">
                        <img
                          src={docUrl}
                          alt="Pratinjau Sertifikat"
                          style={{
                            width: `${imageZoom}%`,
                            maxWidth: 'none',
                            transform: `rotate(${imageRotate}deg)`,
                          }}
                          className="rounded-lg shadow-md border border-slate-300 transition-all duration-150 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : isWebUrl ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-slate-200">
                        <div className="p-4 bg-emerald-50 rounded-full mb-4">
                          <ExternalLink className="w-10 h-10 text-emerald-700" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mb-1">
                          Tautan Dokumen Sertifikat
                        </h3>
                        <p className="text-xs text-slate-600 max-w-md mb-4 font-mono break-all">
                          {docUrl}
                        </p>
                        <div className="flex items-center gap-3">
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg font-semibold text-xs transition-colors shadow-xs"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>Buka di Peramban</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => setActiveTab('UPLOAD')}
                            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-semibold text-xs transition-colors"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Unggah Dokumen Asli ke Google Drive</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-8">
                        <p className="text-slate-600 text-sm">
                          Format berkas tidak dapat dipratinjau langsung.
                        </p>
                        <button
                          type="button"
                          onClick={handleDownload}
                          className="mt-3 inline-flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          <Download className="w-4 h-4" /> Unduh Berkas
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* When no attachment uploaded yet: Show Digital Certificate Representation & Upload prompt */
                <div className="flex flex-col lg:flex-row gap-5 h-full items-stretch overflow-y-auto">
                  {/* Digital Certificate Certificate Card */}
                  <div className="flex-1 bg-gradient-to-b from-amber-50/50 via-white to-amber-50/30 rounded-2xl p-6 border-2 border-dashed border-emerald-300 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
                      <ShieldCheck className="w-96 h-96 text-emerald-900" />
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-center justify-between border-b-2 border-emerald-700/30 pb-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-emerald-800 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-md">
                            PLN
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">
                              Kementerian ATR / Badan Pertanahan Nasional RI
                            </div>
                            <div className="text-sm font-black text-slate-900 uppercase">
                              Kantor Pertanahan {asset.bpn}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                            Surat Tanda Bukti Hak
                          </span>
                          <div className="text-xs font-mono font-bold text-slate-700 mt-0.5">
                            NIB: {asset.nib || '-'}
                          </div>
                        </div>
                      </div>

                      <div className="text-center my-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                          SERTIPIKAT TANAH
                        </h3>
                        <h1 className="text-xl sm:text-2xl font-black text-emerald-900 tracking-tight my-0.5">
                          HAK PAKAI
                        </h1>
                        <div className="inline-block bg-emerald-50 border border-emerald-300 text-emerald-900 font-mono font-extrabold text-sm sm:text-base px-3 py-1 rounded-lg shadow-2xs mt-1">
                          {asset.noSertifikat && asset.noSertifikat !== '-'
                            ? asset.noSertifikat
                            : 'BELUM TERBIT / DALAM PROSES'}
                        </div>
                      </div>

                      {/* Detail Grid */}
                      <div className="grid grid-cols-2 gap-3 text-xs bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-slate-200/80 my-3">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                            Pemegang Hak
                          </span>
                          <span className="font-bold text-slate-900">PT PLN (PERSERO)</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                            Unit Pengelola
                          </span>
                          <span className="font-bold text-slate-900">
                            {asset.upt} - {asset.ultg}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                            Nama Aset / Lapangan
                          </span>
                          <span className="font-bold text-emerald-800">
                            {asset.asetProperti || asset.asetLapangan}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                            Penghantar / Jalur
                          </span>
                          <span className="font-bold text-slate-800">{asset.penghantar}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                            Letak Tanah
                          </span>
                          <span className="font-semibold text-slate-800">
                            Desa {asset.desa}, Kec. {asset.kecamatan}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                            Luas Tanah
                          </span>
                          <span className="font-bold text-emerald-800 font-mono text-sm">
                            {asset.luas.toLocaleString('id-ID')} m²
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                            Tanggal Terbit
                          </span>
                          <span className="font-bold text-slate-800">
                            {asset.tanggalTerbit || '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                            Tahun Anggaran
                          </span>
                          <span className="font-bold text-slate-800">{asset.tahun || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Dokumen Terverifikasi Tim Sertifikasi PLN</span>
                      </div>
                      <span className="font-mono text-[10px]">ID: {asset.id}</span>
                    </div>
                  </div>

                  {/* Google Drive Upload Panel */}
                  <div className="w-full lg:w-[420px] bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700 border border-emerald-100 shadow-inner">
                          <Cloud className="w-6 h-6 text-emerald-700" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">
                            Simpan ke Google Drive
                          </h3>
                          <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{TARGET_DRIVE_ACCOUNT}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        Unggah scan berkas asli sertifikat tanah (PDF atau gambar). Berkas akan disimpan
                        langsung ke Google Drive <strong>{TARGET_DRIVE_ACCOUNT}</strong> dalam folder{' '}
                        <strong>{CERTIFICATE_FOLDER_NAME}</strong> dan langsung dapat dipratinjau tanpa
                        perlu diunduh.
                      </p>

                      {/* Dropzone */}
                      <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                          dragActive
                            ? 'border-emerald-600 bg-emerald-50 scale-[1.01]'
                            : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40'
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleFileInputChange}
                        />
                        <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                        <div className="text-xs font-bold text-slate-800">
                          Pilih atau Tarik Berkas Scan Sertifikat
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Simpan ke Google Drive ({TARGET_DRIVE_ACCOUNT})
                        </div>
                        <div className="text-[9px] text-slate-400 mt-2 font-mono">
                          Format: PDF, PNG, JPG (Maks. 35MB)
                        </div>
                      </div>

                      {isLoading && (
                        <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center text-xs text-emerald-800 font-semibold flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>
                            {isUploadingDrive
                              ? 'Menyimpan berkas ke Google Drive...'
                              : 'Memproses berkas...'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('UPLOAD')}
                        className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Unggah Dokumen Sertifikat Sekarang</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('LINK')}
                        className="w-full py-2 px-3 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>Atau Tautkan Link Dokumen Google Drive</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD (DEDICATED GOOGLE DRIVE STORAGE) */}
          {activeTab === 'UPLOAD' && (
            <div className="max-w-2xl mx-auto w-full bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-md flex flex-col my-auto">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-200 shadow-inner">
                  <Cloud className="w-7 h-7 text-emerald-700" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {docUrl
                    ? 'Ganti Berkas Dokumen Sertifikat'
                    : 'Unggah & Simpan ke Google Drive'}
                </h3>
                <div className="inline-flex items-center gap-1.5 mt-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-1 rounded-full font-semibold">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Akun: {TARGET_DRIVE_ACCOUNT}</span>
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-2">
                  Berkas scan sertifikat untuk nomor{' '}
                  <strong className="text-emerald-800">{asset.noSertifikat || '-'}</strong> akan
                  disimpan di Google Drive dan dapat langsung dipratinjau di aplikasi tanpa perlu
                  diunduh.
                </p>
              </div>

              {/* Status info box */}
              <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Folder Google Drive:</span>
                  <span className="font-bold text-emerald-800">{CERTIFICATE_FOLDER_NAME}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Izin Akses Dokumen:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Siapa saja dengan link
                    (Pratinjau Langsung)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Status Koneksi Drive:</span>
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      isConnectedToDrive ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {isConnectedToDrive ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Terhubung (
                        {googleUser?.email || TARGET_DRIVE_ACCOUNT})
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> Siap Dihubungkan
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Drag & Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-emerald-600 bg-emerald-50 scale-[1.01]'
                    : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="text-sm font-bold text-slate-800 mb-1">
                  Klik untuk Memilih Berkas PDF / Foto Scan
                </div>
                <div className="text-xs text-slate-500 mb-4">
                  atau tarik dan lepaskan berkas sertifikat disini
                </div>
                <span className="inline-block bg-slate-100 text-slate-600 text-[11px] font-mono px-3 py-1 rounded-full border border-slate-200">
                  Dukungan: PDF, PNG, JPG, JPEG (Maks. 35 MB)
                </span>
              </div>

              {isLoading && (
                <div className="mt-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-semibold animate-pulse flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>
                    {isUploadingDrive
                      ? `Sedang mengunggah dan menyimpan ke Google Drive (${TARGET_DRIVE_ACCOUNT})...`
                      : 'Sedang memproses dokumen sertifikat...'}
                  </span>
                </div>
              )}

              {/* Actions below dropzone */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('VIEW')}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal / Kembali
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>Pilih Berkas & Simpan ke Drive</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LINK */}
          {activeTab === 'LINK' && (
            <div className="max-w-2xl mx-auto w-full bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-md flex flex-col my-auto">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                  <LinkIcon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Tautkan Link Dokumen Google Drive
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Masukkan tautan Google Drive (contoh: https://drive.google.com/file/d/.../view).
                  Dokumen akan otomatis dipratinjau langsung di aplikasi.
                </p>
              </div>

              <form onSubmit={handleSaveUrl} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tautan Dokumen Google Drive / Cloud <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/1A2B3C4D5E6F.../view"
                    className="w-full text-xs font-mono border border-slate-300 rounded-xl p-3 text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Pastikan tautan dapat diakses (&ldquo;Siapa saja yang memiliki link&rdquo;)
                      agar dapat dipratinjau tanpa login tambahan.
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Label Nama Dokumen (Opsional)
                  </label>
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder={`Sertifikat_${(asset.noSertifikat || 'PLN').replace(
                      /[^a-zA-Z0-9]/g,
                      '_'
                    )}.pdf`}
                    className="w-full text-xs border border-slate-300 rounded-xl p-3 text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('VIEW')}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !inputUrl.trim()}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan & Tampilkan Pratinjau</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-600"></span>
            <span>
              Tersambung dengan Google Drive <strong>{TARGET_DRIVE_ACCOUNT}</strong> | SIMAS-TANAH
              PLN UPT Madiun
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-close-cert-footer"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
