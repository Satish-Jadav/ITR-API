import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authGuard, getCurrentUser } from '../middleware/authGuard.js';
import { queryDb } from '../config/supabase.js';
import { scrubVerhoeffAndPan } from '../security/verhoeffScrubber.js';

export const chatRoutes = new Hono();

chatRoutes.use('*', authGuard);

const ChatMessageSchema = z.object({
  id: z.string().optional(),
  sender: z.enum(['USER', 'BOT', 'SYSTEM']),
  text: z.string().max(2000),
  timestamp: z.number().optional(),
  chipsSelected: z.array(z.string()).optional(),
});

const ChatSessionSyncSchema = z
  .object({
    sessionId: z.string().uuid().optional(),
    assessmentYear: z.string().regex(/^20[2-3][0-9]-[0-9]{2}$/).default('2026-27'),
    chatTitle: z.string().min(1).max(128).default('Conversational Filing Session'),
    messages: z.array(ChatMessageSchema).min(1).max(200),
    summarySnapshot: z
      .object({
        grossSalary: z.number().optional(),
        netTaxableSalary: z.number().optional(),
        taxLiability: z.number().optional(),
        refundDue: z.number().optional(),
        totalDeductions: z.number().optional(),
      })
      .optional(),
  })
  .strict();

/**
 * 1. POST /api/v1/chat/sync
 * Syncs an on-device AI conversational filing session transcript to Supabase
 */
chatRoutes.post('/sync', zValidator('json', ChatSessionSyncSchema), async (c) => {
  const user = getCurrentUser(c);
  const body = c.req.valid('json');

  // API-VAPT-08: Scrub Aadhaar (Verhoeff checksummed) and PAN numbers from conversational transcript before DB insertion
  const scrubbedMessages = body.messages.map((m) => ({
    ...m,
    text: scrubVerhoeffAndPan(m.text),
  }));
  const scrubbedTitle = scrubVerhoeffAndPan(body.chatTitle);

  const messagesJson = JSON.stringify(scrubbedMessages);
  const summaryJson = body.summarySnapshot ? JSON.stringify(body.summarySnapshot) : null;
  const count = scrubbedMessages.length;

  let sessionId = body.sessionId;

  if (sessionId) {
    const updated = await queryDb(
      `UPDATE chat_filing_sessions
       SET chat_title = $1,
           total_messages = $2,
           messages_json = $3::jsonb,
           summary_snapshot = $4::jsonb,
           updated_at = NOW()
       WHERE session_id = $5::uuid AND user_id = $6::uuid
       RETURNING session_id, updated_at`,
      [scrubbedTitle, count, messagesJson, summaryJson, sessionId, user.userId],
      user.userId
    );

    if (updated.length > 0) {
      return c.json({
        sessionId: updated[0].session_id,
        status: 'UPDATED',
        totalMessages: count,
        syncedAtIso: updated[0].updated_at,
      });
    }
  }

  // API-VAPT-09: Prevent database flooding - enforce max 50 chat sessions per user by pruning oldest session
  const sessionCountRows = await queryDb(
    `SELECT count(*) as total FROM chat_filing_sessions WHERE user_id = $1::uuid`,
    [user.userId],
    user.userId
  );
  const totalExisting = Number(sessionCountRows[0]?.total || 0);
  if (totalExisting >= 50) {
    await queryDb(
      `DELETE FROM chat_filing_sessions
       WHERE session_id IN (
         SELECT session_id FROM chat_filing_sessions
         WHERE user_id = $1::uuid
         ORDER BY created_at ASC
         LIMIT 1
       )`,
      [user.userId],
      user.userId
    );
  }

  // Insert new session
  const inserted = await queryDb(
    `INSERT INTO chat_filing_sessions (
       user_id, assessment_year, chat_title, total_messages, messages_json, summary_snapshot
     ) VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6::jsonb)
     RETURNING session_id, created_at`,
    [user.userId, body.assessmentYear, scrubbedTitle, count, messagesJson, summaryJson],
    user.userId
  );

  return c.json(
    {
      sessionId: inserted[0].session_id,
      status: 'SAVED',
      totalMessages: count,
      syncedAtIso: inserted[0].created_at,
    },
    201
  );
});

/**
 * 2. GET /api/v1/chat/history
 * Returns metadata list of past chat sessions for user
 */
chatRoutes.get('/history', async (c) => {
  const user = getCurrentUser(c);
  const ay = c.req.query('ay');

  let sql = `SELECT session_id, assessment_year, chat_title, total_messages, summary_snapshot, created_at, updated_at
             FROM chat_filing_sessions
             WHERE user_id = $1::uuid`;
  const params: any[] = [user.userId];

  if (ay) {
    params.push(ay);
    sql += ` AND assessment_year = $2`;
  }

  sql += ` ORDER BY updated_at DESC`;

  const rows = await queryDb(sql, params, user.userId);

  return c.json({
    sessions: rows.map((r: any) => ({
      sessionId: r.session_id,
      assessmentYear: r.assessment_year,
      chatTitle: r.chat_title,
      totalMessages: r.total_messages,
      summarySnapshot: typeof r.summary_snapshot === 'string' ? JSON.parse(r.summary_snapshot) : r.summary_snapshot,
      createdAtIso: r.created_at,
      updatedAtIso: r.updated_at,
    })),
  });
});

/**
 * 3. GET /api/v1/chat/session/:sessionId
 * Returns full message transcript of a specific chat session
 */
chatRoutes.get('/session/:sessionId', async (c) => {
  const user = getCurrentUser(c);
  const sessionId = c.req.param('sessionId');

  const rows = await queryDb(
    `SELECT session_id, assessment_year, chat_title, total_messages, messages_json, summary_snapshot, created_at, updated_at
     FROM chat_filing_sessions
     WHERE session_id = $1::uuid AND user_id = $2::uuid`,
    [sessionId, user.userId],
    user.userId
  );

  if (rows.length === 0) {
    return c.json({ errorCode: 'CHAT_SESSION_NOT_FOUND', sessionId }, 404);
  }

  const r = rows[0];
  return c.json({
    sessionId: r.session_id,
    assessmentYear: r.assessment_year,
    chatTitle: r.chat_title,
    totalMessages: r.total_messages,
    messages: typeof r.messages_json === 'string' ? JSON.parse(r.messages_json) : r.messages_json,
    summarySnapshot: typeof r.summary_snapshot === 'string' ? JSON.parse(r.summary_snapshot) : r.summary_snapshot,
    createdAtIso: r.created_at,
    updatedAtIso: r.updated_at,
  });
});

/**
 * 4. DELETE /api/v1/chat/session/:sessionId
 */
chatRoutes.delete('/session/:sessionId', async (c) => {
  const user = getCurrentUser(c);
  const sessionId = c.req.param('sessionId');

  const rows = await queryDb(
    `DELETE FROM chat_filing_sessions
     WHERE session_id = $1::uuid AND user_id = $2::uuid
     RETURNING session_id`,
    [sessionId, user.userId],
    user.userId
  );

  if (rows.length === 0) {
    return c.json({ errorCode: 'CHAT_SESSION_NOT_FOUND', sessionId }, 404);
  }

  return c.json({ status: 'DELETED_SUCCESSFULLY', sessionId });
});

