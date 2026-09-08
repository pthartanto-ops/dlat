import React from 'react';
import { UnitSummaryData } from '../types';
import { BPN_STAGES } from '../data/mockData';
import { Building, Info, ArrowUpRight, HelpCircle } from 'lucide-react';

interface UptSummaryTableProps {
  summaries: UnitSummaryData[];
  selectedUnit: string;
  onSelectUnit: (unit: string) => void;
  selectedStageFilter?: number | null;
  onSelectStageFilter?: (stage: number | null) => void;
  targetYear?: number;
}

export const UptSummaryTable: React.FC<UptSummaryTableProps> = ({
  summaries,
  selectedUnit,
  onSelectUnit,
  selectedStageFilter,
  onSelectStageFilter,
  targetYear,
}) => {
  // Menentukan 5 tahun terakhir secara dinamis dan penggabungan tahun di bawahnya dengan tanda ">"
  const { displayYears, oldestYear, latestYear, olderLabel } = React.useMemo(() => {
    const detectedYears = new Set<number>();
    summaries.forEach((row) => {
      if (row.sertifikatTerbit.yearly) {
        Object.keys(row.sertifikatTerbit.yearly).forEach((y) => {
          const num = Number(y);
          if (num > 0) detectedYears.add(num);
        });
      }
    });

    // Batas tahun maksimal ditentukan oleh tahun terbit aset terdeteksi dan tahun target KPI aktif
    let maxYear = 2025;
    if (targetYear && targetYear > maxYear) {
      maxYear = targetYear;
    }
    detectedYears.forEach((y) => {
      if (y > maxYear) maxYear = y;
    });

    // 5 tahun terakhir: [maxYear - 4, maxYear - 3, maxYear - 2, maxYear - 1, maxYear]
    const years = [maxYear - 4, maxYear - 3, maxYear - 2, maxYear - 1, maxYear];
    const minYear = years[0];

    return {
      displayYears: years,
      oldestYear: minYear,
      latestYear: maxYear,
      olderLabel: `>${minYear}`, // Contoh: ">2022" jika targetYear 2026
    };
  }, [summaries, targetYear]);

  // Helper untuk mendapatkan jumlah sertifikat terbit per tahun
  const getYearCount = (row: UnitSummaryData, yr: number) => {
    if (row.sertifikatTerbit.yearly && row.sertifikatTerbit.yearly[yr] !== undefined) {
      return row.sertifikatTerbit.yearly[yr] || 0;
    }
    if (yr === 2021) return row.sertifikatTerbit.y2021 || 0;
    if (yr === 2022) return row.sertifikatTerbit.y2022 || 0;
    if (yr === 2023) return row.sertifikatTerbit.y2023 || 0;
    if (yr === 2024) return row.sertifikatTerbit.y2024 || 0;
    if (yr === 2025) return row.sertifikatTerbit.y2025 || 0;
    return 0;
  };

  // Helper untuk mendapatkan jumlah sertifikat di bawah 5 tahun terakhir (digabungkan di >oldestYear)
  const getOlderCount = (row: UnitSummaryData) => {
    const fiveYearsSum = displayYears.reduce((acc, yr) => acc + getYearCount(row, yr), 0);
    return Math.max(0, row.sertifikatTerbit.total - fiveYearsSum);
  };

  const totalRow = React.useMemo(() => {
    const res: UnitSummaryData = {
      unit: 'TOTAL KESELURUHAN',
      jenisAset: 'TOTAL KESELURUHAN',
      isTotal: true,
      target: 0,
      totalAset: 0,
      sertifikatTerbit: {
        pre2021: 0,
        y2021: 0,
        y2022: 0,
        y2023: 0,
        y2024: 0,
        total: 0,
        yearly: {},
      },
      statusSebelumBpn: {
        sph: 0,
        tanpaSph: 0,
      },
      tahapanBpn: {},
    };

    // initialize tahapan
    for (let i = 1; i <= 16; i++) {
      res.tahapanBpn[i] = 0;
    }

    summaries.forEach((row) => {
      res.target += row.target;
      res.totalAset += row.totalAset;
      res.sertifikatTerbit.pre2021 += row.sertifikatTerbit.pre2021;
      res.sertifikatTerbit.y2021 += row.sertifikatTerbit.y2021;
      res.sertifikatTerbit.y2022 += row.sertifikatTerbit.y2022;
      res.sertifikatTerbit.y2023 += row.sertifikatTerbit.y2023;
      res.sertifikatTerbit.y2024 += row.sertifikatTerbit.y2024;
      res.sertifikatTerbit.total += row.sertifikatTerbit.total;

      if (row.sertifikatTerbit.yearly) {
        Object.entries(row.sertifikatTerbit.yearly).forEach(([yr, count]) => {
          const yNum = Number(yr);
          res.sertifikatTerbit.yearly![yNum] = (res.sertifikatTerbit.yearly![yNum] || 0) + Number(count || 0);
        });
      }

      res.statusSebelumBpn.sph += row.statusSebelumBpn.sph;
      res.statusSebelumBpn.tanpaSph += row.statusSebelumBpn.tanpaSph;

      for (let i = 1; i <= 16; i++) {
        res.tahapanBpn[i] += row.tahapanBpn[i] || 0;
      }
    });

    return res;
  }, [summaries]);

  const allRows = [...summaries, totalRow];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-6">
      {/* Table Title Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-emerald-950 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-emerald-900">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-700/80 rounded-lg text-emerald-100">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              RINGKASAN SERTIFIKASI ASET TANAH BERDASARKAN JENIS ASET
              <span className="text-[10px] bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded font-normal border border-emerald-700">
                16 Tahapan BPN
              </span>
            </h2>
            <p className="text-[11px] text-slate-300">
              Klik jenis aset atau angka tahapan untuk memfilter tabel detail aset di bawah
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {selectedStageFilter && onSelectStageFilter && (
            <button
              onClick={() => onSelectStageFilter(null)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded text-[11px] transition-colors flex items-center gap-1 shadow-xs"
            >
              <span>Reset Filter Tahap {selectedStageFilter}</span>
              <span className="bg-amber-950/20 text-slate-950 rounded-full w-4 h-4 flex items-center justify-center text-[9px]">
                ✕
              </span>
            </button>
          )}
          <span className="text-emerald-300/80 text-[11px] hidden md:inline">
            *Geser tabel ke kanan untuk melihat tahapan 1 - 16
          </span>
        </div>
      </div>

      {/* Horizontal Scrollable Table Wrapper */}
      <div className="overflow-x-auto w-full relative">
        <table className="w-full text-xs text-left border-collapse min-w-[1400px]">
          {/* Header Tier 1 & Tier 2 */}
          <thead>
            {/* Tier 1 */}
            <tr className="bg-emerald-800 text-white font-semibold text-center border-b border-emerald-700">
              <th
                rowSpan={2}
                className="py-2.5 px-3 text-left sticky left-0 z-20 bg-emerald-800 border-r border-emerald-700 min-w-[140px]"
              >
                JENIS ASET
              </th>
              <th rowSpan={2} className="py-2.5 px-2.5 border-r border-emerald-700 min-w-[65px]">
                TARGET
              </th>
              <th rowSpan={2} className="py-2.5 px-2.5 border-r border-emerald-700 min-w-[70px]">
                TOTAL ASET
              </th>
              <th
                colSpan={displayYears.length + 2}
                className="py-1.5 px-2 bg-emerald-850 border-r border-emerald-700 uppercase tracking-wider text-[11px]"
              >
                SERTIFIKAT TERBIT ({olderLabel} S/D {latestYear})
              </th>
              <th
                colSpan={2}
                className="py-1.5 px-2 bg-emerald-900 border-r border-emerald-700 uppercase tracking-wider text-[11px]"
              >
                Status Sebelum BPN
              </th>
              <th
                colSpan={16}
                className="py-1.5 px-2 bg-teal-900 border-r border-emerald-700 uppercase tracking-wider text-[11px]"
              >
                Status Tahapan Proses di BPN (1 s/d 16)
              </th>
            </tr>

            {/* Tier 2 */}
            <tr className="bg-emerald-700 text-emerald-100 text-[11px] font-medium text-center border-b border-emerald-600">
              {/* Sertifikat Terbit Sub-cols (5 Tahun Terakhir & Penggabungan Tahun Lebih Lama) */}
              <th
                className="py-1.5 px-2 border-r border-emerald-600/70"
                title={`Sertifikat terbit di bawah/lebih lama dari tahun ${oldestYear}`}
              >
                {olderLabel}
              </th>
              {displayYears.map((yr) => (
                <th key={yr} className="py-1.5 px-2 border-r border-emerald-600/70">
                  {yr}
                </th>
              ))}
              <th className="py-1.5 px-2 border-r border-emerald-800 bg-emerald-800 text-amber-300 font-bold">
                Total Terbit
              </th>

              {/* Status Sebelum BPN Sub-cols */}
              <th className="py-1.5 px-2 border-r border-emerald-600/70 bg-emerald-900/60 min-w-[55px]">SPH</th>
              <th className="py-1.5 px-2 border-r border-emerald-800 bg-emerald-900/60 min-w-[65px]">Tanpa SPH</th>

              {/* Tahapan BPN 1 to 16 Sub-cols */}
              {BPN_STAGES.map((st) => (
                <th
                  key={st.stageNumber}
                  title={st.name}
                  className={`py-1.5 px-1.5 border-r border-teal-800/60 min-w-[44px] cursor-help hover:bg-teal-700 transition-colors ${
                    selectedStageFilter === st.stageNumber ? 'bg-amber-400 text-slate-950 font-bold' : ''
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span className="font-bold">{st.stageNumber}</span>
                    <span className="text-[9px] opacity-80 whitespace-nowrap overflow-hidden text-ellipsis max-w-[42px]">
                      {st.code}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-200 font-medium">
            {allRows.map((row, idx) => {
              const isSelected = selectedUnit === row.unit;
              const isTotalRow = row.isTotal;

              return (
                <tr
                  key={row.unit}
                  onClick={() => !isTotalRow && onSelectUnit(row.unit)}
                  className={`transition-colors ${
                    isTotalRow
                      ? 'bg-slate-900 text-white font-bold hover:bg-slate-950 border-t-2 border-slate-700'
                      : isSelected
                      ? 'bg-emerald-50 text-slate-900 font-semibold ring-1 ring-inset ring-emerald-500 cursor-pointer'
                      : idx % 2 === 0
                      ? 'bg-white hover:bg-slate-50 cursor-pointer text-slate-800'
                      : 'bg-slate-50/60 hover:bg-slate-100 cursor-pointer text-slate-800'
                  }`}
                >
                  {/* Unit Column (Sticky Left) */}
                  <td
                    className={`py-2 px-3 text-left font-bold sticky left-0 z-10 border-r ${
                      isTotalRow
                        ? 'bg-slate-900 text-amber-300 border-slate-700'
                        : isSelected
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="tracking-tight">{row.unit}</span>
                      {!isTotalRow && (
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />
                      )}
                    </div>
                  </td>

                  {/* Target */}
                  <td
                    className={`py-2 px-2 text-center border-r ${
                      isTotalRow ? 'border-slate-700 text-amber-200' : 'border-slate-200 text-slate-700 font-semibold'
                    }`}
                  >
                    {row.target}
                  </td>

                  {/* Total Aset */}
                  <td
                    className={`py-2 px-2 text-center border-r ${
                      isTotalRow ? 'border-slate-700 text-white font-bold' : 'border-slate-200 text-slate-800 font-bold'
                    }`}
                  >
                    {row.totalAset}
                  </td>

                  {/* Sertifikat Terbit Columns (5 Tahun Terakhir & Penggabungan Tahun Lebih Lama) */}
                  <td className={`py-2 px-2 text-center border-r ${isTotalRow ? 'border-slate-700 text-slate-200' : 'border-slate-200 text-slate-600'}`}>
                    {getOlderCount(row)}
                  </td>
                  {displayYears.map((yr) => {
                    const count = getYearCount(row, yr);
                    return (
                      <td
                        key={yr}
                        className={`py-2 px-2 text-center border-r ${
                          isTotalRow ? 'border-slate-700 text-slate-200 font-semibold' : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {count}
                      </td>
                    );
                  })}
                  <td
                    className={`py-2 px-2 text-center border-r font-bold ${
                      isTotalRow
                        ? 'border-slate-700 text-emerald-400 bg-slate-800'
                        : 'border-slate-200 text-emerald-700 bg-emerald-50/50'
                    }`}
                  >
                    {row.sertifikatTerbit.total}
                  </td>

                  {/* Status Sebelum BPN Columns */}
                  <td
                    className={`py-2 px-2 text-center border-r ${
                      isTotalRow ? 'border-slate-700 text-blue-300' : 'border-slate-200 text-blue-700 font-medium'
                    }`}
                  >
                    {row.statusSebelumBpn.sph}
                  </td>
                  <td
                    className={`py-2 px-2 text-center border-r ${
                      isTotalRow ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600 font-medium'
                    }`}
                  >
                    {row.statusSebelumBpn.tanpaSph}
                  </td>

                  {/* Tahapan BPN 1 to 16 Columns */}
                  {BPN_STAGES.map((st) => {
                    const count = row.tahapanBpn[st.stageNumber] || 0;
                    const isStageActive = selectedStageFilter === st.stageNumber;

                    return (
                      <td
                        key={st.stageNumber}
                        onClick={(e) => {
                          if (onSelectStageFilter) {
                            e.stopPropagation();
                            onSelectStageFilter(isStageActive ? null : st.stageNumber);
                          }
                        }}
                        title={`${row.unit} - ${st.name}: ${count} persil`}
                        className={`py-2 px-1 text-center border-r transition-colors ${
                          isStageActive
                            ? 'bg-amber-300 text-slate-950 font-extrabold'
                            : isTotalRow
                            ? 'border-slate-800 text-emerald-300 hover:bg-slate-800'
                            : count > 0
                            ? 'border-slate-200 text-slate-800 hover:bg-teal-50'
                            : 'border-slate-100 text-slate-300'
                        }`}
                      >
                        {count > 0 ? (
                          <span
                            className={`inline-block px-1 py-0.5 rounded text-[11px] ${
                              isTotalRow
                                ? 'font-bold'
                                : count >= 10
                                ? 'bg-amber-100 text-amber-900 font-semibold'
                                : 'font-medium'
                            }`}
                          >
                            {count}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stage Legend Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-emerald-600" />
            Legenda 16 Tahap BPN:
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> 1-3: Pemberkasan & Pendaftaran
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 4-7: Pengukuran & PBT
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> 8-11: Sidang & Risalah Panitia A
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span> 12-15: SK Hak & Pembukuan
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-600"></span> 16: PNBP 3 & Penyerahan Sertifikat
          </span>
        </div>

        <div className="text-[11px] text-slate-500">
          *Klik baris jenis aset untuk memfilter data aset | Klik angka tahapan untuk filter spesifik
        </div>
      </div>
    </div>
  );
};
