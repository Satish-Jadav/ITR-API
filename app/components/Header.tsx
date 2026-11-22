'use client';

import React from 'react';
import { ShieldCheck, Sparkles, UserCheck, RefreshCw, Cpu, Cloud } from 'lucide-react';
import { TaxPayerProfile } from '../types';

interface HeaderProps {
  profile: TaxPayerProfile;
  activeStep: number;
  onOpenAi: () => void;
  onResetData: () => void;
}

export default function Header({ profile, activeStep, onOpenAi, onResetData }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand & AY */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-white">ZeroTax</span>
              <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">
                AY 2026-27
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden xs:block">CBDT Direct e-Filing Engine</p>
          </div>
        </div>

        {/* Live Taxpayer & AI Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* PAN Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-slate-200 font-medium">{profile.pan}</span>
            <span className="text-[10px] text-slate-400">({profile.name.split(' ')[0]})</span>
          </div>

          {/* Reset / Live Sync */}
          <button
            onClick={onResetData}
            title="Reload live AIS/Form 16 data"
            className="p-1.5 sm:px-2 sm:py-1 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 text-slate-300 rounded-lg text-xs flex items-center space-x-1 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sync AIS</span>
          </button>

          {/* Chrome Gemini AI Copilot Button */}
          <button
            onClick={onOpenAi}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-medium shadow-md shadow-emerald-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin-slow" />
            <span className="hidden xs:inline">Ask Gemini AI</span>
            <span className="xs:hidden">AI</span>
          </button>
        </div>
      </div>
    </header>
  );
}
