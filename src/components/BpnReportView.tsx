import React, { useState, useMemo } from 'react';
import { AssetItem } from '../types';
import { Landmark, AlertCircle, CheckCircle, Clock, Search, MapPin, Users, Calendar } from 'lucide-react';

interface BpnReportViewProps {
  assets: AssetItem[];
  onFilterByBpn: (bpnName: string) => void;
  availableYears?: number[];
  selectedYear?: string;
  onSelectYear?: (year: string) => void;
}

export const BpnReportView: React.FC<BpnReportViewProps> = ({
  assets,
  onFilterByBpn,
  availableYears = [],
  selectedYear = 'ALL',
  onSelectYear,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalYear, setInternalYear] = useState<string>(selectedYear);

  const activeYear = onSelectYear ? selectedYear : internalYear;
  const handleYearChange = (yr: string) => {
    setInternalYear(yr);
    onSelectYear?.(yr);
  };

  // Derive dynamic list of years present in assets
  const dynamicYears = useMemo(() => {
    const yearSet = new Set<number>([2021, 2022, 2023, 2024, 2025]);
    assets.forEach((a) => {
      if (a.tahun && a.tahun > 0) yearSet.add(a.tahun);
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [assets]);

  // Group all assets by Kantah BPN without year constraint on active stages
  // (Tahun pada data hanya digunakan untuk target dan sertifikat terbit)
  const bpnGroups = useMemo(() => {
    const map: Record<
      string,
      {
        name: string;
        total: number;
        terbitAll: number;
        terbitEvaluasi: number;
        proses: number;
        pnbpPaid: number;
        pemberkasan: number; // 1-3
        pengukuran: number; // 4-7
        pemeriksaan: number; // 8-11
        skDanBuku: number; // 12-16
        kendalaCount: number;
      }
    > = {};

    assets.forEach((a) => {
      const bpn = a.bpn || 'BPN Lainnya';
      if (!map[bpn]) {
        map[bpn] = {
          name: bpn,
          total: 0,
          terbitAll: 0,
          terbitEvaluasi: 0,
          proses: 0,
          pnbpPaid: 0,
          pemberkasan: 0,
          pengukuran: 0,
          pemeriksaan: 0,
          skDanBuku: 0,
          kendalaCount: 0,
        };
      }

      map[bpn].total++;
      map[bpn].pnbpPaid += a.totalPnbp || 0;

      const isTerbit = a.tahapan >= 17 || a.statusDisplay === 'TERBIT';
      if (isTerbit) {
        map[bpn].terbitAll++;
        if (activeYear === 'ALL' || String(a.tahun) === activeYear) {
          map[bpn].terbitEvaluasi++;
        }
      } else {
        map[bpn].proses++;
        if (a.tahapan <= 3) map[bpn].pemberkasan++;
        else if (a.tahapan <= 7) map[bpn].pengukuran++;
        else if (a.tahapan <= 11) map[bpn].pemeriksaan++;
        else map[bpn].skDanBuku++;
      }

      if (a.kendala && !a.kendala.includes('Lancar') && !a.kendala.includes('Tersimpan')) {
        map[bpn].kendalaCount++;
      }
    });

    return Object.values(map);
  }, [assets, activeYear]);

  const filteredBpn = bpnGroups.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatRp = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-teal-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-emerald-600" />
            MONITORING POKJA KANTAH BPN WILAYAH KERJA UPT MADIUN
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Sebaran 16 Tahapan per Kantor Pertanahan (Kantah ATR/BPN)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pantau beban berkas, hambatan tahapan, dan realisasi sertipikat tanah PLN di masing-masing Kantah
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Dynamic Year Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 py-1.5 rounded-lg text-xs w-full sm:w-auto">
            <Calendar className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
            <span className="font-bold text-slate-600">Evaluasi Tahun:</span>
            <select
              id="bpn-report-year-select"
              value={activeYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">Semua Tahun Terbit</option>
              {dynamicYears.map((yr) => (
                <option key={yr} value={String(yr)}>
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter nama Kantah BPN..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Domain scope info note */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center gap-2.5 shadow-2xs">
        <span className="font-bold text-emerald-800">ℹ️</span>
        <span>
          <strong>Ketentuan Data Pokja BPN:</strong> Beban berkas proses (tahapan 1-16) dan total persil di seluruh Kantah BPN mencakup seluruh aset UPT Madiun tanpa batasan tahun. Parameter tahun dikhususkan untuk evaluasi penetapan target dan sertifikat terbit.
        </span>
      </div>

      {/* BPN Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBpn.map((bpn) => {
          const certRate = bpn.total > 0 ? ((bpn.terbitAll / bpn.total) * 100).toFixed(1) : '0';
          const displayTerbit = activeYear === 'ALL' ? bpn.terbitAll : bpn.terbitEvaluasi;

          return (
            <div
              key={bpn.name}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-emerald-500 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 leading-tight">{bpn.name}</h3>
                      <span className="text-[10px] text-slate-500 font-medium">Kantor Pertanahan Kab/Kota</span>
                    </div>
                  </div>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs px-2 py-0.5 rounded-md">
                    {certRate}% Terbit
                  </span>
                </div>

                {/* Main Stats */}
                <div className="grid grid-cols-3 gap-2 my-3 text-center">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-bold">TOTAL</div>
                    <div className="text-base font-black text-slate-900">{bpn.total}</div>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    <div className="text-[10px] text-emerald-700 font-bold">
                      {activeYear === 'ALL' ? 'TERBIT' : `TERBIT '${activeYear.slice(-2)}`}
                    </div>
                    <div className="text-base font-black text-emerald-700">{displayTerbit}</div>
                  </div>
                  <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <div className="text-[10px] text-amber-700 font-bold">PROSES BPN</div>
                    <div className="text-base font-black text-amber-700">{bpn.proses}</div>
                  </div>
                </div>

                {/* 4 Stage Clusters */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span> Tahap 1-3 (Pemberkasan):
                    </span>
                    <span className="font-bold text-slate-800">{bpn.pemberkasan} persil</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Tahap 4-7 (Pengukuran & PBT):
                    </span>
                    <span className="font-bold text-slate-800">{bpn.pengukuran} persil</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span> Tahap 8-11 (Panitia A):
                    </span>
                    <span className="font-bold text-slate-800">{bpn.pemeriksaan} persil</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span> Tahap 12-16 (SK Hak & Terbit):
                    </span>
                    <span className="font-bold text-slate-800">{bpn.skDanBuku} persil</span>
                  </div>
                </div>

                {/* Kendala notice if any */}
                {bpn.kendalaCount > 0 && (
                  <div className="mt-3 p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                    <span>{bpn.kendalaCount} persil dilaporkan terdapat kendala lapangan</span>
                  </div>
                )}
              </div>

              {/* Card Footer Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  PNBP: {formatRp(bpn.pnbpPaid)}
                </span>
                <button
                  onClick={() => onFilterByBpn(bpn.name)}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-bold hover:underline"
                >
                  Filter di Tabel Detail →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
