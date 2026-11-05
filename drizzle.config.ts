import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

const isLocal =
  (!process.env.DB_HOST || process.env.DB_HOST.includes('localhost')) &&
  (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost'));

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: process.env.DATABASE_URL
    ? {
        url: process.env.DATABASE_URL,
        ssl: isLocal ? false : 'require',
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 6543),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'postgres',
        ssl: isLocal ? false : 'require',
      },
});
