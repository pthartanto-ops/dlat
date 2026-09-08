import React from 'react';
import { FilterState } from '../types';
import { Search, Filter, RotateCcw, SlidersHorizontal, CheckCircle2, AlertTriangle, Clock, Calendar } from 'lucide-react';

interface AssetFilterBarProps {
  filter: FilterState;
  onChangeFilter: (key: keyof FilterState, value: string) => void;
  onResetFilters: () => void;
  uniquePenghantar: string[];
  uniqueDesa: string[];
  uniqueKecamatan: string[];
  uniqueBpn: string[];
  uniqueKategori: string[];
  uniqueKendala: string[];
  uniqueTahun?: (number | string)[];
  totalFiltered: number;
  totalAll: number;
}

export const AssetFilterBar: React.FC<AssetFilterBarProps> = ({
  filter,
  onChangeFilter,
  onResetFilters,
  uniquePenghantar,
  uniqueDesa,
  uniqueKecamatan,
  uniqueBpn,
  uniqueKategori,
  uniqueKendala,
  uniqueTahun = [],
  totalFiltered,
  totalAll,
}) => {
  const isAnyFilterActive =
    Boolean(filter.search) ||
    filter.upt !== 'ALL' ||
    filter.penghantar !== 'ALL' ||
    filter.desa !== 'ALL' ||
    filter.kecamatan !== 'ALL' ||
    filter.bpn !== 'ALL' ||
    filter.kategori !== 'ALL' ||
    filter.kendala !== 'ALL' ||
    filter.tahapan !== 'ALL' ||
    filter.alasHak !== 'ALL' ||
    filter.tahun !== 'ALL';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 mb-4">
      {/* Search and Quick Filters Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-md">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              FILTER & PENCARIAN DETAIL ASET
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {totalFiltered} dari {totalAll} Persil
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Gunakan filter kombinasi di bawah untuk mempersempit data persil tanah
            </p>
          </div>
        </div>

        {/* Search Bar Input */}
        <div className="flex items-center gap-2 w-full md:w-80">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="filter-search-input"
              type="text"
              value={filter.search}
              onChange={(e) => onChangeFilter('search', e.target.value)}
              placeholder="Cari Persil, Sertifikat, NIB, Desa..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
            />
            {filter.search && (
              <button
                onClick={() => onChangeFilter('search', '')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {isAnyFilterActive && (
            <button
              id="btn-reset-filters"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors whitespace-nowrap"
              title="Reset semua filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Filter Dropdowns Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-3">
        {/* Filter UPT / Unit */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Unit / ULTG
          </label>
          <select
            id="filter-upt-select"
            value={filter.upt}
            onChange={(e) => onChangeFilter('upt', e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
          >
            <option value="ALL">Semua Unit</option>
            <option value="UPT MADIUN">UPT MADIUN (Semua)</option>
            <option value="ULTG MADIUN">ULTG MADIUN</option>
            <option value="ULTG KEDIRI">ULTG KEDIRI</option>
            <option value="ULTG BABAT">ULTG BABAT</option>
          </select>
        </div>

        {/* Filter Penghantar / Tower */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Penghantar / Jalur
          </label>
          <select
            id="filter-penghantar-select"
            value={filter.penghantar}
            onChange={(e) => onChangeFilter('penghantar', e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
          >
            <option value="ALL">Semua Penghantar</option>
            {uniquePenghantar.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Filter BPN */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Kantah BPN
          </label>
          <select
            id="filter-bpn-select"
            value={filter.bpn}
            onChange={(e) => onChangeFilter('bpn', e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
          >
            <option value="ALL">Semua BPN</option>
            {uniqueBpn.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Desa / Kecamatan */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Desa / Wilayah
          </label>
          <select
            id="filter-desa-select"
            value={filter.desa}
            onChange={(e) => onChangeFilter('desa', e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
          >
            <option value="ALL">Semua Desa</option>
            {uniqueDesa.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Jenis Aset */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Jenis Aset
          </label>
          <select
            id="filter-kategori-select"
            value={filter.kategori}
            onChange={(e) => onChangeFilter('kategori', e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
          >
            <option value="ALL">Semua Jenis Aset</option>
            {uniqueKategori.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Kendala */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Status Kendala
          </label>
          <select
            id="filter-kendala-select"
            value={filter.kendala}
            onChange={(e) => onChangeFilter('kendala', e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
          >
            <option value="ALL">Semua Kendala</option>
            <option value="LANCAR">Hanya yang Lancar</option>
            <option value="KENDALA">Ada Kendala Lapangan</option>
            {uniqueKendala.map((kd) => (
              <option key={kd} value={kd}>
                {kd.length > 35 ? kd.slice(0, 32) + '...' : kd}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Tahun Terbit / Target */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-emerald-600" />
            Tahun Terbit / Target
          </label>
          <select
            id="filter-tahun-select"
            value={filter.tahun}
            onChange={(e) => onChangeFilter('tahun', e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
          >
            <option value="ALL">Semua Tahun</option>
            {uniqueTahun.map((t) => (
              <option key={t} value={String(t)}>
                Tahun {t}
              </option>
            ))}
            <option value="EMPTY">Tanpa Tahun Terbit</option>
          </select>
        </div>
      </div>

      {/* Quick Status Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-3 mt-2 border-t border-slate-100 text-xs">
        <span className="text-[11px] font-semibold text-slate-500 mr-1">Status Pintas:</span>
        <button
          onClick={() => onChangeFilter('tahapan', 'ALL')}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
            filter.tahapan === 'ALL'
              ? 'bg-slate-800 text-white font-bold'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Semua Tahap
        </button>

        <button
          onClick={() => onChangeFilter('tahapan', 'TERBIT')}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium inline-flex items-center gap-1 transition-colors ${
            filter.tahapan === 'TERBIT'
              ? 'bg-emerald-700 text-white font-bold'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <CheckCircle2 className="w-3 h-3" />
          Sudah Terbit
        </button>

        <button
          onClick={() => onChangeFilter('tahapan', 'PROSES')}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium inline-flex items-center gap-1 transition-colors ${
            filter.tahapan === 'PROSES'
              ? 'bg-amber-600 text-white font-bold'
              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          <Clock className="w-3 h-3" />
          Sedang Proses BPN
        </button>

        <button
          onClick={() => onChangeFilter('alasHak', filter.alasHak === 'SPH' ? 'ALL' : 'SPH')}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
            filter.alasHak === 'SPH'
              ? 'bg-blue-700 text-white font-bold'
              : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          Alas Hak SPH
        </button>

        <button
          onClick={() => onChangeFilter('alasHak', filter.alasHak === 'Tanpa SPH' ? 'ALL' : 'Tanpa SPH')}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
            filter.alasHak === 'Tanpa SPH'
              ? 'bg-purple-700 text-white font-bold'
              : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
          }`}
        >
          Tanpa SPH
        </button>
      </div>
    </div>
  );
};
