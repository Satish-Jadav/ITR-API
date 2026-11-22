'use client';

import React from 'react';
import { User, ShieldCheck, CheckCircle2, Building, CreditCard, Calendar, Hash, ArrowRight } from 'lucide-react';
import { TaxPayerProfile } from '../types';

interface Step1Props {
  profile: TaxPayerProfile;
  onChange: (updated: Partial<TaxPayerProfile>) => void;
  onNext: () => void;
}

export default function Step1Identity({ profile, onChange, onNext }: Step1Props) {
  return (
    <div className="space-y-4">
      {/* Intro banner */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 sm:p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
              <span>Step 1: Taxpayer Identity & Verification</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Verified
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Profile authenticated via CBDT e-Filing Portal with Aadhaar-PAN linking.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grid of Identity Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* PAN */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
          <label className="text-[11px] font-medium text-slate-400 flex items-center space-x-1.5 mb-1.5">
            <Hash className="w-3.5 h-3.5 text-emerald-400" />
            <span>Permanent Account Number (PAN)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={profile.pan}
              onChange={(e) => onChange({ pan: e.target.value.toUpperCase() })}
              maxLength={10}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono tracking-wider focus:outline-none focus:border-emerald-500"
            />
            <div className="absolute right-2.5 top-2.5 flex items-center space-x-1 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center space-x-1 text-[10px] text-emerald-400 mt-1">
            <span>● Aadhaar Linked</span>
            <span className="text-slate-500">|</span>
            <span>Valid CBDT Checksum</span>
          </div>
        </div>

        {/* Full Name */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
          <label className="text-[11px] font-medium text-slate-400 flex items-center space-x-1.5 mb-1.5">
            <User className="w-3.5 h-3.5 text-teal-400" />
            <span>Legal Name (As per PAN Card)</span>
          </label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
          <p className="text-[10px] text-slate-400 mt-1">Matched 100% with ITD records</p>
        </div>

        {/* Date of Birth & Category */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
          <label className="text-[11px] font-medium text-slate-400 flex items-center space-x-1.5 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Date of Birth / Citizen Category</span>
          </label>
          <div className="flex space-x-2">
            <input
              type="date"
              value={profile.dob}
              onChange={(e) => onChange({ dob: e.target.value })}
              className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            <select
              value={profile.ageCategory}
              onChange={(e) => onChange({ ageCategory: e.target.value as any })}
              className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="<60">General (&lt;60 yrs)</option>
              <option value="60-80">Senior (60-80 yrs)</option>
              <option value=">80">Super Senior (&gt;80)</option>
            </select>
          </div>
        </div>

        {/* Filing Form */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
          <label className="text-[11px] font-medium text-slate-400 flex items-center space-x-1.5 mb-1.5">
            <Building className="w-3.5 h-3.5 text-indigo-400" />
            <span>ITR Form Tier</span>
          </label>
          <select
            value={profile.filingType}
            onChange={(e) => onChange({ filingType: e.target.value as any })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ITR-1">ITR-1 Sahaj (Salaried, 1 House Property, &lt;₹50L)</option>
            <option value="ITR-2">ITR-2 (Capital Gains, Multiple Properties)</option>
            <option value="ITR-4">ITR-4 Sugam (Presumptive Business/Profession u/s 44AD)</option>
          </select>
          <p className="text-[10px] text-emerald-400 mt-1">Recommended for your Form 16 profile</p>
        </div>
      </div>

      {/* Validated Refund Bank Account Card */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-white">{profile.bankName}</span>
              <span className="text-xs font-mono text-slate-300">{profile.bankAccountMasked}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                Refund Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400">IFSC: {profile.bankIfsc} • EVC &amp; ECS Pre-validated</p>
          </div>
        </div>
        <div className="text-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>

      {/* Continue Action */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={onNext}
          className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2"
        >
          <span>Confirm &amp; Proceed to Income</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
