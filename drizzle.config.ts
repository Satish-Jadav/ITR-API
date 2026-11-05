import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  (process.env.DB_HOST && process.env.DB_USER
    ? `postgresql://${encodeURIComponent(process.env.DB_USER)}:${encodeURIComponent(process.env.DB_PASSWORD || '')}@${process.env.DB_HOST}:${process.env.DB_PORT || 6543}/${process.env.DB_NAME || 'postgres'}?sslmode=require`
    : 'postgresql://postgres:postgres@localhost:5432/postgres');

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
});
