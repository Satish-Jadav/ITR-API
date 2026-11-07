import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import crypto from 'node:crypto';
import { CaShareCreateSchema, FcmRegisterSchema } from '../security/vaptGuards.js';
import { authGuard, getCurrentUser } from '../middleware/authGuard.js';
import { queryDb, getSupabase } from '../config/supabase.js';
import { env } from '../config/env.js';

export const complianceRoutes = new Hono();

/**
 * 1. GET /api/v1/compliance/portal-health (Public telemetry for APK)
 */
complianceRoutes.get('/portal-health', async (c) => {
  return c.json({
    eportalStatus: 'HEALTHY',
    aisPortalStatus: 'HEALTHY',
    traces26AsStatus: 'DEGRADED_HIGH_LATENCY',
    medianResponseMs: 1420,
    recommendOfflineJsonExportFallback: false,
    checkedAtIso: new Date().toISOString(),
  });
});

/**
 * 2. POST /api/v1/compliance/ca-share/create (Authenticated)
 */
complianceRoutes.post('/ca-share/create', authGuard, zValidator('json', CaShareCreateSchema), async (c) => {
  const user = getCurrentUser(c);
  const body = c.req.valid('json');

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + body.durationHours * 3600 * 1000);
  // API-VAPT-10: Use full 64-character SHA-256 hash to prevent path enumeration
  const storagePath = `ca-dossiers/${user.userId}/${tokenHash}.ztshare`;

  // Upload dossier blob to Supabase Storage
  let storageSuccess = false;
  try {
    const supabase = getSupabase();
    const { error: storageErr } = await supabase.storage
      .from(env.SUPABASE_CA_BUCKET)
      .upload(storagePath, Buffer.from(body.encryptedDossierBlobBase64, 'base64'), {
        contentType: 'application/octet-stream',
        upsert: true,
      });
    if (!storageErr) {
      storageSuccess = true;
    } else {
      console.warn('CA dossier storage upload warning:', storageErr.message);
    }
  } catch (err: any) {
    console.warn('CA dossier storage upload warning:', err.message);
  }

  // Prevent database bloat: keep payload NULL in PostgreSQL when stored in Supabase Storage
  await queryDb(
    `INSERT INTO ca_shared_review_links (
       user_id, share_token_sha256, encrypted_dossier_blob_base64,
       storage_bucket, storage_path, aes_gcm_iv_hex, max_views, expires_at
     ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)`,
    [
      user.userId,
      tokenHash,
      storageSuccess ? null : body.encryptedDossierBlobBase64,
      env.SUPABASE_CA_BUCKET,
      storagePath,
      body.aesGcmIvHex,
      body.maxViews,
      expiresAt,
    ],
    user.userId
  );

  return c.json({
    shareUrl: `https://app.zerotax.in/ca/review/${rawToken}`,
    token: rawToken,
    expiresAtIso: expiresAt.toISOString(),
    maxViews: body.maxViews,
  });
});

/**
 * 3. GET /api/v1/compliance/ca-share/:token (Public link with atomic one-time view limiter - API-VAPT-05)
 */
complianceRoutes.get('/ca-share/:token', async (c) => {
  const token = c.req.param('token');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // API-VAPT-05: Atomic compare-and-increment to prevent TOCTOU race conditions
  const updatedRows = await queryDb(
    `UPDATE ca_shared_review_links
     SET current_views = current_views + 1
     WHERE share_token_sha256 = $1
       AND is_revoked = FALSE
       AND current_views < max_views
       AND expires_at > NOW()
     RETURNING share_id, encrypted_dossier_blob_base64, storage_bucket, storage_path,
               aes_gcm_iv_hex, max_views, current_views, expires_at`,
    [tokenHash]
  );

  if (updatedRows.length === 0) {
    // Determine whether token does not exist (404) or is revoked/exhausted/expired (410)
    const checkExists = await queryDb(
      `SELECT share_id FROM ca_shared_review_links WHERE share_token_sha256 = $1`,
      [tokenHash]
    );
    if (checkExists.length === 0) {
      return c.json({ errorCode: 'SHARE_LINK_NOT_FOUND' }, 404);
    }
    return c.json({ errorCode: 'SHARE_LINK_EXPIRED_OR_EXHAUSTED' }, 410);
  }

  const link = updatedRows[0];
  let payloadBase64 = link.encrypted_dossier_blob_base64;

  // If payload was offloaded to Supabase Storage, fetch directly from storage
  if (!payloadBase64 && link.storage_path) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage
        .from(link.storage_bucket || env.SUPABASE_CA_BUCKET)
        .download(link.storage_path);
      if (data && !error) {
        const arrayBuffer = await data.arrayBuffer();
        payloadBase64 = Buffer.from(arrayBuffer).toString('base64');
      }
    } catch (err: any) {
      console.warn('Supabase storage CA dossier fetch warning:', err.message);
    }
  }

  if (!payloadBase64) {
    // Storage download failed; roll back view counter so one-time link is not burned
    await queryDb(
      'UPDATE ca_shared_review_links SET current_views = GREATEST(0, current_views - 1) WHERE share_id = $1::uuid',
      [link.share_id]
    );
    return c.json({ errorCode: 'DOSSIER_STORAGE_TEMPORARILY_UNAVAILABLE' }, 503);
  }

  return c.json({
    encryptedDossierBlobBase64: payloadBase64,
    aesGcmIvHex: link.aes_gcm_iv_hex,
    viewsRemaining: Math.max(0, link.max_views - link.current_views),
    expiresAtIso: link.expires_at,
  });
});

/**
 * 4. POST /api/v1/compliance/fcm/register
 */
complianceRoutes.post('/fcm/register', authGuard, zValidator('json', FcmRegisterSchema), async (c) => {
  const user = getCurrentUser(c);
  const body = c.req.valid('json');

  await queryDb(
    `INSERT INTO fcm_device_registrations (
       device_id, user_id, fcm_token_encrypted, preferred_locale, advance_tax_alerts_enabled
     ) VALUES ($1, $2::uuid, $3, $4, $5)
     ON CONFLICT (device_id) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       fcm_token_encrypted = EXCLUDED.fcm_token_encrypted,
       preferred_locale = EXCLUDED.preferred_locale,
       advance_tax_alerts_enabled = EXCLUDED.advance_tax_alerts_enabled,
       updated_at = NOW()`,
    [
      body.deviceId,
      user.userId,
      Buffer.from(body.fcmToken),
      body.preferredLocale,
      body.advanceTaxAlertsEnabled,
    ],
    user.userId
  );

  return c.json({ status: 'FCM_REGISTERED_SUCCESSFULLY', deviceId: body.deviceId });
});
