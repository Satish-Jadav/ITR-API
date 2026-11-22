import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL;

if (dbUrl) {
  try {
    const parsed = new URL(dbUrl);
    if (!process.env.DB_HOST) process.env.DB_HOST = parsed.hostname;
    if (!process.env.DB_PORT) process.env.DB_PORT = parsed.port || '5432';
    if (!process.env.DB_USER) process.env.DB_USER = decodeURIComponent(parsed.username || 'postgres');
    if (!process.env.DB_PASSWORD) process.env.DB_PASSWORD = decodeURIComponent(parsed.password || '');
    if (!process.env.DB_NAME) process.env.DB_NAME = parsed.pathname.replace(/^\//, '') || 'postgres';
  } catch {}
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_BASE_URL: z.string().url().default('https://api.zerotax.in'),

  // PostgreSQL Connection Parameters (Discrete Variables Only)
  DB_HOST: z.string().min(1, 'DB_HOST is required').default('localhost'),
  DB_PORT: z.coerce.number().default(6543),
  DB_NAME: z.string().min(1).default('postgres'),
  DB_USER: z.string().min(1, 'DB_USER is required').default('postgres'),
  DB_PASSWORD: z.string().default(''),

  // Supabase Storage
  SUPABASE_URL: z.string().url().default('https://placeholder.supabase.co'),
  SUPABASE_ANON_KEY: z.string().default('placeholder-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default('placeholder-service-role-key'),
  SUPABASE_VAULT_BUCKET: z.string().default('ztvault-backups'),
  SUPABASE_CA_BUCKET: z.string().default('ca-dossiers'),

  // Cryptography & Keys
  ZEROTAX_ED25519_PRIVATE_KEY_PEM: z.string().optional(),
  ZEROTAX_ED25519_PUBLIC_KEY_PEM: z.string().optional(),
  ZEROTAX_OTA_SIGNING_PRIVATE_KEY_HEX: z.string().optional(),
  ZEROTAX_OTA_PUBLIC_KEY_HEX: z.string().optional(),
  ZEROTAX_PAN_BLIND_INDEX_PEPPER: z.string().default('default-64-byte-pepper-for-dev-only-00000000000000000000000000000000'),

  // Google Play Integrity & OAuth
  GOOGLE_PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON: z.string().optional(),
  GOOGLE_PLAY_PACKAGE_NAME: z.string().default('in.zerotax'),
  GOOGLE_PLAY_RELEASE_CERT_SHA256: z.string().optional(),
  ALLOW_PLAY_INTEGRITY_DEV_BYPASS: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  ALLOW_INLINE_VAULT_FALLBACK: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().default('zerotax-cron-secret-dev-default'),
  AA_FIU_BASE_URL: z.string().url().optional(),
  AA_CLIENT_ID: z.string().optional(),
  AA_CLIENT_SECRET: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let parsedEnv: EnvConfig;
const parseResult = envSchema.safeParse(process.env);

if (parseResult.success) {
  parsedEnv = parseResult.data;
} else {
  const fallbackResult = envSchema.safeParse({
    ...process.env,
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT || 6543,
    DB_NAME: process.env.DB_NAME || 'postgres',
    DB_USER: process.env.DB_USER || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
  });

  if (fallbackResult.success) {
    parsedEnv = fallbackResult.data;
  } else {
    console.warn('⚠️ Critical env parse error; applying bulletproof fallback config:', fallbackResult.error.flatten().fieldErrors);
    parsedEnv = {
      NODE_ENV: (process.env.NODE_ENV as any) || 'production',
      PORT: Number(process.env.PORT) || 3000,
      API_BASE_URL: process.env.API_BASE_URL || 'https://api.zerotax.in',
      DB_HOST: process.env.DB_HOST || 'localhost',
      DB_PORT: Number(process.env.DB_PORT) || 6543,
      DB_NAME: process.env.DB_NAME || 'postgres',
      DB_USER: process.env.DB_USER || 'postgres',
      DB_PASSWORD: process.env.DB_PASSWORD || '',
      SUPABASE_URL: process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
      SUPABASE_VAULT_BUCKET: process.env.SUPABASE_VAULT_BUCKET || 'ztvault-backups',
      SUPABASE_CA_BUCKET: process.env.SUPABASE_CA_BUCKET || 'ca-dossiers',
      ZEROTAX_PAN_BLIND_INDEX_PEPPER: process.env.ZEROTAX_PAN_BLIND_INDEX_PEPPER || 'default-64-byte-pepper-for-dev-only-00000000000000000000000000000000',
      GOOGLE_PLAY_PACKAGE_NAME: process.env.GOOGLE_PLAY_PACKAGE_NAME || 'in.zerotax',
      ALLOW_PLAY_INTEGRITY_DEV_BYPASS: true,
      ALLOW_INLINE_VAULT_FALLBACK: true,
      CRON_SECRET: process.env.CRON_SECRET || 'zerotax-cron-secret-dev-default',
    };
  }
}

export const env = parsedEnv;
