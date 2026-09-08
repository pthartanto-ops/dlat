import React from 'react';
import { AlertTriangle, Trash2, X, Database, ShieldAlert } from 'lucide-react';

interface ClearAllConfirmModalProps {
  isOpen: boolean;
  totalAssets: number;
  onClose: () => void;
  onConfirmClear: () => void;
}

export const ClearAllConfirmModal: React.FC<ClearAllConfirmModalProps> = ({
  isOpen,
  totalAssets,
  onClose,
  onConfirmClear,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header Danger */}
        <div className="bg-rose-800 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl text-white">
              <Trash2 className="w-5 h-5 text-rose-100" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Bersihkan Seluruh Data Database
              </h3>
              <p className="text-xs text-rose-100 mt-0.5">
                Pengosongan total register persil aset tanah PLN
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
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-rose-900">Konfirmasi Pengosongan Database</h4>
              <p className="text-rose-700 mt-1 leading-relaxed">
                Tindakan ini akan menghapus <strong>seluruh {totalAssets} data persil</strong> dari database Cloud SQL PostgreSQL.
                Data yang telah dibersihkan tidak dapat dipulihkan kembali kecuali Anda melakukan import ulang dari file Excel atau memuat ulang data sampel.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Status Penyimpanan Saat Ini:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Total Aset Tercatat</span>
                <strong className="text-sm text-slate-900">{totalAssets} Persil</strong>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Tipe Database</span>
                <strong className="text-sm text-emerald-700">PostgreSQL (Cloud SQL)</strong>
              </div>
            </div>
          </div>

          <p className="text-slate-500 text-[11px] italic">
            Gunakan fitur ini jika Anda ingin mengosongkan database data awal/sampel untuk kemudian mengimpor data riil persil dari berkas Excel resmi PLN.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-end gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            id="btn-confirm-clear-all"
            onClick={onConfirmClear}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Ya, Bersihkan Seluruh Data
          </button>
        </div>
      </div>
    </div>
  );
};
