import { createClient, SupabaseClient } from '@supabase/supabase-js';
import pg from 'pg';
import { env } from './env.js';
import { logger, formatError } from './logger.js';

const { Pool } = pg;

const isLocalhost = env.DB_HOST.includes('localhost') || env.DB_HOST === '127.0.0.1' || env.DB_HOST === '::1';
const isSslRequired = !isLocalhost;

// Log Pool Configuration on startup (masking password)
logger.info('🐘 Initializing PostgreSQL connection pool', {
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  hasPassword: Boolean(env.DB_PASSWORD && env.DB_PASSWORD.trim().length > 0),
  ssl: isSslRequired,
  environment: env.NODE_ENV,
});

if (isLocalhost && env.DB_PORT === 6543) {
  logger.warn(
    '💡 Notice: Connecting to localhost on port 6543 (default Supabase cloud pooler port). ' +
      'If you are running a local PostgreSQL instance, default ports are usually 5432 or 5433. ' +
      'Set DB_PORT in your .env file to match your local PostgreSQL server.'
  );
}

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
  ssl: isSslRequired ? { rejectUnauthorized: false } : false,
});

// Register pool event listeners for unexpected idle client errors
dbPool.on('error', (err) => {
  logger.dbError(err, {
    phase: 'connect',
    target: `${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`,
  });
});

dbPool.on('connect', () => {
  logger.debug('🐘 New client connected to PostgreSQL pool');
});

/**
 * Helper for executing parameterized queries with automatic timing,
 * structured logging, and actionable error diagnosis.
 */
export async function queryDb<T = any>(
  text: string,
  params: any[] = [],
  currentUserId?: string
): Promise<T[]> {
  const startTime = performance.now();
  const target = `${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;

  let client: pg.PoolClient;
  try {
    client = await dbPool.connect();
  } catch (connectErr: any) {
    const formatted = logger.dbError(connectErr, {
      phase: 'connect',
      sql: text,
      params,
      target,
      userId: currentUserId,
    });

    const enrichMsg = `Database connection failed to ${target} (${formatted.code || 'NO_CODE'}): ${formatted.message}${formatted.diagnosticHint ? ` [Hint: ${formatted.diagnosticHint}]` : ''}`;
    const errorToThrow = new Error(enrichMsg);
    (errorToThrow as any).code = formatted.code;
    (errorToThrow as any).cause = connectErr;
    (errorToThrow as any).diagnosticHint = formatted.diagnosticHint;
    throw errorToThrow;
  }

  try {
    if (currentUserId) {
      // Set RLS scope: app.current_user_id
      try {
        await client.query(`SET LOCAL app.current_user_id = $1`, [currentUserId]);
      } catch (rlsErr: any) {
        logger.dbError(rlsErr, {
          phase: 'rls',
          sql: `SET LOCAL app.current_user_id = $1`,
          params: [currentUserId],
          target,
          userId: currentUserId,
        });
        throw rlsErr;
      }
    }

    const res = await client.query(text, params);
    const durationMs = performance.now() - startTime;

    // Log query execution performance
    logger.dbQuery(text, durationMs, res.rowCount ?? (res.rows?.length || 0), params.length);

    return res.rows as T[];
  } catch (queryErr: any) {
    const formatted = logger.dbError(queryErr, {
      phase: 'query',
      sql: text,
      params,
      target,
      userId: currentUserId,
    });

    const enrichMsg = `Database query error on ${target} [${formatted.code || 'NO_CODE'}]: ${formatted.message}${formatted.diagnosticHint ? ` [Hint: ${formatted.diagnosticHint}]` : ''}`;
    const errorToThrow = new Error(enrichMsg);
    (errorToThrow as any).code = formatted.code;
    (errorToThrow as any).cause = queryErr;
    (errorToThrow as any).table = formatted.details?.table;
    (errorToThrow as any).diagnosticHint = formatted.diagnosticHint;
    throw errorToThrow;
  } finally {
    client.release();
  }
}

/**
 * Diagnostic health check for PostgreSQL connectivity and latency
 */
export async function checkDbHealth(): Promise<{
  status: 'HEALTHY' | 'UNHEALTHY';
  latencyMs: number;
  host: string;
  port: number;
  database: string;
  user: string;
  version?: string;
  serverTime?: string;
  error?: string;
  code?: string;
  diagnosticHint?: string;
}> {
  const start = performance.now();
  const host = env.DB_HOST;
  const port = env.DB_PORT;
  const database = env.DB_NAME;
  const user = env.DB_USER;

  try {
    const rows = await queryDb<{ version: string; server_time: string }>(
      'SELECT version(), NOW() as server_time'
    );
    const duration = performance.now() - start;
    const row = rows[0];

    logger.info('✅ Database health check succeeded', {
      host,
      port,
      database,
      latencyMs: Number(duration.toFixed(2)),
      version: row?.version?.split(' ')?.[1] || 'PostgreSQL',
    });

    return {
      status: 'HEALTHY',
      latencyMs: Number(duration.toFixed(2)),
      host,
      port,
      database,
      user,
      version: row?.version,
      serverTime: row?.server_time,
    };
  } catch (err: any) {
    const duration = performance.now() - start;
    const formatted = formatError(err);

    logger.error('❌ Database health check failed', {
      host,
      port,
      database,
      latencyMs: Number(duration.toFixed(2)),
      error: formatted.message,
      code: formatted.code,
      hint: formatted.diagnosticHint,
    });

    return {
      status: 'UNHEALTHY',
      latencyMs: Number(duration.toFixed(2)),
      host,
      port,
      database,
      user,
      error: formatted.message,
      code: formatted.code,
      diagnosticHint: formatted.diagnosticHint,
    };
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
