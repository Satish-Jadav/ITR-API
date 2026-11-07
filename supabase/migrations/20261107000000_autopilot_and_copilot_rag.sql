-- ============================================================================
-- AUTOPILOT, TAX COPILOT RAG, PORTAL SYNC & SLA TELEMETRY MIGRATION
-- Migration: 20261107000000_autopilot_and_copilot_rag.sql
-- Compliance: DPDP Act 2023, IT Act 1961, RBI Account Aggregator Master Directions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ----------------------------------------------------------------------------
-- 1. Portal & Aadhaar OTP Verification Sessions (Distributed Serverless Store)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portal_otp_verification_sessions (
    txn_id UUID PRIMARY KEY,
    pan VARCHAR(10) NOT NULL CHECK (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
    hashed_otp VARCHAR(64) NOT NULL,
    salt VARCHAR(32) NOT NULL,
    purpose VARCHAR(32) NOT NULL DEFAULT 'LOGIN_PORTAL'
        CHECK (purpose IN ('LOGIN_PORTAL', 'E_VERIFY_140A', 'AIS_SYNC')),
    attempts INTEGER NOT NULL DEFAULT 0,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(64),
    cpc_verification_ref VARCHAR(64),
    client_ip VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_otp_pan ON portal_otp_verification_sessions(pan);
CREATE INDEX IF NOT EXISTS idx_portal_otp_expires ON portal_otp_verification_sessions(expires_at);

-- ----------------------------------------------------------------------------
-- 2. Verified Portal Sync Snapshots (Encrypted Client Bridge / ERI Feeds)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portal_sync_snapshots (
    snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    pan VARCHAR(10) NOT NULL CHECK (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
    assessment_year VARCHAR(7) NOT NULL DEFAULT '2026-27',
    source_origin VARCHAR(32) NOT NULL DEFAULT 'ITD_DIRECT_PORTAL'
        CHECK (source_origin IN ('ITD_DIRECT_PORTAL', 'ERI_GATEWAY', 'CLIENT_ENCRYPTED_BRIDGE', 'AA_AGGREGATOR')),
    record_count INTEGER NOT NULL DEFAULT 0,
    aggregate_gross_amount BIGINT NOT NULL DEFAULT 0,
    aggregate_tds_credit BIGINT NOT NULL DEFAULT 0,
    encrypted_snapshot_payload TEXT,
    snapshot_json JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_sync_pan_ay ON portal_sync_snapshots(pan, assessment_year);

-- ----------------------------------------------------------------------------
-- 3. Statutory Cost Inflation Index (CII) Master Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS statutory_cii_rates_master (
    financial_year VARCHAR(7) PRIMARY KEY,
    cii_index INTEGER NOT NULL CHECK (cii_index > 0),
    notification_ref VARCHAR(128),
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Statutory CII values
INSERT INTO statutory_cii_rates_master (financial_year, cii_index, notification_ref)
VALUES
    ('2001-02', 100, 'CBDT Notification No. 10/2002'),
    ('2015-16', 254, 'CBDT Notification No. 42/2015'),
    ('2016-17', 264, 'CBDT Notification No. 58/2016'),
    ('2017-18', 272, 'CBDT Notification No. 71/2017'),
    ('2018-19', 280, 'CBDT Notification No. 34/2018'),
    ('2019-20', 289, 'CBDT Notification No. 45/2019'),
    ('2020-21', 301, 'CBDT Notification No. 56/2020'),
    ('2021-22', 317, 'CBDT Notification No. 80/2021'),
    ('2022-23', 331, 'CBDT Notification No. 62/2022'),
    ('2023-24', 348, 'CBDT Notification No. 21/2023'),
    ('2024-25', 363, 'CBDT Notification No. 44/2024'),
    ('2025-26', 376, 'CBDT Notification No. 51/2025'),
    ('2026-27', 390, 'CBDT Finance Act 2026 Estimate')
ON CONFLICT (financial_year) DO UPDATE
SET cii_index = EXCLUDED.cii_index, notification_ref = EXCLUDED.notification_ref;

-- ----------------------------------------------------------------------------
-- 4. Statutory Filing Milestones & CBDT Due Dates
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS statutory_filing_milestones (
    milestone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_year VARCHAR(7) NOT NULL DEFAULT '2026-27',
    milestone_code VARCHAR(32) NOT NULL,
    milestone_label VARCHAR(128) NOT NULL,
    due_date DATE NOT NULL,
    penalty_section VARCHAR(16),
    circular_ref VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO statutory_filing_milestones (assessment_year, milestone_code, milestone_label, due_date, penalty_section, circular_ref)
VALUES
    ('2026-27', 'ADVANCE_TAX_Q1', 'Advance Tax Installment 1 (15%)', '2026-06-15', '234C', 'Sec 211(1)'),
    ('2026-27', 'ADVANCE_TAX_Q2', 'Advance Tax Installment 2 (45%)', '2026-09-15', '234C', 'Sec 211(1)'),
    ('2026-27', 'ITR_NON_AUDIT', 'ITR-1 / ITR-2 / ITR-4 Due Date (Non-Audit)', '2026-07-31', '234A', 'Sec 139(1)'),
    ('2026-27', 'TAX_AUDIT_REPORT', 'Tax Audit Report u/s 44AB Filing Due Date', '2026-09-30', '271B', 'Sec 44AB'),
    ('2026-27', 'ITR_AUDIT_CASES', 'ITR-3 Corporate / Business Audit Filing Due Date', '2026-10-31', '234A', 'Sec 139(1)'),
    ('2026-27', 'ADVANCE_TAX_Q3', 'Advance Tax Installment 3 (75%)', '2026-12-15', '234C', 'Sec 211(1)'),
    ('2026-27', 'BELATED_REVISED_ITR', 'Belated / Revised Return u/s 139(4)/(5)', '2026-12-31', '234F', 'Sec 139(4)'),
    ('2026-27', 'ADVANCE_TAX_Q4', 'Advance Tax Installment 4 (100%)', '2027-03-15', '234C', 'Sec 211(1)')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. Real-Time Income Tax Portal Health & Telemetry Probes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portal_health_telemetry (
    probe_id BIGSERIAL PRIMARY KEY,
    probe_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    eportal_status VARCHAR(24) NOT NULL DEFAULT 'HEALTHY',
    ais_portal_status VARCHAR(24) NOT NULL DEFAULT 'HEALTHY',
    traces_status VARCHAR(24) NOT NULL DEFAULT 'HEALTHY',
    response_time_ms INTEGER NOT NULL DEFAULT 450,
    is_healthy BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_portal_health_time ON portal_health_telemetry(probe_timestamp DESC);

-- ----------------------------------------------------------------------------
-- 6. DTAA Country Treaty Rates Master Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dtaa_country_treaty_rates (
    country_code CHAR(2) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    article_number VARCHAR(16) NOT NULL,
    income_type VARCHAR(32) NOT NULL,
    withholding_rate_percent NUMERIC(5, 2) NOT NULL,
    source_circular VARCHAR(128),
    PRIMARY KEY (country_code, income_type)
);

INSERT INTO dtaa_country_treaty_rates (country_code, country_name, article_number, income_type, withholding_rate_percent, source_circular)
VALUES
    ('US', 'United States of America', 'Article 10', 'DIVIDEND', 25.00, 'India-US DTAA 1990'),
    ('US', 'United States of America', 'Article 11', 'INTEREST', 15.00, 'India-US DTAA 1990'),
    ('US', 'United States of America', 'Article 12', 'ROYALTY_FTS', 15.00, 'India-US DTAA 1990'),
    ('US', 'United States of America', 'Article 13', 'CAPITAL_GAINS', 0.00, 'India-US DTAA (Taxable in Source/Resident)'),
    ('GB', 'United Kingdom', 'Article 11', 'DIVIDEND', 15.00, 'India-UK DTAA 1993'),
    ('GB', 'United Kingdom', 'Article 12', 'INTEREST', 15.00, 'India-UK DTAA 1993'),
    ('SG', 'Singapore', 'Article 10', 'DIVIDEND', 15.00, 'India-Singapore DTAA 1994'),
    ('SG', 'Singapore', 'Article 11', 'INTEREST', 15.00, 'India-Singapore DTAA 1994'),
    ('AE', 'United Arab Emirates', 'Article 10', 'DIVIDEND', 10.00, 'India-UAE DTAA 1993'),
    ('DE', 'Germany', 'Article 10', 'DIVIDEND', 10.00, 'India-Germany DTAA 1996'),
    ('CA', 'Canada', 'Article 10', 'DIVIDEND', 15.00, 'India-Canada DTAA 1996')
ON CONFLICT (country_code, income_type) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. ECI Registered Political Parties (Sec 80GGC Deductions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eci_registered_political_parties (
    party_registration_no VARCHAR(64) PRIMARY KEY,
    party_name VARCHAR(200) NOT NULL,
    state_code CHAR(2),
    is_eligible_80ggc BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO eci_registered_political_parties (party_registration_no, party_name, is_eligible_80ggc)
VALUES
    ('ECI-NAT-001', 'Bharatiya Janata Party', TRUE),
    ('ECI-NAT-002', 'Indian National Congress', TRUE),
    ('ECI-NAT-003', 'Aam Aadmi Party', TRUE),
    ('ECI-NAT-004', 'Communist Party of India (Marxist)', TRUE),
    ('ECI-REG-005', 'Dravida Munnetra Kazhagam', TRUE),
    ('ECI-REG-006', 'All India Trinamool Congress', TRUE),
    ('ECI-REG-007', 'Telugu Desam Party', TRUE),
    ('ECI-REG-008', 'Shiv Sena', TRUE)
ON CONFLICT (party_registration_no) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8. CA Shared Dossier Audit Comments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ca_dossier_audit_comments (
    comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id UUID NOT NULL REFERENCES ca_shared_review_links(share_id) ON DELETE CASCADE,
    ca_membership_no VARCHAR(32) NOT NULL,
    comment_text TEXT NOT NULL,
    recommended_action VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ca_comments_share ON ca_dossier_audit_comments(share_id);

-- ----------------------------------------------------------------------------
-- 9. Statutory RAG Knowledge Chunks (Income Tax Act & Circulars)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS statutory_rag_knowledge_chunks (
    chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_code VARCHAR(32) NOT NULL,
    act_or_circular VARCHAR(128) NOT NULL,
    title VARCHAR(256) NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL DEFAULT 0,
    embedding vector(768),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rag_section ON statutory_rag_knowledge_chunks(section_code);

-- Seed essential statutory knowledge chunks for RAG
INSERT INTO statutory_rag_knowledge_chunks (section_code, act_or_circular, title, content, token_count)
VALUES
    ('87A', 'Income Tax Act 1961 u/s 87A (Finance Act 2024/2025/2026)', 'Rebate under Section 87A for Resident Individuals',
     'Under the New Tax Regime (Section 115BAC(1A)), a resident individual whose total taxable income does not exceed Rs 12,00,000 is entitled to a rebate equal to 100% of the income-tax payable or Rs 60,000, whichever is less. Special rate incomes (Sec 111A, 112A) are subject to specific CBDT circular restrictions. Under the Old Regime, the rebate is up to Rs 12,500 for total income up to Rs 5,00,000.', 105),
    ('112A', 'Income Tax Act 1961 u/s 112A', 'Long Term Capital Gains on Listed Equity Shares and Units',
     'Long-term capital gains arising from transfer of equity shares in a company, units of an equity-oriented fund, or business trust where STT has been paid are taxed at the rate of 12.5% on gains exceeding Rs 1,25,000 for transfers on or after July 23, 2024. Grandfathering benefit as of January 31, 2018 applies under Section 55(2)(ac).', 92),
    ('111A', 'Income Tax Act 1961 u/s 111A', 'Short Term Capital Gains on Listed Equity',
     'Short-term capital gains on listed equity shares or units of equity-oriented funds subject to STT are taxed at 20% for transfers on or after July 23, 2024 (previously 15%). Chapter VI-A deductions cannot be set off against Section 111A capital gains.', 75),
    ('44ADA', 'Income Tax Act 1961 u/s 44ADA', 'Presumptive Taxation Scheme for Specified Professionals',
     'Applies to resident professionals (legal, medical, engineering, architectural, accountancy, technical consultancy, interior decoration, authorised representatives, film artists, IT consultants) with gross receipts up to Rs 75 Lakhs (if digital receipts >= 95%, otherwise Rs 50 Lakhs). Deemed income is 50% of gross receipts.', 88),
    ('44AD', 'Income Tax Act 1961 u/s 44AD', 'Presumptive Taxation for Small Businesses',
     'Applies to eligible businesses with turnover up to Rs 3 Crore (if digital receipts >= 95%, otherwise Rs 2 Crore). Presumptive net income is deemed to be 6% of turnover received through digital/banking modes and 8% of cash turnover. Eligible to file simplified ITR-4 Sugam.', 78),
    ('143(1)', 'Income Tax Act 1961 u/s 143(1)', 'Summary Processing & Intimation of Return of Income',
     'The CPC processes returns and generates Intimation u/s 143(1) calculating tax payable or refund due after adjusting for arithmetical errors, incorrect claims, and mismatches with Form 26AS/AIS. If demand is raised, taxpayer has 30 days to file response or Section 154 rectification.', 85)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 10. Chat Messages Ledger (Individual Turns & Tool Calls)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages_ledger (
    ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_filing_sessions(session_id) ON DELETE CASCADE,
    sender VARCHAR(16) NOT NULL CHECK (sender IN ('USER', 'BOT', 'SYSTEM')),
    content TEXT NOT NULL,
    tool_calls JSONB,
    rag_citations JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ledger_session ON chat_messages_ledger(session_id, created_at ASC);

-- ----------------------------------------------------------------------------
-- 11. Verified Filing Speed & SLA Telemetry (Sub-3-Minute / 90s Proof)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS filing_speed_telemetry (
    telemetry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymized_filing_id VARCHAR(64) NOT NULL,
    itr_type VARCHAR(16) NOT NULL CHECK (itr_type IN ('ITR-1', 'ITR-2', 'ITR-3', 'ITR-4')),
    assessment_year VARCHAR(7) NOT NULL DEFAULT '2026-27',
    start_timestamp TIMESTAMPTZ NOT NULL,
    submission_timestamp TIMESTAMPTZ NOT NULL,
    everify_timestamp TIMESTAMPTZ NOT NULL,
    total_duration_seconds NUMERIC(6, 2) NOT NULL CHECK (total_duration_seconds >= 0),
    client_platform VARCHAR(32) NOT NULL DEFAULT 'ANDROID',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_filing_speed_duration ON filing_speed_telemetry(total_duration_seconds);
CREATE INDEX IF NOT EXISTS idx_filing_speed_itr ON filing_speed_telemetry(itr_type, assessment_year);
