import { createClient, SupabaseClient } from '@supabase/supabase-js';
import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

// Supabase PostgreSQL Pool - Tuned for massive Vercel Serverless concurrency
export const dbPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: process.env.NODE_ENV === 'production' ? 2 : 5, // Lean connection footprint per serverless container
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 3000,
  allowExitOnIdle: true,
  ssl: env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
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
