import { Hono } from 'hono';
import { edgeVaptFirewall } from './middleware/edgeFirewall.js';
import { authRoutes } from './routes/auth.js';
import { statutoryRoutes } from './routes/statutory.js';
import { vaultRoutes } from './routes/vault.js';
import { aaRoutes } from './routes/aa.js';
import { aiRoutes } from './routes/ai.js';
import { chatRoutes } from './routes/chat.js';
import { complianceRoutes } from './routes/compliance.js';

export type AppEnv = {
  Variables: {
    requestId: string;
    user?: any;
  };
};

export const app = new Hono<AppEnv>();

// 1. Edge Security & VAPT Firewall Middleware
app.use('*', edgeVaptFirewall);

// 2. Health Check
const healthHandler = (c: any) => {
  return c.json({
    status: 'ONLINE',
    service: 'ZeroTax-Local Node.js API',
    region: 'bom1 (ap-south-1 Mumbai)',
    compliance: 'CERT-In / RBI / DPDP Act 2023',
    version: '2026.1.0',
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', healthHandler);
app.get('/', healthHandler);

// 3. API v1 Domain Routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/statutory', statutoryRoutes);
app.route('/api/v1/vault', vaultRoutes);
app.route('/api/v1/aa', aaRoutes);
app.route('/api/v1/ai', aiRoutes);
app.route('/api/v1/chat', chatRoutes);
app.route('/api/v1/compliance', complianceRoutes);

// 4. API-VAPT-11: Global Error Handler (Zero PII or Stack Trace Leakage)
app.onError((err, c) => {
  const requestId = (c.get('requestId') as string) || 'unknown';
  console.error(`[ERROR] RequestId: ${requestId} - ${err.message}`);

  return c.json(
    {
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'A secure internal processing error occurred.',
      requestId,
    },
    500
  );
});

// 5. 404 Handler
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
