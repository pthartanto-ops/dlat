import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const NEON_DEFAULT_URL =
  'postgresql://neondb_owner:npg_tK6LGxByg9JO@ep-blue-dust-b3p78lj6-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

/**
 * Normalizes connection string to ensure valid postgresql protocol
 */
export const normalizeConnectionString = (url?: string): string => {
  if (!url) return NEON_DEFAULT_URL;
  const trimmed = url.trim();

  // If someone passed an HTTP/HTTPS URL (such as a Supabase project URL https://...supabase.co),
  // it is not a PostgreSQL URI. Fallback to Neon PostgreSQL.
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    console.warn(`Notice: DATABASE_URL is an HTTP(S) URL ("${trimmed}"), not a PostgreSQL URI. Using Neon PostgreSQL connection.`);
    return NEON_DEFAULT_URL;
  }

  if (trimmed.startsWith('//')) {
    return `postgresql:${trimmed}`;
  }

  if (!trimmed.startsWith('postgres://') && !trimmed.startsWith('postgresql://')) {
    if (trimmed.includes('@')) {
      return `postgresql://${trimmed}`;
    }
    console.warn(`Notice: DATABASE_URL ("${trimmed}") is not a valid PostgreSQL URI. Using Neon PostgreSQL connection.`);
    return NEON_DEFAULT_URL;
  }

  return trimmed;
};

export const createPool = () => {
  if (!global._postgresPool) {
    const rawUrl = process.env.DATABASE_URL || NEON_DEFAULT_URL;
    const connectionString = normalizeConnectionString(rawUrl);

    global._postgresPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL pool client:', err);
    });

    console.log('Connected to PostgreSQL Database (Neon DB Pooler)');
  }
  return global._postgresPool;
};

export const pool = createPool();

export const db = drizzle(pool, { schema });

/**
 * Ensures required database tables (users, assets) exist in PostgreSQL
 */
export async function ensureDatabaseTablesExist(): Promise<void> {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          uid TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS assets (
          id TEXT PRIMARY KEY,
          alas_hak TEXT NOT NULL,
          tahapan INTEGER NOT NULL DEFAULT 0,
          status_display TEXT NOT NULL,
          upt TEXT NOT NULL DEFAULT 'UPT MADIUN',
          ultg TEXT NOT NULL,
          penghantar TEXT NOT NULL,
          aset_lapangan TEXT NOT NULL,
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
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('PostgreSQL schema verification completed successfully.');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed verifying or creating PostgreSQL schema:', error);
  }
}
