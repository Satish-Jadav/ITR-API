import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

const isLocal = !process.env.DB_HOST || process.env.DB_HOST.includes('localhost');

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 6543),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'postgres',
    ssl: isLocal ? false : 'require',
  },
});
