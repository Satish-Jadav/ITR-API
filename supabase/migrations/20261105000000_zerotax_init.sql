-- ============================================================================
-- ZEROTAX-LOCAL CLOUD API DATABASE SCHEMA & SUPABASE STORAGE INTEGRATION
-- Target Database: PostgreSQL 16 (Supabase Mumbai ap-south-1)
-- Compliance: CERT-In Directions 2022, RBI Data Localization, DPDP Act 2023
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Users Table (Zero Plaintext PAN/Aadhaar — Uses Blind Index HMAC-SHA256)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_hmac_sha256 CHAR(64) UNIQUE NOT NULL CHECK (email_hmac_sha256 ~ '^[0-9a-f]{64}$'),
    email_encrypted_bytea BYTEA NOT NULL,
    google_sub_id VARCHAR(128) UNIQUE,
    account_status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE'
        CHECK (account_status IN ('ACTIVE', 'SUSPENDED_VAPT_ALERT', 'SHREDDED_DPDP')),
    dpdp_consent_version VARCHAR(16) NOT NULL DEFAULT '2026.1',
    dpdp_consent_granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. OAuth 2.1 & Device-Bound DPoP Refresh Token Sessions (Family Rotation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_pkce_challenges (
    auth_session_id UUID PRIMARY KEY,
    code_challenge VARCHAR(128) NOT NULL,
    dpop_public_key_jwk JSONB NOT NULL,
    device_installation_id VARCHAR(64) NOT NULL,
    play_integrity_nonce VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pkce_expires ON auth_pkce_challenges(expires_at);

-- Distributed DPoP JTI Replay Protection (RFC 9449 anti-replay across serverless instances)
CREATE TABLE IF NOT EXISTS dpop_replay_nonces (
    jti VARCHAR(128) PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dpop_nonces_expires ON dpop_replay_nonces(expires_at);

CREATE TABLE IF NOT EXISTS auth_refresh_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_family_id UUID NOT NULL,
    refresh_token_sha256 CHAR(64) UNIQUE NOT NULL CHECK (refresh_token_sha256 ~ '^[0-9a-f]{64}$'),
    dpop_jkt_thumbprint VARCHAR(64) NOT NULL,
    device_installation_id VARCHAR(64) NOT NULL,
    play_integrity_verdict VARCHAR(32) NOT NULL CHECK (play_integrity_verdict IN ('STRONG', 'DEVICE', 'BASIC', 'DEV_BYPASS')),
    is_rotated BOOLEAN NOT NULL DEFAULT FALSE,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_refresh_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_family ON auth_refresh_sessions(token_family_id);

-- ----------------------------------------------------------------------------
-- 3. Zero-Knowledge E2EE Tax Vault Backups (.ztvault Storage & Metadata)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS encrypted_tax_vault_backups (
    backup_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    pan_blind_index_hmac CHAR(64) NOT NULL CHECK (pan_blind_index_hmac ~ '^[0-9a-f]{64}$'),
    assessment_year VARCHAR(7) NOT NULL DEFAULT '2026-27' CHECK (assessment_year ~ '^20[2-3][0-9]-[0-9]{2}$'),
    relationship_tag VARCHAR(16) NOT NULL DEFAULT 'SELF' CHECK (relationship_tag IN ('SELF', 'SPOUSE', 'FATHER', 'MOTHER', 'HUF')),
    version_number INTEGER NOT NULL DEFAULT 1 CHECK (version_number >= 1),
    pbkdf2_salt_hex CHAR(64) NOT NULL CHECK (pbkdf2_salt_hex ~ '^[0-9a-f]{64}$'),
    aes_gcm_iv_hex CHAR(24) NOT NULL CHECK (aes_gcm_iv_hex ~ '^[0-9a-f]{24}$'),
    aes_gcm_auth_tag_hex CHAR(32) NOT NULL CHECK (aes_gcm_auth_tag_hex ~ '^[0-9a-f]{32}$'),
    ciphertext_sha256_hex CHAR(64) NOT NULL CHECK (ciphertext_sha256_hex ~ '^[0-9a-f]{64}$'),
    ciphertext_payload_base64 TEXT, -- Fallback inline storage or pointer
    storage_bucket VARCHAR(64) DEFAULT 'ztvault-backups',
    storage_path VARCHAR(256),     -- Path in Supabase Storage: e.g. {user_id}/{pan_hash}_{ay}.ztvault
    size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 64 AND 10485760),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, pan_blind_index_hmac, assessment_year)
);

ALTER TABLE encrypted_tax_vault_backups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vault_isolation_policy ON encrypted_tax_vault_backups;
CREATE POLICY vault_isolation_policy ON encrypted_tax_vault_backups
    USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID);

-- ----------------------------------------------------------------------------
-- 4. Stateless RBI Account Aggregator (ReBIT Sahamati) Consent Session Tracker
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aa_fiu_consent_sessions (
    aa_session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    consent_handle UUID NOT NULL UNIQUE,
    consent_id UUID UNIQUE,
    aa_provider_id VARCHAR(64) NOT NULL,
    apk_ephemeral_x25519_pub_key_base64 VARCHAR(128) NOT NULL,
    apk_fiu_nonce_base64 VARCHAR(64) NOT NULL,
    purpose_code CHAR(3) NOT NULL DEFAULT '101' CHECK (purpose_code = '101'),
    fetch_type VARCHAR(16) NOT NULL DEFAULT 'ONETIME' CHECK (fetch_type = 'ONETIME'),
    consent_status VARCHAR(24) NOT NULL DEFAULT 'PENDING'
        CHECK (consent_status IN ('PENDING', 'ACTIVE', 'FI_READY', 'DELIVERED_TO_APK', 'REVOKED', 'EXPIRED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE aa_fiu_consent_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aa_isolation_policy ON aa_fiu_consent_sessions;
CREATE POLICY aa_isolation_policy ON aa_fiu_consent_sessions
    USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID);

-- ----------------------------------------------------------------------------
-- 5. Ed25519-Signed Statutory OTA Rule Bundles (CII, Slabs, CBDT Rules)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS statutory_ota_rule_bundles (
    bundle_version VARCHAR(32) PRIMARY KEY,
    assessment_year VARCHAR(7) NOT NULL DEFAULT '2026-27',
    schema_ver VARCHAR(16) NOT NULL DEFAULT 'Ver1.2',
    payload_json JSONB NOT NULL,
    payload_sha256_hex CHAR(64) NOT NULL,
    ed25519_signature_hex CHAR(128) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. Master SBI Telegraphic Transfer Buying Rate (TTBR) (Rule 115 / Form 67)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sbi_ttbr_rates_master (
    currency_code CHAR(3) NOT NULL CHECK (currency_code IN ('USD', 'EUR', 'GBP', 'SGD', 'AUD', 'CAD', 'CHF', 'JPY', 'AED')),
    rate_date DATE NOT NULL,
    is_month_end_official_rate BOOLEAN NOT NULL DEFAULT FALSE,
    tt_buying_rate_paise BIGINT NOT NULL CHECK (tt_buying_rate_paise > 0),
    source_circular_ref VARCHAR(128),
    PRIMARY KEY (currency_code, rate_date)
);
CREATE INDEX IF NOT EXISTS idx_sbi_ttbr_lookup ON sbi_ttbr_rates_master(currency_code, rate_date DESC);

-- ----------------------------------------------------------------------------
-- 7. Master Jan 31, 2018 Equity & MF Grandfathering FMV (Sec 55(2)(ac))
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS isin_jan2018_fmv_master (
    isin_code CHAR(12) PRIMARY KEY CHECK (isin_code ~ '^IN[A-Z0-9]{10}$'),
    bse_nse_amfi_code VARCHAR(32) NOT NULL,
    security_name VARCHAR(150) NOT NULL,
    asset_class VARCHAR(24) NOT NULL CHECK (asset_class IN ('LISTED_EQUITY', 'EQUITY_MF')),
    highest_price_jan31_2018_paise BIGINT NOT NULL CHECK (highest_price_jan31_2018_paise > 0)
);

-- ----------------------------------------------------------------------------
-- 8. Master RBI Bank IFSC Validation & EVC Directory (Schedule BA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ifsc_directory_master (
    ifsc_code CHAR(11) PRIMARY KEY CHECK (ifsc_code ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
    bank_name VARCHAR(100) NOT NULL,
    branch_name VARCHAR(100) NOT NULL,
    micr_code CHAR(9),
    supports_cbdt_evc BOOLEAN NOT NULL DEFAULT TRUE
);

-- ----------------------------------------------------------------------------
-- 9. Chartered Accountant (CA) E2EE Time-Bound Review Share Links
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ca_shared_review_links (
    share_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    share_token_sha256 CHAR(64) UNIQUE NOT NULL CHECK (share_token_sha256 ~ '^[0-9a-f]{64}$'),
    encrypted_dossier_blob_base64 TEXT,
    storage_bucket VARCHAR(64) DEFAULT 'ca-dossiers',
    storage_path VARCHAR(256),
    aes_gcm_iv_hex CHAR(24) NOT NULL,
    max_views INTEGER NOT NULL DEFAULT 3 CHECK (max_views BETWEEN 1 AND 10),
    current_views INTEGER NOT NULL DEFAULT 0,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 10. Push Notification FCM Device Registry (Advance Tax / 143(1) Alerts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fcm_device_registrations (
    device_id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    fcm_token_encrypted BYTEA NOT NULL,
    preferred_locale VARCHAR(10) NOT NULL DEFAULT 'en-IN'
        CHECK (preferred_locale IN ('en-IN', 'hi-IN', 'gu-IN', 'mr-IN', 'ta-IN', 'te-IN')),
    advance_tax_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 11. Immutable VAPT & CERT-In Security Audit Log (180-Day Retention)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_vapt_audit_logs (
    log_id BIGSERIAL PRIMARY KEY,
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID,
    event_type VARCHAR(64) NOT NULL,
    http_method VARCHAR(8) NOT NULL,
    route_path VARCHAR(128) NOT NULL,
    client_ip_hash_sha256 CHAR(64) NOT NULL,
    status_code SMALLINT NOT NULL,
    vapt_rule_triggered VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS idx_vapt_logs_time ON security_vapt_audit_logs(event_timestamp DESC);

-- ----------------------------------------------------------------------------
-- 12. Conversational Filing Chat Sessions (Zero PII - On-Device AI Transcript)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_filing_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    assessment_year VARCHAR(7) NOT NULL DEFAULT '2026-27' CHECK (assessment_year ~ '^20[2-3][0-9]-[0-9]{2}$'),
    chat_title VARCHAR(128) NOT NULL,
    total_messages INTEGER NOT NULL DEFAULT 0,
    messages_json JSONB NOT NULL,
    summary_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_filing_sessions(user_id, updated_at DESC);

ALTER TABLE chat_filing_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chat_isolation_policy ON chat_filing_sessions;
CREATE POLICY chat_isolation_policy ON chat_filing_sessions
    USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID);

-- ----------------------------------------------------------------------------
-- 13. Supabase Storage Buckets Setup & Policies
-- ----------------------------------------------------------------------------
-- Create buckets if they do not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('ztvault-backups', 'ztvault-backups', false, 10485760, ARRAY['application/octet-stream', 'text/plain']),
    ('ca-dossiers', 'ca-dossiers', false, 10485760, ARRAY['application/octet-stream', 'application/json', 'text/plain'])
ON CONFLICT (id) DO UPDATE SET 
    file_size_limit = EXCLUDED.file_size_limit,
    public = false;

-- Disable public access on storage objects
CREATE POLICY "Deny public access to ztvault-backups" ON storage.objects
    FOR ALL
    TO anon
    USING (bucket_id != 'ztvault-backups');

CREATE POLICY "Deny public access to ca-dossiers" ON storage.objects
    FOR ALL
    TO anon
    USING (bucket_id != 'ca-dossiers');
