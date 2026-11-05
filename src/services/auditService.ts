import crypto from 'node:crypto';
import { queryDb } from '../config/supabase.js';

export async function logSecurityAuditEvent(params: {
  userId?: string;
  eventType: string;
  httpMethod: string;
  routePath: string;
  clientIp: string;
  statusCode: number;
  vaptRuleTriggered?: string;
}) {
  try {
    const ipHash = crypto.createHash('sha256').update(params.clientIp || '127.0.0.1').digest('hex');
    await queryDb(
      `INSERT INTO security_vapt_audit_logs (
        user_id, event_type, http_method, route_path, client_ip_hash_sha256, status_code, vapt_rule_triggered
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.userId || null,
        params.eventType,
        params.httpMethod,
        params.routePath,
        ipHash,
        params.statusCode,
        params.vaptRuleTriggered || null,
      ]
    );
  } catch (err) {
    // Non-blocking fallback: never fail request if audit insert encounters transient DB issue
    console.warn('⚠️ Security audit log write failure:', err);
  }
}
