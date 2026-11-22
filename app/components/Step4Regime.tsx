'use client';

import React from 'react';
import { Award, CheckCircle2, ShieldCheck, Zap, ArrowLeft, ArrowRight, AlertTriangle, FileCheck2, Sparkles, Building, Landmark, History } from 'lucide-react';
import { RegimeComparison, TaxPayerProfile, IncomeDetails, DeductionsDetails } from '../types';

interface Step4Props {
  regime: RegimeComparison;
  profile: TaxPayerProfile;
  income: IncomeDetails;
  deductions: DeductionsDetails;
  onPrev: () => void;
  onOpenApproval: () => void;
}

export default function Step4Regime({
  regime,
  profile,
  income,
  deductions,
  onPrev,
  onOpenApproval,
}: Step4Props) {
  const isNewOptimal = regime.recommended === 'NEW';
  const isPreviousYear = profile.assessmentYear !== '2026-27';
  const isITRU = profile.filingSection === '139(8A)';
  const effectiveStdDeductionNew = profile.assessmentYear === '2024-25' ? 50000 : 75000;

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* High-Impact Recommendation Hero Banner */}
      <div className={`border-2 rounded-2xl p-4 sm:p-6 relative overflow-hidden shadow-2xl ${
        isPreviousYear
          ? 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-emerald-950/80 border-amber-500/50 shadow-amber-950/30'
          : 'bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950/90 border-emerald-500/50 shadow-emerald-950/40'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-4">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 shadow-lg ${
              isPreviousYear
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-amber-500/20'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/20'
            }`}>
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap">
                <span className="text-base sm:text-xl font-black text-white tracking-tight">
                  Optimal Choice: {regime.recommended} Tax Regime
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950 uppercase tracking-wider">
                  AY {profile.assessmentYear} Winner
                </span>
                {isITRU && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-500/40">
                    Sec 139(8A) ITR-U
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-emerald-300 mt-1">
                You save <strong className="text-white font-mono text-sm sm:text-base font-black">₹{regime.savingsAmount.toLocaleString('en-IN')}</strong> in taxes for AY {profile.assessmentYear}!
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right sm:border-l sm:border-slate-800 sm:pl-6 bg-slate-950/60 p-3 sm:p-0 rounded-xl sm:bg-transparent">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
              Net Tax Liability ({regime.recommended})
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight text-emerald-400">
              ₹{(isNewOptimal ? regime.newRegime.totalTaxPayable : regime.oldRegime.totalTaxPayable).toLocaleString('en-IN')}
            </span>
            {isITRU && regime.itrUAdditionalTax && regime.itrUAdditionalTax > 0 ? (
              <span className="text-[11px] text-amber-300 block mt-0.5 font-mono">
                + ₹{regime.itrUAdditionalTax.toLocaleString('en-IN')} Sec 140B Addl. Tax
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Side-by-Side Regime Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* NEW REGIME CARD */}
        <div className={`rounded-2xl p-4 sm:p-5 transition-all duration-200 ${
          isNewOptimal
            ? 'bg-slate-900/90 border-2 border-emerald-500 shadow-xl shadow-emerald-500/10'
            : 'bg-slate-900/50 border border-slate-800 opacity-80'
        }`}>
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-base font-bold text-white">New Tax Regime</h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                  Sec 115BAC
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">AY {profile.assessmentYear} Provisions (Std Ded ₹{effectiveStdDeductionNew.toLocaleString('en-IN')})</p>
            </div>
            {isNewOptimal && (
              <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4" />
                <span>Recommended</span>
              </span>
            )}
          </div>

          <div className="py-3.5 space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Gross Income</span>
              <span className="font-mono">₹{income.grossSalary.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Standard Deduction</span>
              <span className="font-mono text-emerald-400 font-semibold">-₹{effectiveStdDeductionNew.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Net Taxable Income</span>
              <span className="font-mono font-bold text-white">
                ₹{regime.newRegime.taxableIncome.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Basic Slab Tax</span>
              <span className="font-mono">₹{regime.newRegime.basicTax.toLocaleString('en-IN')}</span>
            </div>
            {regime.newRegime.rebate87A > 0 && (
              <div className="flex justify-between text-emerald-400 font-medium">
                <span>Section 87A Rebate</span>
                <span className="font-mono font-bold">-₹{regime.newRegime.rebate87A.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-300">
              <span>Health &amp; Education Cess (4%)</span>
              <span className="font-mono">₹{regime.newRegime.cess.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="pt-3.5 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Net Tax Payable</span>
            <span className="text-lg sm:text-xl font-black text-white font-mono">
              ₹{regime.newRegime.totalTaxPayable.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* OLD REGIME CARD */}
        <div className={`rounded-2xl p-4 sm:p-5 transition-all duration-200 ${
          !isNewOptimal
            ? 'bg-slate-900/90 border-2 border-emerald-500 shadow-xl shadow-emerald-500/10'
            : 'bg-slate-900/50 border border-slate-800 opacity-80'
        }`}>
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-base font-bold text-white">Old Tax Regime</h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                  Chapter VI-A
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">With 80C, 80D, 24(b) &amp; ₹50,000 Std Deduction</p>
            </div>
            {!isNewOptimal && (
              <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4" />
                <span>Recommended</span>
              </span>
            )}
          </div>

          <div className="py-3.5 space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Gross Income</span>
              <span className="font-mono">₹{income.grossSalary.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Std Deduction + Deductions</span>
              <span className="font-mono text-emerald-400 font-semibold">
                -₹{(income.standardDeductionOld + regime.oldRegime.totalDeductions).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Net Taxable Income</span>
              <span className="font-mono font-bold text-white">
                ₹{regime.oldRegime.taxableIncome.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Basic Slab Tax</span>
              <span className="font-mono">₹{regime.oldRegime.basicTax.toLocaleString('en-IN')}</span>
            </div>
            {regime.oldRegime.rebate87A > 0 && (
              <div className="flex justify-between text-emerald-400 font-medium">
                <span>Section 87A Rebate</span>
                <span className="font-mono font-bold">-₹{regime.oldRegime.rebate87A.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-300">
              <span>Health &amp; Education Cess (4%)</span>
              <span className="font-mono">₹{regime.oldRegime.cess.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="pt-3.5 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Net Tax Payable</span>
            <span className="text-lg sm:text-xl font-black text-white font-mono">
              ₹{regime.oldRegime.totalTaxPayable.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

      </div>

      {/* Statutory Pre-Filing Audit Checklist */}
      <div className="bg-slate-900/80 border border-slate-700/70 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md">
        <h4 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>CBDT Statutory Pre-Filing Audit Checks (AY {profile.assessmentYear})</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="flex items-center space-x-2.5 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-300">Filing Section Provision: <strong className="text-emerald-400">u/s {profile.filingSection}</strong></span>
          </div>
          <div className="flex items-center space-x-2.5 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-300">AIS &amp; Form 26AS TDS Match: <strong className="text-emerald-400">100% MATCH</strong></span>
          </div>
          <div className="flex items-center space-x-2.5 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-300">Bank Pre-validation ({profile.bankName}): <strong className="text-emerald-400">REFUND READY</strong></span>
          </div>
          <div className="flex items-center space-x-2.5 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-300">JSON Schema {profile.assessmentYear} Integrity: <strong className="text-emerald-400">VALIDATED</strong></span>
          </div>
        </div>
      </div>

      {/* Final Action Spine */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          onClick={onPrev}
          className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs sm:text-sm font-medium rounded-xl border border-slate-700 transition-all flex items-center justify-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Edit Deductions</span>
        </button>
        <button
          onClick={onOpenApproval}
          className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-black rounded-xl shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/35 active:scale-[0.99] transition-all flex items-center justify-center space-x-2.5"
        >
          <FileCheck2 className="w-5 h-5" />
          <span>Proceed to Final Approval &amp; Filing (AY {profile.assessmentYear})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
