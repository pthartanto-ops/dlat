import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AssetItem, CertificationTargetSettings, PicOfficer } from '../types';
import initialAssetsData from '../data/initialAssets.json';

export const SUPABASE_TARGET_CONFIG_ID = '__CONFIG_TARGET_SETTINGS__';
export const SUPABASE_PIC_CONFIG_ID = '__CONFIG_PIC_OFFICERS__';

// Get Supabase credentials from client environment or fallback to user project
const envUrl = (
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  ''
).trim();

const envKey = (
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  ''
).trim();

// Avoid stale dead project if present in environment
export const SUPABASE_URL = (
  envUrl && !envUrl.includes('xfrllmkcwnuljjffvcdu')
    ? envUrl
    : 'https://trygwztiblpuxzpruhor.supabase.co'
).trim();

export const SUPABASE_ANON_KEY = (
  envKey && !envKey.includes('uF_zbnkcqNJKLkPD8edWsA')
    ? envKey
    : 'sb_publishable_LvxOfFmNc4KkzwVS59UaHw_F7BT74v8'
).trim();

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!clientInstance) {
    clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return clientInstance;
}

export interface SupabaseHealthResult {
  connected: boolean;
  latencyMs: number;
  url: string;
  projectRef: string;
  version?: string;
  error?: string;
}

export interface SupabaseTableStatus {
  connected: boolean;
  tableExists: boolean;
  rowCount: number;
  url: string;
  error?: string;
}

/**
 * Pings Supabase endpoint to verify real connectivity & latency
 */
export async function checkSupabaseConnection(): Promise<SupabaseHealthResult> {
  const start = performance.now();
  const projectRef = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0] || 'trygwztiblpuxzpruhor';

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    const latencyMs = Math.round(performance.now() - start);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        connected: true,
        latencyMs,
        url: SUPABASE_URL,
        projectRef,
        version: data?.version || '2.196.0',
      };
    } else {
      return {
        connected: false,
        latencyMs,
        url: SUPABASE_URL,
        projectRef,
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      connected: false,
      latencyMs,
      url: SUPABASE_URL,
      projectRef,
      error: err.message || 'Koneksi ke Supabase gagal dijangkau',
    };
  }
}

/**
 * Directly checks Supabase table existence & row count from the browser
 */
export async function checkSupabaseTableClient(): Promise<SupabaseTableStatus> {
  const client = getSupabaseClient();
  try {
    const { data, count, error } = await client
      .from('assets')
      .select('id', { count: 'exact' })
      .not('id', 'like', '__CONFIG_%')
      .limit(1);

    if (error) {
      if (
        error.code === 'PGRST205' ||
        error.message?.includes('Could not find the table') ||
        error.message?.includes('schema cache')
      ) {
        return {
          connected: true,
          tableExists: false,
          rowCount: 0,
          url: SUPABASE_URL,
          error: 'Tabel "public.assets" belum dibuat di Supabase.',
        };
      }
      return {
        connected: false,
        tableExists: false,
        rowCount: 0,
        url: SUPABASE_URL,
        error: error.message,
      };
    }

    return {
      connected: true,
      tableExists: true,
      rowCount: count ?? (data ? data.length : 0),
      url: SUPABASE_URL,
    };
  } catch (err: any) {
    return {
      connected: false,
      tableExists: false,
      rowCount: 0,
      url: SUPABASE_URL,
      error: err.message || 'Gagal menghubungi Supabase',
    };
  }
}

/**
 * Converts a Supabase database row (snake_case) to client AssetItem
 */
export function supabaseRowToAssetItem(row: any): AssetItem {
  return {
    id: row.id,
    alasHak: (row.alas_hak || '') as any,
    tahapan: Number(row.tahapan ?? 0),
    statusDisplay: row.status_display || '-',
    upt: row.upt || 'UPT MADIUN',
    ultg: row.ultg || '',
    penghantar: row.penghantar || '',
    asetLapangan: row.aset_lapangan || '',
    desa: row.desa || '',
    kecamatan: row.kecamatan || '',
    bpn: row.bpn || '',
    luas: Number(row.luas ?? 0),
    persil: row.persil || '',
    noSertifikat: row.no_sertifikat || '-',
    asset: row.asset || '-',
    nib: row.nib || '-',
    sps1: {
      spsNo: row.sps1_no || '',
      tanggalSps: row.sps1_payment_date || '',
      amount: Number(row.sps1_amount ?? 0),
      isPaid: Boolean(row.sps1_is_paid || (row.sps1_payment_date && row.sps1_payment_date !== '-')),
      paymentDate: row.sps1_payment_date || '',
      receiptNumber: row.sps1_receipt_number || '',
    },
    sps2: {
      spsNo: row.sps2_no || '',
      tanggalSps: row.sps2_payment_date || '',
      amount: Number(row.sps2_amount ?? 0),
      isPaid: Boolean(row.sps2_is_paid || (row.sps2_payment_date && row.sps2_payment_date !== '-')),
      paymentDate: row.sps2_payment_date || '',
      receiptNumber: row.sps2_receipt_number || '',
    },
    sps3: {
      spsNo: row.sps3_no || '',
      tanggalSps: row.sps3_payment_date || '',
      amount: Number(row.sps3_amount ?? 0),
      isPaid: Boolean(row.sps3_is_paid || (row.sps3_payment_date && row.sps3_payment_date !== '-')),
      paymentDate: row.sps3_payment_date || '',
      receiptNumber: row.sps3_receipt_number || '',
    },
    totalPnbp: Number(row.total_pnbp ?? 0),
    tanggalTerbit: row.tanggal_terbit || '-',
    tanggalAkhir: row.tanggal_akhir || '-',
    kategori: row.kategori || 'TOWER',
    tahun: Number(row.tahun ?? 2024),
    kendala: row.kendala || '',
    koordinat: row.koordinat || '',
    pic: row.pic || '',
    catatan: row.catatan || '',
  };
}

/**
 * Converts client AssetItem to Supabase row format (snake_case)
 */
export function assetItemToSupabaseRow(item: AssetItem): any {
  return {
    id: item.id,
    alas_hak: item.alasHak || '',
    tahapan: item.tahapan ?? 0,
    status_display: item.statusDisplay || '-',
    upt: item.upt || 'UPT MADIUN',
    ultg: item.ultg || '',
    penghantar: item.penghantar || '',
    aset_lapangan: item.asetLapangan || '',
    desa: item.desa || '',
    kecamatan: item.kecamatan || '',
    bpn: item.bpn || '',
    luas: item.luas ?? 0,
    persil: item.persil || '',
    no_sertifikat: item.noSertifikat || '-',
    asset: item.asset || '-',
    nib: item.nib || '-',
    sps1_no: item.sps1?.spsNo || '',
    sps1_amount: item.sps1?.amount ?? 0,
    sps1_is_paid: Boolean(item.sps1?.isPaid),
    sps1_payment_date: item.sps1?.paymentDate || '',
    sps1_receipt_number: item.sps1?.receiptNumber || '',
    sps2_no: item.sps2?.spsNo || '',
    sps2_amount: item.sps2?.amount ?? 0,
    sps2_is_paid: Boolean(item.sps2?.isPaid),
    sps2_payment_date: item.sps2?.paymentDate || '',
    sps2_receipt_number: item.sps2?.receiptNumber || '',
    sps3_no: item.sps3?.spsNo || '',
    sps3_amount: item.sps3?.amount ?? 0,
    sps3_is_paid: Boolean(item.sps3?.isPaid),
    sps3_payment_date: item.sps3?.paymentDate || '',
    sps3_receipt_number: item.sps3?.receiptNumber || '',
    total_pnbp: item.totalPnbp ?? 0,
    tanggal_terbit: item.tanggalTerbit || '-',
    tanggal_akhir: item.tanggalAkhir || '-',
    kategori: item.kategori || 'TOWER',
    tahun: item.tahun ?? 2024,
    kendala: item.kendala || '',
    koordinat: item.koordinat || '',
    pic: item.pic || '',
    catatan: item.catatan || '',
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fetches all assets directly from Supabase via client SDK (excluding config rows)
 */
export async function fetchAssetsDirectFromSupabase(): Promise<AssetItem[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('assets')
    .select('*')
    .not('id', 'like', '__CONFIG_%')
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  if (Array.isArray(data)) {
    return data
      .filter((r) => !r.id.startsWith('__CONFIG_'))
      .map(supabaseRowToAssetItem);
  }
  return [];
}

/**
 * Fetches certification target settings directly from Supabase
 */
export async function fetchTargetSettingsFromSupabase(): Promise<CertificationTargetSettings | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('assets')
      .select('catatan')
      .eq('id', SUPABASE_TARGET_CONFIG_ID)
      .maybeSingle();

    if (error) {
      console.warn('Supabase target query notice:', error.message);
      return null;
    }

    if (data?.catatan) {
      const parsed = JSON.parse(data.catatan) as CertificationTargetSettings;
      if (parsed && typeof parsed.uptTarget === 'number') {
        try {
          localStorage.setItem('pln_target_settings', JSON.stringify(parsed));
        } catch (_) {}
        return parsed;
      }
    }
    return null;
  } catch (err) {
    console.warn('Failed to parse target settings from Supabase:', err);
    return null;
  }
}

/**
 * Saves certification target settings directly to Supabase
 */
export async function saveTargetSettingsToSupabase(settings: CertificationTargetSettings): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    try {
      localStorage.setItem('pln_target_settings', JSON.stringify(settings));
    } catch (_) {}

    const { error } = await client.from('assets').upsert(
      {
        id: SUPABASE_TARGET_CONFIG_ID,
        catatan: JSON.stringify(settings),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.warn('Failed to save target settings to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to save target settings to Supabase:', err);
    return false;
  }
}

/**
 * Fetches PIC officers master list directly from Supabase
 */
export async function fetchPicOfficersFromSupabase(): Promise<PicOfficer[] | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('assets')
      .select('catatan')
      .eq('id', SUPABASE_PIC_CONFIG_ID)
      .maybeSingle();

    if (error) return null;

    if (data?.catatan) {
      const parsed = JSON.parse(data.catatan) as PicOfficer[];
      if (Array.isArray(parsed)) {
        try {
          localStorage.setItem('pln_pic_officers', JSON.stringify(parsed));
        } catch (_) {}
        return parsed;
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Saves PIC officers master list directly to Supabase
 */
export async function savePicOfficersToSupabase(officers: PicOfficer[]): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    try {
      localStorage.setItem('pln_pic_officers', JSON.stringify(officers));
    } catch (_) {}

    const { error } = await client.from('assets').upsert(
      {
        id: SUPABASE_PIC_CONFIG_ID,
        catatan: JSON.stringify(officers),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) return false;
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Upserts a single asset directly to Supabase
 */
export async function upsertAssetDirectToSupabase(asset: AssetItem): Promise<AssetItem> {
  const client = getSupabaseClient();
  const row = assetItemToSupabaseRow(asset);
  const { error } = await client.from('assets').upsert(row, { onConflict: 'id' });
  if (error) {
    throw error;
  }
  return asset;
}

/**
 * Bulk upserts multiple assets directly to Supabase
 */
export async function bulkUpsertAssetsDirectToSupabase(assets: AssetItem[]): Promise<number> {
  const client = getSupabaseClient();
  const rows = assets.map(assetItemToSupabaseRow);
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const { error } = await client.from('assets').upsert(chunk, { onConflict: 'id' });
    if (error) throw error;
  }
  return assets.length;
}

/**
 * Deletes a single asset directly from Supabase
 */
export async function deleteAssetDirectFromSupabase(id: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from('assets').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Deletes multiple assets directly from Supabase
 */
export async function deleteMultipleAssetsDirectFromSupabase(ids: string[]): Promise<number> {
  const client = getSupabaseClient();
  const { error } = await client.from('assets').delete().in('id', ids);
  if (error) throw error;
  return ids.length;
}

/**
 * Clears all assets directly from Supabase
 */
export async function clearAllAssetsDirectFromSupabase(): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from('assets').delete().neq('id', '___PLACEHOLDER___');
  if (error) throw error;
}

/**
 * Syncs / seeds assets directly to Supabase from the client without requiring backend server
 */
export async function syncAssetsToSupabaseClient(assets?: AssetItem[]): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  const client = getSupabaseClient();
  const listToSync = assets && assets.length > 0 ? assets : (initialAssetsData as unknown as AssetItem[]);
  const rows = listToSync.map(assetItemToSupabaseRow);

  try {
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const { error } = await client.from('assets').upsert(chunk, { onConflict: 'id' });
      if (error) {
        if (
          error.code === 'PGRST205' ||
          error.message?.includes('schema cache') ||
          error.message?.includes('Could not find the table')
        ) {
          return {
            success: false,
            count: 0,
            error: 'Tabel "public.assets" belum dibuat di Supabase. Silakan jalankan Skema SQL di SQL Editor Supabase terlebih dahulu.',
          };
        }
        return { success: false, count: 0, error: error.message };
      }
    }
    // Also ensure target settings & PIC officers are synchronized
    try {
      const localTargetRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('pln_target_settings') : null;
      if (localTargetRaw) {
        const localTarget = JSON.parse(localTargetRaw);
        await saveTargetSettingsToSupabase(localTarget);
      }
      const localPicRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('pln_pic_officers') : null;
      if (localPicRaw) {
        const localPic = JSON.parse(localPicRaw);
        await savePicOfficersToSupabase(localPic);
      }
    } catch (_) {}

    return { success: true, count: rows.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Gagal menyinkronkan data ke Supabase' };
  }
}

