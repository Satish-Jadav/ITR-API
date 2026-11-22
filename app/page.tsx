'use client';

import React, { useState, useMemo } from 'react';
import Header from './components/Header';
import Step1Identity from './components/Step1Identity';
import Step2Income from './components/Step2Income';
import Step3Deductions from './components/Step3Deductions';
import Step4Regime from './components/Step4Regime';
import AiCopilot from './components/AiCopilot';
import FinalApprovalModal from './components/FinalApprovalModal';
import { TaxPayerProfile, IncomeDetails, DeductionsDetails, AssessmentYear, FilingSection } from './types';
import { calculateTaxes } from './utils/taxCalculator';
import { User, FileText, PiggyBank, Scale, Sparkles, Shield, ChevronRight, History, Calendar } from 'lucide-react';

export default function FilingWizardPage() {
  // 1. Initial State hydrated with live profile & Form 16 records
  const [profile, setProfile] = useState<TaxPayerProfile>({
    pan: 'BZRPJ9498J',
    name: 'Satish Jadav',
    dob: '1998-05-14',
    email: 'satish.jadav@example.com',
    mobile: '+91 98765 43210',
    assessmentYear: '2026-27',
    financialYear: '2025-26',
    filingSection: '139(1)',
    filingType: 'ITR-1',
    residentStatus: 'Resident',
    ageCategory: '<60',
    bankName: 'HDFC Bank',
    bankAccountMasked: '•••• 4982',
    bankIfsc: 'HDFC0001234',
    bankValidated: true,
  });

  const [income, setIncome] = useState<IncomeDetails>({
    grossSalary: 892173, // Form 16 live record
    allowancesExempt: 0,
    standardDeductionNew: 75000, // Budget 2024/2025/2026 enhanced deduction
    standardDeductionOld: 50000,
    professionalTax: 2400,
    homeLoanInterestSelfOccupied: 0,
    savingsInterest: 12450,
    fdInterest: 18200,
    otherIncome: 0,
  });

  const [deductions, setDeductions] = useState<DeductionsDetails>({
    sec80C: 150000,
    sec80D_Self: 25000,
    sec80D_Parents: 25000,
    sec80CCD_1B: 50000,
    sec80CCD_2: 0,
    sec80TTA: 10000,
    sec80G: 0,
  });

  const [activeStep, setActiveStep] = useState<number>(1);
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState<boolean>(false);

  const handleYearChange = (year: AssessmentYear) => {
    let defaultSection: FilingSection = '139(1)';
    let finYear = '2025-26';
    let stdDedNew = 75000;

    if (year === '2025-26') {
      finYear = '2024-25';
      defaultSection = '139(4)';
      stdDedNew = 75000;
    } else if (year === '2024-25') {
      finYear = '2023-24';
      defaultSection = '139(8A)';
      stdDedNew = 50000;
    }

    setProfile((prev) => ({
      ...prev,
      assessmentYear: year,
      financialYear: finYear,
      filingSection: defaultSection,
    }));

    setIncome((prev) => ({
      ...prev,
      standardDeductionNew: stdDedNew,
    }));
  };

  // Live Statutory Tax Calculation Engine
  const regimeComparison = useMemo(() => {
    return calculateTaxes(income, deductions, profile.assessmentYear, profile.filingSection);
  }, [income, deductions, profile.assessmentYear, profile.filingSection]);

  const steps = [
    { id: 1, label: 'Identity', icon: User, desc: `AY ${profile.assessmentYear} & PAN` },
    { id: 2, label: 'Income', icon: FileText, desc: 'Form 16 / AIS' },
    { id: 3, label: 'Deductions', icon: PiggyBank, desc: '80C & 80D' },
    { id: 4, label: 'Regime', icon: Scale, desc: 'Showdown & File' },
  ];

  const handleResetData = () => {
    const stdDed = profile.assessmentYear === '2024-25' ? 50000 : 75000;
    setIncome({
      grossSalary: 892173,
      allowancesExempt: 0,
      standardDeductionNew: stdDed,
      standardDeductionOld: 50000,
      professionalTax: 2400,
      homeLoanInterestSelfOccupied: 0,
      savingsInterest: 12450,
      fdInterest: 18200,
      otherIncome: 0,
    });
    setDeductions({
      sec80C: 150000,
      sec80D_Self: 25000,
      sec80D_Parents: 25000,
      sec80CCD_1B: 50000,
      sec80CCD_2: 0,
      sec80TTA: 10000,
      sec80G: 0,
    });
  };

  const isPreviousYear = profile.assessmentYear !== '2026-27';

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. Header Navigation */}
      <Header
        profile={profile}
        activeStep={activeStep}
        onOpenAi={() => setIsAiOpen(true)}
        onResetData={handleResetData}
        onYearChange={handleYearChange}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-6 lg:p-8 pb-24 sm:pb-8 flex flex-col">
        
        {/* Value Proposition Hero Banner (Client Attraction & Trust Reassurance) */}
        <div className={`mb-4 sm:mb-6 rounded-2xl border p-3.5 sm:p-5 shadow-lg relative overflow-hidden transition-all ${
          isPreviousYear
            ? 'bg-gradient-to-r from-amber-950/50 via-slate-900/90 to-slate-900/90 border-amber-500/40 shadow-amber-950/20'
            : 'bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-teal-950/50 border-emerald-500/30'
        }`}>
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
            <div>
              <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                  isPreviousYear
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : 'bg-emerald-500 text-slate-950'
                }`}>
                  AY {profile.assessmentYear} Active ({isPreviousYear ? 'Previous Year' : 'Current'})
                </span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>100% Tax Notice Protection</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Section {profile.filingSection}
                </span>
              </div>
              <h1 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
                Direct-to-CBDT Tax Optimizer &amp; Instant e-Filing
              </h1>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                Pre-filled from Form 16, AIS &amp; Form 26AS for FY {profile.financialYear}. Real-time Section 115BAC New vs. Old Regime showdown with instant bank refund credit.
              </p>
            </div>

            {/* Assessment Year Quick-Switcher in Banner */}
            <div className="flex items-center space-x-2 self-start md:self-auto flex-wrap gap-y-1.5">
              <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-1.5 flex items-center space-x-1 shadow-sm">
                <span className="text-[10px] text-slate-400 px-1 font-semibold flex items-center space-x-1">
                  <History className="w-3 h-3 text-amber-400" />
                  <span>AY:</span>
                </span>
                {(['2026-27', '2025-26', '2024-25'] as AssessmentYear[]).map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => handleYearChange(y)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                      profile.assessmentYear === y
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>

              <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-center shadow-sm">
                <span className="text-[10px] text-slate-400 block font-medium">Standard Deduction</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">
                  ₹{income.standardDeductionNew.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step Progress Bar (Responsive 360px S23 to 4K) */}
        <div className="mb-4 sm:mb-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-2 sm:p-3 shadow-md">
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = activeStep === s.id;
              const isDone = activeStep > s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStep(s.id)}
                  className={`flex items-center space-x-2 sm:space-x-3 p-2 sm:p-2.5 rounded-xl transition-all text-left ${
                    isActive
                      ? 'bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 shadow-sm'
                      : isDone
                      ? 'bg-slate-800/40 text-slate-300 hover:bg-slate-800/70 border border-transparent'
                      : 'text-slate-500 hover:bg-slate-800/30 border border-transparent'
                  }`}
                >
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold transition-transform ${
                      isActive
                        ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/25 scale-105'
                        : isDone
                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800/80 text-slate-500'
                    }`}
                  >
                    {isDone ? '✓' : s.id}
                  </div>
                  <div className="hidden xs:block truncate">
                    <div className={`text-xs font-bold leading-tight truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                      {s.label}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight hidden sm:block mt-0.5">{s.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic 2-Column Responsive View (Left Wizard, Right Live Ledger) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 flex-1 items-start">
          
          {/* Active Wizard Step (Left/Main Column) */}
          <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
            {activeStep === 1 && (
              <Step1Identity
                profile={profile}
                onChange={(up) => setProfile((p) => ({ ...p, ...up }))}
                onNext={() => setActiveStep(2)}
              />
            )}
            {activeStep === 2 && (
              <Step2Income
                income={income}
                profile={profile}
                onChange={(up) => setIncome((i) => ({ ...i, ...up }))}
                onNext={() => setActiveStep(3)}
                onPrev={() => setActiveStep(1)}
              />
            )}
            {activeStep === 3 && (
              <Step3Deductions
                deductions={deductions}
                income={income}
                onChange={(up) => setDeductions((d) => ({ ...d, ...up }))}
                onNext={() => setActiveStep(4)}
                onPrev={() => setActiveStep(2)}
              />
            )}
            {activeStep === 4 && (
              <Step4Regime
                regime={regimeComparison}
                profile={profile}
                income={income}
                deductions={deductions}
                onPrev={() => setActiveStep(3)}
                onOpenApproval={() => setIsApprovalOpen(true)}
              />
            )}
          </div>

          {/* Right Column: Live Tax Ledger Summary Card */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl sticky top-16">
              
              {/* Ledger Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">Live Tax Summary</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  {regimeComparison.recommended} Regime Optimal
                </span>
              </div>

              {/* Net Savings Callout */}
              <div className="mt-3 bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/40 rounded-xl p-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-emerald-300 font-semibold block">Maximum Tax Savings</span>
                  <span className="text-[10px] font-mono text-slate-400">AY {profile.assessmentYear}</span>
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-2xl font-black text-white font-mono">
                    ₹{regimeComparison.savingsAmount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded font-extrabold uppercase">
                    Guaranteed
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Comparing Sec 115BAC New vs. Old Regime with Chapter VI-A deductions.
                </p>
              </div>

              {/* Ledger Rows */}
              <div className="py-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Salary Income</span>
                  <span className="font-mono text-slate-200 font-medium">
                    ₹{income.grossSalary.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Standard Deduction (Sec 16ia)</span>
                  <span className="font-mono text-emerald-400 font-medium">
                    -₹{income.standardDeductionNew.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Other Income (Savings &amp; FD)</span>
                  <span className="font-mono text-slate-200">
                    +₹{(income.savingsInterest + income.fdInterest).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between text-slate-400 pt-1.5 border-t border-slate-800/80">
                  <span className="font-semibold text-slate-200">Net Taxable Income</span>
                  <span className="font-mono font-bold text-white">
                    ₹{regimeComparison.newRegime.taxableIncome.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Tax Payable (New Regime)</span>
                  <span className="font-mono text-emerald-300 font-semibold">
                    ₹{regimeComparison.newRegime.totalTaxPayable.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Tax Payable (Old Regime)</span>
                  <span className="font-mono text-slate-400">
                    ₹{regimeComparison.oldRegime.totalTaxPayable.toLocaleString('en-IN')}
                  </span>
                </div>

                {regimeComparison.itrUAdditionalTax && regimeComparison.itrUAdditionalTax > 0 ? (
                  <div className="flex justify-between text-amber-300 font-semibold pt-1 border-t border-slate-800/60">
                    <span>Sec 140B ITR-U Addl. Tax</span>
                    <span className="font-mono">+₹{regimeComparison.itrUAdditionalTax.toLocaleString('en-IN')}</span>
                  </div>
                ) : null}
              </div>

              {/* Direct e-Filing CTA Button from Summary Terminal */}
              <button
                onClick={() => {
                  if (activeStep < 4) {
                    setActiveStep(4);
                  } else {
                    setIsApprovalOpen(true);
                  }
                }}
                className="w-full mt-2 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <span>{activeStep < 4 ? 'Review & Compare Regimes' : `e-Verify & Transmit (AY ${profile.assessmentYear})`}</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Direct Link to Ask Gemini */}
              <button
                onClick={() => setIsAiOpen(true)}
                className="w-full mt-2 py-2 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 text-slate-300 text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Ask Gemini AI Copilot</span>
              </button>
            </div>
          </div>

        </div>

      </main>

      {/* Mobile Sticky Quick Summary & Action Bar (Samsung S23 & Mobile Viewports) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 sm:hidden bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 px-3.5 py-2.5 flex items-center justify-between shadow-2xl">
        <div className="flex flex-col">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">AY {profile.assessmentYear}:</span>
            <span className="font-mono text-sm font-bold text-white">
              ₹{regimeComparison.newRegime.totalTaxPayable.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center space-x-1 text-[10px] text-emerald-400 font-medium">
            <span>{regimeComparison.recommended} Regime</span>
            <span>•</span>
            <span>Save ₹{regimeComparison.savingsAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {activeStep < 4 ? (
            <button
              onClick={() => setActiveStep((s) => Math.min(4, s + 1))}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-1 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <span>Step {activeStep + 1}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setIsApprovalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-1 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <span>File Now</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Action Button for Gemini Copilot on Mobile */}
      <button
        onClick={() => setIsAiOpen(true)}
        className="fixed bottom-16 right-3.5 z-40 sm:hidden w-11 h-11 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-2xl flex items-center justify-center shadow-emerald-500/30 active:scale-95 transition-all border border-emerald-300/30"
        title="Open Chrome Gemini AI"
      >
        <Sparkles className="w-5 h-5 text-amber-300" />
      </button>

      {/* Chrome Gemini AI Copilot Drawer */}
      <AiCopilot
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        profile={profile}
        income={income}
        deductions={deductions}
        regime={regimeComparison}
      />

      {/* Statutory Final Approval Modal */}
      <FinalApprovalModal
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        profile={profile}
        regime={regimeComparison}
        income={income}
      />
    </div>
  );
}
