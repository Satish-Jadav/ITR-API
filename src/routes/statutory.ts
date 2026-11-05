import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { IsinBatchLookupSchema, IFSC_REGEX, AY_REGEX } from '../security/vaptGuards.js';
import { StatutoryService } from '../services/statutoryService.js';

export const statutoryRoutes = new Hono();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_ITR_FORMS = ['ITR-1', 'ITR-2', 'ITR-3', 'ITR-4', 'ITR-5', 'ITR-6', 'ITR-7'];

/**
 * 1. GET /api/v1/statutory/manifest
 */
statutoryRoutes.get('/manifest', async (c) => {
  const ay = c.req.query('ay') || '2026-27';
  if (!AY_REGEX.test(ay)) {
    return c.json({ errorCode: 'INVALID_ASSESSMENT_YEAR_FORMAT' }, 400);
  }
  const currentVersion = c.req.query('currentVersion');
  const manifest = await StatutoryService.getManifest(ay, currentVersion);
  c.header('Cache-Control', 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400');
  return c.json(manifest);
});

/**
 * 2. GET /api/v1/statutory/sbi-ttbr (API-VAPT-05: Strict currency and date bounds validation)
 */
statutoryRoutes.get('/sbi-ttbr', async (c) => {
  const currency = (c.req.query('currency') || 'USD').toUpperCase();
  const fromDate = c.req.query('fromDate');
  const toDate = c.req.query('toDate');

  if (!/^[A-Z]{3}$/.test(currency)) {
    return c.json({ errorCode: 'INVALID_CURRENCY_CODE', currency }, 400);
  }

  if (fromDate && (!DATE_REGEX.test(fromDate) || isNaN(Date.parse(fromDate)))) {
    return c.json({ errorCode: 'INVALID_FROM_DATE_FORMAT', message: 'fromDate must be YYYY-MM-DD' }, 400);
  }
  if (toDate && (!DATE_REGEX.test(toDate) || isNaN(Date.parse(toDate)))) {
    return c.json({ errorCode: 'INVALID_TO_DATE_FORMAT', message: 'toDate must be YYYY-MM-DD' }, 400);
  }

  const result = await StatutoryService.getSbiTtbrRates(currency, fromDate, toDate);
  c.header('Cache-Control', 'public, max-age=43200, s-maxage=86400, stale-while-revalidate=604800');
  return c.json(result);
});

/**
 * 3. POST /api/v1/statutory/isin-fmv-batch
 */
statutoryRoutes.post('/isin-fmv-batch', zValidator('json', IsinBatchLookupSchema), async (c) => {
  const body = c.req.valid('json');
  const result = await StatutoryService.getIsinGrandfatheringFmvs(body.isinCodes);
  c.header('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000');
  return c.json(result);
});

/**
 * 4. GET /api/v1/statutory/ifsc/:ifscCode
 */
statutoryRoutes.get('/ifsc/:ifscCode', async (c) => {
  const ifsc = c.req.param('ifscCode');
  if (!IFSC_REGEX.test(ifsc)) {
    return c.json({ errorCode: 'INVALID_IFSC_FORMAT', ifsc }, 400);
  }

  const details = await StatutoryService.getIfscDetails(ifsc);
  if (!details) {
    return c.json({ errorCode: 'IFSC_NOT_FOUND', ifsc }, 404);
  }

  c.header('Cache-Control', 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=5184000');
  return c.json(details);
});

/**
 * 5. GET /api/v1/statutory/cbdt-schema/:form (API-VAPT-06: Strict form whitelisting)
 */
statutoryRoutes.get('/cbdt-schema/:form', async (c) => {
  const form = c.req.param('form').toUpperCase();
  const ay = c.req.query('ay') || '2026-27';

  if (!ALLOWED_ITR_FORMS.includes(form)) {
    return c.json({ errorCode: 'INVALID_CBDT_FORM', form, allowedForms: ALLOWED_ITR_FORMS }, 400);
  }
  if (!AY_REGEX.test(ay)) {
    return c.json({ errorCode: 'INVALID_ASSESSMENT_YEAR_FORMAT' }, 400);
  }

  return c.json({
    form,
    assessmentYear: ay,
    schemaVersion: 'Ver1.2',
    isDeprecated: false,
    validations: {
      mandatorySchedules: form === 'ITR-2' ? ['Salary', 'HP', 'CG', 'OS', 'VIA', 'CYLA', 'CFL'] : ['Salary', 'OS', 'VIA'],
      scheduleFaMandatoryForNonResidents: false,
      sec112aGrandfatheringSupported: true,
    },
    publishedAtIso: '2026-04-01T00:00:00Z',
  });
});

/**
 * 6. GET /api/v1/statutory/timeline (Dynamic statutory tax milestones & CBDT extensions)
 */
statutoryRoutes.get('/timeline', async (c) => {
  c.header('Cache-Control', 'public, max-age=900, s-maxage=1800, stale-while-revalidate=86400');
  const currentYear = new Date().getFullYear();
  return c.json({
    assessmentYear: '2026-27',
    financialYear: '2025-26',
    activeCirculars: [
      {
        circularId: 'CBDT-CIR-2026-01',
        title: 'Form 16 Part A & B Issuance Extended',
        summary: 'Employers allowed until June 20 to upload Form 24Q and issue Form 16.',
        issuedDate: '2026-05-15',
      },
    ],
    milestones: [
      {
        id: 'MILESTONE_ITR_OPEN',
        title: 'ITR Filing Window Opens',
        dateText: `1st April ${currentYear}`,
        targetDateIso: `${currentYear}-04-01`,
        description: 'CBDT opens e-filing portal. Employers issue Form 16 Part A & B.',
        statutorySection: 'Sec 139(1)',
        isCritical: false,
      },
      {
        id: 'MILESTONE_Q1_ADVANCE_TAX',
        title: 'Q1 Advance Tax Due',
        dateText: `15th June ${currentYear}`,
        targetDateIso: `${currentYear}-06-15`,
        description: '15% advance tax payable if net tax liability exceeds ₹10,000.',
        statutorySection: 'Sec 208 / 211',
        isCritical: false,
      },
      {
        id: 'MILESTONE_MID_SEASON',
        title: 'Mid-Season 30-Day Reminder',
        dateText: `1st July ${currentYear}`,
        targetDateIso: `${currentYear}-07-01`,
        description: 'Form 16 fully reflected in AIS/TIS. Ideal time to file for quick refunds.',
        statutorySection: 'Sec 139(1)',
        isCritical: false,
      },
      {
        id: 'MILESTONE_FINAL_WARNING',
        title: 'Urgent 6-Day Penalty Warning',
        dateText: `25th July ${currentYear}`,
        targetDateIso: `${currentYear}-07-25`,
        description: 'Final countdown before mandatory ₹5,000 late fee u/s 234F kicks in.',
        statutorySection: 'Sec 234F',
        isCritical: true,
      },
      {
        id: 'MILESTONE_JULY_DEADLINE',
        title: 'Statutory Filing Deadline (ITR-1 / ITR-4)',
        dateText: `31st July ${currentYear}`,
        targetDateIso: `${currentYear}-07-31`,
        description: 'Last day to file timely original return without interest or late fee.',
        statutorySection: 'Sec 139(1)',
        isCritical: true,
        isExtended: false,
      },
      {
        id: 'MILESTONE_TAX_AUDIT',
        title: 'Tax Audit Filing Deadline',
        dateText: `31st October ${currentYear}`,
        targetDateIso: `${currentYear}-10-31`,
        description: 'Due date for businesses & professionals subject to audit u/s 44AB.',
        statutorySection: 'Sec 44AB / 139(1)',
        isCritical: false,
      },
      {
        id: 'MILESTONE_BELATED_CLOSE',
        title: 'Belated / Revised Return Closes',
        dateText: `31st December ${currentYear}`,
        targetDateIso: `${currentYear}-12-31`,
        description: 'Final statutory cutoff for belated u/s 139(4) or revised u/s 139(5).',
        statutorySection: 'Sec 139(4) / 139(5)',
        isCritical: true,
      },
    ],
  });
});

/**
 * 7. GET /api/v1/statutory/pdf-rules (Dynamic Institution PDF password cheat-sheet & patterns)
 */
statutoryRoutes.get('/pdf-rules', async (c) => {
  c.header('Cache-Control', 'public, max-age=43200, s-maxage=86400, stale-while-revalidate=604800');
  return c.json({
    version: '2026.11.05',
    rules: [
      {
        institutionId: 'TRACES_FORM16',
        institutionName: 'Income Tax Department / TRACES',
        documentCategory: 'Tax & Identity',
        passwordPatternRule: 'PAN in LOWERCASE + Date of Birth (DDMMYYYY)',
        exampleDescription: 'If PAN is ABCDE1234F and DOB is 15-Aug-1990',
        exampleInput: 'abcde1234f15081990',
        officialHelplineHint: 'Default TRACES Form 16 / 16A password standard',
      },
      {
        institutionId: 'ITD_AIS_TIS',
        institutionName: 'Income Tax Portal (AIS / TIS / 26AS)',
        documentCategory: 'Tax & Identity',
        passwordPatternRule: 'PAN in LOWERCASE + Date of Birth (DDMMYYYY)',
        exampleDescription: 'If PAN is ABCDE1234F and DOB is 15-Aug-1990',
        exampleInput: 'abcde1234f15081990',
        officialHelplineHint: 'Annual Information Statement / Taxpayer Information Summary',
      },
      {
        institutionId: 'UIDAI_EAADHAAR',
        institutionName: 'UIDAI (e-Aadhaar)',
        documentCategory: 'Tax & Identity',
        passwordPatternRule: 'First 4 letters of name in CAPITAL + Birth Year (YYYY)',
        exampleDescription: 'If name is SATISH and birth year is 1990',
        exampleInput: 'SATI1990',
        officialHelplineHint: 'Standard UIDAI e-Aadhaar PDF password',
      },
      {
        institutionId: 'HDFC_BANK',
        institutionName: 'HDFC Bank',
        documentCategory: 'Banking',
        passwordPatternRule: 'Customer ID (NetBanking ID) OR PAN in CAPITAL',
        exampleDescription: 'If Cust ID is 12345678 or PAN is ABCDE1234F',
        exampleInput: '12345678 or ABCDE1234F',
        officialHelplineHint: 'HDFC Bank statement standard format',
      },
      {
        institutionId: 'SBI_BANK',
        institutionName: 'State Bank of India (SBI)',
        documentCategory: 'Banking',
        passwordPatternRule: 'Last 5 digits of Mobile Number + DOB in DDMMYY or DDMMYYYY',
        exampleDescription: 'If Mobile ends in 98765 and DOB is 15-08-1990',
        exampleInput: '98765150890 or 9876515081990',
        officialHelplineHint: 'SBI Online statement password formula',
      },
      {
        institutionId: 'ICICI_BANK',
        institutionName: 'ICICI Bank',
        documentCategory: 'Banking',
        passwordPatternRule: 'First 4 letters of name in LOWERCASE + Birth Date & Month (DDMM)',
        exampleDescription: 'If name is SATISH and DOB is 15-Aug',
        exampleInput: 'sati1508',
        officialHelplineHint: 'ICICI Bank e-statement password standard',
      },
      {
        institutionId: 'AXIS_BANK',
        institutionName: 'Axis Bank',
        documentCategory: 'Banking',
        passwordPatternRule: 'First 4 letters of name in CAPITAL + Last 4 digits of Customer ID',
        exampleDescription: 'If name is SATISH and Cust ID ends in 5678',
        exampleInput: 'SATI5678',
        officialHelplineHint: 'Axis Bank statement password format',
      },
      {
        institutionId: 'KOTAK_BANK',
        institutionName: 'Kotak Mahindra Bank',
        documentCategory: 'Banking',
        passwordPatternRule: 'Customer Relationship Number (CRN) or Date of Birth (DDMMYYYY)',
        exampleDescription: 'If CRN is 98765432 or DOB is 15-Aug-1990',
        exampleInput: '98765432 or 15081990',
        officialHelplineHint: 'Printed on Kotak Debit Card below name',
      },
      {
        institutionId: 'CAMS_KFINTECH',
        institutionName: 'CAMS / KFintech (Mutual Fund CAS)',
        documentCategory: 'Investments',
        passwordPatternRule: 'Password chosen by you when requesting statement from CAMS/KFintech',
        exampleDescription: 'Custom password entered during web generation',
        exampleInput: 'Your chosen password',
        officialHelplineHint: 'Consolidated Account Statement (CAS)',
      },
      {
        institutionId: 'ZERODHA',
        institutionName: 'Zerodha (Tax P&L / Ledger)',
        documentCategory: 'Investments',
        passwordPatternRule: 'PAN in CAPITAL (Default) or Zerodha Account Password',
        exampleDescription: 'If PAN is ABCDE1234F',
        exampleInput: 'ABCDE1234F',
        officialHelplineHint: 'Zerodha Console Tax P&L Statement',
      },
      {
        institutionId: 'GROWW',
        institutionName: 'Groww (Capital Gains Statement)',
        documentCategory: 'Investments',
        passwordPatternRule: 'Date of Birth (DDMMYYYY)',
        exampleDescription: 'If DOB is 15-Aug-1990',
        exampleInput: '15081990',
        officialHelplineHint: 'Groww Tax Reports Password',
      },
    ],
  });
});

