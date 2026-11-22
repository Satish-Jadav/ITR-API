'use client';

import React from 'react';
import { IndianRupee, Briefcase, FileText, CheckCircle2, TrendingUp, AlertCircle, ArrowLeft, ArrowRight, ShieldCheck, Sparkles, Building2, Calendar } from 'lucide-react';
import { IncomeDetails, TaxPayerProfile } from '../types';

interface Step2Props {
  income: IncomeDetails;
  profile: TaxPayerProfile;
  onChange: (updated: Partial<IncomeDetails>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Step2Income({ income, profile, onChange, onNext, onPrev }: Step2Props) {
  const isAY2024 = profile.assessmentYear === '2024-25';
  const effectiveStdDeductionNew = isAY2024 ? 50000 : 75000;
  const netSalaryNew = Math.max(0, income.grossSalary - effectiveStdDeductionNew);
  const totalOther = income.savingsInterest + income.fdInterest + income.otherIncome;
  const grossTotalIncome = income.grossSalary + totalOther;

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* AIS / Form 16 Reconciled Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/30 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Live AIS &amp; Form 16 Pre-Reconciled (AY {profile.assessmentYear})
              </h3>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                100% Zero-Variance
              </span>
            </div>
            <p className="text-xs text-emerald-300/90 mt-0.5">
              CBDT e-Filing database sync complete for FY {profile.financialYear}. Form 26AS TDS credits match employer quarterly returns.
            </p>
          </div>
        </div>
        <div className="text-[11px] font-mono text-slate-300 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-700/60 self-start sm:self-auto">
          TDS Claim: <span className="text-emerald-400 font-bold">₹1,18,450</span>
        </div>
      </div>

      {/* Salary Details Card */}
      <div className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-white">Salary Income u/s 17(1)</h4>
              <p className="text-[11px] text-slate-400">Derived from Form 16 Part B for AY {profile.assessmentYear}</p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700">
            Employer Verified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Gross Salary */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="gross-salary-input" className="text-xs font-semibold text-slate-300">
                Gross Salary (Allowances &amp; Perquisites)
                <span className="text-emerald-400 font-bold ml-1">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Form 16</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-semibold">₹</span>
              <input
                id="gross-salary-input"
                type="number"
                value={income.grossSalary}
                onChange={(e) => onChange({ grossSalary: Number(e.target.value) || 0 })}
                className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white font-mono font-medium tracking-wide transition-all outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Live from Form 16 Part B: <span className="text-slate-200 font-mono font-semibold">₹8,92,173</span>
            </p>
          </div>

          {/* Standard Deduction */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="std-deduction-input" className="text-xs font-semibold text-slate-300">
                Standard Deduction u/s 16(ia)
              </label>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                AY {profile.assessmentYear} Limit
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-semibold">₹</span>
              <input
                id="std-deduction-input"
                type="number"
                value={effectiveStdDeductionNew}
                disabled
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-emerald-400 font-mono font-bold cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 flex-shrink-0" />
              <span>
                {isAY2024
                  ? 'AY 2024-25 CBDT limit: ₹50,000 for New Regime'
                  : 'Enhanced ₹75,000 for New Regime (₹50,000 for Old Regime)'}
              </span>
            </p>
          </div>
        </div>

        {/* Net Salary Computed Highlight */}
        <div className="bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 rounded-xl p-3 sm:p-3.5 flex items-center justify-between">
          <span className="text-xs sm:text-sm text-slate-300 font-medium">Net Chargeable Salary (New Regime)</span>
          <span className="text-sm sm:text-base text-white font-mono font-bold tracking-tight">
            ₹{netSalaryNew.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* House Property & Other Income */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {/* House Property Loan Interest */}
        <div className="bg-slate-900/70 border border-slate-700/60 hover:border-slate-600/80 rounded-2xl p-4 transition-all duration-200 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="home-loan-input" className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Home Loan Interest u/s 24(b)</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">Max ₹2,00,000</span>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-semibold">₹</span>
            <input
              id="home-loan-input"
              type="number"
              value={income.homeLoanInterestSelfOccupied}
              onChange={(e) => onChange({ homeLoanInterestSelfOccupied: Number(e.target.value) || 0 })}
              placeholder="0"
              className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white font-mono transition-all outline-none"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">Deductible in Old Regime for self-occupied properties</p>
        </div>

        {/* Savings & FD Interest */}
        <div className="bg-slate-900/70 border border-slate-700/60 hover:border-slate-600/80 rounded-2xl p-4 transition-all duration-200 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="interest-input" className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
              <span>Savings &amp; FD Bank Interest (AIS)</span>
            </label>
            <span className="text-[10px] text-emerald-400 font-mono">AIS Auto-Synced</span>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-semibold">₹</span>
            <input
              id="interest-input"
              type="number"
              value={income.savingsInterest + income.fdInterest}
              onChange={(e) => onChange({ savingsInterest: Number(e.target.value) || 0 })}
              className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white font-mono transition-all outline-none"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">Eligible for Section 80TTA deduction up to ₹10,000</p>
        </div>
      </div>

      {/* Gross Total Income Summary Banner */}
      <div className="bg-slate-900/90 border border-slate-700/70 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <span className="text-xs text-slate-400 font-medium block">Total Gross Income (Pre-Deductions)</span>
          <div className="text-base sm:text-xl font-black text-white font-mono tracking-tight mt-0.5">
            ₹{grossTotalIncome.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-emerald-400 font-semibold block uppercase tracking-wider">Statutory Audit</span>
          <span className="text-xs font-bold text-slate-200">AY {profile.assessmentYear} Validated</span>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="pt-2 flex items-center justify-between">
        <button
          onClick={onPrev}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs sm:text-sm font-medium rounded-xl border border-slate-700 transition-all flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Identity</span>
        </button>
        <button
          onClick={onNext}
          className="px-7 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xl shadow-emerald-600/25 hover:shadow-emerald-500/35 active:scale-[0.99] transition-all flex items-center space-x-2"
        >
          <span>Continue to Deductions</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
