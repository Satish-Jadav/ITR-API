import pino from 'pino';
import { env } from './env.js';

/**
 * Detailed error representation with diagnosis and resolution hints
 */
export interface FormattedError {
  name: string;
  message: string;
  code?: string;
  stack?: string;
  details?: Record<string, any>;
  errors?: any[];
  diagnosticHint?: string;
}

/**
 * Extracts and formats errors with full support for AggregateError,
 * Node.js net errors (ECONNREFUSED, ETIMEDOUT), and PostgreSQL driver error fields.
 */
export function formatError(err: unknown): FormattedError {
  if (!err || typeof err !== 'object') {
    return { name: 'UnknownError', message: String(err) };
  }

  const e = err as any;
  const name = e.name || 'Error';
  const code = e.code || e.statusCode || e.errno;
  let message = e.message || '';

  // Extract nested errors from AggregateError (Node.js IPv4/IPv6 dual-stack failures)
  let innerErrors: any[] | undefined;
  if (Array.isArray(e.errors) && e.errors.length > 0) {
    const parsedErrors = e.errors.map((ie: any) => ({
      name: ie.name || 'Error',
      message: ie.message || '',
      code: ie.code,
      syscall: ie.syscall,
      address: ie.address,
      port: ie.port,
    }));
    innerErrors = parsedErrors;

    if (!message || message.trim() === '') {
      message = parsedErrors
        .map((ie: any) => ie.message || `${ie.syscall || 'connect'} ${ie.code} to ${ie.address}:${ie.port}`)
        .filter(Boolean)
        .join('; ');
    }
  }

  if (!message && code) {
    message = `System/DB error code: ${code}`;
  } else if (!message) {
    message = name;
  }

  // Diagnostic hints for fast troubleshooting
  let diagnosticHint: string | undefined;
  const codeStr = String(code || '');

  if (codeStr === 'ECONNREFUSED') {
    diagnosticHint =
      'PostgreSQL connection refused. Verify that PostgreSQL is running, and that DB_HOST and DB_PORT in .env match your server.';
  } else if (codeStr === 'ETIMEDOUT') {
    diagnosticHint =
      'Connection to PostgreSQL timed out. Check network firewalls, security groups, or whether the DB pooler is alive.';
  } else if (codeStr === 'ENOTFOUND') {
    diagnosticHint =
      'Database host could not be resolved by DNS. Check the DB_HOST value in your environment configuration.';
  } else if (codeStr === '28P01') {
    diagnosticHint =
      'PostgreSQL authentication failed (password incorrect). Check DB_USER and DB_PASSWORD in .env.';
  } else if (codeStr === '28000') {
    diagnosticHint =
      'Invalid authorization specification for database user. Check DB_USER.';
  } else if (codeStr === '3D000') {
    diagnosticHint =
      `PostgreSQL database does not exist. Verify DB_NAME in .env.`;
  } else if (codeStr === '42P01') {
    diagnosticHint =
      `Table "${e.table || 'unknown'}" does not exist. Run database migrations ("npm run db:push" or apply supabase/migrations/20261105000000_zerotax_init.sql).`;
  } else if (codeStr === '42703') {
    diagnosticHint =
      'A referenced column does not exist in the database table. Check if schema migrations are up to date.';
  } else if (codeStr === '23505') {
    diagnosticHint =
      `Unique constraint violation (${e.constraint || 'unknown'}). Duplicate record cannot be inserted.`;
  } else if (codeStr === '23503') {
    diagnosticHint =
      `Foreign key constraint violation (${e.constraint || 'unknown'}). Referenced parent record not found.`;
  }

  return {
    name,
    message,
    code: codeStr ? codeStr : undefined,
    stack: e.stack,
    details: {
      detail: e.detail,
      hint: e.hint,
      table: e.table,
      constraint: e.constraint,
      position: e.position,
      routine: e.routine,
    },
    errors: innerErrors,
    diagnosticHint,
  };
}

/**
 * Sanitizes parameters to prevent PII, tokens, and passwords from leaking in logs.
 */
function sanitizeParam(param: any): any {
  if (param === null || param === undefined) return param;
  if (typeof param === 'number' || typeof param === 'boolean') return param;
  if (typeof param === 'string') {
    if (param.length > 120) {
      return `${param.slice(0, 30)}...[TRUNCATED ${param.length} chars]`;
    }
    // Mask potential passwords or tokens
    if (/bearer|secret|token|password|hash|private/i.test(param)) {
      return '***REDACTED***';
    }
    // Mask PAN (10 chars alphanumeric)
    if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(param)) {
      return `${param.slice(0, 2)}***${param.slice(-2)}`;
    }
    // Mask Aadhaar (12 digits)
    if (/^\d{12}$/.test(param)) {
      return `********${param.slice(-4)}`;
    }
    return param;
  }
  if (Array.isArray(param)) {
    return `[Array(${param.length})]`;
  }
  if (typeof param === 'object') {
    return '[Object]';
  }
  return String(param);
}

const isProduction = env.NODE_ENV === 'production';

// Base Pino instance
const pinoInstance = pino({
  level: isProduction ? 'info' : 'debug',
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['password', 'DB_PASSWORD', 'token', 'authorization', 'cookie', 'secretKey'],
    censor: '***REDACTED***',
  },
});

export const logger = {
  info(msg: string, meta?: Record<string, any>) {
    if (meta) {
      pinoInstance.info(meta, msg);
    } else {
      pinoInstance.info(msg);
    }
  },

  warn(msg: string, meta?: Record<string, any>) {
    if (meta) {
      pinoInstance.warn(meta, msg);
    } else {
      pinoInstance.warn(msg);
    }
  },

  error(msg: string, meta?: Record<string, any>) {
    if (meta) {
      pinoInstance.error(meta, msg);
    } else {
      pinoInstance.error(msg);
    }
  },

  debug(msg: string, meta?: Record<string, any>) {
    if (meta) {
      pinoInstance.debug(meta, msg);
    } else {
      pinoInstance.debug(msg);
    }
  },

  /**
   * Dedicated structured logger for Database Queries
   */
  dbQuery(sql: string, durationMs: number, rowCount: number, paramsCount: number) {
    const compactSql = sql.replace(/\s+/g, ' ').trim();
    const truncatedSql = compactSql.length > 200 ? `${compactSql.slice(0, 200)}...` : compactSql;

    const payload = {
      event: 'DB_QUERY_SUCCESS',
      sql: truncatedSql,
      durationMs: Number(durationMs.toFixed(2)),
      rowCount,
      paramsCount,
    };

    if (durationMs > 200) {
      pinoInstance.warn(payload, `🐢 [SLOW QUERY] DB query took ${durationMs.toFixed(1)}ms: ${truncatedSql}`);
    } else {
      pinoInstance.debug(payload, `⚡ [DB QUERY] ${truncatedSql} (${durationMs.toFixed(1)}ms, ${rowCount} rows)`);
    }
  },

  /**
   * Dedicated structured logger for Database Failures with actionable diagnostics
   */
  dbError(
    err: unknown,
    context: {
      sql?: string;
      params?: any[];
      target?: string;
      userId?: string;
      phase?: 'connect' | 'query' | 'rls';
    }
  ) {
    const formatted = formatError(err);
    const compactSql = context.sql ? context.sql.replace(/\s+/g, ' ').trim() : '';
    const truncatedSql = compactSql.length > 300 ? `${compactSql.slice(0, 300)}...` : compactSql;
    const sanitizedParams = context.params ? context.params.map(sanitizeParam) : undefined;

    const errorReport = {
      event: 'DB_OPERATION_FAILED',
      phase: context.phase || 'query',
      target: context.target || `${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`,
      errorCode: formatted.code || 'UNKNOWN_DB_ERROR',
      errorName: formatted.name,
      errorMessage: formatted.message,
      diagnosticHint: formatted.diagnosticHint,
      sql: truncatedSql || undefined,
      params: sanitizedParams,
      userId: context.userId,
      details: formatted.details,
      innerErrors: formatted.errors,
      stack: formatted.stack,
    };

    const hintMsg = formatted.diagnosticHint ? `\n   👉 Resolution: ${formatted.diagnosticHint}` : '';
    const innerMsg = formatted.errors?.length
      ? `\n   👉 Inner details: ${formatted.errors.map((i) => `${i.code || ''} ${i.message || ''} (${i.address || ''}:${i.port || ''})`).join('; ')}`
      : '';

    pinoInstance.error(
      errorReport,
      `❌ [DB ERROR] Phase: ${context.phase || 'query'} | Code: ${formatted.code || 'UNKNOWN'} | Message: ${formatted.message} | Target: ${errorReport.target}${innerMsg}${hintMsg}`
    );

    return formatted;
  },

  /**
   * Dedicated structured logger for HTTP Requests
   */
  http(method: string, path: string, status: number, durationMs: number, requestId?: string, errorInfo?: string) {
    const logData = {
      event: 'HTTP_REQUEST',
      method,
      path,
      status,
      durationMs: Number(durationMs.toFixed(2)),
      requestId,
      error: errorInfo,
    };

    const statusTag = status >= 500 ? '❌ 5xx' : status >= 400 ? '⚠️ 4xx' : '✅ 2xx';
    const message = `${statusTag} [HTTP] ${method} ${path} -> ${status} (${durationMs.toFixed(1)}ms) [${requestId || 'no-id'}]${errorInfo ? ` - ${errorInfo}` : ''}`;

    if (status >= 500) {
      pinoInstance.error(logData, message);
    } else if (status >= 400) {
      pinoInstance.warn(logData, message);
    } else {
      pinoInstance.info(logData, message);
    }
  },
};
