import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

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
