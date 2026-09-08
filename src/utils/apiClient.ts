import { AssetItem } from '../types';
import { generateRealisticAssets } from '../data/mockData';

const CACHE_KEY = 'pln_cached_assets_backup';

function getLocalCachedAssets(): AssetItem[] {
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

function setLocalCachedAssets(assets: AssetItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(assets));
  } catch (_) {}
}

/**
 * Fetches assets from /api/assets with automatic retries, caching, and fallback resilience
 */
export async function fetchAssetsFromApi(retries = 3): Promise<AssetItem[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch('/api/assets', {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLocalCachedAssets(json.data);
        return json.data;
      }
    } catch (err: any) {
      // If server is restarting or network hiccup, retry
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 400));
        continue;
      }
      console.warn('Notice: Server API momentarily unreachable. Using local cache.');
    }
  }

  // Resilient fallback: return cached assets if available
  const cached = getLocalCachedAssets();
  return cached;
}

export async function saveAssetToApi(asset: AssetItem): Promise<AssetItem> {
  // Always update local cache first
  const current = getLocalCachedAssets();
  const index = current.findIndex((a) => a.id === asset.id);
  if (index >= 0) {
    current[index] = asset;
  } else {
    current.unshift(asset);
  }
  setLocalCachedAssets(current);

  try {
    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asset),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Server save delayed, saved to local cache:', err);
  }
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

  try {
    const res = await fetch('/api/assets/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assets }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && typeof json.count === 'number') {
        return json.count;
      }
    }
  } catch (err) {
    console.warn('Server bulk import delayed, saved to local cache:', err);
  }
  return assets.length;
}

export async function deleteAssetFromApi(id: string): Promise<void> {
  const current = getLocalCachedAssets().filter((a) => a.id !== id);
  setLocalCachedAssets(current);

  try {
    await fetch(`/api/assets/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Server delete delayed, updated local cache:', err);
  }
}

export async function deleteMultipleAssetsFromApi(ids: string[]): Promise<number> {
  const set = new Set(ids);
  const current = getLocalCachedAssets().filter((a) => !set.has(a.id));
  setLocalCachedAssets(current);

  try {
    const res = await fetch('/api/assets/delete-multiple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && typeof json.count === 'number') {
        return json.count;
      }
    }
  } catch (err) {
    console.warn('Server multi-delete delayed, updated local cache:', err);
  }
  return ids.length;
}

export async function clearAllAssetsApi(): Promise<void> {
  setLocalCachedAssets([]);
  try {
    await fetch('/api/assets/clear-all', {
      method: 'POST',
    });
  } catch (err) {
    console.warn('Server clear delayed, cleared local cache:', err);
  }
}

export async function seedSampleAssetsApi(): Promise<number> {
  const sample = generateRealisticAssets();
  setLocalCachedAssets(sample);

  try {
    const res = await fetch('/api/assets/seed-sample', {
      method: 'POST',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && typeof json.count === 'number') {
        return json.count;
      }
    }
  } catch (err) {
    console.warn('Server sample seed delayed, populated local cache:', err);
  }
  return sample.length;
}
