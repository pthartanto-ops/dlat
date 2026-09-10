import React from 'react';
import { AssetItem } from '../types';
import { AlertTriangle, Trash2, X, Lock, ShieldCheck } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  itemsToDelete: AssetItem[];
  onClose: () => void;
  onConfirmDelete: (ids: string[]) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  itemsToDelete,
  onClose,
  onConfirmDelete,
}) => {
  if (!isOpen || itemsToDelete.length === 0) return null;

  const isSingle = itemsToDelete.length === 1;
  const singleItem = itemsToDelete[0];

  const deletableItems = itemsToDelete.filter(
    (item) => item.statusDisplay !== 'TERBIT' && item.tahapan < 17
  );
  const lockedItems = itemsToDelete.filter(
    (item) => item.statusDisplay === 'TERBIT' || item.tahapan >= 17
  );

  const handleConfirm = () => {
    if (deletableItems.length === 0) return;
    onConfirmDelete(deletableItems.map((item) => item.id));
    onClose();
  };

  // If single item is TERBIT (cannot be deleted)
  if (isSingle && (singleItem.statusDisplay === 'TERBIT' || singleItem.tahapan >= 17)) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
          <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Data Aset Terkunci (Status Terbit)</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Perlindungan integritas data sertifikasi tanah PLN
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4 text-xs text-slate-700">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900">Aset Tidak Dapat Dihapus</h4>
                <p className="text-amber-800 mt-1 leading-relaxed text-[11px]">
                  Persil tanah ini berstatus <strong>TERBIT</strong> dengan nomor sertifikat resmi{' '}
                  <span className="font-mono font-bold">{singleItem.noSertifikat}</span>. Sesuai ketentuan tata kelola aset negara dan PLN, data aset yang telah berkekuatan hukum tetap (sertifikat terbit) tidak diperkenankan untuk dihapus.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Aset Properti:</span>
                <strong className="text-slate-900">{singleItem.asetProperti || singleItem.asetLapangan}</strong>
              </div>
              {singleItem.asetCbm && singleItem.asetCbm !== '-' && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Aset CBM:</span>
                  <strong className="text-slate-800 font-mono">{singleItem.asetCbm}</strong>
                </div>
              )}
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Penghantar / Jalur:</span>
                <span className="text-slate-800">{singleItem.penghantar}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Unit / ULTG:</span>
                <span className="text-slate-800">{singleItem.ultg}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Status Sertifikat:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  SUDAH TERBIT
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
            >
              Mengerti & Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header Danger */}
        <div className="bg-rose-700 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl text-white">
              <Trash2 className="w-5 h-5 text-rose-100" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isSingle ? 'Konfirmasi Hapus Data Aset' : `Konfirmasi Hapus ${deletableItems.length} Data Aset`}
              </h3>
              <p className="text-xs text-rose-100 mt-0.5">
                Penghapusan data register persil tanah dalam proses sertifikasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-rose-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 space-y-4 text-xs text-slate-700">
          {/* Warning Banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900">Perhatian: Tindakan Tidak Dapat Dibatalkan</h4>
              <p className="text-amber-800 mt-1 leading-relaxed text-[11px]">
                Data persil yang dihapus akan dikeluarkan dari database inventaris tanah PLN. Ringkasan rekapitulasi UPT,
                capaian sertifikat terbit, dan statistik 16 tahapan BPN akan disesuaikan secara otomatis.
              </p>
            </div>
          </div>

          {/* If there are locked items in the batch selection */}
          {lockedItems.length > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-900 leading-relaxed">
                <strong className="font-bold">{lockedItems.length} aset berstatus TERBIT dilewati secara otomatis</strong> dan tidak akan dihapus demi menjaga arsip legalitas tanah yang sudah terbit.
              </div>
            </div>
          )}

          {/* Asset Info Card */}
          {isSingle ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-400">Rincian Persil yang Dihapus:</div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-900 text-sm">
                  {singleItem.asetProperti || singleItem.asetLapangan}
                  {singleItem.asetCbm && singleItem.asetCbm !== '-' ? ` (${singleItem.asetCbm})` : ''}
                </span>
                <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {singleItem.id}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-500">Penghantar:</span>{' '}
                  <strong className="text-slate-800">{singleItem.penghantar}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Unit:</span>{' '}
                  <strong className="text-slate-800">{singleItem.ultg}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Alas Hak:</span>{' '}
                  <strong className="text-slate-800">{singleItem.alasHak || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>{' '}
                  <strong className={singleItem.tahapan >= 17 ? 'text-emerald-700' : 'text-amber-700'}>
                    {singleItem.statusDisplay}
                  </strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Lokasi:</span>{' '}
                  <span className="text-slate-800">{singleItem.desa}, {singleItem.kecamatan} ({singleItem.bpn})</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-600">
                Daftar persil yang dapat dihapus ({deletableItems.length} item):
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-200 border border-slate-200 rounded-xl bg-slate-50">
                {deletableItems.map((item, idx) => (
                  <div key={item.id} className="p-2.5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono w-5 text-right">{idx + 1}.</span>
                      <div>
                        <strong className="text-slate-900">{item.asetProperti || item.asetLapangan}</strong>
                        {item.asetCbm && item.asetCbm !== '-' && (
                          <span className="text-slate-600 text-[10px] ml-1 font-mono">[{item.asetCbm}]</span>
                        )}
                        <span className="text-slate-500 text-[10px] ml-1.5 font-mono">({item.id})</span>
                        <div className="text-[10px] text-slate-500">{item.penghantar} - {item.ultg}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {item.statusDisplay}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors shadow-2xs"
          >
            Batal
          </button>
          <button
            type="button"
            id="btn-confirm-delete-asset"
            onClick={handleConfirm}
            disabled={deletableItems.length === 0}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Trash2 className="w-4 h-4" />
            {isSingle ? 'Ya, Hapus Data' : `Ya, Hapus ${deletableItems.length} Data`}
          </button>
        </div>
      </div>
    </div>
  );
};

