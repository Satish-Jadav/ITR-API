import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Edge Subdomain Routing Middleware
 * Separates Web UI and API cleanly while managing a single unified codebase:
 * - api.zerotax.in (or api-*.vercel.app): Serves pure API endpoints & health checks.
 * - zerotax.in (or web / localhost): Serves the Next.js interactive Web Application.
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const url = req.nextUrl;
  const isApiSubdomain = host.startsWith('api.') || host.startsWith('api-') || host.includes('api.localhost');

  if (isApiSubdomain) {
    // 1. Root of API subdomain returns the API Health & Diagnostic status
    if (url.pathname === '/' || url.pathname === '') {
      return NextResponse.rewrite(new URL('/health', req.url));
    }

    // 2. Direct /v1/... paths on api subdomain are rewritten to /api/v1/...
    if (url.pathname.startsWith('/v1/')) {
      return NextResponse.rewrite(new URL(`/api${url.pathname}`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static JS/CSS files)
     * - _next/image (image optimization files)
     * - favicon.ico, icons, images in public
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
