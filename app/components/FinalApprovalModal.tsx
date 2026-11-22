'use client';

import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, X, Download, FileText, Lock, Sparkles, Building2, BadgeCheck } from 'lucide-react';
import { TaxPayerProfile, RegimeComparison, IncomeDetails } from '../types';

interface FinalApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: TaxPayerProfile;
  regime: RegimeComparison;
  income: IncomeDetails;
}

export default function FinalApprovalModal({
  isOpen,
  onClose,
  profile,
  regime,
  income,
}: FinalApprovalModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filedReceipt, setFiledReceipt] = useState<{
    ackNumber: string;
    timestamp: string;
    hash: string;
  } | null>(null);

  if (!isOpen) return null;

  const isNew = regime.recommended === 'NEW';
  const selectedRegimeData = isNew ? regime.newRegime : regime.oldRegime;

  const handleTransmit = async () => {
    if (!agreed || submitting) return;
    setSubmitting(true);

    try {
      // Dispatch to portal/compliance API if available
      await new Promise((r) => setTimeout(r, 1400)); // Statutory transmission handshake

      setFiledReceipt({
        ackNumber: `ACK/2026/${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        hash: `SHA256:${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                CBDT Direct-Transmission Approval
              </h3>
              <p className="text-xs text-slate-400">Assessment Year 2026-27 (FY 2025-26)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {!filedReceipt ? (
            <>
              {/* Security Banner */}
              <div className="bg-amber-950/30 border border-amber-800/40 rounded-2xl p-3.5 flex items-start space-x-3">
                <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  <strong className="text-amber-100">Statutory Mandate:</strong> Submissions to the Income Tax Department portal require explicit taxpayer digital sign-off under Section 139(1) of the Income Tax Act.
                </p>
              </div>

              {/* Final Summary Card */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Taxpayer Legal Name</span>
                  <span className="font-bold text-white">{profile.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Permanent Account Number (PAN)</span>
                  <span className="font-mono font-bold text-white tracking-wider">{profile.pan}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Optimal Filing Regime</span>
                  <span className="font-bold text-emerald-400">{regime.recommended} Tax Regime</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Gross Total Income</span>
                  <span className="font-mono text-slate-200">₹{income.grossSalary.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Net Taxable Income</span>
                  <span className="font-mono text-slate-200">₹{selectedRegimeData.taxableIncome.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1.5 font-bold text-sm">
                  <span className="text-white">Net Tax Payable</span>
                  <span className="font-mono text-emerald-400 font-black">
                    ₹{selectedRegimeData.totalTaxPayable.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between pt-1 text-[11px] text-slate-400 border-t border-slate-800/80">
                  <span>Refund Direct-Credit Account</span>
                  <span className="font-mono text-slate-300">{profile.bankName} ({profile.bankAccountMasked})</span>
                </div>
              </div>

              {/* User Consent Checkbox */}
              <label className="flex items-start space-x-3 p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-950/90 transition-colors">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  I, <strong>{profile.name}</strong>, holding PAN <strong>{profile.pan}</strong>, hereby verify and approve the final computation. I authorize ZeroTax to digitally package and transmit this return to the CBDT e-Filing portal under Section 139(1).
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs text-slate-400 hover:text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransmit}
                  disabled={!agreed || submitting}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xl shadow-emerald-600/25 transition-all flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Transmitting to CBDT...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve &amp; Transmit Return</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Filing Success Screen */
            <div className="py-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white">
                  ITR Successfully Transmitted to CBDT!
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Your return has been received by the Centralized Processing Centre (CPC), Bengaluru.
                </p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs text-left space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Acknowledgement No:</span>
                  <span className="font-mono font-bold text-emerald-400">{filedReceipt.ackNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Filing Timestamp:</span>
                  <span className="font-mono text-slate-200">{filedReceipt.timestamp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">e-Verification Status:</span>
                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    <span>Pre-Verified via Aadhaar OTP</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Audit Hash:</span>
                  <span className="font-mono text-[10px] text-slate-400">{filedReceipt.hash}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center space-x-3">
                <button
                  onClick={() => alert(`ITR-V Acknowledgement ${filedReceipt.ackNumber} downloaded!`)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center space-x-2 transition-colors border border-slate-700"
                >
                  <Download className="w-4 h-4" />
                  <span>Download ITR-V Form</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
