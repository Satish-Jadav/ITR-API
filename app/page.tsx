'use client';

import React, { useState, useMemo } from 'react';
import Header from './components/Header';
import Step1Identity from './components/Step1Identity';
import Step2Income from './components/Step2Income';
import Step3Deductions from './components/Step3Deductions';
import Step4Regime from './components/Step4Regime';
import AiCopilot from './components/AiCopilot';
import FinalApprovalModal from './components/FinalApprovalModal';
import { TaxPayerProfile, IncomeDetails, DeductionsDetails } from './types';
import { calculateTaxes } from './utils/taxCalculator';
import { User, FileText, PiggyBank, Scale, Sparkles, Shield, ChevronRight } from 'lucide-react';

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

  // Live Statutory Tax Calculation Engine
  const regimeComparison = useMemo(() => {
    return calculateTaxes(income, deductions);
  }, [income, deductions]);

  const steps = [
    { id: 1, label: 'Identity', icon: User, desc: 'PAN & Bank' },
    { id: 2, label: 'Income', icon: FileText, desc: 'Form 16 / AIS' },
    { id: 3, label: 'Deductions', icon: PiggyBank, desc: '80C & 80D' },
    { id: 4, label: 'Regime', icon: Scale, desc: 'Showdown & File' },
  ];

  const handleResetData = () => {
    setIncome({
      grossSalary: 892173,
      allowancesExempt: 0,
      standardDeductionNew: 75000,
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

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. Header Navigation */}
      <Header
        profile={profile}
        activeStep={activeStep}
        onOpenAi={() => setIsAiOpen(true)}
        onResetData={handleResetData}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-6 lg:p-8 pb-24 sm:pb-8 flex flex-col">
        
        {/* Step Progress Bar (Responsive 360px S23 to 4K) */}
        <div className="mb-4 sm:mb-6 bg-slate-900/80 border border-slate-800/80 rounded-xl p-2 sm:p-3">
          <div className="grid grid-cols-4 gap-1 sm:gap-2">
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = activeStep === s.id;
              const isDone = activeStep > s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStep(s.id)}
                  className={`flex items-center space-x-1.5 sm:space-x-2.5 p-1.5 sm:p-2 rounded-lg transition-all text-left ${
                    isActive
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                      : isDone
                      ? 'text-slate-300 hover:bg-slate-800/60'
                      : 'text-slate-500 hover:bg-slate-800/30'
                  }`}
                >
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : isDone
                        ? 'bg-slate-700 text-slate-200'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isDone ? '✓' : s.id}
                  </div>
                  <div className="hidden xs:block truncate">
                    <div className="text-xs font-semibold leading-tight truncate">{s.label}</div>
                    <div className="text-[10px] text-slate-400 leading-tight hidden sm:block">{s.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic 2-Column Responsive View (Left Wizard, Right Live Ledger) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 flex-1 items-start">
          
          {/* Active Wizard Step (Left/Main Column) */}
          <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-6 shadow-xl">
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
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {regimeComparison.recommended} Regime
                </span>
              </div>

              {/* Ledger Rows */}
              <div className="py-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Salary</span>
                  <span className="font-mono text-slate-200">
                    ₹{income.grossSalary.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Standard Deduction</span>
                  <span className="font-mono text-emerald-400">
                    -₹{income.standardDeductionNew.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Other Income (AIS)</span>
                  <span className="font-mono text-slate-200">
                    +₹{(income.savingsInterest + income.fdInterest).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Taxable Income</span>
                  <span className="font-mono font-bold text-white">
                    ₹{regimeComparison.newRegime.taxableIncome.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>New Regime Tax</span>
                  <span className="font-mono text-slate-200">
                    ₹{regimeComparison.newRegime.totalTaxPayable.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Old Regime Tax</span>
                  <span className="font-mono text-slate-200">
                    ₹{regimeComparison.oldRegime.totalTaxPayable.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Savings Highlight */}
              <div className="bg-emerald-950/60 border border-emerald-800/60 rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-medium">Net Regime Savings</span>
                <span className="text-emerald-400 font-bold font-mono text-sm">
                  ₹{regimeComparison.savingsAmount.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Direct Link to Ask Gemini */}
              <button
                onClick={() => setIsAiOpen(true)}
                className="w-full mt-3 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Ask Gemini Copilot About This</span>
              </button>
            </div>
          </div>

        </div>

      </main>

      {/* Mobile Sticky Quick Summary & Action Bar (Samsung S23 & Mobile Viewports) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 sm:hidden bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 px-3.5 py-2.5 flex items-center justify-between shadow-2xl">
        <div className="flex flex-col">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Tax Payable:</span>
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
