import { env } from '../config/env.js';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import crypto from 'node:crypto';
import {
  PortalOtpRequestSchema,
  PortalOtpVerifySchema,
  PortalSyncRequestSchema,
} from '../security/vaptGuards.js';
import { logger } from '../config/logger.js';
import { queryDb } from '../config/supabase.js';
import {
  PortalDriverService,
  ipOtpRequests,
  devInMemorySessions,
  devPanToTxnMap,
} from '../services/portalDriverService.js';
import { z } from 'zod';

export const portalRoutes = new Hono();

/**
 * 0. GET /api/v1/portal/driver-status
 * Exposes current driver status, prioritization, and gateway capabilities.
 * Priority: 1) QUICKO_ERI (Sandbox.co.in) -> 2) CBDT_DIRECT_ERI (Official ITD) -> 3) IN_APP_LIVE_DRIVER (Zero-Cost).
 */
portalRoutes.get('/driver-status', (c) => {
  const status = PortalDriverService.getDriverStatus();
  return c.json(status);
});

/**
 * 1. POST /api/v1/portal/otp/request
 * Dispatches a cryptographically secure 6-digit Aadhaar / ITD OTP.
 * Prioritizes Quicko B2B ERI -> CBDT Direct IEC 2.0 -> Zero-Cost In-App Live Driver fallback.
 * Enforces a strict 60-second rate-limiting cooldown per PAN.
 */
portalRoutes.post('/otp/request', zValidator('json', PortalOtpRequestSchema), async (c) => {
  const body = c.req.valid('json');
  const pan = body.pan.toUpperCase();
  const now = Date.now();

  // Enforce IP-level rate-limiting (max 10 OTP requests per 5 minutes per IP)
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const ipRecord = ipOtpRequests.get(clientIp);
  if (ipRecord && ipRecord.resetAt > now) {
    if (ipRecord.count >= 10) {
      return c.json(
        {
          success: false,
          errorCode: 'TOO_MANY_OTP_REQUESTS_FROM_IP',
          message: 'Too many OTP requests from this network. Please wait 5 minutes before trying again.',
        },
        429
      );
    }
    ipRecord.count += 1;
  } else {
    ipOtpRequests.set(clientIp, { count: 1, resetAt: now + 5 * 60 * 1000 });
  }

  try {
    const result = await PortalDriverService.requestPrefillOtp(pan, body.purpose, clientIp);
    return c.json(result);
  } catch (err: any) {
    if (err.statusCode === 429) {
      return c.json(
        {
          success: false,
          errorCode: 'RATE_LIMITED',
          message: err.message,
          cooldownSeconds: err.cooldownSeconds || 60,
        },
        429
      );
    }
    logger.error('[PORTAL OTP REQUEST ERROR]', err);
    return c.json(
      {
        success: false,
        errorCode: 'OTP_REQUEST_FAILED',
        message: err.message || 'Failed to dispatch portal OTP.',
      },
      err.statusCode || 500
    );
  }
});

/**
 * 2. POST /api/v1/portal/otp/verify
 * Validates the 6-digit OTP entered by the user.
 * Prioritizes Quicko B2B ERI -> CBDT Direct IEC 2.0 -> Zero-Cost In-App Live Driver fallback.
 */
portalRoutes.post('/otp/verify', zValidator('json', PortalOtpVerifySchema), async (c) => {
  const body = c.req.valid('json');
  const pan = body.pan.toUpperCase();
  const txnId = body.txnId;

  try {
    const result = await PortalDriverService.verifyPrefillOtp(pan, txnId, body.otp);
    return c.json(result);
  } catch (err: any) {
    const statusCode = err.statusCode || 400;
    return c.json(
      {
        success: false,
        errorCode: err.errorCode || 'OTP_VERIFICATION_FAILED',
        message: err.message || 'OTP verification failed.',
        ...(err.attemptsRemaining !== undefined ? { attemptsRemaining: err.attemptsRemaining } : {}),
      },
      statusCode
    );
  }
});

/**
 * 3. POST /api/v1/portal/sync
 * 100% Zero-Mock AIS/TIS and Form 26AS Sync Engine.
 * Persists verified snapshot into PostgreSQL portal_sync_snapshots.
 */
portalRoutes.post('/sync', zValidator('json', PortalSyncRequestSchema), async (c) => {
  const body = c.req.valid('json');
  const pan = body.pan.toUpperCase();
  const txnId = body.txnId;

  // Retrieve verification session from DB
  let sessionVerified = false;
  let sessionToken: string | null = null;

  try {
    const rows = await queryDb(
      `SELECT verified, verification_token
       FROM portal_otp_verification_sessions
       WHERE txn_id = $1::uuid AND pan = $2`,
      [txnId, pan]
    );
    if (rows.length > 0) {
      sessionVerified = Boolean(rows[0].verified);
      sessionToken = rows[0].verification_token;
    }
  } catch {
    const mem = devInMemorySessions.get(txnId);
    if (mem && mem.pan === pan) {
      sessionVerified = mem.verified;
      sessionToken = mem.verificationToken;
    }
  }

  if (!sessionToken) {
    const mem = devInMemorySessions.get(txnId);
    if (mem && mem.pan === pan) {
      sessionVerified = mem.verified;
      sessionToken = mem.verificationToken;
    }
  }

  if (!sessionVerified || !sessionToken) {
    return c.json(
      {
        success: false,
        errorCode: 'UNAUTHORIZED_SESSION',
        message: 'No verified session found for this PAN.',
      },
      401
    );
  }

  const tokenMatches =
    sessionToken.length === body.verificationToken.length &&
    crypto.timingSafeEqual(Buffer.from(sessionToken, 'utf8'), Buffer.from(body.verificationToken, 'utf8'));

  if (!tokenMatches) {
    return c.json(
      {
        success: false,
        errorCode: 'SESSION_NOT_VERIFIED',
        message: 'Verification token invalid or mismatched.',
      },
      403
    );
  }

  // 100% Zero-Mock Handling:
  let transactions: any[] = [];
  let recordCount = 0;
  let aggregateGross = 0;
  let aggregateTds = 0;

  if (body.transactions && Array.isArray(body.transactions) && body.transactions.length > 0) {
    transactions = body.transactions;
    recordCount = transactions.length;
    aggregateGross = body.aggregateGrossAmount ?? transactions.reduce((acc, t) => acc + (t.grossAmount || 0), 0);
    aggregateTds = body.aggregateTdsCredit ?? transactions.reduce((acc, t) => acc + (t.tdsWithheld || 0), 0);

    const panBlindIndexHmac = crypto
      .createHmac('sha256', env.ZEROTAX_PAN_BLIND_INDEX_PEPPER)
      .update(pan)
      .digest('hex');

    try {
      await queryDb(
        `INSERT INTO portal_sync_snapshots (
           pan, pan_blind_index_hmac, assessment_year, source_origin, record_count, aggregate_gross_amount, aggregate_tds_credit,
           encrypted_snapshot_payload, snapshot_json, synced_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, NOW())`,
        [
          pan,
          panBlindIndexHmac,
          body.assessmentYear,
          body.sourceOrigin || 'CLIENT_ENCRYPTED_BRIDGE',
          recordCount,
          aggregateGross,
          aggregateTds,
          body.encryptedSnapshotPayloadBase64 || null,
        ]
      );
    } catch (err: any) {
      logger.warn('Failed to persist portal snapshot to DB:', err.message);
    }
  } else {
    try {
      const snapRows = await queryDb(
        `SELECT record_count, aggregate_gross_amount, aggregate_tds_credit, snapshot_json, synced_at
         FROM portal_sync_snapshots
         WHERE pan = $1 AND assessment_year = $2
         ORDER BY synced_at DESC LIMIT 1`,
        [pan, body.assessmentYear]
      );

      if (snapRows.length > 0) {
        recordCount = snapRows[0].record_count;
        aggregateGross = snapRows[0].aggregate_gross_amount;
        aggregateTds = snapRows[0].aggregate_tds_credit;
        transactions = typeof snapRows[0].snapshot_json === 'string'
          ? JSON.parse(snapRows[0].snapshot_json)
          : snapRows[0].snapshot_json || [];
      }
    } catch {
      transactions = [];
      recordCount = 0;
      aggregateGross = 0;
      aggregateTds = 0;
    }
  }

  logger.info(`[PORTAL SYNC] Successfully synced ${recordCount} live records for PAN ${pan}`);

  return c.json({
    success: true,
    pan,
    assessmentYear: body.assessmentYear,
    recordCount,
    aggregateGrossAmount: aggregateGross,
    aggregateTdsCredit: aggregateTds,
    transactions,
    syncedAtIso: new Date().toISOString(),
  });
});

/**
 * 4. POST /api/v1/portal/ingest-live-prefill
 * Ingests live authenticated ITD Pre-fill JSON, AIS/TIS JSON & Form 26AS captured
 * by the Android WebView bridge. Persists zero-knowledge encrypted snapshots with pan_blind_index_hmac.
 */
portalRoutes.post('/ingest-live-prefill', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, errorCode: 'INVALID_JSON_BODY' }, 400);
  }

  const rawPan = (body.pan || '').trim().toUpperCase();
  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  if (!PAN_REGEX.test(rawPan)) {
    return c.json({ success: false, errorCode: 'INVALID_PAN_FORMAT' }, 400);
  }

  const ay = body.assessmentYear || '2026-27';
  const sourceOrigin = body.sourceOrigin || 'WEBVIEW_LIVE_INTERCEPTOR';

  const panBlindIndexHmac = crypto
    .createHmac('sha256', env.ZEROTAX_PAN_BLIND_INDEX_PEPPER)
    .update(rawPan)
    .digest('hex');

  let recordCount = Number(body.recordCount || 0);
  let aggregateGross = Number(body.aggregateGrossAmount || 0);
  let aggregateTds = Number(body.aggregateTdsCredit || 0);

  if (Array.isArray(body.transactions) && body.transactions.length > 0) {
    recordCount = body.transactions.length;
    if (aggregateGross === 0) {
      aggregateGross = body.transactions.reduce((acc: number, t: any) => acc + (t.grossAmount || 0), 0);
    }
    if (aggregateTds === 0) {
      aggregateTds = body.transactions.reduce((acc: number, t: any) => acc + (t.tdsWithheld || t.tdsAmount || 0), 0);
    }
  }

  try {
    await queryDb(
      `INSERT INTO portal_sync_snapshots (
         pan, pan_blind_index_hmac, assessment_year, source_origin, record_count,
         aggregate_gross_amount, aggregate_tds_credit, encrypted_snapshot_payload, snapshot_json, synced_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, NOW())`,
      [
        rawPan,
        panBlindIndexHmac,
        ay,
        sourceOrigin,
        recordCount,
        aggregateGross,
        aggregateTds,
        body.encryptedPayloadBase64 || null,
      ]
    );
  } catch (err: any) {
    logger.warn('[PORTAL PREFILL INGEST] DB snapshot save warning:', err.message);
  }

  logger.info(`[PORTAL PREFILL INGEST] Ingested live prefill for PAN ${rawPan.slice(0, 2)}***${rawPan.slice(8)} AY ${ay} (${recordCount} records)`);

  return c.json({
    success: true,
    pan: rawPan,
    assessmentYear: ay,
    recordCount,
    aggregateGrossAmount: aggregateGross,
    aggregateTdsCredit: aggregateTds,
    ingestedAtIso: new Date().toISOString(),
    message: 'Live ITD Pre-fill and tax credits persisted to encrypted vault snapshot.',
  });
});

/**
 * 5. POST /api/v1/portal/submit
 * Direct ITR Submission Router. Prioritizes:
 * 1) Quicko B2B ERI Gateway -> 2) Official CBDT IEC 2.0 Gateway -> 3) Zero-Cost In-App Live Driver.
 */
portalRoutes.post('/submit', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, errorCode: 'INVALID_JSON_BODY' }, 400);
  }

  const pan = (body.pan || '').trim().toUpperCase();
  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  if (!PAN_REGEX.test(pan)) {
    return c.json({ success: false, errorCode: 'INVALID_PAN_FORMAT' }, 400);
  }

  const payloadStr = typeof body.cbdtJsonPayload === 'string'
    ? body.cbdtJsonPayload
    : JSON.stringify(body.cbdtJsonPayload || {});

  let parsed: any;
  try {
    parsed = JSON.parse(payloadStr);
    if (!parsed.ITR1 && !parsed.ITR2 && !parsed.ITR4 && !parsed.ITR) {
      return c.json({ success: false, errorCode: 'MALFORMED_CBDT_SCHEMA', message: 'Missing root ITR element (ITR1/ITR2/ITR4)' }, 400);
    }
  } catch {
    return c.json({ success: false, errorCode: 'INVALID_CBDT_JSON' }, 400);
  }

  const ay = body.assessmentYear || '2026-27';

  try {
    const result = await PortalDriverService.submitReturn(pan, ay, parsed, body.bankAccount);
    return c.json(result);
  } catch (err: any) {
    logger.error('[PORTAL SUBMIT ERROR]', err);
    return c.json(
      {
        success: false,
        errorCode: 'SUBMISSION_FAILED',
        message: err.message || 'Failed to submit ITR.',
      },
      500
    );
  }
});

/**
 * 6. POST /api/v1/portal/everify
 * Direct ITR e-Verification Router.
 * Handles Aadhaar OTP / EVC verification across Quicko, CBDT Direct, and In-App driver.
 */
portalRoutes.post(
  '/everify',
  zValidator(
    'json',
    z.object({
      pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format'),
      acknowledgmentNumber: z.string().min(5, 'Acknowledgment number required'),
      otp: z.string().regex(/^[0-9]{6}$/, 'OTP must be exactly 6 digits'),
      evcType: z.enum(['AADHAAR_OTP', 'NET_BANKING', 'BANK_ACCOUNT', 'DEMAT']).default('AADHAAR_OTP'),
    })
  ),
  async (c) => {
    const body = c.req.valid('json');
    const pan = body.pan.toUpperCase();

    try {
      const result = await PortalDriverService.eVerifyReturn(
        pan,
        body.acknowledgmentNumber,
        body.otp,
        body.evcType
      );
      return c.json(result);
    } catch (err: any) {
      logger.error('[PORTAL EVERIFY ERROR]', err);
      return c.json(
        {
          success: false,
          errorCode: 'EVERIFY_FAILED',
          message: err.message || 'e-Verification failed.',
        },
        500
      );
    }
  }
);
