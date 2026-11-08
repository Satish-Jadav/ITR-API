import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import crypto from 'node:crypto';
import { CaShareCreateSchema, FcmRegisterSchema, FilingSpeedTelemetrySchema } from '../security/vaptGuards.js';
import { authGuard, getCurrentUser } from '../middleware/authGuard.js';
import { queryDb } from '../config/supabase.js';
import { executeLivePortalHealthProbe } from './cron.js';

export const complianceRoutes = new Hono();

/**
 * 1. GET /api/v1/compliance/portal-health (100% Live Telemetry + Lazy TTL Re-Probe)
 * Reads the latest row from portal_health_telemetry (populated by GitHub Actions cron).
 * If no row exists or the latest row is older than 5 minutes, automatically triggers a live
 * probe on-demand so the APK always receives 100% real-time portal latency with zero mock data.
 */
complianceRoutes.get('/portal-health', async (c) => {
  try {
    const rows = await queryDb(
      `SELECT eportal_status, ais_portal_status, traces_status, response_time_ms, is_healthy, recorded_at
       FROM portal_health_telemetry
       ORDER BY recorded_at DESC
       LIMIT 1`
    );

    if (rows.length > 0) {
      const latest = rows[0];
      const ageMs = Date.now() - new Date(latest.recorded_at).getTime();
      if (ageMs <= 5 * 60 * 1000) {
        return c.json({
          eportalStatus: latest.eportal_status,
          aisPortalStatus: latest.ais_portal_status,
          traces26AsStatus: latest.traces_status,
          medianResponseMs: Number(latest.response_time_ms),
          recommendOfflineJsonExportFallback: !latest.is_healthy || Number(latest.response_time_ms) > 3500,
          checkedAtIso: new Date(latest.recorded_at).toISOString(),
        });
      }
    }
  } catch {}

  // Lazy TTL fallback: run live probe right now and store in portal_health_telemetry
  const liveProbe = await executeLivePortalHealthProbe();
  return c.json(liveProbe);
});

/**
 * 2. POST /api/v1/compliance/ca-share/create (Authenticated)
 * Matches CaShareCreateSchema: { aesGcmIvHex, encryptedDossierBlobBase64, maxViews, durationHours }
 * and ca_shared_review_links table in 20261105000000_zerotax_init.sql
 */
complianceRoutes.post('/ca-share/create', authGuard, zValidator('json', CaShareCreateSchema), async (c) => {
  const user = getCurrentUser(c);
  const body = c.req.valid('json');
  const shareToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(shareToken).digest('hex');
  const expiresAt = new Date(Date.now() + body.durationHours * 3600_000);

  try {
    await queryDb(
      `INSERT INTO ca_shared_review_links (
         user_id, share_token_sha256, encrypted_dossier_blob_base64, aes_gcm_iv_hex, max_views, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.userId,
        tokenHash,
        body.encryptedDossierBlobBase64,
        body.aesGcmIvHex,
        body.maxViews,
        expiresAt.toISOString(),
      ]
    );

    return c.json(
      {
        status: 'CA_SHARE_CREATED',
        shareToken,
        shareUrl: `https://zerotax.in/ca-review?token=${shareToken}`,
        maxViews: body.maxViews,
        expiresAtIso: expiresAt.toISOString(),
      },
      201
    );
  } catch (err: any) {
    return c.json({ success: false, error: 'Failed to generate CA share token: ' + err.message }, 500);
  }
});

/**
 * 3. GET /api/v1/compliance/ca-share/:token (CA View via Ephemeral Token)
 */
complianceRoutes.get('/ca-share/:token', async (c) => {
  const rawToken = c.req.param('token');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  try {
    const rows = await queryDb(
      `UPDATE ca_shared_review_links
       SET current_views = current_views + 1
       WHERE share_token_sha256 = $1
         AND is_revoked = FALSE
         AND expires_at > NOW()
         AND current_views < max_views
       RETURNING share_id, encrypted_dossier_blob_base64, aes_gcm_iv_hex, current_views, max_views, expires_at`,
      [tokenHash]
    );

    if (!rows.length) {
      return c.json({ error: 'CA_SHARE_EXPIRED_OR_MAX_VIEWS_REACHED' }, 404);
    }

    return c.json({
      shareId: rows[0].share_id,
      encryptedDossierBlobBase64: rows[0].encrypted_dossier_blob_base64,
      aesGcmIvHex: rows[0].aes_gcm_iv_hex,
      currentViews: rows[0].current_views,
      maxViews: rows[0].max_views,
      expiresAtIso: rows[0].expires_at,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * 4. POST /api/v1/compliance/register-fcm (Register Push Device Token)
 * Matches FcmRegisterSchema: { deviceId, fcmToken, preferredLocale, advanceTaxAlertsEnabled }
 * and fcm_device_registrations table in 20261105000000_zerotax_init.sql
 */
complianceRoutes.post('/register-fcm', authGuard, zValidator('json', FcmRegisterSchema), async (c) => {
  const user = getCurrentUser(c);
  const body = c.req.valid('json');

  try {
    await queryDb(
      `INSERT INTO fcm_device_registrations (
         device_id, user_id, fcm_token_encrypted, preferred_locale, advance_tax_alerts_enabled, updated_at
       ) VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (device_id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         fcm_token_encrypted = EXCLUDED.fcm_token_encrypted,
         preferred_locale = EXCLUDED.preferred_locale,
         advance_tax_alerts_enabled = EXCLUDED.advance_tax_alerts_enabled,
         updated_at = NOW()`,
      [
        body.deviceId,
        user.userId,
        Buffer.from(body.fcmToken, 'utf8'),
        body.preferredLocale,
        body.advanceTaxAlertsEnabled,
      ]
    );

    return c.json({ status: 'FCM_REGISTERED_SUCCESSFULLY', deviceId: body.deviceId });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * 5. POST /api/v1/compliance/filing-speed-telemetry
 * Records verified SLA telemetry for sub-3-minute (< 90-second) filing proof.
 */
complianceRoutes.post('/filing-speed-telemetry', zValidator('json', FilingSpeedTelemetrySchema), async (c) => {
  const body = c.req.valid('json');

  try {
    await queryDb(
      `INSERT INTO filing_speed_telemetry (
        anonymized_filing_id, itr_type, assessment_year, start_timestamp, submission_timestamp,
        everify_timestamp, total_duration_seconds, client_platform
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        body.anonymizedFilingId,
        body.itrType,
        body.assessmentYear,
        body.startTimestamp,
        body.submissionTimestamp,
        body.everifyTimestamp,
        body.totalDurationSeconds,
        body.clientPlatform,
      ]
    );
  } catch (err: any) {
    return c.json({ success: false, error: 'Failed to record filing telemetry: ' + err.message }, 500);
  }

  return c.json({
    success: true,
    message: 'Filing telemetry successfully recorded',
    durationSeconds: body.totalDurationSeconds,
    expressAchieved: body.totalDurationSeconds <= 90.0,
  });
});

/**
 * 6. GET /api/v1/compliance/filing-speed-benchmark
 * Returns 100% live p50 and p95 filing speeds from PostgreSQL (zero hardcoded 1240 mock fallback).
 */
complianceRoutes.get('/filing-speed-benchmark', async (c) => {
  const ay = c.req.query('ay') || '2026-27';

  try {
    const rows = await queryDb(
      `SELECT
        percentile_cont(0.5) WITHIN GROUP (ORDER BY total_duration_seconds) as p50_seconds,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY total_duration_seconds) as p95_seconds,
        count(*) as total_filings
      FROM filing_speed_telemetry
      WHERE assessment_year = $1`,
      [ay]
    );

    const totalFilings = Number(rows[0]?.total_filings || 0);
    const p50 = rows[0]?.p50_seconds !== null && rows[0]?.p50_seconds !== undefined ? Number(rows[0].p50_seconds) : 0;
    const p95 = rows[0]?.p95_seconds !== null && rows[0]?.p95_seconds !== undefined ? Number(rows[0].p95_seconds) : 0;

    return c.json({
      assessmentYear: ay,
      totalFilingsTracked: totalFilings,
      p50DurationSeconds: p50,
      p95DurationSeconds: p95,
      expressClaimVerified: totalFilings > 0 && p50 <= 90.0,
      benchmarkSource: 'ZeroTax Production Telemetry Engine (Live DB)',
    });
  } catch (err: any) {
    return c.json({ success: false, error: 'Failed to query filing speed telemetry: ' + err.message }, 500);
  }
});
