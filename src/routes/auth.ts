import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import crypto from 'node:crypto';
import * as jose from 'jose';
import { OAuth2Client } from 'google-auth-library';
import {
  PkceChallengeRequestSchema,
  GooglePkceExchangeRequestSchema,
  RefreshTokenRequestSchema,
  DpdpShredRequestSchema,
} from '../security/vaptGuards.js';
import { signDpopBoundAccessToken } from '../security/dpopVerifier.js';
import { verifyPlayIntegrityToken } from '../security/playIntegrity.js';
import { queryDb, getSupabase } from '../config/supabase.js';
import { env } from '../config/env.js';
import { authGuard, getCurrentUser } from '../middleware/authGuard.js';
import { logSecurityAuditEvent } from '../services/auditService.js';

export const authRoutes = new Hono();

// Helper to encrypt email using AES-256-GCM with scrypt KDF and per-row random salt (API-VAPT-01)
function encryptEmailAesGcm(email: string, pepperHex: string): Buffer {
  const salt = crypto.randomBytes(16);
  // scrypt key derivation function: 32 bytes derived key with high work factor
  const key = crypto.scryptSync(pepperHex, salt, 32, { N: 16384, r: 8, p: 1 });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(email, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: [16 bytes salt][12 bytes iv][16 bytes tag][encrypted email]
  return Buffer.concat([salt, iv, tag, encrypted]);
}

/**
 * 1. POST /api/v1/auth/oauth/challenge (Distributed Serverless PKCE Storage in Postgres)
 */
authRoutes.post('/oauth/challenge', zValidator('json', PkceChallengeRequestSchema), async (c) => {
  const body = c.req.valid('json');
  const authSessionId = crypto.randomUUID();
  const playIntegrityNonce = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 300_000); // 5 minutes TTL

  await queryDb(
    `INSERT INTO auth_pkce_challenges (
       auth_session_id, code_challenge, dpop_public_key_jwk, device_installation_id,
       play_integrity_nonce, expires_at
     ) VALUES ($1::uuid, $2, $3::jsonb, $4, $5, $6)`,
    [
      authSessionId,
      body.codeChallenge,
      JSON.stringify(body.dpopPublicKeyJwk),
      body.deviceInstallationId,
      playIntegrityNonce,
      expiresAt,
    ]
  );

  return c.json({
    authSessionId,
    playIntegrityNonce,
    expiresInSeconds: 300,
  });
});

/**
 * 2. POST /api/v1/auth/oauth/google-pkce
 */
authRoutes.post('/oauth/google-pkce', zValidator('json', GooglePkceExchangeRequestSchema), async (c) => {
  const body = c.req.valid('json');
  const requestId = (c.get as any)('requestId') || crypto.randomUUID();

  // 1. Atomically consume challenge from Postgres (One-time use & distributed across serverless lambdas)
  const challengeRows = await queryDb(
    `DELETE FROM auth_pkce_challenges
     WHERE auth_session_id = $1::uuid AND expires_at > NOW()
     RETURNING code_challenge, dpop_public_key_jwk, device_installation_id, play_integrity_nonce`,
    [body.authSessionId]
  );

  if (challengeRows.length === 0) {
    return c.json({ errorCode: 'AUTH_SESSION_EXPIRED_OR_NOT_FOUND', requestId }, 400);
  }
  const session = challengeRows[0];
  const dpopJwk = typeof session.dpop_public_key_jwk === 'string'
    ? JSON.parse(session.dpop_public_key_jwk)
    : session.dpop_public_key_jwk;

  // 2. Verify PKCE S256 codeVerifier == codeChallenge
  const computedChallenge = crypto
    .createHash('sha256')
    .update(body.codeVerifier)
    .digest('base64url');

  if (computedChallenge !== session.code_challenge) {
    return c.json({ errorCode: 'INVALID_PKCE_CODE_VERIFIER', requestId }, 400);
  }

  // 3. Verify Play Integrity Verdict Token (API-VAPT-05)
  const integrity = await verifyPlayIntegrityToken(body.playIntegrityToken, session.play_integrity_nonce);
  if (!integrity.isValid) {
    await logSecurityAuditEvent({
      eventType: 'PLAY_INTEGRITY_FAILED',
      httpMethod: 'POST',
      routePath: '/api/v1/auth/oauth/google-pkce',
      clientIp: c.req.header('x-forwarded-for') || '127.0.0.1',
      statusCode: 403,
      vaptRuleTriggered: 'API-VAPT-05',
    });
    return c.json({ errorCode: 'PLAY_INTEGRITY_REJECTED', details: integrity.error, requestId }, 403);
  }

  // 4. Verify Google ID Token (API-VAPT-02: Strict production OAuth enforcement)
  const isProduction = env.NODE_ENV === 'production';
  if (isProduction && body.googleIdToken.startsWith('mock_')) {
    return c.json({ errorCode: 'MOCK_TOKEN_FORBIDDEN_IN_PRODUCTION', requestId }, 401);
  }
  if (isProduction && !env.GOOGLE_OAUTH_CLIENT_ID) {
    return c.json({ errorCode: 'GOOGLE_OAUTH_CONFIG_MISSING', message: 'GOOGLE_OAUTH_CLIENT_ID must be set in production.', requestId }, 500);
  }

  let googleEmail = `user-${session.device_installation_id.slice(0, 8)}@zerotax.in`;
  let googleSub = session.device_installation_id;

  if (env.GOOGLE_OAUTH_CLIENT_ID && !body.googleIdToken.startsWith('mock_')) {
    try {
      const client = new OAuth2Client(env.GOOGLE_OAUTH_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: body.googleIdToken,
        audience: env.GOOGLE_OAUTH_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (payload) {
        googleEmail = payload.email || googleEmail;
        googleSub = payload.sub;
      }
    } catch (e: any) {
      return c.json({ errorCode: 'INVALID_GOOGLE_ID_TOKEN', message: e.message, requestId }, 401);
    }
  }

  // 5. Upsert User in Supabase Postgres (AES-256-GCM encrypted email + HMAC blind index)
  const emailHmac = crypto.createHmac('sha256', env.ZEROTAX_PAN_BLIND_INDEX_PEPPER).update(googleEmail).digest('hex');
  const emailEncrypted = encryptEmailAesGcm(googleEmail, env.ZEROTAX_PAN_BLIND_INDEX_PEPPER);

  const userRows = await queryDb(
    `INSERT INTO users (email_hmac_sha256, email_encrypted_bytea, google_sub_id, dpdp_consent_version)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email_hmac_sha256) DO UPDATE SET updated_at = NOW()
     RETURNING user_id, account_status`,
    [emailHmac, emailEncrypted, googleSub, body.dpdpSection6Consent.consentVersion]
  );

  const user = userRows[0];
  if (user.account_status === 'SUSPENDED_VAPT_ALERT') {
    return c.json({ errorCode: 'ACCOUNT_SUSPENDED_SECURITY_ALERT', requestId }, 403);
  }

  // 6. Calculate Device DPoP Thumbprint (jkt) using RFC 7638 Canonical Thumbprint (API-VAPT-03)
  const dpopJkt = await jose.calculateJwkThumbprint(dpopJwk, 'sha256');

  // 7. Issue Access Token & Refresh Token Family (API-VAPT-06)
  const tokenFamilyId = crypto.randomUUID();
  const rawRefreshToken = `zt_rt_${crypto.randomBytes(32).toString('hex')}`;
  const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const refreshExpiresAt = new Date(Date.now() + 30 * 86400 * 1000); // 30 days

  await queryDb(
    `INSERT INTO auth_refresh_sessions (
       user_id, token_family_id, refresh_token_sha256, dpop_jkt_thumbprint,
       device_installation_id, play_integrity_verdict, expires_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      user.user_id,
      tokenFamilyId,
      refreshTokenHash,
      dpopJkt,
      session.device_installation_id,
      integrity.verdictLevel,
      refreshExpiresAt,
    ]
  );

  const { accessToken } = await signDpopBoundAccessToken(user.user_id, dpopJkt, 900);

  await logSecurityAuditEvent({
    userId: user.user_id,
    eventType: 'AUTH_SUCCESS_PKCE',
    httpMethod: 'POST',
    routePath: '/api/v1/auth/oauth/google-pkce',
    clientIp: c.req.header('x-forwarded-for') || '127.0.0.1',
    statusCode: 200,
  });

  return c.json({
    userId: user.user_id,
    tokenType: 'DPoP',
    accessToken,
    expiresInSeconds: 900,
    refreshToken: rawRefreshToken,
    refreshExpiresInSeconds: 2592000,
    serverEd25519OtaPublicKeyHex: env.ZEROTAX_OTA_PUBLIC_KEY_HEX || 'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a',
  });
});

/**
 * 3. POST /api/v1/auth/token/refresh (API-VAPT-06: Atomic rotation & expiration enforcement)
 */
authRoutes.post('/token/refresh', zValidator('json', RefreshTokenRequestSchema), async (c) => {
  const body = c.req.valid('json');
  const requestId = (c.get as any)('requestId') || crypto.randomUUID();

  const tokenHash = crypto.createHash('sha256').update(body.refreshToken).digest('hex');

  const rows = await queryDb(
    `SELECT session_id, user_id, token_family_id, dpop_jkt_thumbprint, is_rotated, is_revoked, expires_at
     FROM auth_refresh_sessions
     WHERE refresh_token_sha256 = $1 AND device_installation_id = $2`,
    [tokenHash, body.deviceInstallationId]
  );

  if (rows.length === 0) {
    return c.json({ errorCode: 'INVALID_REFRESH_TOKEN', requestId }, 401);
  }

  const session = rows[0];

  // 1. Enforce Expiration Check
  if (new Date() > new Date(session.expires_at)) {
    return c.json(
      {
        errorCode: 'REFRESH_TOKEN_EXPIRED',
        message: 'The refresh token has expired. Please authenticate again.',
        requestId,
      },
      401
    );
  }

  // 2. Compromise reuse detection: if token is already rotated or revoked, revoke the ENTIRE family!
  if (session.is_rotated || session.is_revoked) {
    await queryDb(
      `UPDATE auth_refresh_sessions SET is_revoked = TRUE WHERE token_family_id = $1`,
      [session.token_family_id]
    );

    await logSecurityAuditEvent({
      userId: session.user_id,
      eventType: 'REFRESH_TOKEN_REUSE_DETECTED',
      httpMethod: 'POST',
      routePath: '/api/v1/auth/token/refresh',
      clientIp: c.req.header('x-forwarded-for') || '127.0.0.1',
      statusCode: 403,
      vaptRuleTriggered: 'API-VAPT-06',
    });

    return c.json(
      {
        errorCode: 'REFRESH_TOKEN_REUSE_DETECTED',
        message: 'Security alert: Refresh token replay detected. All sessions have been revoked.',
        requestId,
      },
      403
    );
  }

  // 3. Atomic Rotation with Optimistic Lock preventing concurrent branch creation
  const rotateResult = await queryDb(
    `UPDATE auth_refresh_sessions
     SET is_rotated = TRUE, rotated_at = NOW()
     WHERE session_id = $1 AND is_rotated = FALSE AND is_revoked = FALSE
     RETURNING session_id`,
    [session.session_id]
  );

  if (rotateResult.length === 0) {
    // Concurrent race condition detected: revoke family immediately
    await queryDb(
      `UPDATE auth_refresh_sessions SET is_revoked = TRUE WHERE token_family_id = $1`,
      [session.token_family_id]
    );
    return c.json(
      {
        errorCode: 'REFRESH_TOKEN_REUSE_DETECTED',
        message: 'Race condition detected on refresh token rotation.',
        requestId,
      },
      403
    );
  }

  // Issue new rotated refresh token in same family
  const newRefreshToken = `zt_rt_${crypto.randomBytes(32).toString('hex')}`;
  const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  const refreshExpiresAt = new Date(Date.now() + 30 * 86400 * 1000);

  await queryDb(
    `INSERT INTO auth_refresh_sessions (
       user_id, token_family_id, refresh_token_sha256, dpop_jkt_thumbprint,
       device_installation_id, play_integrity_verdict, expires_at
     ) VALUES ($1, $2, $3, $4, $5, 'STRONG', $6)`,
    [
      session.user_id,
      session.token_family_id,
      newRefreshTokenHash,
      session.dpop_jkt_thumbprint,
      body.deviceInstallationId,
      refreshExpiresAt,
    ]
  );

  const { accessToken } = await signDpopBoundAccessToken(session.user_id, session.dpop_jkt_thumbprint, 900);

  return c.json({
    tokenType: 'DPoP',
    accessToken,
    expiresInSeconds: 900,
    refreshToken: newRefreshToken,
    refreshExpiresInSeconds: 2592000,
  });
});

/**
 * 4. DELETE /api/v1/auth/dpdp-shred-account (DPDP Act Sec 12(3) Right to Erasure)
 */
authRoutes.delete('/dpdp-shred-account', authGuard, zValidator('json', DpdpShredRequestSchema), async (c) => {
  const user = getCurrentUser(c);
  const userId = user.userId;

  // 1. Delete all encrypted vault files from Supabase Storage & DB
  const vaultRows = await queryDb(
    `SELECT storage_bucket, storage_path FROM encrypted_tax_vault_backups WHERE user_id = $1::uuid`,
    [userId],
    userId
  );

  for (const v of vaultRows) {
    if (v.storage_path) {
      try {
        const supabase = getSupabase();
        await supabase.storage.from(v.storage_bucket || env.SUPABASE_VAULT_BUCKET).remove([v.storage_path]);
      } catch (e: any) {
        console.warn('Storage purge warning:', e.message);
      }
    }
  }

  const deletedVaults = await queryDb(
    `DELETE FROM encrypted_tax_vault_backups WHERE user_id = $1::uuid RETURNING backup_id`,
    [userId],
    userId
  );

  // 2. Delete CA shared review links and dossiers from Supabase Storage & DB (API-VAPT-11)
  const caRows = await queryDb(
    `SELECT storage_bucket, storage_path FROM ca_shared_review_links WHERE user_id = $1::uuid`,
    [userId],
    userId
  );
  for (const ca of caRows) {
    if (ca.storage_path) {
      try {
        const supabase = getSupabase();
        await supabase.storage.from(ca.storage_bucket || env.SUPABASE_CA_BUCKET).remove([ca.storage_path]);
      } catch (e: any) {
        console.warn('CA storage purge warning:', e.message);
      }
    }
  }
  const deletedCaLinks = await queryDb(
    `DELETE FROM ca_shared_review_links WHERE user_id = $1::uuid RETURNING share_id`,
    [userId],
    userId
  );

  // 3. Delete all Conversational Filing Chat sessions (API-VAPT-11)
  const deletedChatSessions = await queryDb(
    `DELETE FROM chat_filing_sessions WHERE user_id = $1::uuid RETURNING session_id`,
    [userId],
    userId
  );

  // 4. Delete FCM device push token registrations (API-VAPT-11)
  const deletedFcm = await queryDb(
    `DELETE FROM fcm_device_registrations WHERE user_id = $1::uuid RETURNING device_id`,
    [userId],
    userId
  );

  // 5. Revoke AA sessions
  const revokedAa = await queryDb(
    `UPDATE aa_fiu_consent_sessions SET consent_status = 'REVOKED' WHERE user_id = $1::uuid RETURNING aa_session_id`,
    [userId],
    userId
  );

  // 6. Revoke all refresh sessions
  await queryDb(
    `UPDATE auth_refresh_sessions SET is_revoked = TRUE WHERE user_id = $1::uuid`,
    [userId]
  );

  // 7. Mark user account status shredded and wipe encrypted email bytea
  await queryDb(
    `UPDATE users
     SET account_status = 'SHREDDED_DPDP',
         email_encrypted_bytea = E'\\\\x'::bytea,
         updated_at = NOW()
     WHERE user_id = $1::uuid`,
    [userId]
  );

  const receipt = crypto.createHash('sha256').update(`${userId}:${Date.now()}:DPDP_SHRED`).digest('hex');

  return c.json({
    status: 'SHREDDED_DPDP_SEC_12_3',
    deletedVaultBackupsCount: deletedVaults.length,
    deletedCaLinksCount: deletedCaLinks.length,
    deletedChatSessionsCount: deletedChatSessions.length,
    deletedFcmDevicesCount: deletedFcm.length,
    revokedAaConsentsCount: revokedAa.length,
    shreddedAtIso: new Date().toISOString(),
    auditReceiptSha256: receipt,
  });
});

/**
 * 5. POST /api/v1/auth/logout
 */
authRoutes.post('/logout', authGuard, async (c) => {
  const user = getCurrentUser(c);
  await queryDb(
    `UPDATE auth_refresh_sessions SET is_revoked = TRUE WHERE user_id = $1::uuid`,
    [user.userId]
  );
  return c.json({ status: 'LOGGED_OUT_SUCCESSFULLY' });
});
