import React from 'react';
import { AssetItem } from '../types';
import { BPN_STAGES } from '../data/mockData';
import { AssetLocationMap } from './AssetLocationMap';
import {
  X,
  FileCheck,
  Building,
  MapPin,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clock,
  Shield,
  User,
  Share2,
  Printer,
  Edit3,
  Trash2,
  Lock,
} from 'lucide-react';

interface AssetDetailModalProps {
  asset: AssetItem | null;
  onClose: () => void;
  onUpdateTahapan?: (assetId: string, newTahapan: number) => void;
  onOpenEdit?: (asset: AssetItem) => void;
  onDelete?: (asset: AssetItem) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  asset,
  onClose,
  onUpdateTahapan,
  onOpenEdit,
  onDelete,
}) => {
  if (!asset) return null;

  const isTerbit = asset.tahapan >= 17 || asset.statusDisplay === 'TERBIT';
  const formatRp = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white px-5 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-300">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">{asset.asetLapangan}</h3>
                <span className="bg-emerald-700 text-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500">
                  {asset.id}
                </span>
              </div>
              <p className="text-xs text-emerald-200">
                {asset.penghantar} | {asset.upt} - {asset.ultg}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-100 transition-colors text-xs flex items-center gap-1"
              title="Cetak Lembar Monitoring"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Cetak</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-600 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Header Status Highlight Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Status Sertifikasi</div>
              <div className="mt-1">
                {isTerbit ? (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-md border border-emerald-300">
                    <CheckCircle className="w-4 h-4 text-emerald-700" />
                    SUDAH TERBIT (SHP)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-md border border-amber-300">
                    <Clock className="w-4 h-4 text-amber-700" />
                    DALAM PROSES (TAHAP {asset.tahapan})
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Nomor Sertifikat</div>
              <div className="mt-1 font-mono font-bold text-slate-900 text-sm">
                {asset.noSertifikat !== '-' ? asset.noSertifikat : 'Dalam Penerbitan'}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Alas Hak / Legalitas</div>
              <div className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                {asset.alasHak && asset.alasHak !== '-' ? (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      asset.alasHak === 'SPH' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {asset.alasHak}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                    -
                  </span>
                )}
                <span>Persil: {asset.persil}</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Luas & NIB</div>
              <div className="mt-1 font-semibold text-slate-900">
                <span>{asset.luas.toLocaleString('id-ID')} m²</span>
                <span className="text-slate-400 mx-1">|</span>
                <span className="font-mono text-[11px]">{asset.nib}</span>
              </div>
            </div>
          </div>

          {/* 16-Stage BPN Interactive Timeline */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                Progress 16 Tahapan Kantor Pertanahan (BPN)
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                Tahap {isTerbit ? '16/16 Selesai' : `${asset.tahapan} dari 16`}
              </span>
            </div>

            {/* Stage Progress Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-300"
                style={{
                  width: `${Math.min(100, isTerbit ? 100 : (asset.tahapan / 16) * 100)}%`,
                }}
              ></div>
            </div>

            {/* Grid of 16 Stages */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BPN_STAGES.map((st) => {
                const isPassed = isTerbit || asset.tahapan > st.stageNumber;
                const isCurrent = !isTerbit && asset.tahapan === st.stageNumber;

                return (
                  <div
                    key={st.stageNumber}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      isPassed
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : isCurrent
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300 text-amber-950 shadow-xs'
                        : 'bg-slate-50/50 border-slate-200 text-slate-400 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-[11px]">
                        #{st.stageNumber}
                      </span>
                      {isPassed && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                      {isCurrent && <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />}
                    </div>
                    <div className="font-semibold text-[11px] leading-tight line-clamp-2">
                      {st.name}
                    </div>
                    <div className="text-[9px] mt-1 text-slate-500 flex items-center justify-between">
                      <span>{st.responsibleParty}</span>
                      <span className="font-mono font-bold text-[8px] uppercase">{st.code}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Lokasi & Teknis */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2.5">
              <h4 className="font-bold text-xs text-slate-900 uppercase flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Informasi Lokasi & Teknis Jaringan
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Kantor Pertanahan:</span>
                  <span className="font-semibold text-slate-800">{asset.bpn}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Desa / Kelurahan:</span>
                  <span className="font-semibold text-slate-800">{asset.desa}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Kecamatan:</span>
                  <span className="font-semibold text-slate-800">{asset.kecamatan}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Koordinat Tapak:</span>
                  <span className="font-mono text-slate-700">{asset.koordinat || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Asset SAP Code:</span>
                  <span className="font-mono font-semibold text-slate-800">{asset.asset}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Jenis Aset:</span>
                  <span className="font-semibold text-slate-800">{asset.kategori}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">PIC Legal Lapangan:</span>
                  <span className="font-semibold text-slate-800">{asset.pic || 'Tim Pokja UPT'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Tahun Terbit / Target:</span>
                  <span className="font-semibold text-slate-800">{asset.tahun > 0 ? asset.tahun : '-'}</span>
                </div>
              </div>
            </div>

            {/* Right: Dokumen Surat Perintah Setor (SPS 1, 2, 3) */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2.5">
              <h4 className="font-bold text-xs text-slate-900 uppercase flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                Dokumen Surat Perintah Setor BPN (SPS 1 - 3)
              </h4>

              <div className="space-y-2.5 text-[11px]">
                {/* SPS 1 */}
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">SPS 1: Pengukuran Bidang Tanah</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        (asset.sps1?.tanggalSps && asset.sps1.tanggalSps !== '-') || asset.sps1?.isPaid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {(asset.sps1?.tanggalSps && asset.sps1.tanggalSps !== '-') || asset.sps1?.isPaid ? 'TERBIT / SELESAI' : 'BELUM TERBIT'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-0.5">
                    <div>
                      <span className="text-slate-400 block">No. Dokumen:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {asset.sps1?.spsNo && asset.sps1.spsNo !== '-' ? asset.sps1.spsNo : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Tanggal Terbit SPS:</span>
                      <span className="font-semibold text-slate-700">
                        {asset.sps1?.tanggalSps && asset.sps1.tanggalSps !== '-'
                          ? asset.sps1.tanggalSps
                          : asset.sps1?.paymentDate || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SPS 2 */}
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">SPS 2: Pemeriksaan Tanah Panitia A</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        (asset.sps2?.tanggalSps && asset.sps2.tanggalSps !== '-') || asset.sps2?.isPaid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {(asset.sps2?.tanggalSps && asset.sps2.tanggalSps !== '-') || asset.sps2?.isPaid ? 'TERBIT / SELESAI' : 'BELUM TERBIT'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-0.5">
                    <div>
                      <span className="text-slate-400 block">No. Dokumen:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {asset.sps2?.spsNo && asset.sps2.spsNo !== '-' ? asset.sps2.spsNo : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Tanggal Terbit SPS:</span>
                      <span className="font-semibold text-slate-700">
                        {asset.sps2?.tanggalSps && asset.sps2.tanggalSps !== '-'
                          ? asset.sps2.tanggalSps
                          : asset.sps2?.paymentDate || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SPS 3 */}
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">SPS 3: Pendaftaran SK & Pembukuan Hak</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        (asset.sps3?.tanggalSps && asset.sps3.tanggalSps !== '-') || asset.sps3?.isPaid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {(asset.sps3?.tanggalSps && asset.sps3.tanggalSps !== '-') || asset.sps3?.isPaid ? 'TERBIT / SELESAI' : 'BELUM TERBIT'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-0.5">
                    <div>
                      <span className="text-slate-400 block">No. Dokumen:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {asset.sps3?.spsNo && asset.sps3.spsNo !== '-' ? asset.sps3.spsNo : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Tanggal Terbit SPS:</span>
                      <span className="font-semibold text-slate-700">
                        {asset.sps3?.tanggalSps && asset.sps3.tanggalSps !== '-'
                          ? asset.sps3.tanggalSps
                          : asset.sps3?.paymentDate || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Integrasi Peta Lokasi Persil Tanah */}
          <AssetLocationMap asset={asset} />

          {/* Catatan Kendala Lapangan & Rekomendasi Tindak Lanjut */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-xs text-amber-900">Catatan Kendala Lapangan & Status Mitigasi:</h5>
                <p className="text-[11px] text-amber-800 mt-0.5 font-medium">{asset.kendala}</p>
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  {asset.catatan || 'Diperbarui otomatis oleh sistem sinkronisasi Pokja Tanah UPT Madiun.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <div className="text-[11px] text-slate-500">
            ID Sistem: <strong className="font-mono text-slate-700">{asset.id}</strong> | Terdaftar UPT MADIUN
          </div>

          <div className="flex items-center gap-2">
            {onDelete && (
              isTerbit ? (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-xs font-semibold cursor-not-allowed select-none"
                  title="Aset berstatus TERBIT telah berkekuatan hukum tetap dan dilindungi sehingga tidak dapat dihapus."
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Terkunci (Terbit)
                </span>
              ) : (
                <button
                  id="btn-modal-delete-asset"
                  onClick={() => {
                    onClose();
                    onDelete(asset);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                  title="Hapus data aset ini"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  Hapus
                </button>
              )
            )}
            {onOpenEdit && (
              <button
                id="btn-modal-edit-asset"
                onClick={() => {
                  onClose();
                  onOpenEdit(asset);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                <Edit3 className="w-4 h-4 text-amber-200" />
                Edit Data Aset
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors shadow-2xs"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
