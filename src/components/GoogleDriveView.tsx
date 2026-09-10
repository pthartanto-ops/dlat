import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  FolderOpen,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Database,
  Cloud,
  FileUp,
  Search,
  LogOut,
  ShieldCheck,
  Calendar,
  Layers,
  Copy,
  Check,
  Key,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  signInWithGoogleDrive,
  signOutGoogleDrive,
  fetchDriveAbout,
  getOrCreateAppFolder,
  listDriveFiles,
  uploadFileToDrive,
  backupAssetsToGoogleDrive,
  deleteFileFromDrive,
  readDriveFileText,
  getDriveAccessToken,
  setDriveAccessToken,
} from '../services/googleDriveService';
import { GoogleSignInButton } from './GoogleSignInButton';
import { AssetItem, CertificationTargetSettings, DriveFileItem, DriveUserInfo } from '../types';

interface GoogleDriveViewProps {
  currentUser: User | null;
  currentAccessToken: string | null;
  onAuthSuccess: (user: User, token: string) => void;
  onSignOut: () => void;
  assets: AssetItem[];
  targetSettings: CertificationTargetSettings;
  onRestoreAssets?: (restoredAssets: AssetItem[], settings?: CertificationTargetSettings) => void;
}

export const GoogleDriveView: React.FC<GoogleDriveViewProps> = ({
  currentUser,
  currentAccessToken,
  onAuthSuccess,
  onSignOut,
  assets,
  targetSettings,
  onRestoreAssets,
}) => {
  const [driveUser, setDriveUser] = useState<DriveUserInfo | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PDF' | 'EXCEL' | 'IMAGE'>('ALL');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // User Confirmation Modal for Destructive Operations (MANDATORY per SKILL.md)
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    fileId: string;
    fileName: string;
    isDeleting: boolean;
  }>({
    isOpen: false,
    fileId: '',
    fileName: '',
    isDeleting: false,
  });

  // User Confirmation Modal for Restoring Assets
  const [restoreModalState, setRestoreModalState] = useState<{
    isOpen: boolean;
    fileId: string;
    fileName: string;
    isRestoring: boolean;
  }>({
    isOpen: false,
    fileId: '',
    fileName: '',
    isRestoring: false,
  });

  // Selected file for manual upload
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Diagnostics for Firebase auth/unauthorized-domain error
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [showManualTokenForm, setShowManualTokenForm] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');

  // Load Drive information when token is available
  useEffect(() => {
    let isMounted = true;

    async function loadDriveData() {
      const token = currentAccessToken || getDriveAccessToken();
      if (!token || !currentUser) {
        setDriveUser(null);
        setFiles([]);
        setFolderId(null);
        return;
      }

      setIsLoadingFiles(true);
      try {
        // 1. Fetch about & storage quota
        const aboutData = await fetchDriveAbout(token);
        if (isMounted && aboutData) {
          setDriveUser(aboutData);
        }

        // 2. Get or create app folder
        const fId = await getOrCreateAppFolder(token);
        if (isMounted) {
          setFolderId(fId);
        }

        // 3. List files in folder
        const driveFiles = await listDriveFiles(token, fId);
        if (isMounted) {
          setFiles(driveFiles);
        }
      } catch (err: any) {
        console.error('Error initializing Google Drive:', err);
        if (isMounted) {
          setStatusMessage({
            type: 'error',
            text: err.message || 'Gagal memuat data dari Google Drive. Pastikan izin akses telah disetujui.',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingFiles(false);
        }
      }
    }

    loadDriveData();

    return () => {
      isMounted = false;
    };
  }, [currentUser, currentAccessToken]);

  // Handle Google Drive Login
  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setStatusMessage(null);
    setUnauthorizedDomain(null);
    try {
      const result = await signInWithGoogleDrive();
      if (result) {
        onAuthSuccess(result.user, result.accessToken);
        setStatusMessage({
          type: 'success',
          text: `Berhasil terhubung dengan akun Google Drive: ${result.user.email}`,
        });
      }
    } catch (error: any) {
      const errMsg = error?.message || '';
      const errCode = error?.code || '';
      if (errCode === 'auth/popup-closed-by-user') {
        console.info('Login popup closed by user or blocked by browser.');
        setStatusMessage({
          type: 'info',
          text: 'Jendela otorisasi Google ditutup. Anda dapat mencoba menghubungkan kembali saat siap atau menggunakan opsi token manual di bawah.',
        });
      } else if (errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain')) {
        console.error('Login error:', error);
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'domain runtime';
        setUnauthorizedDomain(domain);
        setStatusMessage({
          type: 'error',
          text: `Domain "${domain}" belum terdaftar di Authorized Domains Firebase Authentication. Silakan daftarkan domain di Firebase Console atau gunakan opsi alternatif di bawah.`,
        });
      } else {
        console.error('Login error:', error);
        setStatusMessage({
          type: 'error',
          text: errMsg || 'Gagal menghubungkan Google Drive. Silakan coba kembali.',
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Manual OAuth Access Token Submission
  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTokenInput.trim()) return;
    const token = manualTokenInput.trim();
    setDriveAccessToken(token);
    const mockUser = {
      email: 'authorized.user@pln.co.id',
      displayName: 'Pengguna Google Terverifikasi',
      uid: 'manual-token-user',
    } as unknown as User;
    onAuthSuccess(mockUser, token);
    setStatusMessage({
      type: 'success',
      text: 'Berhasil terhubung menggunakan Token Akses Google OAuth manual.',
    });
    setShowManualTokenForm(false);
    setUnauthorizedDomain(null);
  };

  // Handle Enable Demo Mode (Allows UI testing without domain whitelist)
  const handleEnableDemoMode = () => {
    const demoToken = 'demo-preview-token';
    setDriveAccessToken(demoToken);
    const mockUser = {
      email: 'demo.pertanahan@pln.co.id',
      displayName: 'Demo Akun PLN UPT Madiun',
      uid: 'demo-user-123',
    } as unknown as User;
    onAuthSuccess(mockUser, demoToken);
    setStatusMessage({
      type: 'info',
      text: 'Mode Simulasi Google Drive aktif: Anda dapat menguji fitur backup, arsip, dan pemulihan data.',
    });
    setUnauthorizedDomain(null);
  };

  // Handle Google Drive Logout
  const handleSignOut = async () => {
    try {
      await signOutGoogleDrive();
      onSignOut();
      setDriveUser(null);
      setFiles([]);
      setFolderId(null);
      setStatusMessage({
        type: 'info',
        text: 'Koneksi akun Google Drive telah diputuskan.',
      });
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  // Refresh files list
  const handleRefreshFiles = async () => {
    const token = currentAccessToken || getDriveAccessToken();
    if (!token) return;

    setIsLoadingFiles(true);
    try {
      const fId = folderId || (await getOrCreateAppFolder(token));
      setFolderId(fId);
      const updatedFiles = await listDriveFiles(token, fId, searchQuery);
      setFiles(updatedFiles);
      const aboutData = await fetchDriveAbout(token);
      if (aboutData) setDriveUser(aboutData);
      setStatusMessage({
        type: 'success',
        text: 'Daftar berkas Google Drive berhasil diperbarui.',
      });
    } catch (err: any) {
      console.error('Error refreshing files:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal memperbarui berkas Google Drive.',
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Trigger Backup to Google Drive
  const handleBackupToDrive = async () => {
    const token = currentAccessToken || getDriveAccessToken();
    if (!token) {
      setStatusMessage({ type: 'error', text: 'Silakan hubungkan akun Google Drive terlebih dahulu.' });
      return;
    }

    setIsBackingUp(true);
    setStatusMessage(null);
    try {
      const uploadedFile = await backupAssetsToGoogleDrive(token, assets, targetSettings);
      setStatusMessage({
        type: 'success',
        text: `Sukses menyimpan backup ke Google Drive: "${uploadedFile.name}" (${assets.length} persil tersimpan).`,
      });
      // Refresh list
      await handleRefreshFiles();
    } catch (err: any) {
      console.error('Backup error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal membuat file backup di Google Drive.',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  // Handle Manual File Upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const token = currentAccessToken || getDriveAccessToken();
    if (!token) {
      setStatusMessage({ type: 'error', text: 'Silakan hubungkan akun Google Drive terlebih dahulu.' });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);
    try {
      const fId = folderId || (await getOrCreateAppFolder(token));
      const uploaded = await uploadFileToDrive(token, file, fId, `Dokumen pertanahan diunggah melalui SIMAS-TANAH`);
      setStatusMessage({
        type: 'success',
        text: `Berkas "${uploaded.name}" berhasil diunggah ke Google Drive!`,
      });
      await handleRefreshFiles();
    } catch (err: any) {
      console.error('Upload error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal mengunggah berkas ke Google Drive.',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Open User Confirmation Modal for Destructive Delete (MANDATORY per SKILL.md)
  const promptDeleteFile = (file: DriveFileItem) => {
    setDeleteModalState({
      isOpen: true,
      fileId: file.id,
      fileName: file.name,
      isDeleting: false,
    });
  };

  // Execute Destructive Delete after user confirms
  const handleConfirmDelete = async () => {
    const token = currentAccessToken || getDriveAccessToken();
    if (!token || !deleteModalState.fileId) return;

    setDeleteModalState((prev) => ({ ...prev, isDeleting: true }));
    try {
      await deleteFileFromDrive(token, deleteModalState.fileId);
      setStatusMessage({
        type: 'success',
        text: `Berkas "${deleteModalState.fileName}" berhasil dihapus dari Google Drive.`,
      });
      setDeleteModalState({ isOpen: false, fileId: '', fileName: '', isDeleting: false });
      await handleRefreshFiles();
    } catch (err: any) {
      console.error('Delete error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal menghapus berkas dari Google Drive.',
      });
      setDeleteModalState((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  // Prompt Restore Modal
  const promptRestoreFile = (file: DriveFileItem) => {
    setRestoreModalState({
      isOpen: true,
      fileId: file.id,
      fileName: file.name,
      isRestoring: false,
    });
  };

  // Execute Restore from Backup File
  const handleConfirmRestore = async () => {
    const token = currentAccessToken || getDriveAccessToken();
    if (!token || !restoreModalState.fileId || !onRestoreAssets) return;

    setRestoreModalState((prev) => ({ ...prev, isRestoring: true }));
    try {
      const content = await readDriveFileText(token, restoreModalState.fileId);
      const parsed = JSON.parse(content);

      if (parsed && Array.isArray(parsed.data)) {
        onRestoreAssets(parsed.data, parsed.targetSettings);
        setStatusMessage({
          type: 'success',
          text: `Data ${parsed.data.length} persil berhasil dipulihkan dari file backup Google Drive "${restoreModalState.fileName}".`,
        });
      } else if (Array.isArray(parsed)) {
        onRestoreAssets(parsed);
        setStatusMessage({
          type: 'success',
          text: `Data ${parsed.length} persil berhasil dipulihkan dari Google Drive.`,
        });
      } else {
        throw new Error('Format isi file backup tidak valid untuk pemulihan.');
      }
      setRestoreModalState({ isOpen: false, fileId: '', fileName: '', isRestoring: false });
    } catch (err: any) {
      console.error('Restore error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal memulihkan data dari file backup Google Drive.',
      });
      setRestoreModalState((prev) => ({ ...prev, isRestoring: false }));
    }
  };

  // Filtered files list
  const filteredFiles = files.filter((f) => {
    if (filterType === 'PDF' && !f.mimeType.includes('pdf') && !f.name.endsWith('.pdf')) {
      return false;
    }
    if (
      filterType === 'EXCEL' &&
      !f.mimeType.includes('spreadsheet') &&
      !f.mimeType.includes('excel') &&
      !f.mimeType.includes('csv') &&
      !f.mimeType.includes('json') &&
      !f.name.endsWith('.xlsx') &&
      !f.name.endsWith('.xls') &&
      !f.name.endsWith('.csv') &&
      !f.name.endsWith('.json')
    ) {
      return false;
    }
    if (filterType === 'IMAGE' && !f.mimeType.startsWith('image/')) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return f.name.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q));
    }
    return true;
  });

  // Calculate storage percentage
  const storageLimitBytes = Number(driveUser?.limit || 0);
  const storageUsageBytes = Number(driveUser?.usage || 0);
  const storagePercent =
    storageLimitBytes > 0 ? Math.min(100, Math.round((storageUsageBytes / storageLimitBytes) * 100)) : 0;
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner & Status */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <Cloud className="w-3.5 h-3.5 text-amber-300" />
              INTEGRASI CLOUD STORAGE GOOGLE DRIVE
            </div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              Pusat Penyimpanan & Arsip Digital Pertanahan
            </h2>
            <p className="text-emerald-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Sinkronisasi dokumen alas hak tanah (SPH), berkas permohonan Kantah BPN, salinan sertifikat HP/HGB,
              serta backup database aset SIMAS-TANAH UPT Madiun langsung ke Google Drive institusi Anda.
            </p>
          </div>

          {/* Connection Card */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 min-w-[280px]">
            {currentUser && currentAccessToken ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Google User'}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full border-2 border-amber-300 shadow-xs"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-700 text-amber-300 flex items-center justify-center font-bold text-sm">
                      {currentUser.displayName?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <div className="font-bold text-sm text-white truncate">
                      {currentUser.displayName || 'Pengguna Google'}
                    </div>
                    <div className="text-xs text-emerald-200 truncate">{currentUser.email}</div>
                  </div>
                </div>

                {/* Storage Info */}
                {driveUser?.limit && (
                  <div className="space-y-1 pt-1 border-t border-white/10">
                    <div className="flex items-center justify-between text-[11px] text-emerald-200 font-semibold">
                      <span>Kapasitas Drive Terpakai</span>
                      <span className="text-amber-300 font-bold">{storagePercent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-400 to-amber-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${storagePercent}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-slate-300 text-right">
                      {formatBytes(storageUsageBytes)} dari {formatBytes(storageLimitBytes)}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Google Drive Terhubung
                  </span>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1 text-xs text-rose-300 hover:text-white px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/40 transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    Putuskan
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <div className="text-xs text-emerald-100 font-medium">
                  Hubungkan akun Google Drive Anda untuk mulai menyimpan dokumen & membuat salinan backup:
                </div>
                <div className="flex justify-center">
                  <GoogleSignInButton
                    onClick={handleSignIn}
                    disabled={isLoggingIn}
                    text={isLoggingIn ? 'Menghubungkan...' : 'Sign in with Google Drive'}
                  />
                </div>
                <div className="text-[10px] text-emerald-300/80">
                  Memerlukan izin penyimpanan Google Drive sesuai otorisasi PLN
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 border shadow-xs animate-in fade-in duration-200 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
            {statusMessage.type === 'info' && <HardDrive className="w-4 h-4 text-blue-600 flex-shrink-0" />}
            <span className="font-semibold">{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-500 hover:text-slate-800 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Troubleshooting Card for Firebase auth/unauthorized-domain */}
      {unauthorizedDomain && (
        <div className="bg-amber-50/90 border-2 border-amber-400/90 rounded-2xl p-6 text-slate-800 shadow-md animate-in fade-in duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-4 flex-1">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-900 mb-1.5">
                  <span>PANDUAN KONFIGURASI FIREBASE AUTHENTICATION</span>
                </div>
                <h3 className="text-base font-bold text-amber-950">
                  Domain Belum Terdaftar di Authorized Domains (auth/unauthorized-domain)
                </h3>
                <p className="text-xs text-amber-900/90 leading-relaxed mt-1">
                  Firebase Authentication secara ketat membatasi autentikasi Google Sign-In hanya pada domain web resmi yang telah disetujui. Karena aplikasi berjalan pada container runtime Google Cloud Run, domain berikut perlu didaftarkan ke proyek Firebase <strong className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-950">gen-lang-client-0105881982</strong>.
                </p>
              </div>

              {/* Current Domain Box with Copy Action */}
              <div className="bg-white rounded-xl p-3.5 border border-amber-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold text-slate-500 block">Nama Domain Runtime yang Perlu Ditambahkan:</span>
                  <span className="font-mono text-xs font-bold text-slate-900 break-all select-all bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-block">
                    {unauthorizedDomain}
                  </span>
                </div>
                <button
                  type="button"
                  id="btn-copy-domain"
                  onClick={() => {
                    navigator.clipboard.writeText(unauthorizedDomain);
                    setCopiedDomain(true);
                    setTimeout(() => setCopiedDomain(false), 3000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shrink-0 shadow-xs cursor-pointer"
                >
                  {copiedDomain ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                  {copiedDomain ? 'Berhasil Disalin!' : 'Salin Nama Domain'}
                </button>
              </div>

              {/* Step by step guide */}
              <div className="bg-amber-100/70 rounded-xl p-4 border border-amber-200 text-xs space-y-2.5">
                <div className="font-bold text-amber-950 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>4 Langkah Mudah Menambahkan Domain di Firebase Console:</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-amber-900 text-xs pl-1">
                  <li>
                    Buka tautan langsung setelan Firebase:{' '}
                    <a
                      href="https://console.firebase.google.com/project/gen-lang-client-0105881982/authentication/settings"
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-emerald-900 underline hover:text-emerald-700 inline-flex items-center gap-1 ml-1"
                    >
                      Firebase Console &gt; Authentication &gt; Settings <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  </li>
                  <li>
                    Pilih tab <strong>"Authorized domains" (Domain resmi)</strong> pada bilah atas.
                  </li>
                  <li>
                    Klik tombol <strong>"Add domain" (Tambahkan domain)</strong>, lalu tempel (paste):{' '}
                    <code className="bg-white/80 px-1.5 py-0.5 rounded font-mono font-bold text-[11px]">{unauthorizedDomain}</code>
                  </li>
                  <li>
                    Klik <strong>"Add / Save"</strong>. Setelah disimpan, kembali ke halaman ini lalu klik <strong>"Coba Hubungkan Kembali"</strong> di bawah.
                  </li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <a
                  href="https://console.firebase.google.com/project/gen-lang-client-0105881982/authentication/settings"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                  Buka Pengaturan Firebase Console
                </a>
                <button
                  type="button"
                  id="btn-retry-auth"
                  onClick={handleSignIn}
                  disabled={isLoggingIn}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoggingIn ? 'animate-spin' : ''}`} />
                  {isLoggingIn ? 'Menghubungkan...' : 'Coba Hubungkan Kembali'}
                </button>
                <button
                  type="button"
                  id="btn-toggle-manual-token"
                  onClick={() => setShowManualTokenForm(!showManualTokenForm)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors shadow-2xs"
                >
                  <Key className="w-3.5 h-3.5 text-slate-500" />
                  {showManualTokenForm ? 'Tutup Input Token' : 'Opsi: Masukkan Token OAuth Manual'}
                </button>
                <button
                  type="button"
                  id="btn-demo-mode"
                  onClick={handleEnableDemoMode}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors"
                >
                  Mode Simulasi / Preview Langsung
                </button>
              </div>

              {/* Form Input Manual OAuth Token */}
              {showManualTokenForm && (
                <form
                  onSubmit={handleManualTokenSubmit}
                  className="mt-3 p-4 bg-white rounded-xl border border-slate-300 shadow-xs space-y-3"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Google OAuth Access Token (Bearer Token):
                    </label>
                    <input
                      type="text"
                      value={manualTokenInput}
                      onChange={(e) => setManualTokenInput(e.target.value)}
                      placeholder="ya29.a0AfH6SMB..."
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Jika Anda memiliki access token sementara (misalnya dari OAuth Playground atau gcloud auth), Anda dapat langsung menempelkannya di sini.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg transition-colors"
                    >
                      Hubungkan dengan Token
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManualTokenForm(false)}
                      className="px-3 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Action Toolbar Cards */}
      {currentUser && currentAccessToken ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Backup Data Aset */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-400 transition-colors">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Backup Database ke Google Drive</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Simpan arsip komprehensif data {assets.length} persil tanah, status tahapan BPN, dan target KPI ke
                folder Google Drive Anda.
              </p>
            </div>
            <button
              type="button"
              id="btn-backup-to-drive"
              onClick={handleBackupToDrive}
              disabled={isBackingUp}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-amber-300" />
              {isBackingUp ? 'Memproses Salinan Backup...' : 'Simpan Backup Baru ke Drive'}
            </button>
          </div>

          {/* Card 2: Unggah Berkas Tanah */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-400 transition-colors">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                <FileUp className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Unggah Berkas Pertanahan</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Unggah dokumen alas hak (SPH), scan peta bidang, salinan sertifikat BPN, atau surat permohonan ke
                folder SIMAS-TANAH di Drive.
              </p>
            </div>
            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                id="drive-file-input"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.jpg,.jpeg,.png,.zip,.json"
              />
              <button
                type="button"
                id="btn-upload-file-drive"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full inline-flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                <FolderOpen className="w-4 h-4 text-emerald-200" />
                {isUploading ? 'Mengunggah Berkas...' : 'Pilih Berkas untuk Diunggah'}
              </button>
            </div>
          </div>

          {/* Card 3: Status Folder & Direktori Google Drive */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-400 transition-colors">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Folder Khusus SIMAS-TANAH</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Direktori: <span className="font-semibold text-slate-800">"SIMAS-TANAH PLN UPT Madiun"</span>
                <br />
                Total berkas terdeteksi: <span className="font-bold text-emerald-700">{files.length} dokumen</span>
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefreshFiles}
                disabled={isLoadingFiles}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-lg transition-colors border border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                Segarkan
              </button>
              {folderId && (
                <a
                  href={`https://drive.google.com/drive/folders/${folderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs py-2.5 px-3 rounded-lg transition-colors border border-amber-300"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Buka di Drive
                </a>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* 3. Google Drive File Explorer */}
      {currentUser && currentAccessToken ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Explorer Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-emerald-700" />
                Arsip Berkas Google Drive ({filteredFiles.length} file)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar salinan sertifikat, SPH, dokumen pendukung, dan data backup di folder SIMAS-TANAH
              </p>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama berkas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 w-48 sm:w-60"
                />
              </div>

              {/* Type selector */}
              <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterType('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    filterType === 'ALL' ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('PDF')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    filterType === 'PDF' ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('EXCEL')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    filterType === 'EXCEL' ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Data / Backup
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('IMAGE')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    filterType === 'IMAGE' ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Gambar
                </button>
              </div>
            </div>
          </div>

          {/* Files Table */}
          {isLoadingFiles ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-700 mb-2" />
              Memuat berkas dari Google Drive...
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs space-y-3">
              <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="font-semibold text-slate-700">Belum ada berkas yang ditemukan</div>
              <p className="max-w-md mx-auto text-slate-400">
                Gunakan tombol "Simpan Backup Baru ke Drive" atau "Pilih Berkas untuk Diunggah" di atas untuk menambahkan
                dokumen sertifikasi ke Google Drive.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-3">Nama Berkas</th>
                    <th className="px-3 py-3">Jenis</th>
                    <th className="px-3 py-3">Ukuran</th>
                    <th className="px-3 py-3">Waktu Diubah</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFiles.map((file) => {
                    const isJsonBackup =
                      file.name.includes('BACKUP_SIMAS_TANAH') || file.name.endsWith('.json');
                    const isPdf = file.mimeType.includes('pdf') || file.name.endsWith('.pdf');
                    const isSpreadsheet =
                      file.mimeType.includes('spreadsheet') ||
                      file.name.endsWith('.xlsx') ||
                      file.name.endsWith('.csv');

                    return (
                      <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          <div className="flex items-center gap-2.5">
                            {isPdf ? (
                              <FileText className="w-4 h-4 text-rose-500 flex-shrink-0" />
                            ) : isSpreadsheet ? (
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            ) : isJsonBackup ? (
                              <Database className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            ) : (
                              <FolderOpen className="w-4 h-4 text-teal-600 flex-shrink-0" />
                            )}
                            <div className="truncate max-w-sm sm:max-w-md">
                              <span className="truncate block font-bold text-slate-800">{file.name}</span>
                              {file.description && (
                                <span className="text-[10px] text-slate-400 truncate block font-normal">
                                  {file.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-500">
                          {isJsonBackup ? (
                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px]">
                              Backup JSON
                            </span>
                          ) : isPdf ? (
                            <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold text-[10px]">
                              Dokumen PDF
                            </span>
                          ) : isSpreadsheet ? (
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                              Spreadsheet
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                              {file.mimeType.split('/').pop() || 'Berkas'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-500 font-mono text-[11px]">
                          {file.size ? formatBytes(Number(file.size)) : '-'}
                        </td>
                        <td className="px-3 py-3 text-slate-500">
                          {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* Tombol Restore khusus file backup JSON */}
                            {isJsonBackup && onRestoreAssets && (
                              <button
                                type="button"
                                onClick={() => promptRestoreFile(file)}
                                className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2 py-1 rounded text-[11px] transition-colors"
                                title="Pulihkan / Terapkan data aset dari file backup ini"
                              >
                                <Database className="w-3 h-3" />
                                Pulihkan
                              </button>
                            )}

                            {/* Buka di Google Drive */}
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-slate-100 rounded transition-colors"
                                title="Buka di tab baru Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {/* Unduh */}
                            {file.webContentLink && (
                              <a
                                href={file.webContentLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-slate-100 rounded transition-colors"
                                title="Unduh berkas"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {/* Hapus dengan User Confirmation Dialog (MANDATORY per SKILL.md) */}
                            <button
                              type="button"
                              onClick={() => promptDeleteFile(file)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              title="Hapus berkas dari Google Drive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {/* 4. EXPLICIT CONFIRMATION MODAL FOR DELETING FILE (MANDATORY per SKILL.md) */}
      {deleteModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">Konfirmasi Hapus Berkas</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus berkas{' '}
                <span className="font-bold text-slate-900 break-all">"{deleteModalState.fileName}"</span> dari Google
                Drive Anda? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>Berkas akan dihapus secara langsung dari Google Drive penyimpanan akun Anda.</span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalState({ isOpen: false, fileId: '', fileName: '', isDeleting: false })}
                disabled={deleteModalState.isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteModalState.isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                {deleteModalState.isDeleting ? 'Menghapus...' : 'Ya, Hapus Berkas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONFIRMATION MODAL FOR RESTORING ASSETS FROM DRIVE */}
      {restoreModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <Database className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">Pulihkan Data dari Google Drive</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda ingin memuat dan memulihkan data aset serta pengaturan target dari file backup{' '}
                <span className="font-bold text-slate-900 break-all">"{restoreModalState.fileName}"</span>?
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <span>Data persil saat ini akan diselaraskan dengan isi file backup yang dipilih.</span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRestoreModalState({ isOpen: false, fileId: '', fileName: '', isRestoring: false })}
                disabled={restoreModalState.isRestoring}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={restoreModalState.isRestoring}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                {restoreModalState.isRestoring ? 'Memulihkan Data...' : 'Ya, Terapkan Pemulihan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
