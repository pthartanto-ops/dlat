import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AssetItem } from '../types';
import initialAssetsData from '../data/initialAssets.json';

// In-memory cache for fast response and fallback
let inMemoryAssetsCache: AssetItem[] = (initialAssetsData as unknown as AssetItem[]) || [];

// Resolve latest credentials from environment, .env, or .env.example
function resolveSupabaseConfig(): { url: string; key: string } {
  // Load .env override if present
  dotenv.config({ override: true });

  let fileUrl = '';
  let fileKey = '';

  for (const filename of ['.env', '.env.example']) {
    const p = path.join(process.cwd(), filename);
    if (fs.existsSync(p)) {
      try {
        const text = fs.readFileSync(p, 'utf8');
        for (const rawLine of text.split('\n')) {
          const line = rawLine.trim();
          if (!line || line.startsWith('#') || !line.includes('=')) continue;
          const [k, ...v] = line.split('=');
          const varName = k.trim();
          const varVal = v.join('=').trim().replace(/^["']|["']$/g, '').trim();
          if ((varName === 'VITE_SUPABASE_URL' || varName === 'SUPABASE_URL') && varVal) {
            if (!varVal.includes('MY_') && !varVal.includes('xfrllmkcwnuljjffvcdu')) {
              fileUrl = varVal;
            }
          }
          if (
            (varName === 'VITE_SUPABASE_ANON_KEY' ||
              varName === 'SUPABASE_ANON_KEY' ||
              varName === 'SUPABASE_PUBLISHABLE_KEY') &&
            varVal
          ) {
            if (!varVal.includes('MY_') && !varVal.includes('uF_zbnkcqNJKLkPD8edWsA')) {
              fileKey = varVal;
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  const pUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const validPUrl = pUrl && !pUrl.includes('xfrllmkcwnuljjffvcdu') ? pUrl : '';
  const finalUrl = fileUrl || validPUrl || 'https://trygwztiblpuxzpruhor.supabase.co';

  const pKey = (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();
  const validPKey = pKey && !pKey.includes('uF_zbnkcqNJKLkPD8edWsA') ? pKey : '';
  const finalKey = fileKey || validPKey || 'sb_publishable_LvxOfFmNc4KkzwVS59UaHw_F7BT74v8';

  return { url: finalUrl, key: finalKey };
}

const supabaseConfig = resolveSupabaseConfig();
export const SUPABASE_URL = supabaseConfig.url;
export const SUPABASE_KEY = supabaseConfig.key;

let supabaseServerClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (!supabaseServerClient) {
    supabaseServerClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log(`Initialized Supabase Server Client (${SUPABASE_URL})`);
  }
  return supabaseServerClient;
}

export interface SupabaseTableStatus {
  connected: boolean;
  tableExists: boolean;
  rowCount: number;
  url: string;
  error?: string;
}

/**
 * Checks if Supabase is reachable and if the 'public.assets' table exists.
 */
export async function checkSupabaseAssetsTable(): Promise<SupabaseTableStatus> {
  const client = getSupabaseServerClient();
  try {
    const { data, count, error } = await client
      .from('assets')
      .select('id', { count: 'exact' })
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
    asetProperti: row.aset_properti || row.aset_lapangan || '',
    asetLapangan: row.aset_properti || row.aset_lapangan || '',
    asetCbm: row.aset_cbm || '',
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
    aset_lapangan: item.asetProperti || item.asetLapangan || '',
    aset_properti: item.asetProperti || item.asetLapangan || '',
    aset_cbm: item.asetCbm || '',
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
    sps1_is_paid: item.sps1?.isPaid ?? Boolean(item.sps1?.tanggalSps && item.sps1?.tanggalSps !== '-'),
    sps1_payment_date: item.sps1?.tanggalSps || item.sps1?.paymentDate || '',
    sps1_receipt_number: item.sps1?.receiptNumber || '',
    sps2_no: item.sps2?.spsNo || '',
    sps2_amount: item.sps2?.amount ?? 0,
    sps2_is_paid: item.sps2?.isPaid ?? Boolean(item.sps2?.tanggalSps && item.sps2?.tanggalSps !== '-'),
    sps2_payment_date: item.sps2?.tanggalSps || item.sps2?.paymentDate || '',
    sps2_receipt_number: item.sps2?.receiptNumber || '',
    sps3_no: item.sps3?.spsNo || '',
    sps3_amount: item.sps3?.amount ?? 0,
    sps3_is_paid: item.sps3?.isPaid ?? Boolean(item.sps3?.tanggalSps && item.sps3?.tanggalSps !== '-'),
    sps3_payment_date: item.sps3?.tanggalSps || item.sps3?.paymentDate || '',
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
 * Get all assets from Supabase (with automatic fallback to cache if table not ready yet)
 */
export async function getSupabaseAssets(): Promise<AssetItem[]> {
  const client = getSupabaseServerClient();
  try {
    const { data, error } = await client
      .from('assets')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.warn('Supabase query assets warning (using memory cache):', error.message);
      return inMemoryAssetsCache;
    }

    if (!data || data.length === 0) {
      // If table exists but is empty, return in-memory cache
      return inMemoryAssetsCache;
    }

    const items = data.map(supabaseRowToAssetItem);
    inMemoryAssetsCache = items;
    return items;
  } catch (err: any) {
    console.error('Failed to get assets from Supabase:', err.message || err);
    return inMemoryAssetsCache;
  }
}

/**
 * Upsert single asset to Supabase
 */
export async function upsertSupabaseAsset(item: AssetItem): Promise<AssetItem> {
  const client = getSupabaseServerClient();
  const row = assetItemToSupabaseRow(item);

  // Update in-memory cache first
  const existingIdx = inMemoryAssetsCache.findIndex((a) => a.id === item.id);
  if (existingIdx >= 0) {
    inMemoryAssetsCache[existingIdx] = item;
  } else {
    inMemoryAssetsCache.push(item);
  }

  try {
    const { data, error } = await client
      .from('assets')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('Supabase upsert warning (saved to memory):', error.message);
      return item;
    }

    return supabaseRowToAssetItem(data);
  } catch (err: any) {
    console.warn('Supabase upsert catch (saved to memory):', err.message);
    return item;
  }
}

/**
 * Bulk upsert assets to Supabase (e.g. from Excel import)
 */
export async function bulkUpsertSupabaseAssets(items: AssetItem[]): Promise<number> {
  if (items.length === 0) return 0;
  const client = getSupabaseServerClient();

  // Update in-memory cache
  const itemMap = new Map(inMemoryAssetsCache.map((a) => [a.id, a]));
  items.forEach((item) => itemMap.set(item.id, item));
  inMemoryAssetsCache = Array.from(itemMap.values());

  const rows = items.map(assetItemToSupabaseRow);
  let upsertedCount = 0;

  try {
    // Process in batches of 50
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const { error } = await client
        .from('assets')
        .upsert(chunk, { onConflict: 'id' });

      if (error) {
        console.warn(`Supabase bulk batch ${i} error:`, error.message);
      } else {
        upsertedCount += chunk.length;
      }
    }
  } catch (err: any) {
    console.warn('Supabase bulkUpsert error:', err.message);
  }

  return upsertedCount || items.length;
}

/**
 * Delete a single asset from Supabase
 */
export async function deleteSupabaseAsset(id: string): Promise<boolean> {
  const existing = inMemoryAssetsCache.find((a) => a.id === id);
  if (existing && (existing.statusDisplay === 'TERBIT' || (existing.tahapan !== null && existing.tahapan >= 17))) {
    throw new Error('Aset berstatus TERBIT tidak dapat dihapus karena telah berkekuatan hukum tetap (sertifikat terbit).');
  }

  inMemoryAssetsCache = inMemoryAssetsCache.filter((a) => a.id !== id);

  const client = getSupabaseServerClient();
  try {
    const { error } = await client.from('assets').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete warning:', error.message);
    }
  } catch (err: any) {
    console.warn('Supabase delete catch:', err.message);
  }

  return true;
}

/**
 * Delete multiple assets from Supabase
 */
export async function deleteSupabaseAssets(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;

  const deletableIds = inMemoryAssetsCache
    .filter((a) => ids.includes(a.id) && a.statusDisplay !== 'TERBIT' && (a.tahapan === null || a.tahapan < 17))
    .map((a) => a.id);

  if (deletableIds.length === 0) return 0;

  inMemoryAssetsCache = inMemoryAssetsCache.filter((a) => !deletableIds.includes(a.id));

  const client = getSupabaseServerClient();
  try {
    const { error } = await client.from('assets').delete().in('id', deletableIds);
    if (error) {
      console.warn('Supabase batch delete warning:', error.message);
    }
  } catch (err: any) {
    console.warn('Supabase batch delete catch:', err.message);
  }

  return deletableIds.length;
}

/**
 * Clear all assets from Supabase
 */
export async function clearAllSupabaseAssets(): Promise<void> {
  inMemoryAssetsCache = [];
  const client = getSupabaseServerClient();
  try {
    const { error } = await client.from('assets').delete().neq('id', '___NEVER_MATCH___');
    if (error) {
      console.warn('Supabase clearAll warning:', error.message);
    }
  } catch (err: any) {
    console.warn('Supabase clearAll catch:', err.message);
  }
}

/**
 * Seeds the Supabase database with the current 91 initial assets
 */
export async function seedSupabaseWithCurrentData(): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseServerClient();
  try {
    const assetsToSeed = (initialAssetsData as unknown as AssetItem[]) || [];
    const rows = assetsToSeed.map(assetItemToSupabaseRow);

    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const { error } = await client.from('assets').upsert(chunk, { onConflict: 'id' });
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('Could not find the table')) {
          return {
            success: false,
            count: 0,
            error: 'Tabel "public.assets" belum dibuat di Supabase. Silakan jalankan Skema SQL di SQL Editor Supabase terlebih dahulu.',
          };
        }
        return { success: false, count: 0, error: error.message };
      }
    }

    inMemoryAssetsCache = assetsToSeed;
    return { success: true, count: assetsToSeed.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message };
  }
}
