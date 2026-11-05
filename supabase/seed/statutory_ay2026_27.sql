-- ============================================================================
-- ZEROTAX-LOCAL STATUTORY MASTER DATA SEED (AY 2026-27 / FY 2025-26)
-- ============================================================================

-- 1. Statutory OTA Rule Bundle for AY 2026-27
INSERT INTO statutory_ota_rule_bundles (
    bundle_version, assessment_year, schema_ver, payload_json, payload_sha256_hex, ed25519_signature_hex, is_active
) VALUES (
    '2026.27.4',
    '2026-27',
    'Ver1.2',
    '{
        "assessmentYear": "2026-27",
        "financialYear": "2025-26",
        "costInflationIndex2025_26": 376,
        "costInflationIndex2024_25": 363,
        "rebate87ANewRegimeLimitRupees": 1200000,
        "rebate87ANewRegimeMaxRupees": 60000,
        "stdDeductionNewRegimeRupees": 75000,
        "stdDeductionOldRegimeRupees": 50000,
        "sec112aLtcgExemptionLimitRupees": 125000,
        "sec112aTaxRatePercent": 12.5,
        "sec111aStcgTaxRatePercent": 20.0,
        "familyPensionDeductionMaxNewRegime": 25000,
        "slabsNewRegime": [
            {"minRupees": 0, "maxRupees": 400000, "ratePercent": 0},
            {"minRupees": 400000, "maxRupees": 800000, "ratePercent": 5},
            {"minRupees": 800000, "maxRupees": 1200000, "ratePercent": 10},
            {"minRupees": 1200000, "maxRupees": 1600000, "ratePercent": 15},
            {"minRupees": 1600000, "maxRupees": 2000000, "ratePercent": 20},
            {"minRupees": 2000000, "maxRupees": 2400000, "ratePercent": 25},
            {"minRupees": 2400000, "maxRupees": null, "ratePercent": 30}
        ]
    }'::jsonb,
    '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    '4a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d',
    TRUE
) ON CONFLICT (bundle_version) DO NOTHING;

-- 2. Master SBI TTBR Rates (Rule 115)
INSERT INTO sbi_ttbr_rates_master (currency_code, rate_date, is_month_end_official_rate, tt_buying_rate_paise, source_circular_ref)
VALUES
    ('USD', '2025-01-31', TRUE, 8612, 'SBI Forex TT Buying Circular 2025/01'),
    ('USD', '2025-02-28', TRUE, 8685, 'SBI Forex TT Buying Circular 2025/02'),
    ('USD', '2025-03-31', TRUE, 8560, 'SBI Forex TT Buying Circular 2025/03'),
    ('USD', '2025-04-30', TRUE, 8575, 'SBI Forex TT Buying Circular 2025/04'),
    ('USD', '2025-05-31', TRUE, 8590, 'SBI Forex TT Buying Circular 2025/05'),
    ('USD', '2025-12-31', TRUE, 8590, 'SBI Forex TT Buying Circular 2025/12'),
    ('EUR', '2025-03-31', TRUE, 9245, 'SBI Forex TT Buying Circular 2025/03'),
    ('GBP', '2025-03-31', TRUE, 10830, 'SBI Forex TT Buying Circular 2025/03'),
    ('SGD', '2025-03-31', TRUE, 6420, 'SBI Forex TT Buying Circular 2025/03'),
    ('AED', '2025-03-31', TRUE, 2330, 'SBI Forex TT Buying Circular 2025/03')
ON CONFLICT (currency_code, rate_date) DO NOTHING;

-- 3. Master Jan 31, 2018 Grandfathering FMVs (Section 55(2)(ac))
INSERT INTO isin_jan2018_fmv_master (isin_code, bse_nse_amfi_code, security_name, asset_class, highest_price_jan31_2018_paise)
VALUES
    ('INE002A01018', 'RELIANCE', 'RELIANCE INDUSTRIES LTD', 'LISTED_EQUITY', 96190),
    ('INE009A01021', 'INFY', 'INFOSYS LTD', 'LISTED_EQUITY', 115050),
    ('INE467B01029', 'TCS', 'TATA CONSULTANCY SERVICES LTD', 'LISTED_EQUITY', 155890),
    ('INE040A01034', 'HDFCBANK', 'HDFC BANK LTD', 'LISTED_EQUITY', 100450),
    ('INE090A01021', 'ICICIBANK', 'ICICI BANK LTD', 'LISTED_EQUITY', 35320),
    ('INE238A01034', 'AXISBANK', 'AXIS BANK LTD', 'LISTED_EQUITY', 59200),
    ('INE062A01020', 'SBIN', 'STATE BANK OF INDIA', 'LISTED_EQUITY', 31320),
    ('INF109K01Z48', '118989', 'ICICI PRU VALUE DISCOVERY FUND - GROWTH', 'EQUITY_MF', 14823),
    ('INF209K01157', '100377', 'HDFC TOP 100 FUND - GROWTH', 'EQUITY_MF', 51240),
    ('INF846K01164', '101962', 'AXIS BLUECHIP FUND - REGULAR GROWTH', 'EQUITY_MF', 28910)
ON CONFLICT (isin_code) DO NOTHING;

-- 4. Master RBI Bank IFSC & EVC Capability Directory (Schedule BA)
INSERT INTO ifsc_directory_master (ifsc_code, bank_name, branch_name, micr_code, supports_cbdt_evc)
VALUES
    ('HDFC0000123', 'HDFC BANK LTD', 'BODAKDEV AHMEDABAD', '380240012', TRUE),
    ('SBIN0000691', 'STATE BANK OF INDIA', 'MUMBAI MAIN', '400002010', TRUE),
    ('ICIC0000001', 'ICICI BANK LTD', 'NARIMAN POINT MUMBAI', '400229002', TRUE),
    ('UTIB0000004', 'AXIS BANK LTD', 'BANDRA KURLA COMPLEX', '400211003', TRUE),
    ('KKBK0000180', 'KOTAK MAHINDRA BANK', 'NARIMAN POINT', '400485002', TRUE),
    ('PUNB0000100', 'PUNJAB NATIONAL BANK', 'NEW DELHI CONNAUGHT PLACE', '110024001', TRUE),
    ('BARB0VJMUMB', 'BANK OF BARODA', 'MUMBAI METRO', '400012050', TRUE)
ON CONFLICT (ifsc_code) DO NOTHING;
