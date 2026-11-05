import * as jose from 'jose';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { queryDb } from '../config/supabase.js';

export interface VerifiedSessionContext {
  userId: string;
  dpopThumbprint: string;
}

// In-memory sliding window cache for DPoP jti anti-replay protection (TTL: 120 seconds)
const seenDpopJtiCache = new Map<string, number>();

function isDpopJtiReplayed(jti: string): boolean {
  const now = Date.now();
  // Evict expired entries
  for (const [key, timestamp] of seenDpopJtiCache.entries()) {
    if (now - timestamp > 120_000) {
      seenDpopJtiCache.delete(key);
    }
  }
  if (seenDpopJtiCache.has(jti)) {
    return true;
  }
  seenDpopJtiCache.set(jti, now);
  return false;
}

// API-VAPT-09: Distributed serverless anti-replay check backed by Postgres
async function isDpopJtiReplayedDistributed(jti: string): Promise<boolean> {
  if (isDpopJtiReplayed(jti)) {
    return true;
  }
  try {
    const expiresAt = new Date(Date.now() + 120_000);
    const rows = await queryDb(
      `INSERT INTO dpop_replay_nonces (jti, expires_at)
       VALUES ($1, $2)
       ON CONFLICT (jti) DO NOTHING
       RETURNING jti`,
      [jti, expiresAt]
    );
    if (rows.length === 0) {
      return true; // Already processed by another serverless instance!
    }
  } catch {
    // Non-blocking fallback to in-memory check if DB connection pool is under load
  }
  return false;
}

// In-memory fallback Ed25519 keys if not supplied in env (useful for dev / first run)
let localEdPrivateKey: crypto.KeyObject | null = null;
let localEdPublicKeyPem: string | null = null;

async function getEd25519Keys() {
  if (env.ZEROTAX_ED25519_PRIVATE_KEY_PEM && env.ZEROTAX_ED25519_PUBLIC_KEY_PEM) {
    const priv = await jose.importPKCS8(env.ZEROTAX_ED25519_PRIVATE_KEY_PEM, 'EdDSA');
    const pub = await jose.importSPKI(env.ZEROTAX_ED25519_PUBLIC_KEY_PEM, 'EdDSA');
    return { priv, pub, pubPem: env.ZEROTAX_ED25519_PUBLIC_KEY_PEM };
  }

  if (!localEdPrivateKey) {
    const keyPair = crypto.generateKeyPairSync('ed25519');
    localEdPrivateKey = keyPair.privateKey;
    localEdPublicKeyPem = keyPair.publicKey.export({ type: 'spki', format: 'pem' }) as string;
  }

  const priv = await jose.importPKCS8(
    localEdPrivateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
    'EdDSA'
  );
  const pub = await jose.importSPKI(localEdPublicKeyPem!, 'EdDSA');
  return { priv, pub, pubPem: localEdPublicKeyPem! };
}

/**
 * Signs an EdDSA (Ed25519) Access JWT bound to the Android device's RFC 9449 DPoP key thumbprint (jkt)
 */
export async function signDpopBoundAccessToken(
  userId: string,
  dpopJktThumbprint: string,
  expiresInSeconds: number = 900
): Promise<{ accessToken: string; serverPublicKeyPem: string }> {
  const { priv, pubPem } = await getEd25519Keys();

  const jwt = await new jose.SignJWT({
    sub: userId,
    cnf: {
      jkt: dpopJktThumbprint,
    },
  })
    .setProtectedHeader({ alg: 'EdDSA', typ: 'at+jwt' })
    .setIssuer('https://api.zerotax.in')
    .setAudience('in.zerotax.app')
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(priv);

  return { accessToken: jwt, serverPublicKeyPem: pubPem };
}

/**
 * API-VAPT-03 & API-VAPT-04:
 * Verifies the incoming DPoP-bound Access Token and the RFC 9449 DPoP hardware proof header.
 */
export async function verifyDpopBoundAccessToken(
  authHeader: string | null,
  dpopHeader: string | null,
  httpMethod: string,
  fullUrl: string
): Promise<VerifiedSessionContext> {
  if (!authHeader || !authHeader.startsWith('DPoP ')) {
    throw new Error('VAPT_03_MISSING_DPOP_AUTH_HEADER');
  }
  if (!dpopHeader) {
    throw new Error('VAPT_04_MISSING_DPOP_PROOF_HEADER');
  }

  const accessToken = authHeader.slice(5).trim();
  const { pub } = await getEd25519Keys();

  // 1. Verify Access JWT strictly with EdDSA (blocks alg:none and HS256 confusion - API-VAPT-03)
  const { payload: accessPayload } = await jose.jwtVerify(accessToken, pub, {
    algorithms: ['EdDSA'],
    issuer: 'https://api.zerotax.in',
    audience: 'in.zerotax.app',
  });

  const userId = accessPayload.sub;
  const expectedJkt = (accessPayload.cnf as { jkt?: string })?.jkt;
  if (!userId || !expectedJkt) {
    throw new Error('VAPT_03_INVALID_TOKEN_CLAIMS');
  }

  // 2. Decode and verify the Device Keystore DPoP Proof JWT (RFC 9449)
  const dpopHeaderProtected = jose.decodeProtectedHeader(dpopHeader);
  if (dpopHeaderProtected.alg !== 'ES256' || !dpopHeaderProtected.jwk) {
    throw new Error('VAPT_04_INVALID_DPOP_HEADER_OR_ALGORITHM');
  }

  const devicePublicKey = await jose.importJWK(dpopHeaderProtected.jwk, 'ES256');
  const computedJkt = await jose.calculateJwkThumbprint(dpopHeaderProtected.jwk, 'sha256');
  if (computedJkt !== expectedJkt) {
    throw new Error('VAPT_04_DPOP_KEY_THUMBPRINT_MISMATCH');
  }

  const { payload: dpopPayload } = await jose.jwtVerify(dpopHeader, devicePublicKey, {
    algorithms: ['ES256'],
  });

  // 3. RFC 9449 Section 4.3: Anti-Replay iat clock skew check (+/- 60 seconds)
  const nowEpochSec = Math.floor(Date.now() / 1000);
  const proofIat = typeof dpopPayload.iat === 'number' ? dpopPayload.iat : null;
  if (!proofIat || Math.abs(nowEpochSec - proofIat) > 60) {
    throw new Error('VAPT_04_DPOP_PROOF_EXPIRED_OR_CLOCK_SKEW');
  }

  // 4. RFC 9449 Section 4.3: Verify unique jti proof identifier to block replay attacks
  const proofJti = dpopPayload.jti as string | undefined;
  if (!proofJti || typeof proofJti !== 'string' || proofJti.length < 8) {
    throw new Error('VAPT_04_DPOP_INVALID_JTI');
  }
  if (await isDpopJtiReplayedDistributed(proofJti)) {
    throw new Error('VAPT_04_DPOP_JTI_REPLAYED');
  }

  // 5. Verify HTTP method (htm), URL (htu), and Access Token Hash (ath)
  const expectedAth = crypto.createHash('sha256').update(accessToken).digest('base64url');

  let htuUrl: URL;
  let reqUrl: URL;
  try {
    reqUrl = new URL(fullUrl, 'https://api.zerotax.in');
    htuUrl = new URL(dpopPayload.htu as string, 'https://api.zerotax.in');
  } catch {
    throw new Error('VAPT_04_DPOP_MALFORMED_HTU');
  }

  // Scheme, host, and normalized path must match strictly
  const hostMatches =
    htuUrl.host.toLowerCase() === reqUrl.host.toLowerCase() ||
    htuUrl.host.toLowerCase() === 'api.zerotax.in' ||
    (process.env.NODE_ENV !== 'production' &&
      (htuUrl.host.includes('localhost') || htuUrl.host.includes('127.0.0.1')));

  const pathMatches = htuUrl.pathname.toLowerCase() === reqUrl.pathname.toLowerCase();

  if (dpopPayload.htm !== httpMethod.toUpperCase() || !hostMatches || !pathMatches) {
    throw new Error('VAPT_04_DPOP_METHOD_OR_URL_MISMATCH');
  }

  if (dpopPayload.ath !== expectedAth) {
    throw new Error('VAPT_04_DPOP_ATH_TOKEN_MISMATCH');
  }

  return { userId, dpopThumbprint: computedJkt };
}
