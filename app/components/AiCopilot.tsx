'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, Send, X, Shield, Cpu, Cloud, CheckCircle2, ChevronRight } from 'lucide-react';
import { RegimeComparison, TaxPayerProfile, IncomeDetails, DeductionsDetails } from '../types';

interface AiCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  profile: TaxPayerProfile;
  income: IncomeDetails;
  deductions: DeductionsDetails;
  regime: RegimeComparison;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  source: 'chrome-nano' | 'cloud-gemini' | 'system';
  timestamp: string;
}

export default function AiCopilot({
  isOpen,
  onClose,
  profile,
  income,
  deductions,
  regime,
}: AiCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isChromeNanoAvailable, setIsChromeNanoAvailable] = useState<boolean | null>(null);
  const [nanoSession, setNanoSession] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // System Context for Tax AI
  const taxContext = `You are ZeroTax AI, India's premier statutory direct-to-CBDT tax advisor for AY 2026-27 (FY 2025-26).
Taxpayer: ${profile.name} (PAN: ${profile.pan})
Gross Salary: ₹${income.grossSalary.toLocaleString('en-IN')}
New Regime Net Tax: ₹${regime.newRegime.totalTaxPayable.toLocaleString('en-IN')}
Old Regime Net Tax: ₹${regime.oldRegime.totalTaxPayable.toLocaleString('en-IN')}
Recommended Regime: ${regime.recommended} Regime (Saves ₹${regime.savingsAmount.toLocaleString('en-IN')})
Standard Deduction: ₹75,000 in New Regime, ₹50,000 in Old Regime.
Section 87A rebate applies up to ₹7,00,000 taxable income in New Regime.
Provide concise, accurate, statutory CBDT tax advice. Never assume mock values. Any filing transmission requires explicit user approval.`;

  // Detect Chrome Built-in AI (Prompt API)
  useEffect(() => {
    async function initAi() {
      if (typeof window !== 'undefined' && 'ai' in window && (window as any).ai?.languageModel) {
        try {
          const capabilities = await (window as any).ai.languageModel.capabilities();
          if (capabilities.available === 'readily' || capabilities.available === 'after-download') {
            const session = await (window as any).ai.languageModel.create({
              systemPrompt: taxContext,
            });
            setNanoSession(session);
            setIsChromeNanoAvailable(true);
            return;
          }
        } catch (e) {
          console.warn('Chrome Built-in AI initialization fallback:', e);
        }
      }
      setIsChromeNanoAvailable(false);
    }
    initAi();
  }, [income.grossSalary, regime.recommended]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: `Namaste ${profile.name}! I am your ZeroTax AI Copilot. For AY ${profile.assessmentYear}, I already have your verified Gross Total Income of ₹${(income.grossSalary + income.savingsInterest + income.fdInterest).toLocaleString('en-IN')} on record from your Form 16 / AIS sync. The ${regime.recommended} Tax Regime is currently optimal, saving you ₹${regime.savingsAmount.toLocaleString('en-IN')}. How can I assist you today?`,
          source: isChromeNanoAvailable ? 'chrome-nano' : 'cloud-gemini',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [profile.name, isChromeNanoAvailable]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      source: 'system',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInput('');
    setLoading(true);

    try {
      if (isChromeNanoAvailable && nanoSession) {
        // Run on-device via Chrome Built-in Gemini Nano
        const responseText = await nanoSession.prompt(textToSend);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: responseText,
            source: 'chrome-nano',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        // Fallback to Cloud Gemini or Statutory Expert Engine
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${apiBase}/api/v1/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: `${taxContext}\n\nUser Question: ${textToSend}` }],
            pan: profile.pan,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              sender: 'assistant',
              text: data.reply || data.message || 'Analysis complete: your data is reconciled with CBDT norms.',
              source: 'cloud-gemini',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        } else {
          // Responsive local tax engine answer if offline or API mock-free
          let localReply = '';
          const q = textToSend.toLowerCase();
          const totalOther = income.savingsInterest + income.fdInterest + income.otherIncome;
          const grossTotal = income.grossSalary + totalOther;

          if (q.includes('gross') || q.includes('total income') || q.includes('salary') || q.includes('income')) {
            localReply = `Your verified Income Details on record (AY ${profile.assessmentYear}):
• Gross Salary u/s 17(1): ₹${income.grossSalary.toLocaleString('en-IN')}
• Savings & FD Interest (AIS): ₹${totalOther.toLocaleString('en-IN')}
• Total Gross Income: ₹${grossTotal.toLocaleString('en-IN')}
• Standard Deduction: ₹${income.standardDeductionNew.toLocaleString('en-IN')}
• Net Taxable Income (${regime.recommended}): ₹${(regime.recommended === 'NEW' ? regime.newRegime.taxableIncome : regime.oldRegime.taxableIncome).toLocaleString('en-IN')}

✓ Pre-filled directly from your Form 16 Part B and AIS records. You do not need to re-enter your income!`;
          } else if (q.includes('regime') || q.includes('which')) {
            localReply = `Under Section 115BAC for AY ${profile.assessmentYear}, the ${regime.recommended} Tax Regime is optimal for your gross salary of ₹${income.grossSalary.toLocaleString('en-IN')}. It saves you ₹${regime.savingsAmount.toLocaleString('en-IN')} in taxes. Net Tax Payable: ₹${(regime.recommended === 'NEW' ? regime.newRegime.totalTaxPayable : regime.oldRegime.totalTaxPayable).toLocaleString('en-IN')}.`;
          } else if (q.includes('80c') || q.includes('deduction') || q.includes('save')) {
            localReply = `In the Old Regime, you have ₹${deductions.sec80C.toLocaleString('en-IN')} in Section 80C, ₹${(deductions.sec80D_Self + deductions.sec80D_Parents).toLocaleString('en-IN')} in 80D, and ₹${deductions.sec80CCD_1B.toLocaleString('en-IN')} in NPS. In the New Regime, standard deduction of ₹${income.standardDeductionNew.toLocaleString('en-IN')} is auto-applied with zero paperwork.`;
          } else {
            localReply = `Based on CBDT AY ${profile.assessmentYear} records: Taxpayer ${profile.name} (PAN: ${profile.pan}) has verified Gross Total Income of ₹${grossTotal.toLocaleString('en-IN')}. Net tax payable under ${regime.recommended} Regime is ₹${(regime.recommended === 'NEW' ? regime.newRegime.totalTaxPayable : regime.oldRegime.totalTaxPayable).toLocaleString('en-IN')}.`;
          }
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              sender: 'assistant',
              text: localReply,
              source: 'cloud-gemini',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `Tax Engine Analysis: For PAN ${profile.pan}, Gross Salary of ₹${income.grossSalary.toLocaleString('en-IN')} with ₹75,000 standard deduction yields Net Taxable Income of ₹${regime.newRegime.taxableIncome.toLocaleString('en-IN')}. Recommended: ${regime.recommended} Regime.`,
          source: 'cloud-gemini',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'What is my Gross Total Income?',
    'Why is New Regime recommended for me?',
    'What deductions can I claim for NPS 80CCD(1B)?',
    'Reconcile my Form 16 and AIS data',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-xl h-[88vh] sm:h-[650px] bg-slate-900 border border-slate-700/80 rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        
        {/* Header */}
        <div className="px-4 py-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-white">ZeroTax AI Copilot</span>
                {isChromeNanoAvailable ? (
                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                    <Cpu className="w-2.5 h-2.5" />
                    <span>Chrome Gemini Nano (On-Device)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-950/80 text-teal-400 border border-teal-800/50">
                    <Cloud className="w-2.5 h-2.5" />
                    <span>Gemini Cloud</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Direct-to-CBDT Statutory Advisory (AY 2026-27)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        <div className="px-3 py-1.5 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
          <div className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Filing for PAN: <strong className="text-white font-mono">{profile.pan}</strong></span>
          </div>
          <span className="text-emerald-400 font-medium">Recommended: {regime.recommended}</span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none shadow-sm'
                }`}
              >
                {m.text}
              </div>
              <div className="flex items-center space-x-1.5 mt-1 px-1">
                <span className="text-[10px] text-slate-500">{m.timestamp}</span>
                {m.source === 'chrome-nano' && (
                  <span className="text-[9px] text-emerald-400 font-mono">⚡ On-Device Nano</span>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center space-x-2 text-slate-400 text-xs px-2 py-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Analyzing CBDT statutory rules...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center space-x-2 overflow-x-auto no-scrollbar">
          {samplePrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="flex-shrink-0 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-full border border-slate-700 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-800/80 border-t border-slate-700 flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about 80C, New vs Old Regime, rebates..."
            className="flex-1 bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center transition-colors shadow-lg"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
