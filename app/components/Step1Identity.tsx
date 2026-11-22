'use client';

import React from 'react';
import { User, ShieldCheck, CheckCircle2, Building, CreditCard, Calendar, Hash, ArrowRight, Sparkles, Lock, BadgeCheck, AlertCircle, History } from 'lucide-react';
import { TaxPayerProfile, AssessmentYear, FilingSection } from '../types';

interface Step1Props {
  profile: TaxPayerProfile;
  onChange: (updated: Partial<TaxPayerProfile>) => void;
  onNext: () => void;
}

export default function Step1Identity({ profile, onChange, onNext }: Step1Props) {
  const isPreviousYear = profile.assessmentYear !== '2026-27';

  const handleYearChange = (year: AssessmentYear) => {
    let defaultSection: FilingSection = '139(1)';
    let finYear = '2025-26';

    if (year === '2025-26') {
      finYear = '2024-25';
      defaultSection = '139(4)'; // Belated or 139(8A)
    } else if (year === '2024-25') {
      finYear = '2023-24';
      defaultSection = '139(8A)'; // Updated return
    }

    onChange({
      assessmentYear: year,
      financialYear: finYear,
      filingSection: defaultSection,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      
      {/* Assessment Year & Statutory Provision Selection Card */}
      <div className={`rounded-2xl p-4 sm:p-5 border transition-all shadow-lg ${
        isPreviousYear
          ? 'bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border-amber-500/40 shadow-amber-950/20'
          : 'bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950/30 border-slate-700/70 shadow-black/20'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isPreviousYear
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            }`}>
              {isPreviousYear ? <History className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  Filing Assessment Year &amp; Statutory Section
                </h3>
                {isPreviousYear && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Previous Year Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Need to file for a past year? Select the relevant Assessment Year and CBDT statutory section below.
              </p>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-300 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
            FY: <strong className="text-emerald-400">{profile.financialYear}</strong>
          </div>
        </div>

        {/* Year Selector Pills */}
        <div className="pt-3.5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Select Assessment Year (AY):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              {/* AY 2026-27 */}
              <button
                type="button"
                onClick={() => handleYearChange('2026-27')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  profile.assessmentYear === '2026-27'
                    ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">AY 2026-27</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    Current Year
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">FY 2025-26 • Std Ded ₹75,000</p>
              </button>

              {/* AY 2025-26 (Previous Year) */}
              <button
                type="button"
                onClick={() => handleYearChange('2025-26')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  profile.assessmentYear === '2025-26'
                    ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">AY 2025-26</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                    Previous Year
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">FY 2024-25 • Belated / ITR-U</p>
              </button>

              {/* AY 2024-25 (Past Year ITR-U) */}
              <button
                type="button"
                onClick={() => handleYearChange('2024-25')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  profile.assessmentYear === '2024-25'
                    ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">AY 2024-25</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                    ITR-U Available
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">FY 2023-24 • Sec 139(8A) Updated</p>
              </button>

            </div>
          </div>

          {/* Statutory Filing Section Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label htmlFor="filing-section" className="text-xs font-semibold text-slate-300 block mb-1.5">
                Filing Section &amp; Provision
              </label>
              <select
                id="filing-section"
                value={profile.filingSection}
                onChange={(e) => onChange({ filingSection: e.target.value as FilingSection })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="139(1)">Section 139(1) — Original Return (On or before Due Date)</option>
                <option value="139(4)">Section 139(4) — Belated Return (After Due Date)</option>
                <option value="139(5)">Section 139(5) — Revised Return (Correcting previous return)</option>
                <option value="139(8A)">Section 139(8A) — Updated Return (ITR-U for missed/under-reported income)</option>
              </select>
            </div>

            <div>
              <label htmlFor="filing-tier" className="text-xs font-semibold text-slate-300 block mb-1.5">
                ITR Form Tier
              </label>
              <select
                id="filing-tier"
                value={profile.filingType}
                onChange={(e) => onChange({ filingType: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="ITR-1">ITR-1 Sahaj (Salaried, 1 House Property, &lt;₹50L)</option>
                <option value="ITR-2">ITR-2 (Capital Gains, Multiple Properties, Crypto)</option>
                <option value="ITR-4">ITR-4 Sugam (Presumptive Business / Profession)</option>
              </select>
            </div>
          </div>

          {/* Previous Year Alert Tip */}
          {isPreviousYear && (
            <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Statutory Notice Protection:</strong> Under <strong>Section 139(8A)</strong>, you can file an Updated Return (ITR-U) up to 24–48 months from the end of the relevant assessment year to clear past unfiled years or report additional income with statutory immunity.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Identity Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {/* PAN Input Card */}
        <div className="bg-slate-900/70 border border-slate-700/60 hover:border-slate-600/80 rounded-2xl p-4 transition-all duration-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="pan-input" className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Hash className="w-3.5 h-3.5 text-emerald-400" />
              <span>Permanent Account Number (PAN)</span>
              <span className="text-emerald-400 font-bold">*</span>
            </label>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Valid Format
            </span>
          </div>
          <div className="relative">
            <input
              id="pan-input"
              type="text"
              value={profile.pan}
              onChange={(e) => onChange({ pan: e.target.value.toUpperCase() })}
              maxLength={10}
              placeholder="ABCDE1234F"
              className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono tracking-widest placeholder:text-slate-600 transition-all outline-none"
            />
            <div className="absolute right-3 top-3 flex items-center space-x-1 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-0.5">
            <span className="flex items-center space-x-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span>Aadhaar Linked</span>
            </span>
            <span className="text-slate-500">CBDT Mod10 Checked</span>
          </div>
        </div>

        {/* Legal Name */}
        <div className="bg-slate-900/70 border border-slate-700/60 hover:border-slate-600/80 rounded-2xl p-4 transition-all duration-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="name-input" className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-teal-400" />
              <span>Legal Taxpayer Name</span>
              <span className="text-emerald-400 font-bold">*</span>
            </label>
            <span className="text-[10px] text-slate-400">As per ITD Database</span>
          </div>
          <input
            id="name-input"
            type="text"
            value={profile.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Legal name on PAN"
            className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium placeholder:text-slate-600 transition-all outline-none"
          />
          <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400 mt-2 px-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>100% matched with Form 16 Part A</span>
          </div>
        </div>

        {/* Date of Birth & Citizen Category */}
        <div className="bg-slate-900/70 border border-slate-700/60 hover:border-slate-600/80 rounded-2xl p-4 transition-all duration-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="dob-input" className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Date of Birth &amp; Category</span>
              <span className="text-emerald-400 font-bold">*</span>
            </label>
            <span className="text-[10px] text-slate-400">Determines Slabs</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              id="dob-input"
              type="date"
              value={profile.dob}
              onChange={(e) => onChange({ dob: e.target.value })}
              className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white font-mono transition-all outline-none"
            />
            <select
              aria-label="Age category for slab determination"
              value={profile.ageCategory}
              onChange={(e) => onChange({ ageCategory: e.target.value as any })}
              className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-2.5 py-2.5 text-xs sm:text-sm text-white transition-all outline-none"
            >
              <option value="<60">General (&lt;60 yrs)</option>
              <option value="60-80">Senior (60-80 yrs)</option>
              <option value=">80">Super Senior (&gt;80)</option>
            </select>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 px-0.5">Standard slab criteria applied automatically</p>
        </div>

        {/* Bank Account Masked Card */}
        <div className="bg-slate-900/70 border border-slate-700/60 hover:border-slate-600/80 rounded-2xl p-4 transition-all duration-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <CreditCard className="w-3.5 h-3.5 text-teal-400" />
              <span>Validated Refund Account</span>
            </label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Pre-Validated
            </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">{profile.bankName}</span>
              <span className="text-[11px] font-mono text-slate-400">{profile.bankAccountMasked} • IFSC: {profile.bankIfsc}</span>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-[11px] text-emerald-400 mt-2 px-0.5">Direct CBDT ECS refund credit enabled</p>
        </div>
      </div>

      {/* Continue Action Button */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={onNext}
          className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl shadow-xl shadow-emerald-600/25 hover:shadow-emerald-500/35 active:scale-[0.99] transition-all flex items-center justify-center space-x-2"
        >
          <span>Confirm &amp; Proceed to Income (AY {profile.assessmentYear})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
