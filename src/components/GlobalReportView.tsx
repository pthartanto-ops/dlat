import React, { useState, useMemo } from 'react';
import { AssetItem, UnitSummaryData } from '../types';
import { FileText, Download, Printer, TrendingUp, DollarSign, CheckCircle, ShieldAlert, Award, Calendar } from 'lucide-react';

interface GlobalReportViewProps {
  summaries: UnitSummaryData[];
  assets: AssetItem[];
  onExportCsv: () => void;
  availableYears?: number[];
  selectedYear?: string;
  onSelectYear?: (year: string) => void;
}

export const GlobalReportView: React.FC<GlobalReportViewProps> = ({
  summaries,
  assets,
  onExportCsv,
  availableYears = [],
  selectedYear = 'ALL',
  onSelectYear,
}) => {
  const [internalYear, setInternalYear] = useState<string>(selectedYear);
  const activeYear = onSelectYear ? selectedYear : internalYear;
  const handleYearChange = (yr: string) => {
    setInternalYear(yr);
    onSelectYear?.(yr);
  };

  // Filter assets based on activeYear
  const filteredAssets = useMemo(() => {
    if (activeYear === 'ALL') return assets;
    if (activeYear === 'EMPTY') return assets.filter((a) => !a.tahun || a.tahun <= 0);
    return assets.filter((a) => String(a.tahun) === activeYear);
  }, [assets, activeYear]);

  // Dynamic statistics per year for report breakdown
  const yearBreakdown = useMemo(() => {
    const map: Record<number, { total: number; terbit: number; sph: number; tanpaSph: number; pnbp: number }> = {};
    assets.forEach((a) => {
      const yr = a.tahun && a.tahun > 0 ? a.tahun : 0;
      if (!map[yr]) {
        map[yr] = { total: 0, terbit: 0, sph: 0, tanpaSph: 0, pnbp: 0 };
      }
      map[yr].total++;
      if (a.tahapan >= 17 || a.statusDisplay === 'TERBIT') map[yr].terbit++;
      if (a.alasHak === 'SPH') map[yr].sph++;
      if (a.alasHak === 'Tanpa SPH') map[yr].tanpaSph++;
      map[yr].pnbp += a.totalPnbp || 0;
    });
    return map;
  }, [assets]);

  const sortedYears = useMemo(() => {
    return Object.keys(yearBreakdown)
      .map(Number)
      .filter((y) => y > 0)
      .sort((a, b) => b - a);
  }, [yearBreakdown]);

  const totalTarget = summaries.reduce((acc, s) => acc + s.target, 0);
  const totalAset = summaries.reduce((acc, s) => acc + s.totalAset, 0) || assets.length;
  const totalTerbitAll = summaries.reduce((acc, s) => acc + s.sertifikatTerbit.total, 0) || assets.filter((a) => a.tahapan >= 17 || a.statusDisplay === 'TERBIT').length;
  const terbitEvaluasi = activeYear === 'ALL'
    ? totalTerbitAll
    : assets.filter((a) => (a.tahapan >= 17 || a.statusDisplay === 'TERBIT') && String(a.tahun) === activeYear).length;

  const totalSph = assets.filter((a) => a.alasHak === 'SPH').length;
  const totalTanpaSph = assets.filter((a) => a.alasHak === 'Tanpa SPH').length;

  const totalPnbpPaid = assets.reduce((acc, a) => acc + (a.totalPnbp || 0), 0);
  const estimatedPnbpRemaining = (totalAset - totalTerbitAll) * 4500000;

  const formatRp = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const periodSubtitle = useMemo(() => {
    if (activeYear !== 'ALL') {
      return `Evaluasi Target & Terbit: Tahun ${activeYear}`;
    }
    if (sortedYears.length > 0) {
      const minYr = sortedYears[sortedYears.length - 1];
      const maxYr = sortedYears[0];
      return `Evaluasi Target & Terbit: Multi-Tahun (${minYr} - ${maxYr})`;
    }
    return `Evaluasi Target & Terbit: Seluruh Periode Terbit`;
  }, [activeYear, sortedYears]);

  return (
    <div className="space-y-6">
      {/* Report Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            LAPORAN EKSEKUTIF GLOBAL SERTIFIKASI TANAH
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Kinerja Legalisasi & Penertiban Aset Tanah UPT Madiun
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {periodSubtitle} | Sumber Data: SIMAS-TANAH Terintegrasi ATR/BPN
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dynamic Year Filter in Report View */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span className="font-bold text-slate-600">Evaluasi Tahun:</span>
            <select
              id="global-report-year-select"
              value={activeYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Tahun Terbit</option>
              {sortedYears.map((yr) => (
                <option key={yr} value={String(yr)}>
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            Cetak PDF
          </button>
          <button
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Unduh Excel / CSV
          </button>
        </div>
      </div>

      {/* Scope banner note */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center gap-2.5 shadow-2xs">
        <span className="font-bold text-emerald-800">ℹ️</span>
        <span>
          <strong>Ketentuan Data:</strong> Parameter tahun pada aplikasi hanya digunakan untuk evaluasi <strong>Target Sertifikasi</strong> dan <strong>Realisasi Sertifikat Terbit</strong>. Total Populasi Aset ({totalAset} persil), status legalitas SPH, dan realisasi PNBP mencakup seluruh aset UPT Madiun dan tidak dibatasi oleh tahun.
        </span>
      </div>

      {/* Global Financial & Operational Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-xl shadow-xs">
          <div className="text-xs font-bold text-emerald-400 uppercase">Realisasi Anggaran PNBP BPN</div>
          <div className="text-2xl font-black mt-2 text-white">{formatRp(totalPnbpPaid)}</div>
          <p className="text-[11px] text-slate-300 mt-1">
            Total biaya PNBP (SPS 1, 2, 3) yang telah disetorkan ke kas negara
          </p>
          <div className="mt-4 pt-3 border-t border-slate-700/80 text-[11px] text-slate-300">
            Estimasi sisa kebutuhan PNBP: <strong className="text-amber-300">{formatRp(estimatedPnbpRemaining)}</strong>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-900 to-teal-900 text-white p-5 rounded-xl shadow-xs">
          <div className="text-xs font-bold text-amber-300 uppercase">
            {activeYear === 'ALL' ? 'Capaian Terbit Sertifikat' : `Sertifikat Terbit Tahun ${activeYear}`}
          </div>
          <div className="text-2xl font-black mt-2 text-white">
            {terbitEvaluasi} <span className="text-sm font-normal text-emerald-200">/ {totalTarget} Target Persil</span>
          </div>
          <p className="text-[11px] text-emerald-100 mt-1">
            {activeYear === 'ALL'
              ? `Rasio Akumulasi Terbit: ${((totalTerbitAll / totalAset) * 100).toFixed(1)}% dari ${totalAset} persil`
              : `Capaian Target Tahun ${activeYear}: ${((terbitEvaluasi / totalTarget) * 100).toFixed(1)}%`}
          </p>
          <div className="mt-4 pt-3 border-t border-emerald-800/80 text-[11px] text-emerald-200">
            Total Kumulatif Terbit: <strong className="text-white">{totalTerbitAll} persil</strong>
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-900 to-emerald-950 text-white p-5 rounded-xl shadow-xs">
          <div className="text-xs font-bold text-teal-300 uppercase">Kesiapan Alas Hak Tanah</div>
          <div className="text-2xl font-black mt-2 text-white">
            {totalSph} <span className="text-sm font-normal text-teal-200">SPH ({((totalSph / totalAset) * 100).toFixed(0)}%)</span>
          </div>
          <p className="text-[11px] text-teal-100 mt-1">
            Persil memiliki dokumen legal SPH awal dari Kepala Desa/Camat
          </p>
          <div className="mt-4 pt-3 border-t border-teal-800/80 text-[11px] text-teal-200">
            Tanpa SPH: <strong className="text-amber-300">{totalTanpaSph} persil</strong> (Proses sporadik/SK Kanwil)
          </div>
        </div>
      </div>

      {/* Detail Table of Units in Global View */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-900">
          Tabel Rekapitulasi Capaian Yuridis Per ULTG Pelaksana
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-emerald-800 text-white border-b border-emerald-700">
              <tr>
                <th className="py-2.5 px-3">Unit Pelaksana (ULTG)</th>
                <th className="py-2.5 px-3 text-center">Target</th>
                <th className="py-2.5 px-3 text-center">Total Aset</th>
                <th className="py-2.5 px-3 text-center">Sertifikat Terbit</th>
                <th className="py-2.5 px-3 text-center">% Terbit</th>
                <th className="py-2.5 px-3 text-center">SPH</th>
                <th className="py-2.5 px-3 text-center">Tanpa SPH</th>
                <th className="py-2.5 px-3 text-center">Proses BPN</th>
                <th className="py-2.5 px-3 text-center">Status Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {summaries.map((s) => {
                const pct = ((s.sertifikatTerbit.total / s.totalAset) * 100).toFixed(1);
                const isGood = Number(pct) >= 60;
                return (
                  <tr key={s.unit} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{s.unit}</td>
                    <td className="py-2.5 px-3 text-center text-slate-700">{s.target}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">{s.totalAset}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                      {s.sertifikatTerbit.total}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{pct}%</td>
                    <td className="py-2.5 px-3 text-center text-blue-700">{s.statusSebelumBpn.sph}</td>
                    <td className="py-2.5 px-3 text-center text-purple-700">{s.statusSebelumBpn.tanpaSph}</td>
                    <td className="py-2.5 px-3 text-center text-amber-700">
                      {s.totalAset - s.sertifikatTerbit.total}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          isGood
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {isGood ? 'On Track (Baik)' : 'Perlu Akselerasi'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-slate-900 text-white font-bold">
                <td className="py-3 px-3 text-amber-300">TOTAL UPT MADIUN</td>
                <td className="py-3 px-3 text-center text-amber-200">{totalTarget}</td>
                <td className="py-3 px-3 text-center text-white">{totalAset}</td>
                <td className="py-3 px-3 text-center text-emerald-400">{totalTerbitAll}</td>
                <td className="py-3 px-3 text-center text-emerald-300">
                  {((totalTerbitAll / totalAset) * 100).toFixed(1)}%
                </td>
                <td className="py-3 px-3 text-center text-blue-300">{totalSph}</td>
                <td className="py-3 px-3 text-center text-purple-300">{totalTanpaSph}</td>
                <td className="py-3 px-3 text-center text-amber-400">{totalAset - totalTerbitAll}</td>
                <td className="py-3 px-3 text-center text-emerald-400">Target Berjalan</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Breakdown per Tahun Terbit Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-700" />
            Tabel Rekapitulasi Yuridis & Finansial Per Tahun Pelaksanaan (Dinamis)
          </div>
          <span className="text-[11px] text-slate-500">
            Total {sortedYears.length} tahun terdaftar dalam database aset
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Tahun Anggaran</th>
                <th className="py-2.5 px-3 text-center">Total Persil</th>
                <th className="py-2.5 px-3 text-center">Sertifikat Terbit</th>
                <th className="py-2.5 px-3 text-center">% Terbit</th>
                <th className="py-2.5 px-3 text-center">Alas Hak SPH</th>
                <th className="py-2.5 px-3 text-center">Tanpa SPH</th>
                <th className="py-2.5 px-3 text-right">Realisasi PNBP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {sortedYears.map((yr) => {
                const data = yearBreakdown[yr];
                const pct = data.total > 0 ? ((data.terbit / data.total) * 100).toFixed(1) : '0';
                const isSelected = activeYear === String(yr);

                return (
                  <tr
                    key={yr}
                    onClick={() => handleYearChange(isSelected ? 'ALL' : String(yr))}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      Tahun {yr}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">{data.total}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{data.terbit}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{pct}%</td>
                    <td className="py-2.5 px-3 text-center text-blue-700">{data.sph}</td>
                    <td className="py-2.5 px-3 text-center text-purple-700">{data.tanpaSph}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800 font-bold">
                      {formatRp(data.pnbp)}
                    </td>
                  </tr>
                );
              })}
              {yearBreakdown[0] && yearBreakdown[0].total > 0 && (
                <tr
                  onClick={() => handleYearChange(activeYear === 'EMPTY' ? 'ALL' : 'EMPTY')}
                  className={`cursor-pointer transition-colors ${
                    activeYear === 'EMPTY' ? 'bg-amber-50 font-bold' : 'hover:bg-slate-50 text-slate-500'
                  }`}
                >
                  <td className="py-2.5 px-3 italic flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    Tanpa Tahun (Belum Ditentukan)
                  </td>
                  <td className="py-2.5 px-3 text-center">{yearBreakdown[0].total}</td>
                  <td className="py-2.5 px-3 text-center text-emerald-700">{yearBreakdown[0].terbit}</td>
                  <td className="py-2.5 px-3 text-center">
                    {((yearBreakdown[0].terbit / yearBreakdown[0].total) * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-center text-blue-700">{yearBreakdown[0].sph}</td>
                  <td className="py-2.5 px-3 text-center text-purple-700">{yearBreakdown[0].tanpaSph}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">
                    {formatRp(yearBreakdown[0].pnbp)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
