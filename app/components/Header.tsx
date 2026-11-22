'use client';

import React, { useState } from 'react';
import { ShieldCheck, Sparkles, UserCheck, RefreshCw, Lock, Zap, Calendar, ChevronDown, Check } from 'lucide-react';
import { TaxPayerProfile, AssessmentYear } from '../types';

interface HeaderProps {
  profile: TaxPayerProfile;
  activeStep: number;
  onOpenAi: () => void;
  onResetData: () => void;
  onYearChange?: (ay: AssessmentYear) => void;
}

export default function Header({ profile, activeStep, onOpenAi, onResetData, onYearChange }: HeaderProps) {
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  const years: { value: AssessmentYear; label: string; sub: string; tag: string }[] = [
    { value: '2026-27', label: 'AY 2026-27', sub: 'FY 2025-26', tag: 'Current' },
    { value: '2025-26', label: 'AY 2025-26', sub: 'FY 2024-25', tag: 'Previous Year' },
    { value: '2024-25', label: 'AY 2024-25', sub: 'FY 2023-24', tag: 'ITR-U Available' },
  ];

  const handleSelectYear = (year: AssessmentYear) => {
    setIsYearDropdownOpen(false);
    if (onYearChange) {
      onYearChange(year);
    }
  };

  const isPreviousYear = profile.assessmentYear !== '2026-27';

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 px-3.5 sm:px-6 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand & Statutory Status */}
        <div className="flex items-center space-x-3">
          <div className="relative group cursor-pointer">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 p-[1.5px] shadow-lg shadow-emerald-500/25">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="text-emerald-400 font-extrabold text-lg sm:text-xl font-sans tracking-tight">₹</span>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Zero<span className="text-emerald-400">Tax</span>
              </span>

              {/* Assessment Year Dropdown Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                  className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border transition-all flex items-center space-x-1 ${
                    isPreviousYear
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                  }`}
                  title="Click to switch Assessment Year"
                >
                  <Calendar className="w-3 h-3" />
                  <span>AY {profile.assessmentYear}</span>
                  {isPreviousYear && <span className="text-[9px] uppercase px-1 rounded bg-amber-500/30 text-amber-200">Past</span>}
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>

                {/* Dropdown Menu */}
                {isYearDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-56 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Select Assessment Year
                    </div>
                    {years.map((y) => {
                      const isSelected = profile.assessmentYear === y.value;
                      return (
                        <button
                          key={y.value}
                          type="button"
                          onClick={() => handleSelectYear(y.value)}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                            isSelected ? 'bg-slate-800/80 text-emerald-400 font-bold' : 'text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span>{y.label}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
                                {y.tag}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">{y.sub}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
              <Lock className="w-2.5 h-2.5 text-emerald-400" />
              <span>Direct CBDT e-Filing Gateway</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-medium hidden sm:inline">DPDP Act Compliant</span>
            </div>
          </div>
        </div>

        {/* Live Taxpayer & AI Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Taxpayer PAN Capsule */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-slate-900/90 border border-slate-700/80 rounded-full text-xs shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-slate-100 font-bold tracking-wider">{profile.pan}</span>
            <span className="text-[11px] text-slate-400 font-medium">({profile.name.split(' ')[0]})</span>
          </div>

          {/* Sync AIS / Form 16 Button */}
          <button
            onClick={onResetData}
            title="Reload live AIS/Form 16 data"
            className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all active:scale-95 hover:border-slate-600 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Sync AIS</span>
          </button>

          {/* Chrome Gemini AI Copilot Button */}
          <button
            onClick={onOpenAi}
            className="flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-current" />
            <span className="hidden xs:inline">Ask Gemini AI</span>
            <span className="xs:hidden">AI</span>
          </button>
        </div>
      </div>
    </header>
  );
}
