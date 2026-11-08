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
  GOOGLE_PLAY_PACKAGE_NAME: z.string().default('in.zerotax.app'),
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
  // Tier 1: Quicko / Sandbox.co.in B2B Tax API Gateway
  QUICKO_API_KEY: z.string().optional(),
  QUICKO_API_SECRET: z.string().optional(),
  QUICKO_BASE_URL: z.string().url().default('https://api.sandbox.co.in'),
  QUICKO_API_VERSION: z.string().default('2.0'),
  SANDBOX_API_KEY: z.string().optional(),
  SANDBOX_API_SECRET: z.string().optional(),

  // Tier 2: Official CBDT IEC 2.0 Direct ERI Gateway (Future-Ready)
  ITD_ERI_USER_ID: z.string().optional(),
  ITD_ERI_PASSWORD: z.string().optional(),
  ITD_ERI_BASE_URL: z.string().url().default('https://eportal.incometax.gov.in/iec/foservices/api'),
  ITD_ERI_DSC_PRIVATE_KEY_PEM: z.string().optional(),
  ITD_ERI_API_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let parsedEnv: EnvConfig;
try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    // Provide safe defaults during dev/test if .env is not yet configured
    parsedEnv = envSchema.parse({
      ...process.env,
      DB_HOST: process.env.DB_HOST || 'localhost',
      DB_PORT: process.env.DB_PORT || 5432,
      DB_NAME: process.env.DB_NAME || 'postgres',
      DB_USER: process.env.DB_USER || 'postgres',
      DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
    });
  } else {
    console.error('❌ Environment configuration error (Please define DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD):', error);
    throw error;
  }
}

export const env = parsedEnv;
