import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

const rawUrl =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_tK6LGxByg9JO@ep-blue-dust-b3p78lj6-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const defaultUrl =
  'postgresql://neondb_owner:npg_tK6LGxByg9JO@ep-blue-dust-b3p78lj6-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

let normalizedUrl = defaultUrl;
const trimmed = rawUrl.trim();
if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
  if (trimmed.startsWith('//')) {
    normalizedUrl = `postgresql:${trimmed}`;
  } else if (trimmed.startsWith('postgres://') || trimmed.startsWith('postgresql://') || trimmed.includes('@')) {
    normalizedUrl = trimmed.startsWith('postgresql://') || trimmed.startsWith('postgres://') ? trimmed : `postgresql://${trimmed}`;
  }
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials: {
    url: normalizedUrl,
    ssl: { rejectUnauthorized: false },
  },
  verbose: true,
});
