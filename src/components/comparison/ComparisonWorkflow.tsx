"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ComparisonView } from "@/components/ComparisonView";
import { DocumentViewer } from "@/components/DocumentViewer";

export function ComparisonWorkflow({ documents }: { documents: any[] }) {
  const [docA, setDocA] = useState<string | null>(null);
  const [docB, setDocB] = useState<string | null>(null);
  const [mode, setMode] = useState<"setup" | "compare">("setup");

  const aName = documents.find((d) => d.id === docA)?.filename || "Document A";
  const bName = documents.find((d) => d.id === docB)?.filename || "Document B";

  const startComparison = () => {
    if (docA && docB && docA !== docB) {
      setMode("compare");
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

        {mode === "compare" && docA && docB && (
          <ComparisonView documentAId={docA} documentBId={docB} documentAName={aName} documentBName={bName} onAbort={handleAbort} />
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
