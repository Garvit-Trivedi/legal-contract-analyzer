"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ComparisonView } from "@/components/ComparisonView";
import { DocumentViewer } from "@/components/DocumentViewer";

// Animated loader steps shown whilst the comparison API runs
const LOADER_STEPS = [
  { label: "Loading document contents", duration: 1200 },
  { label: "Normalizing text", duration: 900 },
  { label: "Aligning paragraphs", duration: 1400 },
  { label: "Detecting changes", duration: 1100 },
  { label: "Classifying significance", duration: 900 },
  { label: "Running AI analysis", duration: 0 }, // stays here until done
];

function ComparisonLoader({
  docAName,
  docBName,
  onAbort,
}: {
  docAName: string;
  docBName: string;
  onAbort: () => void;
}) {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    let currentStep = 0;
    const advance = () => {
      const next = currentStep + 1;
      if (next < LOADER_STEPS.length - 1) {
        currentStep = next;
        setStep(next);
        const dur = LOADER_STEPS[next].duration;
        if (dur > 0) setTimeout(advance, dur);
      } else {
        setStep(LOADER_STEPS.length - 1);
      }
    };
    const dur = LOADER_STEPS[0].duration;
    if (dur > 0) setTimeout(advance, dur);
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Spinning orb */}
        <div className="flex justify-center mb-10">
          <div className="relative w-20 h-20">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/10 border-t-amber-500 animate-spin" />
            {/* Inner ring */}
            <div
              className="absolute inset-3 rounded-full border-4 border-blue-500/10 border-b-blue-500 animate-spin"
              style={{ animationDirection: "reverse", animationDuration: "1.4s" }}
            />
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Heading */}
        <h3 className="text-center text-xl font-semibold text-white mb-1">
          Comparing Documents
        </h3>
        <p className="text-center text-xs text-slate-500 font-mono mb-8">
          <span className="text-emerald-400">{docAName}</span>
          <span className="text-slate-600 mx-2">vs</span>
          <span className="text-blue-400">{docBName}</span>
        </p>

        {/* Steps */}
        <div className="space-y-3 mb-10">
          {LOADER_STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            const pending = i > step;

            return (
              <div key={i} className="flex items-center gap-3">
                {/* Status icon */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                    done
                      ? "bg-emerald-500/20 border border-emerald-500/50"
                      : active
                      ? "border-2 border-amber-500 animate-pulse"
                      : "border border-white/10"
                  }`}
                >
                  {done && (
                    <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {active && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                </div>

                {/* Label */}
                <span
                  className={`text-sm transition-all duration-500 ${
                    done
                      ? "text-slate-500 line-through decoration-slate-700"
                      : active
                      ? "text-white font-medium"
                      : "text-slate-700"
                  }`}
                >
                  {s.label}
                </span>

                {/* Spinner for active */}
                {active && (
                  <div className="ml-auto w-3 h-3 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin flex-shrink-0" />
                )}
                {done && (
                  <span className="ml-auto text-[10px] text-emerald-600 font-mono uppercase tracking-wider">
                    done
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-blue-500 rounded-full transition-all duration-700"
            style={{ width: `${((step + 1) / LOADER_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Abort */}
        <div className="flex justify-center">
          <button
            onClick={onAbort}
            className="px-4 py-1.5 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function ComparisonWorkflow({ documents }: { documents: any[] }) {
  const [docA, setDocA] = useState<string | null>(null);
  const [docB, setDocB] = useState<string | null>(null);
  const [mode, setMode] = useState<"setup" | "loading" | "compare">("setup");

  const aName = documents.find((d) => d.id === docA)?.filename || "Document A";
  const bName = documents.find((d) => d.id === docB)?.filename || "Document B";

  const startComparison = () => {
    if (docA && docB && docA !== docB) {
      setMode("loading");
      setTimeout(() => setMode("compare"), 200);
    }
  };

  const handleAbort = () => {
    setMode("setup");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] text-zinc-300 font-sans tracking-tight overflow-hidden">
      
      {/* ── UNIFIED TOP BAR ── */}
      <div className="bg-[#111115] border-b border-white/10 px-8 py-5 shrink-0 z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
              Side-by-Side Contract Comparison & Risk Analysis
            </h2>
            <p className="text-[13px] text-zinc-400 mt-1 pl-7">
              Clause-level matching with synchronized scrolling, accessible diffs, and interactive comparison analysis.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          {/* Version 1 */}
          <div className="flex-1 min-w-[240px] max-w-sm">
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
              Version 1 (Left Pane)
            </label>
            <select
              value={docA || ""}
              onChange={(e) => { setDocA(e.target.value); setMode("setup"); }}
              className="w-full bg-[#09090b] border border-white/10 rounded-md p-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50 transition-colors shadow-sm"
            >
              <option value="" disabled>-- Select Base Document --</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id === docB}>{d.filename}</option>
              ))}
            </select>
          </div>

          {/* Versus Icon */}
          <div className="flex items-center justify-center shrink-0 h-10 w-10 text-zinc-600 font-bold text-xl pb-2">
            ⇌
          </div>

          {/* Version 2 */}
          <div className="flex-1 min-w-[240px] max-w-sm">
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
              Version 2 (Right Pane - Revised)
            </label>
            <select
              value={docB || ""}
              onChange={(e) => { setDocB(e.target.value); setMode("setup"); }}
              className="w-full bg-[#09090b] border border-white/10 rounded-md p-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50 transition-colors shadow-sm"
            >
              <option value="" disabled>-- Select Revised Document --</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id === docA}>{d.filename}</option>
              ))}
            </select>
          </div>

          <div className="pb-0 shrink-0">
            <button
              disabled={!docA || !docB || docA === docB || mode !== "setup"}
              onClick={startComparison}
              className="px-6 py-2.5 bg-[#252530] hover:bg-[#343444] disabled:opacity-40 border border-white/10 disabled:border-transparent text-white font-semibold rounded-md transition-colors text-xs shadow-sm flex items-center gap-2"
            >
              Run Side-by-Side Comparison <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col overflow-hidden">
        {mode === "setup" && (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {documents.length < 2 && (
              <div className="text-center bg-[#18181b] border border-white/10 rounded-xl p-10 max-w-lg mx-auto">
                <svg className="w-10 h-10 text-amber-500/50 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                <h3 className="text-amber-400 font-semibold mb-2">Insufficient Documents</h3>
                <p className="text-sm text-zinc-400">You need to upload and index at least 2 documents in your workspace before you can run a comparison.</p>
              </div>
            )}
            
            {documents.length >= 2 && (
              <div className="bg-[#111114] border border-white/5 rounded-xl p-6 max-w-3xl mx-auto mt-4 shadow-sm hidden">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Legend — What do these terms mean?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
                  <div className="space-y-2">
                    <LegendItem badge="ADDED" badgeColor="bg-emerald-500/15 text-emerald-400 border-emerald-500/30" desc="Clause or text present in Version B but absent in Version A" />
                    <LegendItem badge="REMOVED" badgeColor="bg-rose-500/15 text-rose-400 border-rose-500/30" desc="Clause or text that existed in Version A but is gone in Version B" />
                    <LegendItem badge="MODIFIED" badgeColor="bg-amber-500/15 text-amber-400 border-amber-500/30" desc="Clause present in both versions but with differing wording, values, or terms" />
                  </div>
                  <div className="space-y-2">
                    <LegendItem badge="HIGH" badgeColor="bg-red-500/15 text-red-400 border-red-500/30" desc="Core legal exposure — liability caps, payment sums, termination rights, IP" />
                    <LegendItem badge="MEDIUM" badgeColor="bg-orange-500/15 text-orange-400 border-orange-500/30" desc="Procedural obligations — notice periods, operational requirements" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "loading" && (
          <ComparisonLoader docAName={aName} docBName={bName} onAbort={handleAbort} />
        )}

        {mode === "compare" && docA && docB && (
          <ComparisonView documentAId={docA} documentBId={docB} documentAName={aName} documentBName={bName} />
        )}
      </div>
    </div>
  );
}

function LegendItem({
  badge,
  badgeColor,
  desc,
}: {
  badge: string;
  badgeColor: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={`flex-shrink-0 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider mt-0.5 ${badgeColor}`}
      >
        {badge}
      </span>
      <span className="text-slate-400 leading-relaxed">{desc}</span>
    </div>
  );
}
