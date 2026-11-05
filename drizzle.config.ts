import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

function getCredentials() {
  const isLocal =
    (!process.env.DB_HOST || process.env.DB_HOST.includes('localhost') || process.env.DB_HOST === '127.0.0.1') &&
    (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1'));

  const ssl = isLocal ? false : 'require';

  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      return {
        host: parsed.hostname,
        port: Number(parsed.port || 5432),
        user: decodeURIComponent(parsed.username || 'postgres'),
        password: decodeURIComponent(parsed.password || ''),
        database: parsed.pathname.replace(/^\//, '') || 'postgres',
        ssl,
      };
    } catch {
      return {
        url: process.env.DATABASE_URL,
        ssl,
      };
    }
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 6543),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'postgres',
    ssl,
  };
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  verbose: true,
  strict: false,
  dbCredentials: getCredentials(),
});
