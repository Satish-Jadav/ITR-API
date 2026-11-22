'use client';

import React from 'react';
import { Shield, Sparkles, PlusCircle, CheckCircle2, Info, ArrowRight } from 'lucide-react';
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
    <div className="space-y-4">
      {/* Chapter VI-A Overview */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
              <span>Step 3: Chapter VI-A Deductions &amp; Exemptions</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Maximize your eligible tax deductions. We will test these against both Old &amp; New Regimes.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Total Claimed (Old)</span>
            <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono">
              ₹{totalDeductionsOld.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Deduction Utilization Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>Deduction Potential Used</span>
            <span>{utilizedPercent}% (₹{totalDeductionsOld.toLocaleString('en-IN')} / ₹{maxPossible.toLocaleString('en-IN')})</span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${utilizedPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Deductions Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        
        {/* Section 80C */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-white">Section 80C</label>
            <span className="text-[10px] text-slate-400 font-mono">Max ₹1,50,000</span>
          </div>
          <p className="text-[10px] text-slate-400 mb-2">EPF, PPF, ELSS, Life Insurance, Principal Home Loan</p>
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
            <input
              type="number"
              value={deductions.sec80C}
              onChange={(e) => onChange({ sec80C: Number(e.target.value) || 0 })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Section 80D - Health Insurance */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-white">Section 80D (Mediclaim)</label>
            <span className="text-[10px] text-slate-400 font-mono">Max ₹25k (Self) + ₹50k (Parents)</span>
          </div>
          <p className="text-[10px] text-slate-400 mb-2">Self/Family &amp; Senior Citizen Parents Insurance</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-slate-400 text-xs">₹</span>
              <input
                type="number"
                placeholder="Self (₹25k)"
                value={deductions.sec80D_Self}
                onChange={(e) => onChange({ sec80D_Self: Number(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-6 pr-2 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-slate-400 text-xs">₹</span>
              <input
                type="number"
                placeholder="Parents (₹50k)"
                value={deductions.sec80D_Parents}
                onChange={(e) => onChange({ sec80D_Parents: Number(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-6 pr-2 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Section 80CCD(1B) - NPS Additional */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-white">Section 80CCD(1B) (NPS)</label>
            <span className="text-[10px] text-slate-400 font-mono">Max ₹50,000</span>
          </div>
          <p className="text-[10px] text-slate-400 mb-2">Exclusive additional deduction for Tier-1 NPS contribution</p>
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
            <input
              type="number"
              value={deductions.sec80CCD_1B}
              onChange={(e) => onChange({ sec80CCD_1B: Number(e.target.value) || 0 })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Section 80CCD(2) - Employer NPS (Allowed in New Regime too!) */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-white flex items-center space-x-1">
              <span>Section 80CCD(2)</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded">Both Regimes</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">Up to 14% of Basic</span>
          </div>
          <p className="text-[10px] text-slate-400 mb-2">Employer contribution to NPS (deductible even in New Regime)</p>
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
            <input
              type="number"
              value={deductions.sec80CCD_2}
              onChange={(e) => onChange({ sec80CCD_2: Number(e.target.value) || 0 })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Statutory Tip */}
      <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-slate-300">
        <Info className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
        <p>
          <strong>CBDT Rule 1962:</strong> Standard Deduction of <strong>₹75,000</strong> is automatically granted in the New Regime without requiring investment proofs. Let us now compare which regime yields lower tax.
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="pt-2 flex items-center justify-between">
        <button
          onClick={onPrev}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm rounded-xl transition-colors"
        >
          ← Back to Income
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center space-x-1"
        >
          <span>Calculate Regime Showdown</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
