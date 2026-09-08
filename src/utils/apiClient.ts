import { AssetItem } from '../types';
import initialAssetsData from '../data/initialAssets.json';
import {
  fetchAssetsDirectFromSupabase,
  upsertAssetDirectToSupabase,
  bulkUpsertAssetsDirectToSupabase,
  deleteAssetDirectFromSupabase,
  deleteMultipleAssetsDirectFromSupabase,
  clearAllAssetsDirectFromSupabase,
  syncAssetsToSupabaseClient,
} from '../services/supabaseClient';

const CACHE_KEY = 'pln_cached_assets_backup';

export function getLocalCachedAssets(): AssetItem[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_) {}
  return [];
}

export function setLocalCachedAssets(assets: AssetItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(assets));
  } catch (_) {}
}

/**
 * Safely parses a response as JSON if and only if the content-type is application/json
 */
async function safeJsonParse(res: Response): Promise<any | null> {
  try {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (_) {}
  return null;
}

/**
 * Fetches assets with direct Supabase priority, resilient server API fallback,
 * and guaranteed initial 91-asset fallback for static deployments (Vercel, Cloud Run, etc.)
 */
export async function fetchAssetsFromApi(retries = 2): Promise<AssetItem[]> {
  // 1. Primary: Direct query to Supabase from the client (works on Vercel, localhost, Cloud Run)
  try {
    const supabaseData = await fetchAssetsDirectFromSupabase();
    if (Array.isArray(supabaseData) && supabaseData.length > 0) {
      setLocalCachedAssets(supabaseData);
      return supabaseData;
    }
  } catch (err) {
    console.info('Direct Supabase fetch fallback to API/Cache:', err);
  }

  // 2. Secondary: If direct Supabase failed or table empty, try backend API if available
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch('/api/assets', {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await safeJsonParse(res);
        if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setLocalCachedAssets(json.data);
          return json.data;
        }
      }
    } catch (_) {
      // Backend not running (e.g. static host on Vercel)
    }
  }

  // 3. Tertiary: Return local cache if populated
  const cached = getLocalCachedAssets();
  if (cached.length > 0) {
    return cached;
  }

  // 4. Quaternary: Guaranteed PLN UPT Madiun 91 data persil fallback
  const fallbackAssets = (initialAssetsData as unknown as AssetItem[]) || [];
  if (fallbackAssets.length > 0) {
    setLocalCachedAssets(fallbackAssets);
  }
  return fallbackAssets;
}

export async function saveAssetToApi(asset: AssetItem): Promise<AssetItem> {
  // Always update local cache immediately
  const current = getLocalCachedAssets();
  const index = current.findIndex((a) => a.id === asset.id);
  if (index >= 0) {
    current[index] = asset;
  } else {
    current.unshift(asset);
  }
  setLocalCachedAssets(current);

  // 1. Direct Supabase save
  try {
    await upsertAssetDirectToSupabase(asset);
  } catch (supabaseErr) {
    console.warn('Direct Supabase save delayed, trying backend API:', supabaseErr);
  }

  // 2. Secondary backend sync (if Express server exists)
  try {
    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asset),
    });
    if (res.ok) {
      const json = await safeJsonParse(res);
      if (json && json.success && json.data) {
        return json.data;
      }
    }
  } catch (_) {}

  return asset;
}

export async function bulkSaveAssetsToApi(assets: AssetItem[]): Promise<number> {
  // Update local cache
  const map = new Map<string, AssetItem>();
  for (const a of getLocalCachedAssets()) {
    map.set(a.id, a);
  }
  for (const a of assets) {
    map.set(a.id, a);
  }
  const merged = Array.from(map.values());
  setLocalCachedAssets(merged);

  // 1. Direct Supabase bulk upsert
  try {
    await bulkUpsertAssetsDirectToSupabase(assets);
  } catch (supabaseErr) {
    console.warn('Direct Supabase bulk save delayed:', supabaseErr);
  }

  // 2. Secondary backend sync
  try {
    const res = await fetch('/api/assets/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assets }),
    });
    if (res.ok) {
      const json = await safeJsonParse(res);
      if (json && json.success && typeof json.count === 'number') {
        return json.count;
      }
    }
  } catch (_) {}

  return assets.length;
}

export async function deleteAssetFromApi(id: string): Promise<void> {
  const current = getLocalCachedAssets().filter((a) => a.id !== id);
  setLocalCachedAssets(current);

  // 1. Direct Supabase delete
  try {
    await deleteAssetDirectFromSupabase(id);
  } catch (supabaseErr) {
    console.warn('Direct Supabase delete delayed:', supabaseErr);
  }

  // 2. Secondary backend delete
  try {
    await fetch(`/api/assets/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (_) {}
}

export async function deleteMultipleAssetsFromApi(ids: string[]): Promise<number> {
  const set = new Set(ids);
  const current = getLocalCachedAssets().filter((a) => !set.has(a.id));
  setLocalCachedAssets(current);

  // 1. Direct Supabase delete
  try {
    await deleteMultipleAssetsDirectFromSupabase(ids);
  } catch (supabaseErr) {
    console.warn('Direct Supabase multi-delete delayed:', supabaseErr);
  }

  // 2. Secondary backend delete
  try {
    const res = await fetch('/api/assets/delete-multiple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      const json = await safeJsonParse(res);
      if (json && json.success && typeof json.count === 'number') {
        return json.count;
      }
    }
  } catch (_) {}

  return ids.length;
}

export async function clearAllAssetsApi(): Promise<void> {
  setLocalCachedAssets([]);

  // 1. Direct Supabase clear
  try {
    await clearAllAssetsDirectFromSupabase();
  } catch (supabaseErr) {
    console.warn('Direct Supabase clear delayed:', supabaseErr);
  }

  // 2. Secondary backend clear
  try {
    await fetch('/api/assets/clear-all', {
      method: 'POST',
    });
  } catch (_) {}
}

export async function seedSampleAssetsApi(): Promise<number> {
  const fallbackAssets = (initialAssetsData as unknown as AssetItem[]) || [];
  setLocalCachedAssets(fallbackAssets);

  // Direct Supabase sync
  try {
    const result = await syncAssetsToSupabaseClient(fallbackAssets);
    if (result.success) {
      return result.count;
    }
  } catch (supabaseErr) {
    console.warn('Direct Supabase seed delayed:', supabaseErr);
  }

  // Secondary backend seed
  try {
    const res = await fetch('/api/assets/seed-sample', {
      method: 'POST',
    });
    if (res.ok) {
      const json = await safeJsonParse(res);
      if (json && json.success && typeof json.count === 'number') {
        return json.count;
      }
    }
  } catch (_) {}

  return fallbackAssets.length;
}

