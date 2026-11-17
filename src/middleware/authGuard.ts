import { Context, Next } from 'hono';
import { verifyDpopBoundAccessToken, VerifiedSessionContext } from '../security/dpopVerifier.js';

export async function authGuard(c: Context, next: Next) {
  const authHeader = c.req.header('authorization') || null;
  const dpopHeader = c.req.header('dpop') || null;
  const method = c.req.method;

  // RFC 9449 Section 4.3: htu MUST NOT include query string or fragment identifier.
  // Normalize URL with proxy headers for Vercel/reverse proxy deployments.
  const proto = c.req.header('x-forwarded-proto') || 'https';
  const host = c.req.header('x-forwarded-host') || c.req.header('host') || 'api.zerotax.in';
  let pathname = c.req.path;
  if (!pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }
  const normalizedHtu = `${proto}://${host}${pathname}`;

  try {
    const verified = await verifyDpopBoundAccessToken(authHeader, dpopHeader, method, normalizedHtu);
    c.set('user', verified);
    return await next();
  } catch (error: any) {
    return c.json(
      {
        errorCode: error.message || 'UNAUTHORIZED',
        message: 'DPoP hardware token authentication failed or expired.',
        requestId: c.get('requestId'),
      },
      401
    );
  }
}

export function getCurrentUser(c: Context): VerifiedSessionContext {
  const user = c.get('user') as VerifiedSessionContext;
  if (!user) {
    throw new Error('User context not found in request');
  }
  return user;
}
