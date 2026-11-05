import { createClient, SupabaseClient } from '@supabase/supabase-js';
import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

// Supabase PostgreSQL Pool - Tuned for massive Vercel Serverless concurrency
const poolConfig: pg.PoolConfig = {
  max: process.env.NODE_ENV === 'production' ? 4 : 5,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: true,
};

if (env.DB_HOST && env.DB_USER) {
  poolConfig.host = env.DB_HOST;
  poolConfig.port = env.DB_PORT;
  poolConfig.database = env.DB_NAME;
  poolConfig.user = env.DB_USER;
  poolConfig.password = env.DB_PASSWORD;
  poolConfig.ssl = env.DB_HOST.includes('localhost') ? false : { rejectUnauthorized: false };
} else {
  poolConfig.connectionString = env.DATABASE_URL;
  poolConfig.ssl = env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false };
}

export const dbPool = new Pool(poolConfig);

// Helper for executing parameterized queries with automatic error catching
export async function queryDb<T = any>(
  text: string,
  params: any[] = [],
  currentUserId?: string
): Promise<T[]> {
  const client = await dbPool.connect();
  try {
    if (currentUserId) {
      // Set RLS scope: app.current_user_id
      await client.query(`SET LOCAL app.current_user_id = $1`, [currentUserId]);
    }
    const res = await client.query(text, params);
    return res.rows as T[];
  } finally {
    client.release();
  }
}

// Supabase JS Client for Storage
let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseInstance;
}
