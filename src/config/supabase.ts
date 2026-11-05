import { createClient, SupabaseClient } from '@supabase/supabase-js';
import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

// Direct PostgreSQL Pool - Tuned for serverless concurrency
export const dbPool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: process.env.NODE_ENV === 'production' ? 4 : 5,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: true,
  ssl: env.DB_HOST.includes('localhost') ? false : { rejectUnauthorized: false },
});

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
