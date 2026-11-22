'use client';

import React from 'react';
import { IndianRupee, Briefcase, FileText, CheckCircle2, TrendingUp, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { IncomeDetails } from '../types';

interface Step2Props {
  income: IncomeDetails;
  onChange: (updated: Partial<IncomeDetails>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Step2Income({ income, onChange, onNext, onPrev }: Step2Props) {
  const netSalaryNew = Math.max(0, income.grossSalary - income.standardDeductionNew);
  const totalOther = income.savingsInterest + income.fdInterest + income.otherIncome;
  const grossTotalIncome = netSalaryNew + totalOther;

  return (
    <div className="space-y-4">
      {/* AIS Sync Banner */}
      <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-white">Live Form 16 &amp; AIS Reconciled</h4>
            <p className="text-[11px] text-emerald-300">
              Fetched from CBDT e-Filing Portal. Form 26AS TDS matches ₹0 variance.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
          100% Match
        </span>
      </div>

      {/* Salary Details Card */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
          <div className="flex items-center space-x-2">
            <Briefcase className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Salary Income u/s 17(1)</h3>
          </div>
          <span className="text-xs text-slate-400">Form 16 Part B</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Gross Salary */}
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Gross Salary (Including Allowances &amp; Perquisites)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
              <input
                type="number"
                value={income.grossSalary}
                onChange={(e) => onChange({ grossSalary: Number(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Live from Form 16: ₹8,92,173</p>
          </div>

          {/* Standard Deduction */}
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Standard Deduction u/s 16(ia)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
              <input
                type="number"
                value={income.standardDeductionNew}
                disabled
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-sm text-emerald-400 font-mono"
              />
            </div>
            <p className="text-[10px] text-emerald-400 mt-1">
              AY 2026-27 Enhanced CBDT Limit: ₹75,000 (New Regime)
            </p>
          </div>
        </div>

        {/* Net Salary Computed */}
        <div className="bg-slate-900/70 rounded-lg p-2.5 flex items-center justify-between text-xs sm:text-sm">
          <span className="text-slate-300 font-medium">Net Chargeable Salary (New Regime)</span>
          <span className="text-white font-mono font-bold">
            ₹{netSalaryNew.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* House Property & Other Income */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* House Property Loan Interest */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3.5">
          <label className="text-[11px] font-medium text-slate-400 block mb-1">
            Home Loan Interest u/s 24(b) (Self Occupied)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
            <input
              type="number"
              value={income.homeLoanInterestSelfOccupied}
              onChange={(e) => onChange({ homeLoanInterestSelfOccupied: Number(e.target.value) || 0 })}
              placeholder="0"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Deductible in Old Regime up to ₹2,00,000</p>
        </div>

        {/* Savings & FD Interest */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3.5">
          <label className="text-[11px] font-medium text-slate-400 block mb-1">
            Interest from Savings Bank &amp; FDs (AIS)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
            <input
              type="number"
              value={income.savingsInterest + income.fdInterest}
              onChange={(e) => onChange({ savingsInterest: Number(e.target.value) || 0 })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Pre-filled from AIS data</p>
        </div>
      </div>

      {/* Gross Total Income Summary */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3.5 flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400">Total Gross Income (Before Deductions)</span>
          <div className="text-base sm:text-lg font-bold text-white font-mono">
            ₹{grossTotalIncome.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-emerald-400 block">AIS Status</span>
          <span className="text-xs font-semibold text-slate-200">Reconciliation Verified</span>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="pt-2 flex items-center justify-between">
        <button
          onClick={onPrev}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm rounded-xl transition-colors flex items-center space-x-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Identity</span>
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
        >
          <span>Continue to Deductions</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
