import React, { useState, useMemo } from 'react';
import { AssetItem, UnitSummaryData } from '../types';
import { Layers, CheckCircle2, AlertCircle, Building, MapPin, ArrowRight, Calendar } from 'lucide-react';

interface UltgDashboardViewProps {
  summaries: UnitSummaryData[];
  assets: AssetItem[];
  onNavigateToDetail: (ultgName: string) => void;
  availableYears?: number[];
  selectedYear?: string;
  onSelectYear?: (year: string) => void;
  targetYear?: number;
}

export const UltgDashboardView: React.FC<UltgDashboardViewProps> = ({
  summaries,
  assets,
  onNavigateToDetail,
  availableYears = [],
  selectedYear = 'ALL',
  onSelectYear,
  targetYear,
}) => {
  const [activeUltgTab, setActiveUltgTab] = useState<string>('ULTG MADIUN');
  const [internalYear, setInternalYear] = useState<string>(selectedYear);

  const activeYear = onSelectYear ? selectedYear : internalYear;
  const handleYearChange = (yr: string) => {
    setInternalYear(yr);
    onSelectYear?.(yr);
  };

  const currentSummary = summaries.find((s) => s.unit === activeUltgTab) || summaries[0];
  const allUltgAssets = useMemo(() => assets.filter((a) => a.ultg === activeUltgTab), [assets, activeUltgTab]);

  // Menentukan 5 tahun terakhir dan label gabungan tahun di bawahnya (>oldestYear)
  const { displayYears, oldestYear, latestYear, olderLabel } = useMemo(() => {
    const detectedYears = new Set<number>();
    if (currentSummary?.sertifikatTerbit?.yearly) {
      Object.keys(currentSummary.sertifikatTerbit.yearly).forEach((y) => {
        const num = Number(y);
        if (num > 0) detectedYears.add(num);
      });
    }
    allUltgAssets.forEach((a) => {
      if (a.tahun && a.tahun > 0) detectedYears.add(a.tahun);
    });

    let maxYear = 2025;
    if (targetYear && targetYear > maxYear) {
      maxYear = targetYear;
    }
    detectedYears.forEach((y) => {
      if (y > maxYear) maxYear = y;
    });

    const years = [maxYear - 4, maxYear - 3, maxYear - 2, maxYear - 1, maxYear];
    const minYear = years[0];

    return {
      displayYears: years,
      oldestYear: minYear,
      latestYear: maxYear,
      olderLabel: `>${minYear}`,
    };
  }, [currentSummary, allUltgAssets, targetYear]);

  const getYearCount = (yr: number) => {
    if (currentSummary?.sertifikatTerbit?.yearly && currentSummary.sertifikatTerbit.yearly[yr] !== undefined) {
      return currentSummary.sertifikatTerbit.yearly[yr] || 0;
    }
    if (yr === 2021) return currentSummary?.sertifikatTerbit?.y2021 || 0;
    if (yr === 2022) return currentSummary?.sertifikatTerbit?.y2022 || 0;
    if (yr === 2023) return currentSummary?.sertifikatTerbit?.y2023 || 0;
    if (yr === 2024) return currentSummary?.sertifikatTerbit?.y2024 || 0;
    if (yr === 2025) return currentSummary?.sertifikatTerbit?.y2025 || 0;
    return 0;
  };

  const olderCount = useMemo(() => {
    if (!currentSummary) return 0;
    const fiveYearsSum = displayYears.reduce((sum, yr) => sum + getYearCount(yr), 0);
    return Math.max(0, (currentSummary.sertifikatTerbit?.total || 0) - fiveYearsSum);
  }, [currentSummary, displayYears]);

  const totalAssetsCount = currentSummary?.totalAset || allUltgAssets.length;
  const totalTerbitAll = currentSummary?.sertifikatTerbit?.total || allUltgAssets.filter((a) => a.tahapan >= 17 || a.statusDisplay === 'TERBIT').length;
  const terbitEvaluasi = activeYear === 'ALL'
    ? totalTerbitAll
    : allUltgAssets.filter((a) => (a.tahapan >= 17 || a.statusDisplay === 'TERBIT') && String(a.tahun) === activeYear).length;
  const totalProsesBpn = allUltgAssets.filter((a) => a.tahapan >= 1 && a.tahapan <= 16).length || (totalAssetsCount - totalTerbitAll);

  const targetCount = currentSummary?.target || 0;
  const certRateAll = totalAssetsCount > 0 ? ((totalTerbitAll / totalAssetsCount) * 100).toFixed(1) : '0';
  const targetCapaian = targetCount > 0 ? ((terbitEvaluasi / targetCount) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Unit Selector Tabs & Year Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-2">
          {summaries.map((s) => (
            <button
              key={s.unit}
              onClick={() => setActiveUltgTab(s.unit)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeUltgTab === s.unit
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Building className="w-4 h-4" />
              {s.unit}
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeUltgTab === s.unit ? 'bg-emerald-700 text-amber-300' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {s.totalAset}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Dynamic Year Filter Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 py-1 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span className="text-[11px] font-bold text-slate-600">Evaluasi Tahun:</span>
            <select
              id="ultg-dashboard-year-filter"
              value={activeYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="text-xs font-bold bg-transparent text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Tahun Terbit</option>
              {displayYears.map((yr) => (
                <option key={yr} value={String(yr)}>
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onNavigateToDetail(activeUltgTab)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold px-3 py-1.5 flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
          >
            Lihat Register Persil {activeUltgTab}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Info note */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center gap-2.5 shadow-2xs">
        <span className="font-bold text-emerald-800">ℹ️</span>
        <span>
          <strong>Ketentuan Data {activeUltgTab}:</strong> Parameter tahun hanya digunakan untuk target sertifikasi dan sertifikat terbit. Data <strong>Total Aset ({totalAssetsCount} persil)</strong>, <strong>Alas Hak SPH</strong>, dan <strong>Proses BPN</strong> mencakup seluruh persil eksisting dan tidak dibatasi tahun.
        </span>
      </div>

      {/* ULTG Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[10px] font-bold uppercase text-slate-400">Target Sertifikasi</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{targetCount} Persil</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Total Populasi Aset: <strong>{totalAssetsCount}</strong> persil
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[10px] font-bold uppercase text-emerald-600">
            {activeYear === 'ALL' ? 'Sertifikat Terbit (Kumulatif)' : `Sertifikat Terbit (${activeYear})`}
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{terbitEvaluasi} Persil</div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1">
            {activeYear === 'ALL'
              ? `${certRateAll}% dari total aset telah terbit`
              : `${targetCapaian}% tercapai dari target ${targetCount} persil`}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[10px] font-bold uppercase text-amber-700">Proses di BPN</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {totalProsesBpn} Persil
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">Berjalan di 16 tahapan BPN</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[10px] font-bold uppercase text-blue-700">Alas Hak SPH / Non-SPH</div>
          <div className="text-2xl font-black text-slate-800 mt-1">
            {currentSummary.statusSebelumBpn.sph}{' '}
            <span className="text-xs font-normal text-slate-500">/ {currentSummary.statusSebelumBpn.tanpaSph}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Status yuridis awal kepemilikan</div>
        </div>
      </div>

      {/* Sertifikat Terbit per Tahun Breakdown (Dynamic) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-700" />
            Tren Penerbitan Sertifikat Per Tahun - {activeUltgTab}
          </h3>
          <span className="text-xs text-slate-500">
            {activeYear === 'ALL' ? 'Menampilkan seluruh histori tahun' : `Difilter untuk Tahun: ${activeYear}`}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold">{olderLabel}</div>
            <div className="text-xl font-bold text-slate-800 my-1">{olderCount}</div>
            <div className="text-[10px] text-slate-500">Sertifikat Lama</div>
          </div>
          {displayYears.map((yr) => {
            const count = getYearCount(yr);
            const isHighlighted = activeYear === String(yr);

            return (
              <div
                key={yr}
                onClick={() => handleYearChange(isHighlighted ? 'ALL' : String(yr))}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isHighlighted
                    ? 'border-emerald-600 bg-emerald-50 shadow-xs ring-2 ring-emerald-500'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="text-[10px] text-slate-500 font-bold">{yr}</div>
                <div className="text-xl font-bold text-emerald-700 my-1">{count}</div>
                <div className="text-[10px] text-slate-500">Realisasi {yr}</div>
              </div>
            );
          })}
          <div className="bg-emerald-900 text-white p-3 rounded-lg border border-emerald-950">
            <div className="text-[10px] text-amber-300 font-bold">TOTAL TERBIT</div>
            <div className="text-xl font-black text-white my-1">{currentSummary.sertifikatTerbit.total}</div>
            <div className="text-[10px] text-emerald-200">Sertipikat Hak Pakai</div>
          </div>
        </div>
      </div>

      {/* Top Assets in this ULTG Sample */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-bold text-xs text-slate-800">
            Daftar Sampel Aset Terkini ({activeUltgTab})
          </span>
          <span className="text-[11px] text-slate-500">
            Total {allUltgAssets.length} aset terdata di {activeUltgTab}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">ID</th>
                <th className="py-2 px-3">Penghantar / Jalur</th>
                <th className="py-2 px-3">Aset Properti</th>
                <th className="py-2 px-3">Aset CBM</th>
                <th className="py-2 px-3">Desa / BPN</th>
                <th className="py-2 px-3">Tahapan</th>
                <th className="py-2 px-3">No Sertifikat</th>
                <th className="py-2 px-3">Kendala</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {allUltgAssets.slice(0, 8).map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono text-slate-500">{a.id}</td>
                  <td className="py-2 px-3 text-slate-900 font-semibold">{a.penghantar}</td>
                  <td className="py-2 px-3 text-slate-700">{a.asetProperti || a.asetLapangan}</td>
                  <td className="py-2 px-3 text-slate-700 font-mono text-xs">{a.asetCbm && a.asetCbm !== '-' ? a.asetCbm : '-'}</td>
                  <td className="py-2 px-3 text-slate-700">
                    {a.desa} ({a.bpn})
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.statusDisplay === 'TERBIT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {a.statusDisplay}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-800">{a.noSertifikat}</td>
                  <td className="py-2 px-3 text-slate-600 text-[11px]">{a.kendala}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
