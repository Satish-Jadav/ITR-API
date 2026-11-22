export type AssessmentYear = '2026-27' | '2025-26' | '2024-25';

export type FilingSection = '139(1)' | '139(4)' | '139(5)' | '139(8A)';

export interface TaxPayerProfile {
  pan: string;
  name: string;
  dob: string;
  email: string;
  mobile: string;
  assessmentYear: AssessmentYear;
  financialYear: string;
  filingSection: FilingSection;
  filingType: 'ITR-1' | 'ITR-2' | 'ITR-4';
  residentStatus: 'Resident' | 'Non-Resident';
  ageCategory: '<60' | '60-80' | '>80';
  bankName: string;
  bankAccountMasked: string;
  bankIfsc: string;
  bankValidated: boolean;
}

export interface IncomeDetails {
  grossSalary: number;
  allowancesExempt: number; // u/s 10
  standardDeductionNew: number; // 75,000 for AY 2026-27 & AY 2025-26; 50,000 for AY 2024-25
  standardDeductionOld: number; // 50,000
  professionalTax: number; // u/s 16(iii)
  homeLoanInterestSelfOccupied: number; // u/s 24(b)
  savingsInterest: number;
  fdInterest: number;
  otherIncome: number;
}

export interface DeductionsDetails {
  sec80C: number; // Max 1,50,000
  sec80D_Self: number; // Max 25,000
  sec80D_Parents: number; // Max 50,000 for seniors
  sec80CCD_1B: number; // NPS additional Max 50,000
  sec80CCD_2: number; // Employer NPS
  sec80TTA: number; // Savings interest Max 10,000
  sec80G: number; // Donations
}

export interface RegimeComparison {
  newRegime: {
    grossTotalIncome: number;
    totalDeductions: number;
    taxableIncome: number;
    basicTax: number;
    rebate87A: number;
    taxAfterRebate: number;
    cess: number;
    totalTaxPayable: number;
  };
  oldRegime: {
    grossTotalIncome: number;
    totalDeductions: number;
    taxableIncome: number;
    basicTax: number;
    rebate87A: number;
    taxAfterRebate: number;
    cess: number;
    totalTaxPayable: number;
  };
  recommended: 'NEW' | 'OLD';
  savingsAmount: number;
  assessmentYear: AssessmentYear;
  filingSection: FilingSection;
  itrUAdditionalTax?: number; // 25% or 50% additional tax under 139(8A) if applicable
}
