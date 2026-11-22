import { IncomeDetails, DeductionsDetails, RegimeComparison, AssessmentYear, FilingSection } from '../types';

/**
 * CBDT Tax Calculator supporting:
 * - AY 2026-27 (FY 2025-26): Current Year (₹75,000 New Regime Std Deduction, 3-7-10-12-15 Slabs)
 * - AY 2025-26 (FY 2024-25): Previous Year (₹75,000 New Regime Std Deduction, Belated/Revised/ITR-U)
 * - AY 2024-25 (FY 2023-24): Previous Year (₹50,000 New Regime Std Deduction, 3-6-9-12-15 Slabs, ITR-U u/s 139(8A))
 */
export function calculateTaxes(
  income: IncomeDetails,
  deductions: DeductionsDetails,
  assessmentYear: AssessmentYear = '2026-27',
  filingSection: FilingSection = '139(1)'
): RegimeComparison {
  const isAY2024 = assessmentYear === '2024-25';
  
  // Standard Deduction in New Regime:
  // AY 2024-25: ₹50,000
  // AY 2025-26 & AY 2026-27: ₹75,000
  const stdDeductionNew = isAY2024 ? 50000 : 75000;

  // ----------------------------------------------------
  // 1. NEW REGIME (Section 115BAC)
  // ----------------------------------------------------
  const grossSalary = income.grossSalary;
  const netSalaryNew = Math.max(0, grossSalary - stdDeductionNew);
  const otherIncomeTotal = income.savingsInterest + income.fdInterest + income.otherIncome;
  
  const grossTotalIncomeNew = netSalaryNew + otherIncomeTotal;
  const totalDeductionsNew = deductions.sec80CCD_2; // Only employer NPS allowed in New Regime
  const taxableIncomeNew = Math.max(0, grossTotalIncomeNew - totalDeductionsNew);

  let basicTaxNew = 0;

  if (isAY2024) {
    // AY 2024-25 Slabs:
    // 0 to 3,00,000: Nil
    // 3,00,001 to 6,00,000: 5%
    // 6,00,001 to 9,00,000: 10%
    // 9,00,001 to 12,00,000: 15%
    // 12,00,001 to 15,00,000: 20%
    // Above 15,00,000: 30%
    if (taxableIncomeNew > 1500000) {
      basicTaxNew += (taxableIncomeNew - 1500000) * 0.30;
      basicTaxNew += 300000 * 0.20; // 12L to 15L
      basicTaxNew += 300000 * 0.15; // 9L to 12L
      basicTaxNew += 300000 * 0.10; // 6L to 9L
      basicTaxNew += 300000 * 0.05; // 3L to 6L
    } else if (taxableIncomeNew > 1200000) {
      basicTaxNew += (taxableIncomeNew - 1200000) * 0.20;
      basicTaxNew += 300000 * 0.15;
      basicTaxNew += 300000 * 0.10;
      basicTaxNew += 300000 * 0.05;
    } else if (taxableIncomeNew > 900000) {
      basicTaxNew += (taxableIncomeNew - 900000) * 0.15;
      basicTaxNew += 300000 * 0.10;
      basicTaxNew += 300000 * 0.05;
    } else if (taxableIncomeNew > 600000) {
      basicTaxNew += (taxableIncomeNew - 600000) * 0.10;
      basicTaxNew += 300000 * 0.05;
    } else if (taxableIncomeNew > 300000) {
      basicTaxNew += (taxableIncomeNew - 300000) * 0.05;
    }
  } else {
    // AY 2025-26 & AY 2026-27 Slabs (Budget 2024+):
    // 0 to 3,00,000: Nil
    // 3,00,001 to 7,00,000: 5%
    // 7,00,001 to 10,00,000: 10%
    // 10,00,001 to 12,00,000: 15%
    // 12,00,001 to 15,00,000: 20%
    // Above 15,00,000: 30%
    if (taxableIncomeNew > 1500000) {
      basicTaxNew += (taxableIncomeNew - 1500000) * 0.30;
      basicTaxNew += 300000 * 0.20; // 12L to 15L
      basicTaxNew += 200000 * 0.15; // 10L to 12L
      basicTaxNew += 300000 * 0.10; // 7L to 10L
      basicTaxNew += 400000 * 0.05; // 3L to 7L
    } else if (taxableIncomeNew > 1200000) {
      basicTaxNew += (taxableIncomeNew - 1200000) * 0.20;
      basicTaxNew += 200000 * 0.15;
      basicTaxNew += 300000 * 0.10;
      basicTaxNew += 400000 * 0.05;
    } else if (taxableIncomeNew > 1000000) {
      basicTaxNew += (taxableIncomeNew - 1000000) * 0.15;
      basicTaxNew += 300000 * 0.10;
      basicTaxNew += 400000 * 0.05;
    } else if (taxableIncomeNew > 700000) {
      basicTaxNew += (taxableIncomeNew - 700000) * 0.10;
      basicTaxNew += 400000 * 0.05;
    } else if (taxableIncomeNew > 300000) {
      basicTaxNew += (taxableIncomeNew - 300000) * 0.05;
    }
  }

  // Section 87A Full Rebate in New Regime up to ₹7,00,000 taxable income (max ₹25,000)
  let rebate87ANew = 0;
  if (taxableIncomeNew <= 700000) {
    rebate87ANew = basicTaxNew;
  } else {
    // Marginal relief: Tax payable cannot exceed (Taxable Income - 7,00,000)
    const excessOver7L = taxableIncomeNew - 700000;
    if (basicTaxNew > excessOver7L) {
      rebate87ANew = basicTaxNew - excessOver7L;
    }
  }

  const taxAfterRebateNew = Math.max(0, basicTaxNew - rebate87ANew);
  const cessNew = Math.round(taxAfterRebateNew * 0.04);
  let totalTaxPayableNew = taxAfterRebateNew + cessNew;

  // ----------------------------------------------------
  // 2. OLD REGIME
  // Standard Deduction: ₹50,000 + Prof Tax
  // ----------------------------------------------------
  const salaryDeductionsOld = income.standardDeductionOld + income.professionalTax;
  const netSalaryOld = Math.max(0, grossSalary - salaryDeductionsOld);
  
  // House property loss (max 2,00,000)
  const homeLoanLoss = Math.min(200000, income.homeLoanInterestSelfOccupied);
  const housePropertyIncome = -homeLoanLoss;

  const grossTotalIncomeOld = Math.max(0, netSalaryOld + housePropertyIncome + otherIncomeTotal);

  // Chapter VI-A Deductions
  const ded80C = Math.min(150000, deductions.sec80C);
  const ded80D = Math.min(25000, deductions.sec80D_Self) + Math.min(50000, deductions.sec80D_Parents);
  const ded80CCD1B = Math.min(50000, deductions.sec80CCD_1B);
  const ded80TTA = Math.min(10000, Math.min(income.savingsInterest, deductions.sec80TTA));
  const ded80CCD2 = deductions.sec80CCD_2;
  const ded80G = deductions.sec80G;

  const totalDeductionsOld = ded80C + ded80D + ded80CCD1B + ded80TTA + ded80CCD2 + ded80G;
  const taxableIncomeOld = Math.max(0, grossTotalIncomeOld - totalDeductionsOld);

  // Old Regime Slabs (General Individual):
  // 0 to 2,50,000: Nil
  // 2,50,001 to 5,00,000: 5%
  // 5,00,001 to 10,00,000: 20%
  // Above 10,00,000: 30%
  let basicTaxOld = 0;
  if (taxableIncomeOld > 1000000) {
    basicTaxOld += (taxableIncomeOld - 1000000) * 0.30;
    basicTaxOld += 500000 * 0.20;
    basicTaxOld += 250000 * 0.05;
  } else if (taxableIncomeOld > 500000) {
    basicTaxOld += (taxableIncomeOld - 500000) * 0.20;
    basicTaxOld += 250000 * 0.05;
  } else if (taxableIncomeOld > 250000) {
    basicTaxOld += (taxableIncomeOld - 250000) * 0.05;
  }

  // 87A rebate in Old Regime up to ₹5,00,000 (max ₹12,500)
  let rebate87AOld = 0;
  if (taxableIncomeOld <= 500000) {
    rebate87AOld = Math.min(12500, basicTaxOld);
  }

  const taxAfterRebateOld = Math.max(0, basicTaxOld - rebate87AOld);
  const cessOld = Math.round(taxAfterRebateOld * 0.04);
  let totalTaxPayableOld = taxAfterRebateOld + cessOld;

  // ITR-U Additional Tax under Section 140B (25% if filed within 12 months, 50% if filed between 12-24 months)
  let itrUAdditionalTax = 0;
  if (filingSection === '139(8A)') {
    const chosenTax = Math.min(totalTaxPayableNew, totalTaxPayableOld);
    const rate = assessmentYear === '2024-25' ? 0.50 : 0.25; // 50% for 12-24 months past, 25% for 0-12 months past
    itrUAdditionalTax = Math.round(chosenTax * rate);
  }

  const savingsAmount = Math.abs(totalTaxPayableOld - totalTaxPayableNew);
  const recommended = totalTaxPayableNew <= totalTaxPayableOld ? 'NEW' : 'OLD';

  return {
    newRegime: {
      grossTotalIncome: grossTotalIncomeNew,
      totalDeductions: totalDeductionsNew,
      taxableIncome: taxableIncomeNew,
      basicTax: basicTaxNew,
      rebate87A: rebate87ANew,
      taxAfterRebate: taxAfterRebateNew,
      cess: cessNew,
      totalTaxPayable: totalTaxPayableNew,
    },
    oldRegime: {
      grossTotalIncome: grossTotalIncomeOld,
      totalDeductions: totalDeductionsOld,
      taxableIncome: taxableIncomeOld,
      basicTax: basicTaxOld,
      rebate87A: rebate87AOld,
      taxAfterRebate: taxAfterRebateOld,
      cess: cessOld,
      totalTaxPayable: totalTaxPayableOld,
    },
    recommended,
    savingsAmount,
    assessmentYear,
    filingSection,
    itrUAdditionalTax,
  };
}
