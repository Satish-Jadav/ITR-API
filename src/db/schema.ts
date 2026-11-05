import {
  pgTable,
  uuid,
  varchar,
  char,
  text,
  integer,
  bigint,
  smallint,
  bigserial,
  boolean,
  timestamp,
  date,
  jsonb,
  customType,
  index,
  primaryKey,
  unique,
} from 'drizzle-orm/pg-core';

// PostgreSQL bytea type mapping
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver(val: Buffer): Buffer {
    return val;
  },
  fromDriver(val: unknown): Buffer {
    if (Buffer.isBuffer(val)) return val;
    if (typeof val === 'string') {
      // Postgres bytea hex format: \x...
      if (val.startsWith('\\x')) {
        return Buffer.from(val.slice(2), 'hex');
      }
      return Buffer.from(val, 'utf8');
    }
    return Buffer.from([]);
  },
});

// ----------------------------------------------------------------------------
// 1. Users Table (Zero Plaintext PAN/Aadhaar — HMAC Blind Index)
// ----------------------------------------------------------------------------
export const users = pgTable('users', {
  userId: uuid('user_id').defaultRandom().primaryKey(),
  emailHmacSha256: char('email_hmac_sha256', { length: 64 }).notNull().unique(),
  emailEncryptedBytea: bytea('email_encrypted_bytea').notNull(),
  googleSubId: varchar('google_sub_id', { length: 128 }).unique(),
  accountStatus: varchar('account_status', { length: 24 }).default('ACTIVE').notNull(),
  dpdpConsentVersion: varchar('dpdp_consent_version', { length: 16 }).default('2026.1').notNull(),
  dpdpConsentGrantedAt: timestamp('dpdp_consent_granted_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ----------------------------------------------------------------------------
// 2. PKCE Challenges & DPoP Nonces
// ----------------------------------------------------------------------------
export const authPkceChallenges = pgTable(
  'auth_pkce_challenges',
  {
    authSessionId: uuid('auth_session_id').primaryKey(),
    codeChallenge: varchar('code_challenge', { length: 128 }).notNull(),
    dpopPublicKeyJwk: jsonb('dpop_public_key_jwk').notNull(),
    deviceInstallationId: varchar('device_installation_id', { length: 64 }).notNull(),
    playIntegrityNonce: varchar('play_integrity_nonce', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_pkce_expires').on(table.expiresAt),
  ]
);

export const dpopReplayNonces = pgTable(
  'dpop_replay_nonces',
  {
    jti: varchar('jti', { length: 128 }).primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_dpop_nonces_expires').on(table.expiresAt),
  ]
);

export const authRefreshSessions = pgTable(
  'auth_refresh_sessions',
  {
    sessionId: uuid('session_id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.userId, { onDelete: 'cascade' }).notNull(),
    tokenFamilyId: uuid('token_family_id').notNull(),
    refreshTokenSha256: char('refresh_token_sha256', { length: 64 }).notNull().unique(),
    dpopJktThumbprint: varchar('dpop_jkt_thumbprint', { length: 64 }).notNull(),
    deviceInstallationId: varchar('device_installation_id', { length: 64 }).notNull(),
    playIntegrityVerdict: varchar('play_integrity_verdict', { length: 32 }).notNull(),
    isRotated: boolean('is_rotated').default(false).notNull(),
    isRevoked: boolean('is_revoked').default(false).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_auth_sessions_user').on(table.userId),
    index('idx_auth_sessions_family').on(table.tokenFamilyId),
  ]
);

// ----------------------------------------------------------------------------
// 3. Encrypted Tax Vault Backups
// ----------------------------------------------------------------------------
export const encryptedTaxVaultBackups = pgTable(
  'encrypted_tax_vault_backups',
  {
    backupId: uuid('backup_id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.userId, { onDelete: 'cascade' }).notNull(),
    panBlindIndexHmac: char('pan_blind_index_hmac', { length: 64 }).notNull(),
    assessmentYear: varchar('assessment_year', { length: 7 }).default('2026-27').notNull(),
    relationshipTag: varchar('relationship_tag', { length: 16 }).default('SELF').notNull(),
    versionNumber: integer('version_number').default(1).notNull(),
    pbkdf2SaltHex: char('pbkdf2_salt_hex', { length: 64 }).notNull(),
    aesGcmIvHex: char('aes_gcm_iv_hex', { length: 24 }).notNull(),
    aesGcmAuthTagHex: char('aes_gcm_auth_tag_hex', { length: 32 }).notNull(),
    ciphertextSha256Hex: char('ciphertext_sha256_hex', { length: 64 }).notNull(),
    ciphertextPayloadBase64: text('ciphertext_payload_base64'),
    storageBucket: varchar('storage_bucket', { length: 64 }).default('ztvault-backups'),
    storagePath: varchar('storage_path', { length: 256 }),
    sizeBytes: integer('size_bytes').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('unq_user_pan_ay').on(table.userId, table.panBlindIndexHmac, table.assessmentYear),
  ]
);

// ----------------------------------------------------------------------------
// 4. RBI Account Aggregator (AA) Consent Sessions
// ----------------------------------------------------------------------------
export const aaFiuConsentSessions = pgTable(
  'aa_fiu_consent_sessions',
  {
    aaSessionId: uuid('aa_session_id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.userId, { onDelete: 'cascade' }).notNull(),
    consentHandle: uuid('consent_handle').notNull().unique(),
    consentId: uuid('consent_id').unique(),
    aaProviderId: varchar('aa_provider_id', { length: 64 }).notNull(),
    apkEphemeralX25519PubKeyBase64: varchar('apk_ephemeral_x25519_pub_key_base64', { length: 128 }).notNull(),
    apkFiuNonceBase64: varchar('apk_fiu_nonce_base64', { length: 64 }).notNull(),
    purposeCode: char('purpose_code', { length: 3 }).default('101').notNull(),
    fetchType: varchar('fetch_type', { length: 16 }).default('ONETIME').notNull(),
    consentStatus: varchar('consent_status', { length: 24 }).default('PENDING').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// ----------------------------------------------------------------------------
// 5. Statutory OTA Rule Bundles
// ----------------------------------------------------------------------------
export const statutoryOtaRuleBundles = pgTable(
  'statutory_ota_rule_bundles',
  {
    bundleVersion: varchar('bundle_version', { length: 32 }).primaryKey(),
    assessmentYear: varchar('assessment_year', { length: 7 }).default('2026-27').notNull(),
    schemaVer: varchar('schema_ver', { length: 16 }).default('Ver1.2').notNull(),
    payloadJson: jsonb('payload_json').notNull(),
    payloadSha256Hex: char('payload_sha256_hex', { length: 64 }).notNull(),
    ed25519SignatureHex: char('ed25519_signature_hex', { length: 128 }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// ----------------------------------------------------------------------------
// 6. Master SBI TTBR Rates
// ----------------------------------------------------------------------------
export const sbiTtbrRatesMaster = pgTable(
  'sbi_ttbr_rates_master',
  {
    currencyCode: char('currency_code', { length: 3 }).notNull(),
    rateDate: date('rate_date').notNull(),
    isMonthEndOfficialRate: boolean('is_month_end_official_rate').default(false).notNull(),
    ttBuyingRatePaise: bigint('tt_buying_rate_paise', { mode: 'number' }).notNull(),
    sourceCircularRef: varchar('source_circular_ref', { length: 128 }),
  },
  (table) => [
    primaryKey({ columns: [table.currencyCode, table.rateDate] }),
    index('idx_sbi_ttbr_lookup').on(table.currencyCode, table.rateDate),
  ]
);

// ----------------------------------------------------------------------------
// 7. Master Jan 31, 2018 Grandfathering FMV
// ----------------------------------------------------------------------------
export const isinJan2018FmvMaster = pgTable(
  'isin_jan2018_fmv_master',
  {
    isinCode: char('isin_code', { length: 12 }).primaryKey(),
    bseNseAmfiCode: varchar('bse_nse_amfi_code', { length: 32 }).notNull(),
    securityName: varchar('security_name', { length: 150 }).notNull(),
    assetClass: varchar('asset_class', { length: 24 }).notNull(),
    highestPriceJan312018Paise: bigint('highest_price_jan31_2018_paise', { mode: 'number' }).notNull(),
  }
);

// ----------------------------------------------------------------------------
// 8. Master IFSC Directory
// ----------------------------------------------------------------------------
export const ifscDirectoryMaster = pgTable(
  'ifsc_directory_master',
  {
    ifscCode: char('ifsc_code', { length: 11 }).primaryKey(),
    bankName: varchar('bank_name', { length: 100 }).notNull(),
    branchName: varchar('branch_name', { length: 100 }).notNull(),
    micrCode: char('micr_code', { length: 9 }),
    supportsCbdtEvc: boolean('supports_cbdt_evc').default(true).notNull(),
  }
);

// ----------------------------------------------------------------------------
// 9. CA Shared Review Links
// ----------------------------------------------------------------------------
export const caSharedReviewLinks = pgTable(
  'ca_shared_review_links',
  {
    shareId: uuid('share_id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.userId, { onDelete: 'cascade' }).notNull(),
    shareTokenSha256: char('share_token_sha256', { length: 64 }).notNull().unique(),
    encryptedDossierBlobBase64: text('encrypted_dossier_blob_base64'),
    storageBucket: varchar('storage_bucket', { length: 64 }).default('ca-dossiers'),
    storagePath: varchar('storage_path', { length: 256 }),
    aesGcmIvHex: char('aes_gcm_iv_hex', { length: 24 }).notNull(),
    maxViews: integer('max_views').default(3).notNull(),
    currentViews: integer('current_views').default(0).notNull(),
    isRevoked: boolean('is_revoked').default(false).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// ----------------------------------------------------------------------------
// 10. FCM Push Registrations
// ----------------------------------------------------------------------------
export const fcmDeviceRegistrations = pgTable(
  'fcm_device_registrations',
  {
    deviceId: varchar('device_id', { length: 64 }).primaryKey(),
    userId: uuid('user_id').references(() => users.userId, { onDelete: 'cascade' }).notNull(),
    fcmTokenEncrypted: bytea('fcm_token_encrypted').notNull(),
    preferredLocale: varchar('preferred_locale', { length: 10 }).default('en-IN').notNull(),
    advanceTaxAlertsEnabled: boolean('advance_tax_alerts_enabled').default(true).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// ----------------------------------------------------------------------------
// 11. Security Audit Logs
// ----------------------------------------------------------------------------
export const securityVaptAuditLogs = pgTable(
  'security_vapt_audit_logs',
  {
    logId: bigserial('log_id', { mode: 'number' }).primaryKey(),
    eventTimestamp: timestamp('event_timestamp', { withTimezone: true }).defaultNow().notNull(),
    userId: uuid('user_id'),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    httpMethod: varchar('http_method', { length: 8 }).notNull(),
    routePath: varchar('route_path', { length: 128 }).notNull(),
    clientIpHashSha256: char('client_ip_hash_sha256', { length: 64 }).notNull(),
    statusCode: smallint('status_code').notNull(),
    vaptRuleTriggered: varchar('vapt_rule_triggered', { length: 64 }),
  },
  (table) => [
    index('idx_vapt_logs_time').on(table.eventTimestamp),
  ]
);

// ----------------------------------------------------------------------------
// 12. Conversational Filing Chat Sessions
// ----------------------------------------------------------------------------
export const chatFilingSessions = pgTable(
  'chat_filing_sessions',
  {
    sessionId: uuid('session_id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.userId, { onDelete: 'cascade' }).notNull(),
    assessmentYear: varchar('assessment_year', { length: 7 }).default('2026-27').notNull(),
    chatTitle: varchar('chat_title', { length: 128 }).notNull(),
    totalMessages: integer('total_messages').default(0).notNull(),
    messagesJson: jsonb('messages_json').notNull(),
    summarySnapshot: jsonb('summary_snapshot'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_chat_sessions_user').on(table.userId, table.updatedAt),
  ]
);
