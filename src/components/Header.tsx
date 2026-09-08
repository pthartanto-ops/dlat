import React from 'react';
import { ActiveNavTab } from '../types';
import {
  FileText,
  Building2,
  Layers,
  BarChart3,
  Landmark,
  Map,
  PlusCircle,
  Download,
  FileSpreadsheet,
  Search,
  Bell,
  CheckCircle2,
  ShieldCheck,
  Zap,
  RotateCcw,
  Calendar,
  Settings,
  HardDrive,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  totalAssets: number;
  totalTerbit: number;
  totalProses: number;
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onExportCsv: () => void;
  onRefresh: () => void;
  onOpenClearModal?: () => void;
  onSeedSample?: () => void;
  targetYear?: number;
  availableTargetYears?: number[];
  onChangeTargetYear?: (year: number) => void;
  googleUser?: User | null;
  isGoogleDriveConnected?: boolean;
  onOpenSupabaseModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  totalAssets,
  totalTerbit,
  totalProses,
  onOpenAddModal,
  onOpenImportModal,
  onExportCsv,
  onRefresh,
  onOpenClearModal,
  onSeedSample,
  targetYear = 2024,
  availableTargetYears = [],
  onChangeTargetYear,
  googleUser,
  isGoogleDriveConnected = false,
  onOpenSupabaseModal,
}) => {
  const certPercentage = totalAssets > 0 ? ((totalTerbit / totalAssets) * 100).toFixed(1) : '0';

  // Sediakan daftar tahun target KPI (termasuk tahun yang sedang aktif)
  const targetYearOptions = React.useMemo(() => {
    const set = new Set<number>([2021, 2022, 2023, 2024, 2025, 2026, 2027]);
    if (targetYear) set.add(targetYear);
    availableTargetYears.forEach((y) => {
      if (y > 0) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [availableTargetYears, targetYear]);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner / Corporate Identity */}
      <div className="bg-emerald-900 text-white px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-200 tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              PORTAL LEGALITAS & PENERTIBAN ASET TANAH
            </span>
            <span className="text-emerald-500">|</span>
            <span className="text-emerald-100 hidden sm:inline">PT PLN (PERSERO) UIT JBTB - UPT MADIUN</span>
          </div>
          <div className="flex items-center gap-3 text-emerald-200">
            {/* Supabase Connection Status Badge */}
            <button
              id="btn-supabase-status-top"
              type="button"
              onClick={onOpenSupabaseModal}
              className="inline-flex items-center gap-1.5 bg-emerald-950/90 hover:bg-emerald-800 text-emerald-200 hover:text-white px-2.5 py-1 rounded-lg border border-emerald-600/70 text-xs shadow-xs transition-colors cursor-pointer group"
              title="Koneksi Supabase Cloud Aktif - Klik untuk rincian & tes koneksi"
            >
              <div className="w-3.5 h-3.5 rounded bg-emerald-500/20 flex items-center justify-center">
                <Zap className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <span className="font-bold text-[11px]">Supabase</span>
              <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-800 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ONLINE
              </span>
            </button>

            <span className="hidden sm:inline text-emerald-600">|</span>

            <span className="hidden sm:flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Sinkronisasi Kantah BPN Aktif
            </span>
            <span className="hidden md:inline text-emerald-400">|</span>
            <div className="flex items-center gap-1.5 bg-emerald-800/90 hover:bg-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-700 text-xs shadow-xs transition-colors">
              <Calendar className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
              <label htmlFor="header-kpi-target-year-select" className="text-emerald-200 text-[11px] font-semibold cursor-pointer whitespace-nowrap">
                Tahun Target KPI:
              </label>
              {onChangeTargetYear ? (
                <div className="flex items-center gap-1.5">
                  <select
                    id="header-kpi-target-year-select"
                    value={targetYear}
                    onChange={(e) => onChangeTargetYear(Number(e.target.value))}
                    className="bg-emerald-950 text-amber-300 font-extrabold text-xs px-2 py-0.5 rounded border border-emerald-600 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer hover:border-amber-400 transition-colors"
                    title="Ubah Tahun Sasaran Target KPI"
                  >
                    {targetYearOptions.map((yr) => (
                      <option key={yr} value={yr} className="bg-slate-900 text-amber-300">
                        {yr}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onSelectTab('ADMIN_SETTINGS')}
                    title="Buka Pusat Kendali Target KPI Lengkap di Menu Admin"
                    className="text-emerald-300 hover:text-amber-300 p-0.5 rounded transition-colors"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="font-bold text-amber-300 text-xs">{targetYear}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-md ring-2 ring-emerald-500/30 flex-shrink-0 relative">
              <Zap className="w-6 h-6 text-amber-300 fill-amber-300" />
              <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-900 font-extrabold text-[9px] px-1 rounded shadow-xs">
                PLN
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-none">
                  SIMAS-TANAH <span className="text-emerald-700 font-extrabold">UPT MADIUN</span>
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  LIVE V2.4
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Dashboard Monitoring Sertifikasi Aset Tanah & Tracking 16 Tahapan BPN
              </p>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                {totalAssets}
              </div>
              <div className="text-left leading-tight">
                <div className="text-[10px] uppercase font-semibold text-slate-400">Total Aset</div>
                <div className="text-xs font-bold text-slate-700">Persil / Bidang</div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                {totalTerbit}
              </div>
              <div className="text-left leading-tight">
                <div className="text-[10px] uppercase font-semibold text-emerald-600">Terbit</div>
                <div className="text-xs font-bold text-emerald-800">{certPercentage}% Selesai</div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                {totalProses}
              </div>
              <div className="text-left leading-tight">
                <div className="text-[10px] uppercase font-semibold text-amber-700">Proses BPN</div>
                <div className="text-xs font-bold text-amber-900">16 Tahapan</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-auto lg:ml-2">
              <button
                id="btn-import-excel"
                onClick={onOpenImportModal}
                className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow-xs border border-emerald-600/40"
                title="Input data dalam jumlah banyak menggunakan file Excel (.xlsx / .xls / .csv)"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-300" />
                <span className="hidden sm:inline">Import Excel</span>
              </button>

              <button
                id="btn-tambah-aset"
                onClick={onOpenAddModal}
                className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow-xs"
                title="Tambah data persil atau aset baru"
              >
                <PlusCircle className="w-4 h-4 text-emerald-200" />
                <span className="hidden sm:inline">Tambah Aset</span>
              </button>

              <button
                id="btn-export-csv"
                onClick={onExportCsv}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow-xs"
                title="Unduh rekap data CSV / Excel"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span className="hidden md:inline">Export Excel</span>
              </button>

              {/* Supabase Connection Action Button */}
              <button
                id="btn-supabase-modal"
                type="button"
                onClick={onOpenSupabaseModal}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-2.5 py-2 rounded-lg transition-colors shadow-xs border border-emerald-500/60 hover:border-emerald-400 group cursor-pointer"
                title="Koneksi Database Supabase Cloud - Klik untuk periksa status"
              >
                <div className="w-3.5 h-3.5 rounded bg-emerald-500/20 flex items-center justify-center">
                  <Zap className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <span className="hidden sm:inline font-bold text-emerald-300">Supabase</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between overflow-x-auto">
          <nav className="flex space-x-1 sm:space-x-2" aria-label="Tabs">
            <button
              id="nav-home"
              onClick={() => onSelectTab('HOME')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-md whitespace-nowrap transition-all ${
                activeTab === 'HOME'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Home / Monitoring
            </button>

            <button
              id="nav-dashboard-upt"
              onClick={() => onSelectTab('DASHBOARD_UPT')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-md whitespace-nowrap transition-all ${
                activeTab === 'DASHBOARD_UPT'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              DASHBOARD UPT
            </button>

            <button
              id="nav-dashboard-ultg"
              onClick={() => onSelectTab('DASHBOARD_ULTG')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-md whitespace-nowrap transition-all ${
                activeTab === 'DASHBOARD_ULTG'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              DASHBOARD ULTG
            </button>

            <button
              id="nav-global-report"
              onClick={() => onSelectTab('GLOBAL_REPORT')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-md whitespace-nowrap transition-all ${
                activeTab === 'GLOBAL_REPORT'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              GLOBAL REPORT
            </button>

            <button
              id="nav-bpn-report"
              onClick={() => onSelectTab('BPN_REPORT')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-md whitespace-nowrap transition-all ${
                activeTab === 'BPN_REPORT'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              BPN REPORT
            </button>

            <button
              id="nav-map-view"
              onClick={() => onSelectTab('MAP_VIEW')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-md whitespace-nowrap transition-all ${
                activeTab === 'MAP_VIEW'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <Map className="w-3.5 h-3.5 text-amber-300" />
              PETA SEBARAN ASET
            </button>

            <button
              id="nav-admin-menu"
              onClick={() => onSelectTab('ADMIN_SETTINGS')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-md whitespace-nowrap transition-all border ${
                activeTab === 'ADMIN_SETTINGS'
                  ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs font-extrabold'
                  : 'text-amber-800 bg-amber-50/80 border-amber-300/80 hover:bg-amber-100 hover:text-amber-900'
              }`}
              title="Menu Admin untuk input target sertifikasi dan penetapan PIC Pokja"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>ADMIN: TARGET & PIC</span>
              <span className="bg-amber-200/80 text-amber-950 text-[9px] px-1.5 py-0.2 rounded font-black tracking-wide">
                BARU
              </span>
            </button>

            <button
              id="nav-google-drive"
              onClick={() => onSelectTab('GOOGLE_DRIVE')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-md whitespace-nowrap transition-all border ${
                activeTab === 'GOOGLE_DRIVE'
                  ? 'bg-emerald-800 text-white border-emerald-700 shadow-xs'
                  : isGoogleDriveConnected
                  ? 'text-emerald-900 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 font-extrabold'
                  : 'text-slate-600 border-transparent hover:text-emerald-800 hover:bg-emerald-50'
              }`}
              title="Pusat Dokumen Pertanahan & Backup Google Drive"
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>GOOGLE DRIVE</span>
              {isGoogleDriveConnected ? (
                <span className="inline-flex items-center gap-1 bg-emerald-200/80 text-emerald-900 text-[9px] px-1.5 py-0.2 rounded font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  AKTIF
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.2 rounded font-medium">
                  CLOUD
                </span>
              )}
            </button>
          </nav>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
            {/* Supabase Cloud Connection Badge */}
            <button
              id="btn-supabase-user-badge"
              type="button"
              onClick={onOpenSupabaseModal}
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-300/90 font-bold text-[11px] transition-colors cursor-pointer"
              title="Koneksi Supabase Cloud Aktif (Klik untuk rincian & ping test)"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-500" />
              <span>Supabase</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </button>

            {isGoogleDriveConnected && googleUser ? (
              <button
                type="button"
                onClick={() => onSelectTab('GOOGLE_DRIVE')}
                className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-900 transition-colors cursor-pointer"
                title="Google Drive Terhubung - Klik untuk membuka"
              >
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Google'}
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full border border-emerald-400"
                  />
                ) : (
                  <HardDrive className="w-3.5 h-3.5 text-emerald-700" />
                )}
                <span className="font-bold text-[11px] truncate max-w-[150px]">
                  {googleUser.email || googleUser.displayName}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectTab('GOOGLE_DRIVE')}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-semibold text-[11px] border border-slate-200 transition-colors"
                title="Klik untuk menghubungkan Google Drive"
              >
                <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                <span>Drive: Belum Terhubung</span>
              </button>
            )}
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[11px] border border-slate-200">
              PTHartanto@gmail.com (Asman Fasilitas)
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
