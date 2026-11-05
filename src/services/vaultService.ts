import { queryDb, getSupabase } from '../config/supabase.js';
import { env } from '../config/env.js';
import { z } from 'zod';
import { VaultSyncPutSchema } from '../security/vaptGuards.js';

export class VaultService {
  /**
   * Uploads encrypted .ztvault payload to Supabase Storage and records metadata in Postgres with RLS
   */
  static async syncVault(
    userId: string,
    body: z.infer<typeof VaultSyncPutSchema>
  ) {
    const rawBuffer = Buffer.from(body.ciphertextPayloadBase64, 'base64');
    const sizeBytes = rawBuffer.length;
    const bucket = env.SUPABASE_VAULT_BUCKET;
    const nextVersion = body.expectedPreviousVersion + 1;
    // Versioned storage path prevents silent clobbering / race condition collisions (API-VAPT-06)
    const storagePath = `${userId}/${body.panBlindIndexHmac}_${body.assessmentYear}_v${nextVersion}.ztvault`;

    // 1. Upload opaque ciphertext to Supabase Storage
    let storageUploaded = false;
    try {
      const supabase = getSupabase();
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, rawBuffer, {
          contentType: 'application/octet-stream',
          upsert: true,
        });

      if (!storageError) {
        storageUploaded = true;
      } else {
        console.warn(`Supabase storage upload note: ${storageError.message}`);
      }
    } catch (e: any) {
      console.warn('Supabase storage client skipped or failed, fallback to DB metadata:', e.message);
    }

    // API-VAPT-08: If storage upload failed and inline fallback is disabled, fail fast to prevent DB bloat
    if (!storageUploaded && !env.ALLOW_INLINE_VAULT_FALLBACK) {
      throw new Error('STORAGE_SERVICE_UNAVAILABLE_503');
    }

    // 2. Upsert cryptographic metadata into PostgreSQL encrypted_tax_vault_backups.
    // Offload payload to Supabase Storage (ciphertext_payload_base64 is NULL) to prevent DB bloat (API-VAPT-07)
    const rows = await queryDb(
      `INSERT INTO encrypted_tax_vault_backups (
          user_id, pan_blind_index_hmac, assessment_year, relationship_tag,
          version_number, pbkdf2_salt_hex, aes_gcm_iv_hex, aes_gcm_auth_tag_hex,
          ciphertext_sha256_hex, storage_bucket, storage_path, size_bytes,
          ciphertext_payload_base64
       )
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (user_id, pan_blind_index_hmac, assessment_year)
       DO UPDATE SET
          version_number = EXCLUDED.version_number,
          relationship_tag = EXCLUDED.relationship_tag,
          pbkdf2_salt_hex = EXCLUDED.pbkdf2_salt_hex,
          aes_gcm_iv_hex = EXCLUDED.aes_gcm_iv_hex,
          aes_gcm_auth_tag_hex = EXCLUDED.aes_gcm_auth_tag_hex,
          ciphertext_sha256_hex = EXCLUDED.ciphertext_sha256_hex,
          storage_bucket = EXCLUDED.storage_bucket,
          storage_path = EXCLUDED.storage_path,
          size_bytes = EXCLUDED.size_bytes,
          ciphertext_payload_base64 = EXCLUDED.ciphertext_payload_base64,
          created_at = NOW()
       WHERE encrypted_tax_vault_backups.user_id = $1::uuid
         AND encrypted_tax_vault_backups.version_number = $14
       RETURNING backup_id, version_number, created_at`,
      [
        userId,
        body.panBlindIndexHmac,
        body.assessmentYear,
        body.relationshipTag,
        nextVersion,
        body.pbkdf2SaltHex,
        body.aesGcmIvHex,
        body.aesGcmAuthTagHex,
        body.ciphertextSha256Hex,
        bucket,
        storagePath,
        sizeBytes,
        storageUploaded ? null : body.ciphertextPayloadBase64,
        body.expectedPreviousVersion,
      ],
      userId
    );

    if (rows.length === 0) {
      throw new Error('VAULT_VERSION_CONFLICT_409');
    }

    return rows[0];
  }

  /**
   * Retrieves encrypted .ztvault snapshot for device restore
   */
  static async getVault(
    userId: string,
    panBlindIndexHmac: string,
    assessmentYear: string = '2026-27'
  ) {
    const rows = await queryDb(
      `SELECT backup_id, pan_blind_index_hmac, assessment_year, relationship_tag,
              version_number, pbkdf2_salt_hex, aes_gcm_iv_hex, aes_gcm_auth_tag_hex,
              ciphertext_sha256_hex, storage_bucket, storage_path, size_bytes,
              ciphertext_payload_base64, created_at
       FROM encrypted_tax_vault_backups
       WHERE user_id = $1::uuid
         AND pan_blind_index_hmac = $2
         AND assessment_year = $3`,
      [userId, panBlindIndexHmac, assessmentYear],
      userId
    );

    if (rows.length === 0) {
      return null;
    }

    const record = rows[0];
    let payloadBase64 = record.ciphertext_payload_base64;

    // If storage path exists, attempt to pull latest bytes from Supabase Storage
    if (record.storage_path) {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.storage
          .from(record.storage_bucket || env.SUPABASE_VAULT_BUCKET)
          .download(record.storage_path);

        if (data && !error) {
          const arrayBuffer = await data.arrayBuffer();
          payloadBase64 = Buffer.from(arrayBuffer).toString('base64');
        }
      } catch (err: any) {
        console.warn('Falling back to inline payload:', err.message);
      }
    }

    return {
      backupId: record.backup_id,
      panBlindIndexHmac: record.pan_blind_index_hmac,
      assessmentYear: record.assessment_year,
      relationshipTag: record.relationship_tag,
      versionNumber: record.version_number,
      pbkdf2SaltHex: record.pbkdf2_salt_hex,
      aesGcmIvHex: record.aes_gcm_iv_hex,
      aesGcmAuthTagHex: record.aes_gcm_auth_tag_hex,
      ciphertextPayloadBase64: payloadBase64,
      ciphertextSha256Hex: record.ciphertext_sha256_hex,
      sizeBytes: record.size_bytes,
      syncedAtIso: record.created_at,
    };
  }

  /**
   * List all vault backups for authenticated user
   */
  static async listHistory(userId: string) {
    return queryDb(
      `SELECT backup_id, pan_blind_index_hmac, assessment_year, relationship_tag,
              version_number, size_bytes, created_at
       FROM encrypted_tax_vault_backups
       WHERE user_id = $1::uuid
       ORDER BY created_at DESC`,
      [userId],
      userId
    );
  }

  /**
   * Deletes vault backup from Supabase Storage and Postgres
   */
  static async purgeVault(userId: string, panBlindIndexHmac: string) {
    const records = await queryDb(
      `SELECT storage_bucket, storage_path FROM encrypted_tax_vault_backups
       WHERE user_id = $1::uuid AND pan_blind_index_hmac = $2`,
      [userId, panBlindIndexHmac],
      userId
    );

    // Delete files from Supabase Storage
    for (const rec of records) {
      if (rec.storage_path) {
        try {
          const supabase = getSupabase();
          await supabase.storage
            .from(rec.storage_bucket || env.SUPABASE_VAULT_BUCKET)
            .remove([rec.storage_path]);
        } catch (e: any) {
          console.warn('Storage delete warning:', e.message);
        }
      }
    }

    const del = await queryDb(
      `DELETE FROM encrypted_tax_vault_backups
       WHERE user_id = $1::uuid AND pan_blind_index_hmac = $2
       RETURNING backup_id`,
      [userId, panBlindIndexHmac],
      userId
    );

    return del.length;
  }
}
