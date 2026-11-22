import { IncomeDetails, DeductionsDetails, RegimeComparison } from '../types';

/**
 * CBDT Tax Calculator for AY 2026-27 (FY 2025-26)
 * Real statutory slab mathematics with Section 87A rebate & 4% Health & Education Cess
 */
export function calculateTaxes(
  income: IncomeDetails,
  deductions: DeductionsDetails
): RegimeComparison {
  // ----------------------------------------------------
  // 1. NEW REGIME (Section 115BAC - Budget 2024/2025/2026)
  // Standard Deduction: ₹75,000 for salaried employees
  // ----------------------------------------------------
  const grossSalary = income.grossSalary;
  const netSalaryNew = Math.max(0, grossSalary - income.standardDeductionNew);
  const otherIncomeTotal = income.savingsInterest + income.fdInterest + income.otherIncome;
  
  // Under New Regime: Sec 24(b) on self-occupied is NOT allowed. Sec 80CCD(2) employer NPS is allowed.
  const grossTotalIncomeNew = netSalaryNew + otherIncomeTotal;
  const totalDeductionsNew = deductions.sec80CCD_2; // Only employer NPS allowed
  const taxableIncomeNew = Math.max(0, grossTotalIncomeNew - totalDeductionsNew);

  // New Regime Slabs:
  // 0 to 3,00,000: Nil
  // 3,00,001 to 7,00,000: 5%
  // 7,00,001 to 10,00,000: 10%
  // 10,00,001 to 12,00,000: 15%
  // 12,00,001 to 15,00,000: 20%
  // Above 15,00,000: 30%
  let basicTaxNew = 0;
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

  // Section 87A Full Rebate in New Regime up to ₹7,00,000 taxable income (max ₹25,000)
  // Marginal relief applies if taxable income slightly exceeds 7L
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
  const totalTaxPayableNew = taxAfterRebateNew + cessNew;

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
  const totalTaxPayableOld = taxAfterRebateOld + cessOld;

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
  };
}
