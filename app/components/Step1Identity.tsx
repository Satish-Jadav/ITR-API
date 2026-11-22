'use client';

import React from 'react';
import { User, ShieldCheck, CheckCircle2, Building, CreditCard, Calendar, Hash, ArrowRight, Sparkles, Lock, BadgeCheck } from 'lucide-react';
import { TaxPayerProfile } from '../types';

interface Step1Props {
  profile: TaxPayerProfile;
  onChange: (updated: Partial<TaxPayerProfile>) => void;
  onNext: () => void;
}

export default function Step1Identity({ profile, onChange, onNext }: Step1Props) {
  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* Statutory CBDT Verification Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950/30 border border-slate-700/70 rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Taxpayer Identity &amp; Portal Authentication
                </h2>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <BadgeCheck className="w-3 h-3" />
                  <span>CBDT E-Filing Authenticated</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Profile authenticated via Income Tax Department (ITD) e-Filing 2.0 with Aadhaar-PAN statutory linkage.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-emerald-400 font-mono bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700/60 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AY 2026-27 Active</span>
          </div>
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

        {/* Filing Form Tier */}
        <div className="bg-slate-900/70 border border-slate-700/60 hover:border-slate-600/80 rounded-2xl p-4 transition-all duration-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="filing-type-select" className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-400" />
              <span>ITR Return Form Tier</span>
              <span className="text-emerald-400 font-bold">*</span>
            </label>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              CBDT FY 2025-26
            </span>
          </div>
          <select
            id="filing-type-select"
            value={profile.filingType}
            onChange={(e) => onChange({ filingType: e.target.value as any })}
            className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white transition-all outline-none"
          >
            <option value="ITR-1">ITR-1 Sahaj (Salaried, 1 House Property, &lt;₹50L)</option>
            <option value="ITR-2">ITR-2 (Capital Gains, Multiple Properties, Crypto)</option>
            <option value="ITR-4">ITR-4 Sugam (Presumptive Business u/s 44AD / Profession)</option>
          </select>
          <p className="text-[11px] text-emerald-400 mt-2 px-0.5">Recommended automatically based on your Form 16 stream</p>
        </div>
      </div>

      {/* Validated Refund Bank Account Card */}
      <div className="bg-gradient-to-r from-slate-900/90 to-slate-900/60 border border-slate-700/70 hover:border-slate-600 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 flex-shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="text-sm font-bold text-white">{profile.bankName}</span>
              <span className="text-xs font-mono text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                {profile.bankAccountMasked}
              </span>
              <span className="inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                <span>Pre-Validated for Direct Refund</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              IFSC: <span className="font-mono text-slate-300">{profile.bankIfsc}</span> • EVC &amp; Direct ECS Mandate Active • 100% Tax Notice Protection
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold self-end sm:self-auto bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
          <Lock className="w-3.5 h-3.5" />
          <span>Direct Credit Enabled</span>
        </div>
      </div>

      {/* Continue Action Button */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={onNext}
          className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-xl shadow-xl shadow-emerald-600/25 hover:shadow-emerald-500/35 active:scale-[0.99] transition-all flex items-center justify-center space-x-2"
        >
          <span>Confirm &amp; Proceed to Income</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
