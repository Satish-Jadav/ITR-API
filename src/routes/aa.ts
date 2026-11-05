import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import crypto from 'node:crypto';
import { AaConsentCreateSchema, AaFiRequestSchema } from '../security/vaptGuards.js';
import { authGuard, getCurrentUser } from '../middleware/authGuard.js';
import { queryDb } from '../config/supabase.js';

export const aaRoutes = new Hono();

aaRoutes.use('*', authGuard);

/**
 * 1. POST /api/v1/aa/consent/create
 */
aaRoutes.post('/consent/create', zValidator('json', AaConsentCreateSchema), async (c) => {
  const user = getCurrentUser(c);
  const body = c.req.valid('json');

  const consentHandle = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 86400 * 1000); // 24 hours

  const rows = await queryDb(
    `INSERT INTO aa_fiu_consent_sessions (
       user_id, consent_handle, aa_provider_id, apk_ephemeral_x25519_pub_key_base64,
       apk_fiu_nonce_base64, purpose_code, fetch_type, consent_status, expires_at
     )
     VALUES ($1::uuid, $2::uuid, $3, $4, $5, '101', 'ONETIME', 'PENDING', $6)
     RETURNING aa_session_id, consent_handle`,
    [
      user.userId,
      consentHandle,
      body.aaHandle.split('@')[1] || 'sahamati@aa',
      body.apkEphemeralX25519PublicKeyBase64,
      body.apkFiuNonceBase64,
      expiresAt,
    ],
    user.userId
  );

  return c.json(
    {
      aaSessionId: rows[0].aa_session_id,
      consentHandle: rows[0].consent_handle,
      aaRedirectWebUrl: `https://webview.finvu.in/consent?handle=${consentHandle}&app=in.zerotax.app`,
      enforcedPolicy: {
        purposeCode: '101',
        fetchType: 'ONETIME',
        dataLifeUnit: 'MONTH',
        dataLifeValue: 0,
      },
    },
    201
  );
});

/**
 * 2. GET /api/v1/aa/consent/:handle/status
 */
aaRoutes.get('/consent/:handle/status', async (c) => {
  const user = getCurrentUser(c);
  const handle = c.req.param('handle');

  const rows = await queryDb(
    `SELECT aa_session_id, consent_id, consent_status, expires_at
     FROM aa_fiu_consent_sessions
     WHERE user_id = $1::uuid AND consent_handle = $2::uuid`,
    [user.userId, handle],
    user.userId
  );

  if (rows.length === 0) {
    return c.json({ errorCode: 'CONSENT_SESSION_NOT_FOUND', handle }, 404);
  }

  const s = rows[0];
  return c.json({
    consentHandle: handle,
    consentId: s.consent_id || crypto.randomUUID(),
    status: s.consent_status,
    expiresAtIso: s.expires_at,
  });
});

/**
 * 3. POST /api/v1/aa/fi/request
 */
aaRoutes.post('/fi/request', zValidator('json', AaFiRequestSchema), async (c) => {
  const user = getCurrentUser(c);
  const body = c.req.valid('json');

  const sessionId = crypto.randomUUID();
  await queryDb(
    `UPDATE aa_fiu_consent_sessions
     SET consent_status = 'FI_READY'
     WHERE user_id = $1::uuid AND (consent_id = $2::uuid OR consent_handle = $2::uuid)`,
    [user.userId, body.consentId],
    user.userId
  );

  return c.json({
    sessionId,
    status: 'FI_REQUEST_DISPATCHED',
    retryAfterSeconds: 3,
  });
});

/**
 * 4. GET /api/v1/aa/fi/fetch/:sessionId
 * CRITICAL ZERO-KNOWLEDGE RULE: Vercel server returns FIP ciphertext untouched.
 */
aaRoutes.get('/fi/fetch/:sessionId', async (c) => {
  const user = getCurrentUser(c);
  const sessionId = c.req.param('sessionId');

  // Simulated encrypted FIP response matching ReBIT payload format
  return c.json({
    aaSessionId: sessionId,
    fipId: 'HDFC-FIP-01',
    fipKeyMaterial: {
      cryptoAlg: 'ECDHE',
      curve: 'Curve25519',
      fipEphemeralPublicKeyBase64: 'MCowBQYDK2VuAyEA1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2=',
      fipNonceBase64: 'z9x8c7v6b5n4m3l2k1j0h9g8f7d6s5a4==',
    },
    encryptedFiObjects: [
      {
        fiType: 'DEPOSIT',
        maskedAccNumber: 'XXXXXXXX4821',
        ciphertextWithGcmTagBase64: '7G8H9J0K1L2M3N4B5V6C7X8Z9A0S1D2F3G4H5J6K7L8M9N0B1V2C3X4Z5A6S7D8F9G0H1J2K3L4M5N6B7V8C9X0Z',
      },
    ],
  });
});

/**
 * 5. POST /api/v1/aa/consent/revoke (API-VAPT-04: Strict consentId validation)
 */
aaRoutes.post('/consent/revoke', async (c) => {
  const user = getCurrentUser(c);
  let consentId = c.req.query('consentId');

  if (!consentId) {
    try {
      const body = await c.req.json();
      consentId = body?.consentId;
    } catch {
      // Body not JSON or empty
    }
  }

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!consentId || !UUID_REGEX.test(consentId)) {
    return c.json({ errorCode: 'INVALID_OR_MISSING_CONSENT_ID', message: 'Valid UUID consentId is required to revoke.' }, 400);
  }

  const result = await queryDb(
    `UPDATE aa_fiu_consent_sessions
     SET consent_status = 'REVOKED'
     WHERE user_id = $1::uuid AND (consent_id = $2::uuid OR consent_handle = $2::uuid)
     RETURNING aa_session_id`,
    [user.userId, consentId],
    user.userId
  );

  if (result.length === 0) {
    return c.json({ errorCode: 'CONSENT_NOT_FOUND_OR_ALREADY_REVOKED', consentId }, 404);
  }

  return c.json({ status: 'CONSENT_REVOKED_SUCCESSFULLY', consentId });
});
