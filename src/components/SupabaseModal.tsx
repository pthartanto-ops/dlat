import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Server,
  ShieldCheck,
  Activity,
  Layers,
  Download,
  ArrowRight,
  UploadCloud,
} from 'lucide-react';
import {
  checkSupabaseConnection,
  checkSupabaseTableClient,
  syncAssetsToSupabaseClient,
  SupabaseHealthResult,
  SupabaseTableStatus,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from '../services/supabaseClient';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose, onRefreshData }) => {
  const [health, setHealth] = useState<SupabaseHealthResult | null>(null);
  const [tableStatus, setTableStatus] = useState<SupabaseTableStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedFullSql, setCopiedFullSql] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const currentProjectRef =
    health?.projectRef ||
    SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0] ||
    'trygwztiblpuxzpruhor';

  const runCheck = async () => {
    setIsChecking(true);
    setSyncMessage(null);
    try {
      const [resHealth, resTable] = await Promise.all([
        checkSupabaseConnection(),
        checkSupabaseTableClient(),
      ]);
      setHealth(resHealth);
      setTableStatus(resTable);
    } catch (err: any) {
      setHealth({
        connected: false,
        latencyMs: 0,
        url: SUPABASE_URL,
        projectRef: currentProjectRef,
        error: err.message,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      // 1. Direct browser-to-Supabase sync (runs seamlessly on Vercel, static SPA, and localhost)
      const directResult = await syncAssetsToSupabaseClient();
      if (directResult.success) {
        setSyncMessage(`Berhasil: ${directResult.count} data persil berhasil disinkronkan langsung ke Supabase!`);
        await runCheck();
        if (onRefreshData) onRefreshData();
        return;
      }

      // If direct sync indicated table missing
      if (directResult.error?.includes('belum dibuat') || directResult.error?.includes('schema cache')) {
        setSyncMessage(`Gagal sinkron: ${directResult.error}`);
        return;
      }

      // 2. Secondary backend attempt (safely checking content-type to never fail on HTML 404)
      try {
        const res = await fetch('/api/supabase/seed', { method: 'POST' });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success) {
            setSyncMessage(`Berhasil: ${data.message || `${data.count} data berhasil disinkronkan ke Supabase`}`);
            await runCheck();
            if (onRefreshData) onRefreshData();
            return;
          }
        }
      } catch (_) {}

      setSyncMessage(`Gagal sinkron: ${directResult.error || 'Pastikan tabel assets telah dibuat di SQL Editor'}`);
    } catch (err: any) {
      setSyncMessage(`Kesalahan: ${err.message || 'Gagal terhubung ke Supabase'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const copyFullSqlScript = async () => {
    try {
      // Statically served from /public/ in both Vite and Vercel
      const res = await fetch('/supabase_schema_and_data.sql');
      if (res.ok) {
        const text = await res.text();
        if (text && text.includes('CREATE TABLE')) {
          navigator.clipboard.writeText(text);
          setCopiedFullSql(true);
          setTimeout(() => setCopiedFullSql(false), 2500);
          return;
        }
      }
    } catch (err) {
      console.error('Static SQL fetch error:', err);
    }

    navigator.clipboard.writeText(sqlSchemaSnippet);
    setCopiedFullSql(true);
    setTimeout(() => setCopiedFullSql(false), 2500);
  };

  useEffect(() => {
    if (isOpen) {
      runCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sqlSchemaSnippet = `-- 1. Skema Tabel Aset untuk Supabase PostgreSQL
CREATE TABLE IF NOT EXISTS public.assets (
  id TEXT PRIMARY KEY,
  alas_hak TEXT NOT NULL DEFAULT '',
  tahapan INTEGER NOT NULL DEFAULT 0,
  status_display TEXT NOT NULL DEFAULT '-',
  upt TEXT NOT NULL DEFAULT 'UPT MADIUN',
  ultg TEXT NOT NULL DEFAULT '',
  penghantar TEXT NOT NULL DEFAULT '',
  aset_lapangan TEXT NOT NULL DEFAULT '',
  desa TEXT NOT NULL DEFAULT '',
  kecamatan TEXT NOT NULL DEFAULT '',
  bpn TEXT NOT NULL DEFAULT '',
  luas INTEGER NOT NULL DEFAULT 0,
  persil TEXT DEFAULT '',
  no_sertifikat TEXT DEFAULT '-',
  asset TEXT DEFAULT '-',
  nib TEXT DEFAULT '-',
  sps1_no TEXT DEFAULT '',
  sps1_amount INTEGER DEFAULT 0,
  sps1_is_paid BOOLEAN DEFAULT false,
  sps1_payment_date TEXT DEFAULT '',
  sps1_receipt_number TEXT DEFAULT '',
  sps2_no TEXT DEFAULT '',
  sps2_amount INTEGER DEFAULT 0,
  sps2_is_paid BOOLEAN DEFAULT false,
  sps2_payment_date TEXT DEFAULT '',
  sps2_receipt_number TEXT DEFAULT '',
  sps3_no TEXT DEFAULT '',
  sps3_amount INTEGER DEFAULT 0,
  sps3_is_paid BOOLEAN DEFAULT false,
  sps3_payment_date TEXT DEFAULT '',
  sps3_receipt_number TEXT DEFAULT '',
  total_pnbp INTEGER DEFAULT 0,
  tanggal_terbit TEXT DEFAULT '-',
  tanggal_akhir TEXT DEFAULT '-',
  kategori TEXT NOT NULL DEFAULT 'TOWER',
  tahun INTEGER NOT NULL DEFAULT 2024,
  kendala TEXT DEFAULT '',
  koordinat TEXT DEFAULT '',
  pic TEXT DEFAULT '',
  catatan TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Konfigurasi Izin Akses (Row Level Security)
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.assets FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.assets FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON public.assets FOR DELETE USING (true);`;

  const copyToClipboard = (text: string, type: 'sql' | 'url') => {
    navigator.clipboard.writeText(text);
    if (type === 'sql') {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        id="supabase-connection-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 px-6 py-4 flex items-center justify-between text-white border-b border-emerald-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Zap className="w-5 h-5 fill-emerald-400 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Database Utama: Supabase Cloud</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  ONLY SUPABASE
                </span>
              </div>
              <p className="text-xs text-slate-300 font-normal">
                Koneksi & Sinkronisasi Database Persil Tanah UPT Madiun
              </p>
            </div>
          </div>
          <button
            id="btn-close-supabase-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Connection & Table Status Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Supabase Connectivity */}
            <div
              className={`p-3.5 rounded-xl border flex items-start justify-between gap-2.5 ${
                health?.connected
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/90 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`mt-0.5 p-1.5 rounded-lg ${
                    health?.connected ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                  }`}
                >
                  {health?.connected ? <CheckCircle2 className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs">
                      {health?.connected ? 'Supabase Online' : 'Memeriksa Supabase...'}
                    </span>
                    {health?.connected && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300">
                        {health.latencyMs} ms
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {health?.connected
                      ? 'Endpoint REST API aktif & merespons 200 OK.'
                      : health?.error || 'Menghubungkan...'}
                  </p>
                </div>
              </div>

              <button
                id="btn-recheck-supabase"
                onClick={runCheck}
                disabled={isChecking}
                className="p-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs rounded-lg shadow-2xs transition-all disabled:opacity-50"
                title="Ping Ulang"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>

            {/* Table public.assets Status */}
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                tableStatus?.tableExists
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/90 border-amber-200 text-amber-900'
              }`}
            >
              <div
                className={`mt-0.5 p-1.5 rounded-lg ${
                  tableStatus?.tableExists ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                }`}
              >
                {tableStatus?.tableExists ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              </div>
              <div>
                <span className="font-bold text-xs">
                  {tableStatus?.tableExists
                    ? `Tabel "assets" Aktif (${tableStatus.rowCount} Persil)`
                    : 'Tabel "assets" Belum Dibuat'}
                </span>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {tableStatus?.tableExists
                    ? 'Data persil tanah tersimpan dan terbaca langsung dari Supabase.'
                    : 'Jalankan skema SQL di Supabase SQL Editor di bawah untuk membuat tabel.'}
                </p>
              </div>
            </div>
          </div>

          {/* Sync Message Feedback */}
          {syncMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                syncMessage.startsWith('Berhasil')
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                  : 'bg-amber-100 border-amber-300 text-amber-800'
              }`}
            >
              {syncMessage.startsWith('Berhasil') ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
              )}
              <span>{syncMessage}</span>
            </div>
          )}

          {/* Quick 3-Step Setup Guide */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="font-bold text-xs text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-700" />
              Cara Membuat Database & Memasukkan Data ke Supabase:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-600">
              <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                <div>
                  <span className="font-extrabold text-emerald-700 block mb-1">Langkah 1: Salin SQL</span>
                  <p className="text-[11px] text-slate-500">
                    Salin seluruh skema tabel dan 91 data aset awal siap pakai.
                  </p>
                </div>
                <button
                  onClick={copyFullSqlScript}
                  className="mt-2.5 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 rounded-md font-bold text-[11px] transition-colors"
                >
                  {copiedFullSql ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFullSql ? 'Tersalin!' : 'Salin Seluruh SQL'}</span>
                </button>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                <div>
                  <span className="font-extrabold text-emerald-700 block mb-1">Langkah 2: SQL Editor</span>
                  <p className="text-[11px] text-slate-500">
                    Buka SQL Editor Supabase, tempelkan (paste), lalu klik <strong>RUN</strong>.
                  </p>
                </div>
                <a
                  href={`https://supabase.com/dashboard/project/${currentProjectRef}/sql/new`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2.5 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-md font-bold text-[11px] transition-colors"
                >
                  <span>Buka SQL Editor</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                <div>
                  <span className="font-extrabold text-emerald-700 block mb-1">Langkah 3: Sinkronkan</span>
                  <p className="text-[11px] text-slate-500">
                    Klik tombol sinkronisasi untuk memverifikasi data persil aktif di aplikasi.
                  </p>
                </div>
                <button
                  onClick={handleSyncData}
                  disabled={isSyncing}
                  className="mt-2.5 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 rounded-md font-bold text-[11px] transition-colors shadow-2xs"
                >
                  <UploadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Data'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Project Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-slate-400" />
                  Supabase Project URL
                </span>
                <button
                  onClick={() => copyToClipboard(SUPABASE_URL, 'url')}
                  className="text-slate-400 hover:text-slate-700 p-1"
                  title="Salin URL"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-xs font-mono font-bold text-slate-800 truncate mt-1">{SUPABASE_URL}</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                Anon / Public API Key
              </span>
              <p className="text-xs font-mono font-bold text-slate-800 truncate mt-1">
                {SUPABASE_ANON_KEY.substring(0, 16)}••••••••••••
              </p>
            </div>
          </div>

          {/* SQL Editor Helper Snippet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-700" />
                Skema SQL DDL Tabel Assets:
              </label>
              <div className="flex items-center gap-2">
                <a
                  href="/supabase_schema_and_data.sql"
                  download="supabase_schema_and_data.sql"
                  className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-semibold"
                  title="Unduh File SQL"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .sql (37 KB)</span>
                </a>
                <button
                  onClick={() => copyToClipboard(sqlSchemaSnippet, 'sql')}
                  className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-bold ml-2"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Skema DDL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <pre className="bg-slate-900 text-emerald-300 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-36 border border-slate-800 leading-relaxed">
              {sqlSchemaSnippet}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <a
            href={`https://supabase.com/dashboard/project/${currentProjectRef}/editor`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-800 hover:text-emerald-950 font-bold transition-colors"
          >
            <span>Buka Table Editor Supabase</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncData}
              disabled={isSyncing}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <UploadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
