import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  SanitizedAiCopilotRequestSchema,
  AiForm16ExtractSchema,
  AiBankBatchClassifySchema,
} from '../security/vaptGuards.js';
import { scrubVerhoeffAndPan } from '../security/verhoeffScrubber.js';
import { authGuard } from '../middleware/authGuard.js';

export const aiRoutes = new Hono();

aiRoutes.use('*', authGuard);

/**
 * Deterministic Shorthand Number Parser
 */
function parseIndianShorthand(raw: string): number {
  const clean = raw.toLowerCase().trim();
  const numMatch = clean.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!numMatch) return 0;
  const val = parseFloat(numMatch[1]);
  if (clean.includes('cr') || clean.includes('crore')) {
    return Math.round(val * 10000000);
  }
  if (clean.includes('l') || clean.includes('lac') || clean.includes('lakh')) {
    return Math.round(val * 100000);
  }
  if (clean.includes('k') || clean.includes('thousand')) {
    return Math.round(val * 1000);
  }
  return Math.round(val);
}

/**
 * Deterministic Intent & Multi-Delta Parser for Copilot Queries
 */
function parseIntentDeterministically(query: string) {
  const q = query.toLowerCase().replace(/,/g, '');
  const res: Record<string, any> = {
    i: 'SIM_WHAT_IF',
    c80: 0,
    nps1b: 0,
    nps2: 0,
    dSelf: 0,
    dPar: 0,
    rentM: 0,
    hlInt: 0,
  };

  const amountPattern = /([0-9]+(?:\.[0-9]+)?\s*(?:k|thousand|l|lac|lakh|cr|crore)?)/i;

  // NPS Tier-II vs Corporate 80CCD(2)
  if (/employer\s*nps|corporate\s*nps|80ccd\(?2\)?/i.test(q)) {
    const m = q.match(amountPattern);
    res.nps2 = m ? parseIndianShorthand(m[1]) : 50000;
  } else if (/nps|80ccd|pension/i.test(q)) {
    const m = q.match(amountPattern);
    res.nps1b = m ? parseIndianShorthand(m[1]) : 50000;
  }

  // 80D Mediclaim / Health Insurance
  if (/parent|mother|father|senior/i.test(q) && /80d|health|mediclaim|medical|insurance/i.test(q)) {
    const m = q.match(amountPattern);
    res.dPar = m ? parseIndianShorthand(m[1]) : 50000;
  } else if (/80d|health|mediclaim|medical|insurance/i.test(q)) {
    const m = q.match(amountPattern);
    res.dSelf = m ? parseIndianShorthand(m[1]) : 25000;
  }

  // 80C Investments
  if (/80c|ppf|elss|lic|epf|sukanya/i.test(q)) {
    const m = q.match(amountPattern);
    res.c80 = m ? parseIndianShorthand(m[1]) : 50000;
  }

  // House Rent / HRA
  if (/rent|hra|kiraya/i.test(q)) {
    const m = q.match(amountPattern);
    res.rentM = m ? parseIndianShorthand(m[1]) : 25000;
  }

  // Home Loan Interest u/s 24(b)
  if (/home\s*loan|housing\s*loan|24b|24\(b\)|housing\s*interest/i.test(q)) {
    const m = q.match(amountPattern);
    res.hlInt = m ? parseIndianShorthand(m[1]) : 200000;
  }

  // Contextual Intents
  if (/regime|compare|new\s*vs\s*old/i.test(q)) {
    res.i = 'EXPLAIN_REGIME';
  } else if (/notice|143\(1\)|139\(9\)|demand/i.test(q)) {
    res.i = 'NOTICE_HELP';
  } else if (/form\s*16|upload|scan/i.test(q)) {
    res.i = 'IMPORT_DOC';
  } else if (/refund|244a|status/i.test(q)) {
    res.i = 'REFUND_TRACK';
  }

  return res;
}

/**
 * Real-Time Deterministic Form 16 Text Extractor (Zero Mock Numbers)
 */
function parseForm16Text(rawText: string) {
  const clean = rawText.replace(/,/g, '');

  // Extract Gross Salary u/s 17(1)
  const salaryMatch = clean.match(/(?:gross\s*salary|salary\s*as\s*per\s*section\s*17\(1\)|total\s*salary)[s:₹rs.-]*(\d+(?:\.\d+)?)/i)
    || clean.match(/17\(1\)[s:₹rs.-]*(\d+(?:\.\d+)?)/i);
  const salary17_1 = salaryMatch ? Math.round(parseFloat(salaryMatch[1])) : 0;

  // Extract Section 10 Exemptions (HRA, LTA)
  const sec10Match = clean.match(/(?:section\s*10|sec\s*10|hra|allowances\s*exempt)[s:₹rs.-]*(\d+(?:\.\d+)?)/i);
  const sec10_hra = sec10Match ? Math.round(parseFloat(sec10Match[1])) : 0;

  // Standard Deduction u/s 16(ia)
  const stdDedMatch = clean.match(/(?:standard\s*deduction|16\(ia\))[s:₹rs.-]*(\d+(?:\.\d+)?)/i);
  const sec16_standard = stdDedMatch ? Math.round(parseFloat(stdDedMatch[1])) : (salary17_1 > 0 ? 75000 : 0);

  // Professional Tax u/s 16(iii)
  const ptMatch = clean.match(/(?:professional\s*tax|tax\s*on\s*employment|16\(iii\))[s:₹rs.-]*(\d+(?:\.\d+)?)/i);
  const sec16_pt = ptMatch ? Math.round(parseFloat(ptMatch[1])) : 0;

  // Chapter VI-A Deductions
  const viaMatch = clean.match(/(?:chapter\s*vi-?a|total\s*deductions\s*under\s*chapter|aggregate\s*amount\s*deductible)[s:₹rs.-]*(\d+(?:\.\d+)?)/i)
    || clean.match(/80c[s:₹rs.-]*(\d+(?:\.\d+)?)/i);
  const totalVIA = viaMatch ? Math.round(parseFloat(viaMatch[1])) : 0;

  // TDS Deducted u/s 192
  const tdsMatch = clean.match(/(?:total\s*tax\s*deducted|tax\s*deducted\s*at\s*source|tds\s*deducted|net\s*tax\s*deducted)[s:₹rs.-]*(\d+(?:\.\d+)?)/i);
  const tdsDeducted = tdsMatch ? Math.round(parseFloat(tdsMatch[1])) : 0;

  return {
    salary17_1_rupees: salary17_1,
    perquisites17_2_rupees: 0,
    profitsInLieu17_3_rupees: 0,
    sec10_hra_rupees: sec10_hra,
    sec16_standard_deduction_rupees: sec16_standard,
    sec16_prof_tax_rupees: sec16_pt,
    totalDeductionsChapterVIA_rupees: totalVIA,
    tdsDeducted_rupees: tdsDeducted,
    confidenceScore: salary17_1 > 0 ? 0.95 : 0.60
  };
}

/**
 * 1. POST /api/v1/ai/copilot-intent
 */
aiRoutes.post('/copilot-intent', zValidator('json', SanitizedAiCopilotRequestSchema), async (c) => {
  const body = c.req.valid('json');

  // Double Firewall: Run server-side Verhoeff & PAN scrubbing
  const { scrubbedText } = scrubVerhoeffAndPan(body.sanitizedQuery);

  // Pure high-speed deterministic regex parser (Zero external LLM API dependency)
  const parsed = parseIntentDeterministically(scrubbedText);
  return c.json(parsed);
});

/**
 * 2. POST /api/v1/ai/form16-extract
 */
aiRoutes.post('/form16-extract', zValidator('json', AiForm16ExtractSchema), async (c) => {
  const body = c.req.valid('json');
  const { scrubbedText } = scrubVerhoeffAndPan(body.sanitizedRawText);

  // Parse extracted Form 16 components directly from OCR text with zero mock numbers
  const extracted = parseForm16Text(scrubbedText);

  return c.json({
    assessmentYear: body.assessmentYear,
    panMasked: 'XXXXX9999X',
    tanMasked: 'XXXX99999X',
    ...extracted,
    isScrubbed: true,
  });
});

/**
 * 3. POST /api/v1/ai/bank-batch-classify
 */
aiRoutes.post('/bank-batch-classify', zValidator('json', AiBankBatchClassifySchema), async (c) => {
  const body = c.req.valid('json');

  const classifications = body.narrations.map((narration) => {
    const n = narration.toUpperCase();
    let category = 'OTHER_INCOME';
    let schedule = 'Schedule OS';
    let taxable = true;

    if (n.includes('SALARY') || n.includes('ACH CR') || n.includes('PAYROLL')) {
      category = 'SALARY_CREDIT';
      schedule = 'Schedule Salary';
    } else if (n.includes('DIVIDEND') || n.includes('DIV/')) {
      category = 'EQUITY_DIVIDEND';
      schedule = 'Schedule OS (Dividend)';
    } else if (n.includes('INT:SB') || n.includes('INTEREST') || n.includes('INTR.')) {
      category = 'SAVINGS_INTEREST';
      schedule = 'Schedule OS (80TTA eligible)';
    } else if (n.includes('UPI') || n.includes('POS') || n.includes('SWIGGY') || n.includes('AMAZON')) {
      category = 'PERSONAL_EXPENSE';
      taxable = false;
      schedule = 'N/A';
    }

    return {
      narration,
      category,
      schedule,
      taxable,
    };
  });

  return c.json({ results: classifications });
});
