import { Hono } from 'hono';
import { edgeVaptFirewall } from './middleware/edgeFirewall.js';
import { authRoutes } from './routes/auth.js';
import { statutoryRoutes } from './routes/statutory.js';
import { vaultRoutes } from './routes/vault.js';
import { aaRoutes } from './routes/aa.js';
import { aiRoutes } from './routes/ai.js';
import { chatRoutes } from './routes/chat.js';
import { complianceRoutes } from './routes/compliance.js';
import { portalRoutes } from './routes/portal.js';
import { cronRoutes } from './routes/cron.js';
import { checkDbHealth } from './config/supabase.js';
import { logger, formatError } from './config/logger.js';
import { env } from './config/env.js';

export type AppEnv = {
  Variables: {
    requestId: string;
    user?: any;
  };
};

export const app = new Hono<AppEnv>();

// 1. Edge Security & VAPT Firewall Middleware
app.use('*', edgeVaptFirewall);

// 2. HTTP Request & Response Diagnostic Logger
app.use('*', async (c, next) => {
  const start = performance.now();
  const requestId = (c.get('requestId') as string) || 'unknown';
  const method = c.req.method;
  const path = c.req.path;

  try {
    await next();
  } finally {
    const durationMs = performance.now() - start;
    const status = c.res.status;
    logger.http(method, path, status, durationMs, requestId);
  }
});

// 3. Health Checks
const healthHandler = (c: any) => {
  return c.json({
    status: 'ONLINE',
    service: 'ZeroTax Production Node.js API',
    region: 'bom1 (ap-south-1 Mumbai)',
    compliance: 'CERT-In / RBI / DPDP Act 2023',
    version: '2026.1.0',
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', healthHandler);
app.get('/', healthHandler);

// Database Health & Diagnostic Check Endpoint
const dbHealthHandler = async (c: any) => {
  const dbHealth = await checkDbHealth();
  const httpStatus = dbHealth.status === 'HEALTHY' ? 200 : 503;
  return c.json(dbHealth, httpStatus);
};

app.get('/health/db', dbHealthHandler);
app.get('/api/v1/compliance/db-health', dbHealthHandler);

// 4. API v1 Domain Routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/statutory', statutoryRoutes);
app.route('/api/v1/vault', vaultRoutes);
app.route('/api/v1/aa', aaRoutes);
app.route('/api/v1/ai', aiRoutes);
app.route('/api/v1/chat', chatRoutes);
app.route('/api/v1/compliance', complianceRoutes);
app.route('/api/v1/portal', portalRoutes);
app.route('/api/v1/cron', cronRoutes);

// 5. API-VAPT-11: Global Error Handler with Rich Server-Side Logging
app.onError((err, c) => {
  const requestId = (c.get('requestId') as string) || 'unknown';
  const formatted = formatError(err);
  const method = c.req.method;
  const path = c.req.path;

  // Log complete diagnostic error on the server
  logger.error(`[API ERROR] ${method} ${path} failed [RequestId: ${requestId}]`, {
    requestId,
    method,
    path,
    errorName: formatted.name,
    errorCode: formatted.code,
    errorMessage: formatted.message,
    diagnosticHint: formatted.diagnosticHint,
    details: formatted.details,
    innerErrors: formatted.errors,
    stack: formatted.stack,
  });

  const isDev = env.NODE_ENV !== 'production';

  return c.json(
    {
      errorCode: formatted.code || 'INTERNAL_SERVER_ERROR',
      message: isDev
        ? formatted.message
        : 'A secure internal processing error occurred.',
      requestId,
      ...(isDev && formatted.diagnosticHint ? { diagnosticHint: formatted.diagnosticHint } : {}),
      ...(isDev && formatted.errors?.length ? { rootCauses: formatted.errors } : {}),
    },
    500
  );
});

// 6. 404 Handler
app.notFound((c) => {
  const requestId = (c.get('requestId') as string) || 'unknown';
  return c.json(
    {
      errorCode: 'ROUTE_NOT_FOUND',
      path: c.req.path,
      requestId,
    },
    404
  );
});
