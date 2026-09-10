import React, { useState, useRef } from 'react';
import { AssetItem } from '../types';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  HelpCircle,
  Layers,
  ArrowRight,
  Database,
  Trash2,
  MapPin,
  User,
} from 'lucide-react';
import { downloadSampleExcelTemplate, parseExcelFile, ParsedRowResult } from '../utils/excelUtils';
import { normalizeAssetsToUpperCase } from '../utils/textUtils';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportAssets: (newAssets: AssetItem[], mode: 'append' | 'replace') => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportAssets,
}) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRowResult[]>([]);
  const [isEmptyExcel, setIsEmptyExcel] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setErrorMessage(null);
    setIsEmptyExcel(false);
    if (!file) return;

    // Check extension
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExt) {
      setErrorMessage(
        'Format berkas tidak didukung. Harap unggah file Excel (.xlsx, .xls) atau file .csv.'
      );
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const { rows, error } = parseExcelFile(buffer);
        if (error) {
          if (error.toLowerCase().includes('kosong')) {
            setIsEmptyExcel(true);
            setParsedRows([]);
            setErrorMessage(null);
          } else {
            setErrorMessage(error);
            setParsedRows([]);
            setIsEmptyExcel(false);
          }
        } else if (rows.length === 0) {
          setIsEmptyExcel(true);
          setParsedRows([]);
          setErrorMessage(null);
        } else {
          setIsEmptyExcel(false);
          setParsedRows(rows);
        }
      } catch (err: any) {
        setErrorMessage(
          'Terjadi kesalahan saat memproses isi berkas Excel: ' +
            (err?.message || 'Format tidak valid')
        );
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Gagal membaca berkas dari sistem komputer.');
      setIsProcessing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setFileName('');
    setFileSize('');
    setParsedRows([]);
    setIsEmptyExcel(false);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (isEmptyExcel) {
      onImportAssets([], 'replace');
      handleReset();
      onClose();
      return;
    }
    if (parsedRows.length === 0) return;
    const items = normalizeAssetsToUpperCase(parsedRows.map((r) => r.item));
    onImportAssets(items, importMode);
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-800 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700/80 rounded-xl border border-emerald-500/40 text-amber-300">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Import Data Aset Massal via Excel
                <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  Batch Input
                </span>
              </h2>
              <p className="text-xs text-emerald-200 mt-0.5">
                Unggah berkas Microsoft Excel (.xlsx / .xls / .csv) untuk memasukkan puluhan hingga ratusan data persil sekaligus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Download Template Alert Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg flex-shrink-0 mt-0.5">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-900">
                  Perlu Format Kolom Excel Standar?
                </h4>
                <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                  Gunakan format template resmi SIMAS-TANAH PLN UPT Madiun yang telah dilengkapi kolom ULTG, Penghantar, Titik Lapangan, 16 Tahapan BPN, Alas Hak SPH, <strong>Nomor Dokumen & Tanggal Terbit SPS 1-3</strong>, serta <strong>Koordinat GPS (Latitude, Longitude)</strong> untuk pemetaan GIS dan <strong>PIC Sertifikasi</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={downloadSampleExcelTemplate}
              className="inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shadow-xs flex-shrink-0"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              Unduh Template (.xlsx)
            </button>
          </div>

          {/* Upload Drop Zone (if not yet uploaded) */}
          {parsedRows.length === 0 && !isEmptyExcel ? (
            <div>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-150 ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-50/80 scale-[1.01]'
                    : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleInputChange}
                  className="hidden"
                />

                <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Upload className="w-8 h-8 text-emerald-700" />
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Tarik & Lepas File Excel di Sini
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto">
                  atau <span className="text-emerald-700 font-bold underline">klik untuk memilih berkas</span> dari komputer Anda. Mendukung format <span className="font-semibold text-slate-700">.xlsx, .xls, .csv</span>.
                </p>

                <div className="mt-4 flex flex-wrap justify-center items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Deteksi Header Otomatis
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Pemetaan 16 Tahap BPN
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" /> No. & Tanggal Dokumen SPS (1-3)
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Koordinat GPS (Single / Lat & Long Terpisah)
                  </span>
                </div>
              </div>

              {isProcessing && (
                <div className="mt-4 text-center py-4">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800">
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    Membaca dan memvalidasi lembar kerja Excel...
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          ) : isEmptyExcel ? (
            /* Uploaded Excel is Empty Area */
            <div className="space-y-5">
              {/* File Info Card */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{fileName}</span>
                      <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded font-mono">
                        {fileSize}
                      </span>
                      <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded font-bold border border-amber-300">
                        Berkas Kosong
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 font-semibold mt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      File Excel terbaca, namun tidak memiliki baris data aset (0 baris data).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <X className="w-3.5 h-3.5" /> Ganti Berkas
                  </button>
                </div>
              </div>

              {/* Information Notice */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl flex-shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Hasil Upload Dibuat Kosong</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Sesuai permintaan sistem: <em>"Saat upload dari excel bila data kosong maka hasil upload juga dibuat kosong"</em>. 
                      Jika Anda mengonfirmasi tindakan ini, hasil upload akan diterapkan sebagai data kosong (0 aset tanah) di dashboard dan database.
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Jika Anda hanya ingin membatalkan, silakan klik tombol <strong>Batal</strong> atau <strong>Ganti Berkas</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Upload Success & Preview Area */
            <div className="space-y-5">
              {/* File Info Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{fileName}</span>
                      <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded font-mono">
                        {fileSize}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Berhasil membaca <strong>{parsedRows.length} baris data persil</strong> siap diimpor.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Ganti File
                  </button>
                </div>
              </div>

              {/* Import Mode Radio Selection */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-600" />
                  Pilih Metode Penyimpanan ke Database:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'append'
                        ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Tambahkan Data (Append)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Menambahkan {parsedRows.length} data baru ke daftar persil yang sudah ada saat ini.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      importMode === 'replace'
                        ? 'border-amber-600 bg-amber-50/50 ring-1 ring-amber-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Gantikan Seluruh Data (Replace All)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Menghapus data sebelumnya dan hanya menggunakan {parsedRows.length} persil dari berkas ini.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Data Preview Table */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-800">
                    Pratinjau Data yang Diparsing ({Math.min(10, parsedRows.length)} dari {parsedRows.length} baris):
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      {parsedRows.filter((r) => r.item.koordinat && r.item.koordinat !== '-').length} berkoordinat GPS
                    </span>
                    <span className="text-[11px] text-slate-400">
                      *Kolom terpetakan otomatis
                    </span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Jenis Aset</th>
                          <th className="py-2 px-3">Unit / ULTG</th>
                          <th className="py-2 px-3">Penghantar / Jalur</th>
                          <th className="py-2 px-3">Aset Properti</th>
                          <th className="py-2 px-3">Aset CBM</th>
                          <th className="py-2 px-3">Koordinat (GPS)</th>
                          <th className="py-2 px-3">PIC Pokja</th>
                          <th className="py-2 px-3 text-center">Alas Hak</th>
                          <th className="py-2 px-3 text-center">Tahap BPN</th>
                          <th className="py-2 px-3">Dokumen & Tgl SPS</th>
                          <th className="py-2 px-3 text-center">Tgl Terbit</th>
                          <th className="py-2 px-3 text-center">Tgl Akhir</th>
                          <th className="py-2 px-3 text-right">Luas (m²)</th>
                          <th className="py-2 px-3">Kantah BPN</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.slice(0, 10).map((r, idx) => {
                          const item = r.item;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="py-1.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="py-1.5 px-3 whitespace-nowrap">
                                <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200">
                                  {item.kategori}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                                {item.ultg}
                              </td>
                              <td className="py-1.5 px-3 text-slate-700 whitespace-nowrap">
                                {item.penghantar}
                              </td>
                              <td className="py-1.5 px-3 text-slate-700 whitespace-nowrap">
                                {item.asetProperti || item.asetLapangan}
                              </td>
                              <td className="py-1.5 px-3 text-slate-700 whitespace-nowrap font-mono text-xs">
                                {item.asetCbm && item.asetCbm !== '-' ? item.asetCbm : '-'}
                              </td>
                              <td className="py-1.5 px-3 whitespace-nowrap">
                                {item.koordinat && item.koordinat !== '-' ? (
                                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    <MapPin className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                    {item.koordinat}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Kosong</span>
                                )}
                              </td>
                              <td className="py-1.5 px-3 whitespace-nowrap text-slate-700">
                                {item.pic && item.pic !== '-' ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-800">
                                    <User className="w-3 h-3 text-slate-400" />
                                    {item.pic}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">-</span>
                                )}
                              </td>
                              <td className="py-1.5 px-3 text-center whitespace-nowrap">
                                {item.alasHak && item.alasHak !== '-' ? (
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                      item.alasHak === 'SPH'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-purple-100 text-purple-800'
                                    }`}
                                  >
                                    {item.alasHak}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">-</span>
                                )}
                              </td>
                              <td className="py-1.5 px-3 text-center whitespace-nowrap">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.statusDisplay === 'TERBIT'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {item.statusDisplay}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 whitespace-nowrap">
                                {item.sps1?.spsNo && item.sps1.spsNo !== '-' ? (
                                  <div className="text-[10px]">
                                    <span className="font-mono font-medium text-slate-800">{item.sps1.spsNo}</span>
                                    {item.sps1.tanggalSps && item.sps1.tanggalSps !== '-' && (
                                      <span className="text-slate-500 ml-1">({item.sps1.tanggalSps})</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Belum terbit</span>
                                )}
                              </td>
                              <td className="py-1.5 px-3 text-center whitespace-nowrap font-mono text-[11px]">
                                {item.tanggalTerbit && item.tanggalTerbit !== '-' ? (
                                  <span className="text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {item.tanggalTerbit}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">-</span>
                                )}
                              </td>
                              <td className="py-1.5 px-3 text-center whitespace-nowrap font-mono text-[11px]">
                                {item.tanggalTerbit && item.tanggalTerbit !== '-' && item.tanggalAkhir && item.tanggalAkhir !== '-' ? (
                                  <span className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    {item.tanggalAkhir}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">-</span>
                                )}
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono text-slate-700">
                                {item.luas.toLocaleString('id-ID')}
                              </td>
                              <td className="py-1.5 px-3 text-slate-600 whitespace-nowrap">
                                {item.bpn}
                              </td>
                              <td className="py-1.5 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Siap
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {parsedRows.length > 10 && (
                    <div className="bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500 border-t border-slate-200 text-center">
                      ... dan {parsedRows.length - 10} baris lainnya akan ikut diimpor
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-500">
            {isEmptyExcel ? (
              <span className="text-amber-800 font-medium">
                Berkas kosong terdeteksi. Hasil upload akan diatur menjadi kosong (0 data).
              </span>
            ) : parsedRows.length > 0 ? (
              <span className="text-slate-700">
                Total <strong>{parsedRows.length} persil</strong> akan dimasukkan ke database SIMAS-TANAH.
              </span>
            ) : (
              <span>Pastikan file Excel menggunakan format kolom yang sesuai.</span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            {isEmptyExcel ? (
              <button
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Konfirmasi & Buat Data Kosong (0 Aset)
              </button>
            ) : (
              <button
                disabled={parsedRows.length === 0}
                onClick={handleConfirmImport}
                className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-xs ${
                  parsedRows.length > 0
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Konfirmasi & Import {parsedRows.length > 0 ? `${parsedRows.length} Data Aset` : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
