import { Context, Next } from 'hono';

// In-memory sliding window cache for request ID anti-replay (TTL: 60 seconds)
const seenRequestIds = new Map<string, number>();

// Periodic unref cleanup runs every 30s instead of blocking the event loop on every single request
const cleanupReplayInterval = setInterval(() => {
  const now = Date.now();
  for (const [id, ts] of seenRequestIds.entries()) {
    if (now - ts > 60_000) {
      seenRequestIds.delete(id);
    }
  }
}, 30_000);
cleanupReplayInterval.unref();

function isRequestIdReplayed(requestId: string): boolean {
  const now = Date.now();
  const existingTs = seenRequestIds.get(requestId);
  if (existingTs !== undefined && now - existingTs <= 60_000) {
    return true;
  }
  seenRequestIds.set(requestId, now);
  return false;
}

export async function edgeVaptFirewall(c: Context, next: Next) {
  const req = c.req;
  const clientIp = req.header('x-vercel-forwarded-for')?.split(',')[0].trim() || req.header('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  c.set('clientIp', clientIp);
  const requestId = req.header('x-zerotax-request-id') || crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-ZeroTax-Request-Id', requestId);

  const path = req.path;
  const isCaShare = path.startsWith('/api/v1/compliance/ca-share/');
  const isStatutory = path.startsWith('/api/v1/statutory/');
  const isHealth = path.endsWith('/health') || path.endsWith('/portal-health') || path === '/' || path === '';

  // 1. API-VAPT-12: Reject Browser Cross-Origin Requests (Native Android APK Only!)
  // Allow official CA portal origin for /compliance/ca-share/:token, and allow health checks
  const origin = req.header('origin');
  if (!isHealth && (origin || req.header('sec-fetch-site'))) {
    const isAllowedCaOrigin = isCaShare && (origin === 'https://app.zerotax.in' || (process.env.NODE_ENV !== 'production' && origin?.includes('localhost')));
    if (!isAllowedCaOrigin) {
      return c.json(
        {
          errorCode: 'VAPT_12_BROWSER_ORIGIN_FORBIDDEN',
          message: 'Direct browser access is strictly forbidden. ZeroTax API accepts native Android APK calls only.',
          requestId,
        },
        403
      );
    }
  }

  // 2. API-VAPT-08: Enforce Strict Payload Size Limit per Endpoint
  const contentLength = Number(req.header('content-length') || '0');
  let maxBytes = 512 * 1024; // 512KB default
  if (path.startsWith('/api/v1/vault/sync')) {
    maxBytes = 10 * 1024 * 1024; // 10MB for encrypted vault blobs
  } else if (path.startsWith('/api/v1/chat/sync')) {
    maxBytes = 64 * 1024; // 64KB for conversational chat sync
  }

  if (contentLength > maxBytes) {
    return c.json(
      {
        errorCode: 'VAPT_08_PAYLOAD_TOO_LARGE',
        maxAllowedBytes: maxBytes,
        receivedBytes: contentLength,
        requestId,
      },
      413
    );
  }

  // 3. API-VAPT-04: Anti-Replay Timestamp Window & Request ID Deduplication
  // Skip timestamp checks on public CDN-cacheable GET statutory & health endpoints
  if (!isHealth && !isStatutory && req.method !== 'GET') {
    const tsHeader = Number(req.header('x-zerotax-timestamp') || '0');
    const nowSec = Math.floor(Date.now() / 1000);
    if (!tsHeader || Math.abs(nowSec - tsHeader) > 30) {
      return c.json(
        {
          errorCode: 'VAPT_04_TIMESTAMP_SKEW_OR_REPLAY',
          message: 'Timestamp clock skew exceeds allowed 30-second window.',
          serverEpochSec: nowSec,
          clientEpochSec: tsHeader,
          requestId,
        },
        401
      );
    }

    if (isRequestIdReplayed(requestId)) {
      return c.json(
        {
          errorCode: 'VAPT_04_REQUEST_ID_REPLAYED',
          message: 'A request with this X-ZeroTax-Request-Id was already processed within the anti-replay window.',
          requestId,
        },
        409
      );
    }
  }

  return await next();
}
