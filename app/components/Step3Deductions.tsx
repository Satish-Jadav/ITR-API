'use client';

import React from 'react';
import { Info, ArrowLeft, ArrowRight, ShieldCheck, Sparkles, HeartPulse, PiggyBank, Layers } from 'lucide-react';
import { DeductionsDetails, IncomeDetails } from '../types';

interface Step3Props {
  deductions: DeductionsDetails;
  income: IncomeDetails;
  onChange: (updated: Partial<DeductionsDetails>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Step3Deductions({ deductions, income, onChange, onNext, onPrev }: Step3Props) {
  const total80C = Math.min(150000, deductions.sec80C);
  const total80D = Math.min(25000, deductions.sec80D_Self) + Math.min(50000, deductions.sec80D_Parents);
  const total80CCD1B = Math.min(50000, deductions.sec80CCD_1B);
  const totalDeductionsOld = total80C + total80D + total80CCD1B + deductions.sec80CCD_2 + Math.min(10000, deductions.sec80TTA);

  // Maximum potential under standard provisions
  const maxPossible = 150000 + 75000 + 50000 + 10000;
  const utilizedPercent = Math.min(100, Math.round((totalDeductionsOld / maxPossible) * 100));

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* Chapter VI-A Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-teal-950/40 border border-slate-700/70 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
                <span>Chapter VI-A Deductions &amp; Tax Optimizations</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold">
                Tax-Saver Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Maximize your statutory deductions. Our CA engine tests these dynamically across both tax regimes.
            </p>
          </div>
          <div className="text-left sm:text-right bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Total Claimed (Old Regime)</span>
            <span className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
              ₹{totalDeductionsOld.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Deduction Utilization Progress Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Deduction Potential Utilized</span>
            </span>
            <span className="font-mono text-slate-300">
              {utilizedPercent}% (₹{totalDeductionsOld.toLocaleString('en-IN')} / ₹{maxPossible.toLocaleString('en-IN')})
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-emerald-300 rounded-full transition-all duration-500"
              style={{ width: `${utilizedPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Deductions Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        
        {/* Section 80C */}
        <div className="bg-slate-900/70 border border-slate-700/60 hover:border-slate-600/80 rounded-2xl p-4 transition-all duration-200 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="sec-80c-input" className="text-xs font-semibold text-white flex items-center space-x-1.5">
              <PiggyBank className="w-3.5 h-3.5 text-emerald-400" />
              <span>Section 80C</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">
              Max ₹1,50,000
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2.5">EPF, PPF, ELSS, Life Insurance, Housing Loan Principal</p>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-semibold">₹</span>
            <input
              id="sec-80c-input"
              type="number"
              value={deductions.sec80C}
              onChange={(e) => onChange({ sec80C: Number(e.target.value) || 0 })}
              className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white font-mono transition-all outline-none"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">Allowed exclusively under Old Tax Regime</p>
        </div>

        {/* Section 80D - Health Insurance */}
        <div className="bg-slate-900/70 border border-slate-700/60 hover:border-slate-600/80 rounded-2xl p-4 transition-all duration-200 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-white flex items-center space-x-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
              <span>Section 80D (Mediclaim)</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">
              Max ₹25k + ₹50k
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2.5">Self/Family &amp; Senior Citizen Parents Health Insurance</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-semibold">₹</span>
              <input
                id="sec-80d-self"
                aria-label="Section 80D Self and Family"
                type="number"
                placeholder="Self (₹25k)"
                value={deductions.sec80D_Self}
                onChange={(e) => onChange({ sec80D_Self: Number(e.target.value) || 0 })}
                className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-7 pr-2.5 py-2.5 text-xs sm:text-sm text-white font-mono transition-all outline-none"
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-semibold">₹</span>
              <input
                id="sec-80d-parents"
                aria-label="Section 80D Parents"
                type="number"
                placeholder="Parents (₹50k)"
                value={deductions.sec80D_Parents}
                onChange={(e) => onChange({ sec80D_Parents: Number(e.target.value) || 0 })}
                className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-7 pr-2.5 py-2.5 text-xs sm:text-sm text-white font-mono transition-all outline-none"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">Includes ₹5,000 preventive health checkup</p>
        </div>

        {/* Section 80CCD(1B) - NPS Additional */}
        <div className="bg-slate-900/70 border border-slate-700/60 hover:border-slate-600/80 rounded-2xl p-4 transition-all duration-200 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="sec-80ccd1b-input" className="text-xs font-semibold text-white flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              <span>Section 80CCD(1B) (NPS)</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">
              Max ₹50,000
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2.5">Exclusive additional deduction over and above Section 80C</p>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-semibold">₹</span>
            <input
              id="sec-80ccd1b-input"
              type="number"
              value={deductions.sec80CCD_1B}
              onChange={(e) => onChange({ sec80CCD_1B: Number(e.target.value) || 0 })}
              className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white font-mono transition-all outline-none"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">Tier-1 NPS self-contribution</p>
        </div>

        {/* Section 80CCD(2) - Employer NPS (Allowed in New Regime too!) */}
        <div className="bg-slate-900/70 border border-slate-700/60 hover:border-slate-600/80 rounded-2xl p-4 transition-all duration-200 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="sec-80ccd2-input" className="text-xs font-semibold text-white flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Section 80CCD(2) Employer NPS</span>
            </label>
            <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold border border-emerald-500/30">
              Both Regimes
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2.5">Employer contribution (deductible even in the New Regime up to 14%)</p>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-semibold">₹</span>
            <input
              id="sec-80ccd2-input"
              type="number"
              value={deductions.sec80CCD_2}
              onChange={(e) => onChange({ sec80CCD_2: Number(e.target.value) || 0 })}
              className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white font-mono transition-all outline-none"
            />
          </div>
          <p className="text-[10px] text-emerald-400 mt-1.5">Zero-leakage corporate tax shielding benefit</p>
        </div>
      </div>

      {/* Statutory Tip */}
      <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 flex items-start space-x-3 text-xs text-slate-300 shadow-md">
        <Info className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-white">CBDT Rule 1962 (AY 2026-27):</strong> The Standard Deduction of <strong className="text-emerald-400 font-mono">₹75,000</strong> is unconditionally credited in the New Regime without requiring investment proofs. Let us run the dual-regime comparative analysis.
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="pt-2 flex items-center justify-between">
        <button
          onClick={onPrev}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs sm:text-sm font-medium rounded-xl border border-slate-700 transition-all flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Income</span>
        </button>
        <button
          onClick={onNext}
          className="px-7 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xl shadow-emerald-600/25 hover:shadow-emerald-500/35 active:scale-[0.99] transition-all flex items-center space-x-2"
        >
          <span>Calculate Regime Showdown</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
