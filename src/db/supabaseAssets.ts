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
 * Set of columns that might be missing in the remote Supabase schema cache.
 * By default, 'aset_cbm' and 'aset_properti' are flagged as missing unless the user has executed
 * the migration script in their Supabase project.
 */
const knownMissingColumns = new Set<string>([
  'aset_cbm',
  'aset_properti',
  'dokumen_sertifikat',
  'dokumen_sertifikat_nama',
  'dokumen_sertifikat_type',
  'dokumen_sertifikat_ukuran',
]);

/**
 * Converts a Supabase database row (snake_case) to client AssetItem
 */
export function supabaseRowToAssetItem(row: any): AssetItem {
  let asetCbm = row.aset_cbm || '';
  let catatan = row.catatan || '';

  // Fallback: If aset_cbm column is not present in PostgreSQL, extract from [CBM: ...] tag in catatan
  if (!asetCbm && catatan && catatan.includes('[CBM:')) {
    const match = catatan.match(/\[CBM:\s*([^\]]+)\]/i);
    if (match) {
      asetCbm = match[1].trim();
      catatan = catatan.replace(/\[CBM:\s*[^\]]+\]/i, '').trim();
    }
  }

  // Fallback: If dokumen_sertifikat column is not present in PostgreSQL, extract from [DOK_SERTIFIKAT: ...] tag in catatan
  let dokumenSertifikat = row.dokumen_sertifikat || '';
  let dokumenSertifikatNama = row.dokumen_sertifikat_nama || '';

  if (!dokumenSertifikat && catatan && catatan.includes('[DOK_SERTIFIKAT:')) {
    const match = catatan.match(/\[DOK_SERTIFIKAT:\s*([^\]|]+)(?:\|([^\]]+))?\]/i);
    if (match) {
      if (match[2]) {
        dokumenSertifikatNama = match[1].trim();
        dokumenSertifikat = match[2].trim();
      } else {
        dokumenSertifikat = match[1].trim();
      }
      catatan = catatan.replace(/\[DOK_SERTIFIKAT:\s*[^\]]+\]/i, '').trim();
    }
  }

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
    asetCbm: asetCbm,
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
    tanggalAkhir: (() => {
      const rawTgl = row.tanggal_terbit || '-';
      const hasTerbit = rawTgl !== '' && rawTgl !== '-' && rawTgl.toLowerCase() !== 'null';
      return hasTerbit ? (row.tanggal_akhir || '-') : '-';
    })(),
    kategori: row.kategori || 'TOWER',
    tahun: Number(row.tahun ?? 2024),
    kendala: row.kendala || '',
    koordinat: row.koordinat || '',
    pic: row.pic || '',
    catatan: catatan,
    dokumenSertifikat: dokumenSertifikat || undefined,
    dokumenSertifikatNama: dokumenSertifikatNama || undefined,
  };
}

/**
 * Converts client AssetItem to Supabase row format (snake_case),
 * safely omitting columns that do not exist in the remote PostgreSQL table.
 */
export function assetItemToSupabaseRow(item: AssetItem): any {
  let finalCatatan = item.catatan || '';

  // If aset_cbm column is not present in PostgreSQL schema, encode CBM into catatan so data is never lost
  if (knownMissingColumns.has('aset_cbm') && item.asetCbm && item.asetCbm !== '-') {
    if (!finalCatatan.includes('[CBM:')) {
      finalCatatan = finalCatatan ? `${finalCatatan} [CBM: ${item.asetCbm}]` : `[CBM: ${item.asetCbm}]`;
    }
  }

  // If dokumen_sertifikat column is not present in PostgreSQL schema, encode URL into catatan if it's a URL/link
  if (item.dokumenSertifikat) {
    if (!finalCatatan.includes('[DOK_SERTIFIKAT:')) {
      const docName = item.dokumenSertifikatNama || 'Dokumen';
      // Only encode if it's a reasonable length (e.g. web/drive URL or short reference, not huge base64)
      if (item.dokumenSertifikat.length < 2000) {
        finalCatatan = finalCatatan
          ? `${finalCatatan} [DOK_SERTIFIKAT: ${docName}|${item.dokumenSertifikat}]`
          : `[DOK_SERTIFIKAT: ${docName}|${item.dokumenSertifikat}]`;
      }
    }
  }

  const row: any = {
    id: item.id,
    alas_hak: item.alasHak || '',
    tahapan: item.tahapan ?? 0,
    status_display: item.statusDisplay || '-',
    upt: item.upt || 'UPT MADIUN',
    ultg: item.ultg || '',
    penghantar: item.penghantar || '',
    aset_lapangan: item.asetProperti || item.asetLapangan || '',
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
    tanggal_akhir: (() => {
      const rawTgl = item.tanggalTerbit || '-';
      const hasTerbit = rawTgl !== '' && rawTgl !== '-' && rawTgl.toLowerCase() !== 'null';
      return hasTerbit ? (item.tanggalAkhir || '-') : '-';
    })(),
    kategori: item.kategori || 'TOWER',
    tahun: item.tahun ?? 2024,
    kendala: item.kendala || '',
    koordinat: item.koordinat || '',
    pic: item.pic || '',
    catatan: finalCatatan,
    updated_at: new Date().toISOString(),
  };

  // Only include optional columns if they exist in the schema
  if (!knownMissingColumns.has('aset_properti')) {
    row.aset_properti = item.asetProperti || item.asetLapangan || '';
  }
  if (!knownMissingColumns.has('aset_cbm')) {
    row.aset_cbm = item.asetCbm || '';
  }

  return row;
}

/**
 * Resilient upsert helper that auto-adapts to PostgreSQL schema cache by stripping any unknown columns
 */
async function executeSafeSupabaseUpsert(client: any, rows: any[], selectSingle: boolean = false): Promise<{ data?: any; error?: any }> {
  let currentRows = rows.map((r) => ({ ...r }));
  let attempts = 0;

  while (attempts < 5) {
    attempts++;
    // Clean known missing columns from the payload
    for (const r of currentRows) {
      for (const col of knownMissingColumns) {
        delete r[col];
      }
    }

    let query: any = client.from('assets').upsert(selectSingle ? currentRows[0] : currentRows, { onConflict: 'id' });
    if (selectSingle) {
      query = query.select().single();
    }

    const res = await query;
    if (!res.error) {
      return { data: res.data };
    }

    // Check if error is due to an unknown column in schema cache
    const match = res.error.message?.match(/Could not find the '([^']+)' column/i);
    if (match && match[1]) {
      const missingCol = match[1];
      knownMissingColumns.add(missingCol);
      for (const r of currentRows) {
        delete r[missingCol];
      }
      continue;
    }

    return { error: res.error };
  }

  return { error: new Error('Gagal menyinkronkan data aset ke skema Supabase') };
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
    const { data, error } = await executeSafeSupabaseUpsert(client, [row], true);

    if (error) {
      console.warn('Supabase upsert warning (saved to memory):', error.message);
      return item;
    }

    return data ? supabaseRowToAssetItem(data) : item;
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
      const { error } = await executeSafeSupabaseUpsert(client, chunk, false);

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
      const { error } = await executeSafeSupabaseUpsert(client, chunk, false);
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
