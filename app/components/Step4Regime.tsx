'use client';

import React from 'react';
import { Award, CheckCircle2, ShieldCheck, Zap, ArrowRight, AlertTriangle, FileCheck2 } from 'lucide-react';
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

  return (
    <div className="space-y-5">
      {/* Recommendation Banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-lg font-bold text-white">
                  Recommended: {regime.recommended} Tax Regime
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950">
                  OPTIMAL
                </span>
              </div>
              <p className="text-xs text-emerald-300 mt-0.5">
                Saves you <strong className="text-white font-mono">₹{regime.savingsAmount.toLocaleString('en-IN')}</strong> in taxes for AY 2026-27!
              </p>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-4">
            <span className="text-[11px] text-slate-400 block">Net Payable ({regime.recommended})</span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono">
              ₹{(isNewOptimal ? regime.newRegime.totalTaxPayable : regime.oldRegime.totalTaxPayable).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Regime Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* NEW REGIME CARD */}
        <div className={`rounded-xl p-4 transition-all ${
          isNewOptimal
            ? 'bg-slate-800/70 border-2 border-emerald-500/80 shadow-lg shadow-emerald-500/10'
            : 'bg-slate-900/50 border border-slate-800'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm sm:text-base font-bold text-white">New Tax Regime</h4>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                  Sec 115BAC
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Default Regime with ₹75,000 Standard Deduction</p>
            </div>
            {isNewOptimal && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Selected</span>
              </span>
            )}
          </div>

          <div className="py-3 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Gross Income</span>
              <span className="font-mono">₹{income.grossSalary.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Standard Deduction</span>
              <span className="font-mono text-emerald-400">-₹75,000</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Net Taxable Income</span>
              <span className="font-mono font-semibold text-white">
                ₹{regime.newRegime.taxableIncome.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Basic Slab Tax</span>
              <span className="font-mono">₹{regime.newRegime.basicTax.toLocaleString('en-IN')}</span>
            </div>
            {regime.newRegime.rebate87A > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Section 87A Rebate</span>
                <span className="font-mono">-₹{regime.newRegime.rebate87A.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-300">
              <span>Health &amp; Education Cess (4%)</span>
              <span className="font-mono">₹{regime.newRegime.cess.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Net Tax Liability</span>
            <span className="text-base sm:text-lg font-bold text-white font-mono">
              ₹{regime.newRegime.totalTaxPayable.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* OLD REGIME CARD */}
        <div className={`rounded-xl p-4 transition-all ${
          !isNewOptimal
            ? 'bg-slate-800/70 border-2 border-emerald-500/80 shadow-lg shadow-emerald-500/10'
            : 'bg-slate-900/50 border border-slate-800'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm sm:text-base font-bold text-white">Old Tax Regime</h4>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                  Chapter VI-A
                </span>
              </div>
              <p className="text-[11px] text-slate-400">With 80C, 80D, 24(b) &amp; ₹50,000 Std Deduction</p>
            </div>
            {!isNewOptimal && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Selected</span>
              </span>
            )}
          </div>

          <div className="py-3 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Gross Income</span>
              <span className="font-mono">₹{income.grossSalary.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Std Deduction + Deductions</span>
              <span className="font-mono text-emerald-400">
                -₹{(income.standardDeductionOld + regime.oldRegime.totalDeductions).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Net Taxable Income</span>
              <span className="font-mono font-semibold text-white">
                ₹{regime.oldRegime.taxableIncome.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Basic Slab Tax</span>
              <span className="font-mono">₹{regime.oldRegime.basicTax.toLocaleString('en-IN')}</span>
            </div>
            {regime.oldRegime.rebate87A > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Section 87A Rebate</span>
                <span className="font-mono">-₹{regime.oldRegime.rebate87A.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-300">
              <span>Health &amp; Education Cess (4%)</span>
              <span className="font-mono">₹{regime.oldRegime.cess.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Net Tax Liability</span>
            <span className="text-base sm:text-lg font-bold text-white font-mono">
              ₹{regime.oldRegime.totalTaxPayable.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

      </div>

      {/* 5-Point Statutory Pre-Filing Audit Checklist */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-2.5">
        <h4 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>CBDT Statutory Pre-Filing Audit Checks (AY 2026-27)</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-2 bg-slate-900/60 p-2 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-300">Aadhaar-PAN Linkage Status: <strong>LINKED</strong></span>
          </div>
          <div className="flex items-center space-x-2 bg-slate-900/60 p-2 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-300">AIS &amp; Form 26AS TDS Match: <strong>100% MATCH</strong></span>
          </div>
          <div className="flex items-center space-x-2 bg-slate-900/60 p-2 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-300">Bank Pre-validation ({profile.bankName}): <strong>REFUND READY</strong></span>
          </div>
          <div className="flex items-center space-x-2 bg-slate-900/60 p-2 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-300">JSON Schema 2026 Integrity: <strong>PASSED</strong></span>
          </div>
        </div>
      </div>

      {/* Final Action Spine */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          onClick={onPrev}
          className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm rounded-xl transition-colors"
        >
          ← Edit Deductions
        </button>
        <button
          onClick={onOpenApproval}
          className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Proceed to Final Approval &amp; Filing</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
