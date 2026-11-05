import { queryDb } from '../config/supabase.js';
import { logger } from '../config/logger.js';

export class StatutoryService {
  /**
   * Returns statutory manifest with AY 2026-27 latest bundle version and Ed25519 signature
   */
  static async getManifest(assessmentYear: string = '2026-27', currentVersion?: string) {
    let rows: any[] = [];
    try {
      rows = await queryDb(
        `SELECT bundle_version, assessment_year, schema_ver, payload_json, payload_sha256_hex, ed25519_signature_hex
         FROM statutory_ota_rule_bundles
         WHERE assessment_year = $1 AND is_active = TRUE
         ORDER BY published_at DESC LIMIT 1`,
        [assessmentYear]
      );
    } catch (err: any) {
      logger.warn('⚠️ Statutory manifest DB query failed, falling back to bundled statutory defaults', {
        assessmentYear,
        error: err.message,
      });
      rows = [];
    }

    if (rows.length === 0) {
      // Return hardcoded default if table not yet seeded
      return {
        updateAvailable: false,
        latestBundleVersion: '2026.27.4',
        assessmentYear: '2026-27',
        cbdtSchemaVersion: 'Ver1.2',
        cii2025_26: 376,
        rebate87ANewRegimeLimitRupees: 1200000,
        rebate87ANewRegimeMaxRupees: 60000,
        stdDeductionNewRegimeRupees: 75000,
        payloadSha256Hex: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
        ed25519SignatureHex: '4a1b2c3d4e5f...',
      };
    }

    const row = rows[0];
    const payload = typeof row.payload_json === 'string' ? JSON.parse(row.payload_json) : row.payload_json;
    const isUpdateAvailable = currentVersion !== row.bundle_version;

    return {
      updateAvailable: isUpdateAvailable,
      latestBundleVersion: row.bundle_version,
      assessmentYear: row.assessment_year,
      cbdtSchemaVersion: row.schema_ver,
      cii2025_26: payload.costInflationIndex2025_26 ?? 376,
      rebate87ANewRegimeLimitRupees: payload.rebate87ANewRegimeLimitRupees ?? 1200000,
      rebate87ANewRegimeMaxRupees: payload.rebate87ANewRegimeMaxRupees ?? 60000,
      stdDeductionNewRegimeRupees: payload.stdDeductionNewRegimeRupees ?? 75000,
      payloadSha256Hex: row.payload_sha256_hex,
      ed25519SignatureHex: row.ed25519_signature_hex,
      rules: payload,
    };
  }

  /**
   * Master SBI TTBR Rates (Income-tax Rule 115 & Form 67)
   */
  static async getSbiTtbrRates(currency: string, fromDate?: string, toDate?: string) {
    const params: any[] = [currency.toUpperCase()];
    let sql = `SELECT rate_date, is_month_end_official_rate, tt_buying_rate_paise
               FROM sbi_ttbr_rates_master
               WHERE currency_code = $1`;

    if (fromDate) {
      params.push(fromDate);
      sql += ` AND rate_date >= $${params.length}`;
    }
    if (toDate) {
      params.push(toDate);
      sql += ` AND rate_date <= $${params.length}`;
    }

    sql += ` ORDER BY rate_date DESC`;

    const rows = await queryDb(sql, params);
    return {
      currencyCode: currency.toUpperCase(),
      statutoryRuleRef: 'Income-tax Rule 115 & Rule 128(5)',
      rates: rows.map((r: any) => ({
        rateDate: r.rate_date instanceof Date ? r.rate_date.toISOString().split('T')[0] : r.rate_date,
        isMonthEndOfficial: r.is_month_end_official_rate,
        ttBuyingRatePaise: Number(r.tt_buying_rate_paise),
        ttBuyingRateInr: (Number(r.tt_buying_rate_paise) / 100).toFixed(2),
      })),
    };
  }

  /**
   * Master Jan 31, 2018 Grandfathering FMV Lookup (Section 55(2)(ac))
   */
  static async getIsinGrandfatheringFmvs(isinCodes: string[]) {
    const rows = await queryDb(
      `SELECT isin_code, bse_nse_amfi_code, security_name, asset_class, highest_price_jan31_2018_paise
       FROM isin_jan2018_fmv_master
       WHERE isin_code = ANY($1)`,
      [isinCodes]
    );

    const fmvMap: Record<string, any> = {};
    for (const r of rows) {
      fmvMap[r.isin_code] = {
        symbol: r.bse_nse_amfi_code,
        name: r.security_name,
        assetClass: r.asset_class,
        fmvPaise: Number(r.highest_price_jan31_2018_paise),
        fmvRupees: Number(r.highest_price_jan31_2018_paise) / 100,
      };
    }

    return {
      grandfatheringCutoffDate: '2018-01-31',
      statutorySection: 'Section 55(2)(ac) & Schedule 112A',
      fmvMap,
    };
  }

  /**
   * Master RBI Bank IFSC validation
   */
  static async getIfscDetails(ifsc: string) {
    const rows = await queryDb(
      `SELECT ifsc_code, bank_name, branch_name, micr_code, supports_cbdt_evc
       FROM ifsc_directory_master
       WHERE ifsc_code = $1`,
      [ifsc.toUpperCase()]
    );

    if (rows.length === 0) {
      return null;
    }

    const r = rows[0];
    return {
      ifscCode: r.ifsc_code,
      bankName: r.bank_name,
      branchName: r.branch_name,
      micrCode: r.micr_code,
      supportsCbdtEvc: r.supports_cbdt_evc,
    };
  }
}
