import React, { useState } from 'react';
import { AssetItem, UnitSummaryData } from '../types';
import { BPN_STAGES } from '../data/mockData';
import {
  Building2,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  FileText,
  DollarSign,
  PieChart,
  Calendar,
} from 'lucide-react';

interface UptDashboardViewProps {
  summaries: UnitSummaryData[];
  assets: AssetItem[];
  availableYears?: number[];
  selectedYear?: string;
  onSelectYear?: (year: string) => void;
  targetYear?: number;
}

export const UptDashboardView: React.FC<UptDashboardViewProps> = ({
  summaries,
  assets,
  availableYears = [],
  selectedYear = 'ALL',
  onSelectYear,
  targetYear,
}) => {
  const [internalYear, setInternalYear] = useState<string>(selectedYear);
  const activeYear = onSelectYear ? selectedYear : internalYear;
  const handleYearChange = (yr: string) => {
    setInternalYear(yr);
    onSelectYear?.(yr);
  };

  // Compute dynamic yearly statistics of ISSUED CERTIFICATES only
  // (Tahun hanya digunakan untuk kepentingan target sertifikasi dan sertifikat terbit saja)
  const yearlyStats = React.useMemo(() => {
    const stats: Record<number, { terbit: number }> = {};
    assets.forEach((a) => {
      const isTerbit = a.tahapan >= 17 || a.statusDisplay === 'TERBIT';
      if (isTerbit && a.tahun && a.tahun > 0) {
        if (!stats[a.tahun]) stats[a.tahun] = { terbit: 0 };
        stats[a.tahun].terbit++;
      }
    });
    return stats;
  }, [assets]);

  const sortedYears = React.useMemo(() => {
    return Object.keys(yearlyStats)
      .map(Number)
      .filter((y) => y > 0)
      .sort((a, b) => b - a);
  }, [yearlyStats]);

  // Populasi aset dan legalitas awal TIDAK terikat tahun
  const totalTarget = summaries.reduce((acc, s) => acc + s.target, 0);
  const totalAset = summaries.reduce((acc, s) => acc + s.totalAset, 0) || assets.length;
  const totalTerbitAll = summaries.reduce((acc, s) => acc + s.sertifikatTerbit.total, 0) || assets.filter((a) => a.tahapan >= 17 || a.statusDisplay === 'TERBIT').length;
  
  // Realisasi sertifikat terbit berdasarkan tahun evaluasi
  const terbitEvaluasi = activeYear === 'ALL'
    ? totalTerbitAll
    : assets.filter((a) => (a.tahapan >= 17 || a.statusDisplay === 'TERBIT') && String(a.tahun) === activeYear).length;

  const totalSph = assets.filter((a) => a.alasHak === 'SPH').length;
  const totalTanpaSph = assets.filter((a) => a.alasHak === 'Tanpa SPH').length;
  const totalProsesBpn = assets.filter((a) => a.tahapan >= 1 && a.tahapan <= 16).length || (totalAset - totalTerbitAll);

  const certRateAll = totalAset > 0 ? ((totalTerbitAll / totalAset) * 100).toFixed(1) : '0';
  const targetRate = totalTarget > 0 ? ((terbitEvaluasi / totalTarget) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-xl p-5 text-white shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-700/80 text-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2">
              <Building2 className="w-3.5 h-3.5 text-amber-300" />
              DASHBOARD EKSEKUTIF TINGKAT UPT
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              PT PLN (PERSERO) UPT MADIUN
            </h2>
            <p className="text-xs text-emerald-100 max-w-2xl mt-1">
              Monitoring komprehensif target pensertipikatan tanah tapak tower transmisi (SUTT/SUTET) dan Gardu Induk di wilayah kerja UPT Madiun meliputi 3 ULTG (Madiun, Kediri, Babat).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            {/* Year Selector in Banner */}
            <div className="bg-emerald-950/70 border border-emerald-600/50 px-3 py-2 rounded-xl text-left">
              <div className="text-[10px] uppercase font-bold text-emerald-300 flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-amber-400" />
                Evaluasi Target & Terbit:
              </div>
              <select
                id="upt-dashboard-year-filter"
                value={activeYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="bg-emerald-900 border border-emerald-600 text-white text-xs font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer w-full"
              >
                <option value="ALL">Semua Tahun Terbit</option>
                {sortedYears.map((yr) => (
                  <option key={yr} value={String(yr)}>
                    Tahun {yr} ({yearlyStats[yr]?.terbit || 0} Terbit)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-xs border border-white/10">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-emerald-200">
                  {activeYear === 'ALL'
                    ? `Realisasi Target UPT${targetYear ? ` (TA ${targetYear})` : ''}`
                    : `Realisasi Target (${activeYear})`}
                </div>
                <div className="text-2xl font-black text-amber-300">{targetRate}%</div>
                <div className="text-[10px] text-emerald-100">{terbitEvaluasi} dari {totalTarget} Target Persil</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Information Banner on Domain Scope */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center gap-3 text-xs text-emerald-900 shadow-2xs">
        <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg flex-shrink-0 font-bold">
          ℹ️
        </div>
        <div className="leading-relaxed">
          <strong className="font-semibold text-emerald-950">Ketentuan Data Sertifikasi:</strong> Tahun pada data hanya digunakan untuk kepentingan <strong>Target Sertifikasi</strong> dan <strong>Sertifikat Terbit</strong> saja. Data <strong>Total Populasi Aset ({totalAset} persil)</strong>, <strong>Alas Hak SPH/Tanpa SPH</strong>, dan <strong>Proses BPN ({totalProsesBpn} persil)</strong> mencakup seluruh aset UPT Madiun dan tidak dibatasi oleh tahun.
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Total Populasi Aset UPT
            </span>
            <span className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalAset}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-700 font-bold">Seluruh Aset Fisik</span> (3 ULTG)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase">
              {activeYear === 'ALL' ? 'Sertifikat Terbit (Kumulatif)' : `Sertifikat Terbit (${activeYear})`}
            </span>
            <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{terbitEvaluasi}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            {activeYear === 'ALL'
              ? `${certRateAll}% dari total populasi telah terbit`
              : `Target: ${totalTarget} persil (${targetRate}% tercapai)`}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase">Proses di BPN</span>
            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{totalProsesBpn}</div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            Aktif di 16 tahapan Kantah BPN
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase">Alas Hak Penguasaan</span>
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-blue-800 mt-2">{totalSph} <span className="text-xs font-normal text-slate-500">SPH</span></div>
          <div className="text-[11px] text-slate-500 mt-1">
            Tanpa SPH: <strong className="text-slate-800">{totalTanpaSph}</strong> persil
          </div>
        </div>
      </div>

      {/* Dynamic Yearly Performance Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              TREN & SEBARAN CAPAIAN SERTIFIKASI PER TAHUN (DINAMIS)
            </h3>
            <p className="text-xs text-slate-500">
              Distribusi progres persil terbit dan aktif proses berdasarkan tahun pelaksanaan sertifikasi
            </p>
          </div>
          {activeYear !== 'ALL' && (
            <button
              onClick={() => handleYearChange('ALL')}
              className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer self-start sm:self-auto"
            >
              Reset ke Semua Tahun
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sortedYears.map((yr) => {
            const terbitCount = yearlyStats[yr]?.terbit || 0;
            const isSelected = activeYear === String(yr);

            return (
              <div
                key={yr}
                onClick={() => handleYearChange(isSelected ? 'ALL' : String(yr))}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-sm text-slate-900">Tahun {yr}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Sertifikat Terbit
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1 mb-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-500 text-[11px]">Realisasi Terbit:</span>
                    <span className="text-emerald-700 font-extrabold text-base">{terbitCount} <span className="text-xs font-normal text-slate-500">Persil</span></span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {isSelected ? '✓ Terpilih untuk evaluasi target' : 'Klik untuk evaluasi tahun ini'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown per Jenis Aset Cards */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-700" />
          RINGKASAN SERTIFIKASI BERDASARKAN JENIS ASET
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {summaries.map((s) => {
            const catRate = s.totalAset > 0 ? ((s.sertifikatTerbit.total / s.totalAset) * 100).toFixed(1) : '0';
            return (
              <div key={s.unit} className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-xs text-slate-900">{s.jenisAset || s.unit}</h3>
                  <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full">
                    {catRate}% Selesai
                  </span>
                </div>

              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Target Pensertipikatan:</span>
                  <span className="font-bold text-slate-900">{s.target} Persil</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Total Aset Terdata:</span>
                  <span className="font-bold text-slate-900">{s.totalAset} Persil</span>
                </div>
                <div className="flex justify-between items-center text-emerald-700 font-semibold">
                  <span>Sertifikat Terbit:</span>
                  <span className="font-bold">{s.sertifikatTerbit.total} Persil</span>
                </div>
                <div className="flex justify-between items-center text-amber-800">
                  <span>Sedang Proses BPN:</span>
                  <span className="font-bold">{s.totalAset - s.sertifikatTerbit.total} Persil</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-700 h-full rounded-full"
                    style={{ width: `${catRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* 16 Stages Aggregate Bar Visualizer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-700" />
          DISTRIBUSI ASET PADA 16 TAHAPAN BPN (UPT MADIUN)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Jumlah persil tanah yang sedang berjalan pada masing-masing tahapan di seluruh Kantah BPN
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
          {BPN_STAGES.map((st) => {
            const sumStage = summaries.reduce((acc, s) => acc + (s.tahapanBpn[st.stageNumber] || 0), 0);
            return (
              <div key={st.stageNumber} className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 text-center">
                <div className="text-[10px] font-bold text-slate-500">Tahap {st.stageNumber}</div>
                <div className="text-lg font-black text-slate-900 my-1">{sumStage}</div>
                <div className="text-[9px] text-slate-600 line-clamp-2 leading-tight">
                  {st.shortName}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
