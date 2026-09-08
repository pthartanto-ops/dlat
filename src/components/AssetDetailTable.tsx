import React, { useState } from 'react';
import { AssetItem } from '../types';
import {
  FileCheck,
  AlertCircle,
  Clock,
  Eye,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  ShieldCheck,
  Tag,
  MapPin,
  Edit3,
  Trash2,
  Lock,
} from 'lucide-react';

interface AssetDetailTableProps {
  assets: AssetItem[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenDetailModal: (asset: AssetItem) => void;
  onOpenEditModal: (asset: AssetItem) => void;
  onDeleteAsset: (asset: AssetItem) => void;
  onDeleteMultiple: (assets: AssetItem[]) => void;
}

export const AssetDetailTable: React.FC<AssetDetailTableProps> = ({
  assets,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpenDetailModal,
  onOpenEditModal,
  onDeleteAsset,
  onDeleteMultiple,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Pagination calculation
  const totalItems = assets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ensure current page is valid
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedAssets = assets.slice(startIndex, startIndex + pageSize);

  // Format IDR currency
  const formatRp = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Helper for tahapan badge styling
  const getTahapanBadge = (tahapan: number, statusDisplay: string) => {
    if (tahapan >= 17 || statusDisplay === 'TERBIT') {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
          <FileCheck className="w-3 h-3 text-emerald-700" />
          TERBIT
        </span>
      );
    }
    if (tahapan <= 3) {
      return (
        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
          <Clock className="w-3 h-3 text-blue-600" />
          {statusDisplay}
        </span>
      );
    }
    if (tahapan <= 7) {
      return (
        <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-teal-200">
          <Clock className="w-3 h-3 text-teal-600" />
          {statusDisplay}
        </span>
      );
    }
    if (tahapan <= 11) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 text-[11px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
          <AlertCircle className="w-3 h-3 text-amber-600" />
          {statusDisplay}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-900 text-[11px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
        <Clock className="w-3 h-3 text-purple-600" />
        {statusDisplay}
      </span>
    );
  };

  // Generate page numbers array (support showing 1 to 10 or surrounding pages)
  const renderPaginationButtons = () => {
    const pageButtons = [];
    const maxButtonsToShow = 10;
    
    let startP = 1;
    let endP = Math.min(totalPages, maxButtonsToShow);

    if (totalPages > maxButtonsToShow) {
      if (currentPage > 6) {
        startP = Math.min(currentPage - 4, totalPages - maxButtonsToShow + 1);
        endP = Math.min(startP + maxButtonsToShow - 1, totalPages);
      }
    }

    for (let p = startP; p <= endP; p++) {
      pageButtons.push(
        <button
          key={p}
          onClick={() => setCurrentPage(p)}
          className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-md transition-all ${
            currentPage === p
              ? 'bg-emerald-700 text-white shadow-xs scale-105'
              : 'text-slate-700 hover:bg-slate-200 bg-white border border-slate-200'
          }`}
        >
          {p}
        </button>
      );
    }
    return pageButtons;
  };

  const isAllSelected = paginatedAssets.length > 0 && paginatedAssets.every((a) => selectedIds.includes(a.id));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            DETAIL REGISTER PERSIL & SERTIFIKASI TANAH
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-xs text-slate-300">
            Menampilkan <strong className="text-white">{startIndex + 1} - {Math.min(startIndex + pageSize, totalItems)}</strong> dari <strong className="text-white">{totalItems}</strong> Persil
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="bg-emerald-800 text-emerald-200 px-2.5 py-1 rounded-md font-semibold border border-emerald-700">
                {selectedIds.length} item dipilih
              </span>
              {selectedIds.length === 1 && (
                <button
                  id="btn-edit-selected-asset"
                  onClick={() => {
                    const target = assets.find((a) => a.id === selectedIds[0]);
                    if (target) onOpenEditModal(target);
                  }}
                  className="inline-flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1 rounded-md font-bold text-xs transition-colors shadow-xs"
                  title="Buka menu edit untuk persil yang dipilih"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Aset Terpilih
                </button>
              )}
              {(() => {
                const selectedAssets = assets.filter((a) => selectedIds.includes(a.id));
                const deletableTargets = selectedAssets.filter(
                  (a) => a.statusDisplay !== 'TERBIT' && a.tahapan < 17
                );
                const terbitCount = selectedAssets.length - deletableTargets.length;

                if (deletableTargets.length === 0) {
                  return (
                    <button
                      disabled
                      className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1 rounded-md font-semibold text-xs cursor-not-allowed opacity-90"
                      title="Seluruh aset yang dipilih berstatus TERBIT dan terkunci (tidak dapat dihapus)"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      Terkunci (Status Terbit)
                    </button>
                  );
                }

                return (
                  <button
                    id="btn-delete-selected-assets"
                    onClick={() => onDeleteMultiple(deletableTargets)}
                    className="inline-flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded-md font-bold text-xs transition-colors shadow-xs"
                    title={
                      terbitCount > 0
                        ? `Hapus ${deletableTargets.length} aset dalam proses (${terbitCount} aset berstatus TERBIT dilewati karena terkunci)`
                        : 'Hapus aset terpilih dari database'
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus ({deletableTargets.length}) Aset
                    {terbitCount > 0 && (
                      <span className="text-[10px] bg-rose-900 text-rose-200 px-1 py-0.5 rounded font-normal ml-0.5">
                        ({terbitCount} Terbit Terkunci)
                      </span>
                    )}
                  </button>
                );
              })()}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Tampilkan:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value={10}>10 Baris</option>
              <option value={15}>15 Baris</option>
              <option value={25}>25 Baris</option>
              <option value={50}>50 Baris</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Responsive Table */}
      <div className="overflow-x-auto w-full relative">
        <table className="w-full text-xs text-left border-collapse min-w-[2100px]">
          {/* Table Head */}
          <thead>
            <tr className="bg-emerald-800 text-white font-semibold border-b border-emerald-700 select-none">
              {/* Sticky Columns */}
              <th className="py-2.5 px-2 text-center sticky left-0 z-20 bg-emerald-800 border-r border-emerald-700 w-10">
                #
              </th>
              <th className="py-2.5 px-2 text-center sticky left-10 z-20 bg-emerald-800 border-r border-emerald-700 w-10">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  title="Pilih semua baris halaman ini"
                />
              </th>
              <th className="py-2.5 px-3 sticky left-20 z-20 bg-emerald-800 border-r border-emerald-700 min-w-[95px]">
                ALAS HAK
              </th>
              <th className="py-2.5 px-3 sticky left-[175px] z-20 bg-emerald-800 border-r border-emerald-700 min-w-[110px]">
                TAHAPAN
              </th>

              {/* Scrollable Standard Columns */}
              <th className="py-2.5 px-3 border-r border-emerald-700 min-w-[120px]">UPT</th>
              <th className="py-2.5 px-3 border-r border-emerald-700 min-w-[200px]">PENGHANTAR / JALUR</th>
              <th className="py-2.5 px-3 border-r border-emerald-700 min-w-[150px]">ASET LAPANGAN</th>
              <th className="py-2.5 px-3 border-r border-emerald-700 min-w-[120px]">DESA</th>
              <th className="py-2.5 px-3 border-r border-emerald-700 min-w-[110px]">KECAMATAN</th>
              <th className="py-2.5 px-3 border-r border-emerald-700 min-w-[130px]">BPN (KANTAH)</th>
              <th className="py-2.5 px-3 border-r border-emerald-700 text-right min-w-[85px]">LUAS (m²)</th>
              <th className="py-2.5 px-3 border-r border-emerald-700 text-center min-w-[80px]">PERSIL</th>
              <th className="py-2.5 px-3 border-r border-emerald-700 min-w-[140px]">NO SERTIFIKAT</th>
              <th className="py-2.5 px-3 border-r border-emerald-700 min-w-[100px]">ASSET (SAP)</th>
              <th className="py-2.5 px-3 border-r border-emerald-700 min-w-[120px]">NIB</th>
              <th className="py-2.5 px-3 border-r border-emerald-700 min-w-[240px]">DOKUMEN & TGL SPS (1-3)</th>
              <th className="py-2.5 px-3 border-r border-emerald-700 text-center min-w-[100px]">TGL TERBIT</th>
              <th className="py-2.5 px-3 border-r border-emerald-700 text-center min-w-[100px]">TGL AKHIR</th>
              <th className="py-2.5 px-3 border-r border-emerald-700 min-w-[120px]">JENIS ASET</th>
              <th className="py-2.5 px-3 border-r border-emerald-700 text-center min-w-[85px]" title="Tahun Sertifikat Terbit / Target">
                THN TERBIT
              </th>
              <th className="py-2.5 px-3 border-r border-emerald-700 min-w-[240px]">KENDALA</th>
              <th className="py-2.5 px-3 border-r border-emerald-700 min-w-[110px]">ID PERSIL</th>
              <th className="py-2.5 px-3 text-center min-w-[190px] sticky right-0 z-20 bg-emerald-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.2)]">AKSI</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-200">
            {paginatedAssets.length === 0 ? (
              <tr>
                <td colSpan={23} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-8 h-8 text-slate-400" />
                    <span className="font-semibold text-sm">Tidak ada data persil yang sesuai filter</span>
                    <span className="text-xs text-slate-400">Silakan ubah kata kunci pencarian atau reset filter di atas</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedAssets.map((item, idx) => {
                const isSelected = selectedIds.includes(item.id);
                const rowNumber = startIndex + idx + 1;

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-emerald-50/40 group ${
                      isSelected ? 'bg-emerald-50/80 font-medium' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    {/* # Sticky col */}
                    <td className="py-2 px-2 text-center sticky left-0 z-10 bg-inherit border-r border-slate-200 text-slate-500 font-mono">
                      {rowNumber}
                    </td>

                    {/* Checkbox Sticky col */}
                    <td className="py-2 px-2 text-center sticky left-10 z-10 bg-inherit border-r border-slate-200">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(item.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>

                    {/* Alas Hak Sticky col */}
                    <td className="py-2 px-3 sticky left-20 z-10 bg-inherit border-r border-slate-200">
                      {item.alasHak && item.alasHak !== '-' ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            item.alasHak === 'SPH'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-purple-100 text-purple-800 border border-purple-200'
                          }`}
                        >
                          {item.alasHak}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>

                    {/* Tahapan Sticky col */}
                    <td className="py-2 px-3 sticky left-[175px] z-10 bg-inherit border-r border-slate-200 whitespace-nowrap">
                      {getTahapanBadge(item.tahapan, item.statusDisplay)}
                    </td>

                    {/* UPT */}
                    <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-800">
                      {item.upt || '-'}
                      <span className="block text-[10px] text-slate-500 font-normal">{item.ultg || '-'}</span>
                    </td>

                    {/* Penghantar */}
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-900 font-medium">
                      {item.penghantar || <span className="text-slate-400 italic">-</span>}
                    </td>

                    {/* Aset Lapangan */}
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-700">
                      {item.asetLapangan || <span className="text-slate-400 italic">-</span>}
                    </td>

                    {/* Desa */}
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-700">
                      {item.desa || <span className="text-slate-400 italic">-</span>}
                    </td>

                    {/* Kecamatan */}
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-700">
                      {item.kecamatan || <span className="text-slate-400 italic">-</span>}
                    </td>

                    {/* BPN */}
                    <td className="py-2 px-3 border-r border-slate-200 text-slate-800 font-medium">
                      {item.bpn || <span className="text-slate-400 italic">-</span>}
                    </td>

                    {/* Luas */}
                    <td className="py-2 px-3 border-r border-slate-200 text-right font-mono text-slate-900 font-semibold">
                      {item.luas > 0 ? item.luas.toLocaleString('id-ID') : <span className="text-slate-400 font-normal">-</span>}
                    </td>

                    {/* Persil */}
                    <td className="py-2 px-3 border-r border-slate-200 text-center font-mono font-bold text-slate-700">
                      {item.persil && item.persil !== '-' ? item.persil : <span className="text-slate-400 font-normal italic">-</span>}
                    </td>

                    {/* No Sertifikat */}
                    <td className="py-2 px-3 border-r border-slate-200 font-mono">
                      {item.noSertifikat && item.noSertifikat !== '-' ? (
                        <span className="text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {item.noSertifikat}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Belum terbit</span>
                      )}
                    </td>

                    {/* Asset SAP */}
                    <td className="py-2 px-3 border-r border-slate-200 font-mono text-slate-600">
                      {item.asset && item.asset !== '-' ? item.asset : <span className="text-slate-400 italic">-</span>}
                    </td>

                    {/* NIB */}
                    <td className="py-2 px-3 border-r border-slate-200 font-mono text-slate-700">
                      {item.nib && item.nib !== '-' ? item.nib : <span className="text-slate-400 italic">-</span>}
                    </td>

                    {/* Dokumen & Tgl Terbit SPS 1-3 */}
                    <td className="py-2 px-3 border-r border-slate-200">
                      <div className="space-y-1">
                        {/* SPS 1 */}
                        <div className="text-[10px] leading-tight">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-400 font-medium">SPS 1:</span>
                            {item.sps1?.spsNo && item.sps1.spsNo !== '-' ? (
                              <span className="font-mono text-slate-800 font-semibold truncate max-w-[130px]" title={item.sps1.spsNo}>
                                {item.sps1.spsNo}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Belum terbit</span>
                            )}
                          </div>
                          {(item.sps1?.tanggalSps && item.sps1.tanggalSps !== '-') || item.sps1?.paymentDate ? (
                            <div className="text-[9px] text-emerald-700 font-medium text-right">
                              Tgl: {item.sps1?.tanggalSps && item.sps1.tanggalSps !== '-' ? item.sps1.tanggalSps : item.sps1?.paymentDate}
                            </div>
                          ) : null}
                        </div>

                        {/* SPS 2 */}
                        <div className="text-[10px] leading-tight border-t border-slate-100 pt-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-400 font-medium">SPS 2:</span>
                            {item.sps2?.spsNo && item.sps2.spsNo !== '-' ? (
                              <span className="font-mono text-slate-800 font-semibold truncate max-w-[130px]" title={item.sps2.spsNo}>
                                {item.sps2.spsNo}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Belum terbit</span>
                            )}
                          </div>
                          {(item.sps2?.tanggalSps && item.sps2.tanggalSps !== '-') || item.sps2?.paymentDate ? (
                            <div className="text-[9px] text-emerald-700 font-medium text-right">
                              Tgl: {item.sps2?.tanggalSps && item.sps2.tanggalSps !== '-' ? item.sps2.tanggalSps : item.sps2?.paymentDate}
                            </div>
                          ) : null}
                        </div>

                        {/* SPS 3 */}
                        <div className="text-[10px] leading-tight border-t border-slate-100 pt-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-400 font-medium">SPS 3:</span>
                            {item.sps3?.spsNo && item.sps3.spsNo !== '-' ? (
                              <span className="font-mono text-slate-800 font-semibold truncate max-w-[130px]" title={item.sps3.spsNo}>
                                {item.sps3.spsNo}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Belum terbit</span>
                            )}
                          </div>
                          {(item.sps3?.tanggalSps && item.sps3.tanggalSps !== '-') || item.sps3?.paymentDate ? (
                            <div className="text-[9px] text-emerald-700 font-medium text-right">
                              Tgl: {item.sps3?.tanggalSps && item.sps3.tanggalSps !== '-' ? item.sps3.tanggalSps : item.sps3?.paymentDate}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* Tanggal Terbit */}
                    <td className="py-2 px-3 border-r border-slate-200 text-center font-mono text-slate-700">
                      {item.tanggalTerbit && item.tanggalTerbit !== '-' ? item.tanggalTerbit : <span className="text-slate-400 italic">-</span>}
                    </td>

                    {/* Tanggal Akhir */}
                    <td className="py-2 px-3 border-r border-slate-200 text-center font-mono text-slate-600">
                      {item.tanggalAkhir && item.tanggalAkhir !== '-' ? item.tanggalAkhir : <span className="text-slate-400 italic">-</span>}
                    </td>

                    {/* Kategori */}
                    <td className="py-2 px-3 border-r border-slate-200">
                      <span className="inline-block bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        {item.kategori || '-'}
                      </span>
                    </td>

                    {/* Tahun */}
                    <td className="py-2 px-3 border-r border-slate-200 text-center font-semibold text-slate-700">
                      {item.tahun > 0 ? item.tahun : <span className="text-slate-400 italic">-</span>}
                    </td>

                    {/* Kendala */}
                    <td className="py-2 px-3 border-r border-slate-200">
                      {item.kendala ? (
                        <span
                          className={`inline-block text-[11px] leading-tight ${
                            item.kendala.includes('Lancar') || item.kendala.includes('Tersimpan')
                              ? 'text-emerald-700'
                              : 'text-amber-800 font-medium'
                          }`}
                        >
                          {item.kendala}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>

                    {/* ID */}
                    <td className="py-2 px-3 border-r border-slate-200 font-mono text-slate-500 font-medium">
                      {item.id}
                    </td>

                    {/* Aksi Sticky Right */}
                    <td className="py-2 px-2 text-center sticky right-0 z-10 bg-inherit shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.08)]">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          id={`btn-edit-${item.id}`}
                          onClick={() => onOpenEditModal(item)}
                          className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-2 py-1 rounded text-[11px] font-bold transition-colors shadow-2xs"
                          title="Edit data persil tanah ini"
                        >
                          <Edit3 className="w-3 h-3 text-amber-700" />
                          Edit
                        </button>
                        <button
                          id={`btn-detail-${item.id}`}
                          onClick={() => onOpenDetailModal(item)}
                          className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-1 rounded text-[11px] font-bold transition-colors shadow-2xs"
                          title="Lihat rincian 16 tahapan & berkas"
                        >
                          <Eye className="w-3 h-3 text-emerald-700" />
                          Detail
                        </button>
                        {item.statusDisplay === 'TERBIT' || item.tahapan >= 17 ? (
                          <span
                            className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 border border-slate-200 px-2 py-1 rounded text-[11px] font-semibold cursor-not-allowed select-none"
                            title="Aset berstatus TERBIT telah berkekuatan hukum tetap dan dilindungi sehingga tidak dapat dihapus."
                          >
                            <Lock className="w-3 h-3 text-slate-400" />
                            Terkunci
                          </span>
                        ) : (
                          <button
                            id={`btn-delete-${item.id}`}
                            onClick={() => onDeleteAsset(item)}
                            className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 px-2 py-1 rounded text-[11px] font-bold transition-colors shadow-2xs"
                            title="Hapus data persil tanah ini"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls Section */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="text-slate-600">
          Halaman <strong className="text-slate-900">{currentPage}</strong> dari{' '}
          <strong className="text-slate-900">{totalPages}</strong> ({totalItems} total aset tercatat)
        </div>

        {/* Numbered Pagination Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Halaman Pertama"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 mx-1">{renderPaginationButtons()}</div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Halaman Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Halaman Terakhir"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
