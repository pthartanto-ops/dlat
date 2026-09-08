import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
