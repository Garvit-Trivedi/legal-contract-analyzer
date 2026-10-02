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
  const [mode, setMode] = useState<"select" | "loading" | "compare">("select");
  const [activeCitation, setActiveCitation] = useState<any | null>(null);

  const aName = documents.find((d) => d.id === docA)?.filename || "Document A";
  const bName = documents.find((d) => d.id === docB)?.filename || "Document B";

  const startComparison = () => {
    if (docA && docB && docA !== docB) {
      // Show loader immediately, then transition to compare after a brief
      // moment so the loader renders
      setMode("loading");
      // Let the React paint cycle complete before starting API call
      setTimeout(() => setMode("compare"), 200);
    }
  };

  const handleAbort = () => {
    setMode("select");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] text-zinc-300 font-sans tracking-tight overflow-hidden">
      {mode === "select" && (
        <main className="flex-1 max-w-4xl mx-auto w-full pt-16 p-8 overflow-y-auto custom-scrollbar">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold text-white mb-3">Compare Documents</h2>
            <p className="text-sm text-zinc-400">
              Select two indexed documents to trigger automated change discovery.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12">
            {/* Version A */}
            <div className="bg-[#18181b] p-6 rounded-xl border border-white/10 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-semibold uppercase text-zinc-400">Version A (Base)</h3>
              </div>
              <select
                value={docA || ""}
                onChange={(e) => setDocA(e.target.value)}
                className="w-full bg-[#09090b] border border-white/10 rounded-md p-3 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
              >
                <option value="" disabled>
                  -- Select Base Document --
                </option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id} disabled={d.id === docB}>
                    {d.filename}
                  </option>
                ))}
              </select>
              {docA && (
                <p className="text-[10px] text-emerald-500/70 mt-2 font-mono truncate">
                  ✓ {documents.find((d) => d.id === docA)?.filename}
                </p>
              )}
            </div>

            {/* Version B */}
            <div className="bg-[#18181b] p-6 rounded-xl border border-white/10 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <h3 className="text-xs font-semibold uppercase text-zinc-400">Version B (Revised)</h3>
              </div>
              <select
                value={docB || ""}
                onChange={(e) => setDocB(e.target.value)}
                className="w-full bg-[#09090b] border border-white/10 rounded-md p-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50 transition-colors"
              >
                <option value="" disabled>
                  -- Select Revised Document --
                </option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id} disabled={d.id === docA}>
                    {d.filename}
                  </option>
                ))}
              </select>
              {docB && (
                <p className="text-[10px] text-blue-500/70 mt-2 font-mono truncate">
                  ✓ {documents.find((d) => d.id === docB)?.filename}
                </p>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-[#111114] border border-white/8 rounded-xl p-5 mb-8">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
              Legend — What do these terms mean?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
              {/* Change types */}
              <div className="space-y-2">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-1">
                  Change Types
                </p>
                <LegendItem
                  badge="ADDED"
                  badgeColor="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  desc="Clause or text present in Version B but absent in Version A"
                />
                <LegendItem
                  badge="REMOVED"
                  badgeColor="bg-rose-500/15 text-rose-400 border-rose-500/30"
                  desc="Clause or text that existed in Version A but is gone in Version B"
                />
                <LegendItem
                  badge="MODIFIED"
                  badgeColor="bg-amber-500/15 text-amber-400 border-amber-500/30"
                  desc="Clause present in both versions but with differing wording, values, or terms"
                />
              </div>

              {/* Significance levels */}
              <div className="space-y-2">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-1">
                  Significance Levels
                </p>
                <LegendItem
                  badge="HIGH"
                  badgeColor="bg-red-500/15 text-red-400 border-red-500/30"
                  desc="Core legal exposure — liability caps, payment sums, termination rights, IP, governance"
                />
                <LegendItem
                  badge="MEDIUM"
                  badgeColor="bg-orange-500/15 text-orange-400 border-orange-500/30"
                  desc="Procedural obligations — notice periods, operational requirements, schedules"
                />
                <LegendItem
                  badge="LOW"
                  badgeColor="bg-slate-500/15 text-slate-400 border-slate-500/30"
                  desc="Minor wording or formatting differences with limited substantive impact"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              disabled={!docA || !docB || docA === docB}
              onClick={startComparison}
              className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-full transition-all shadow-lg shadow-amber-500/20 text-sm"
            >
              Run Comparison →
            </button>
          </div>

          {documents.length === 0 && (
            <p className="text-center text-slate-600 text-sm mt-8">
              No indexed documents found. Upload and process a document first.
            </p>
          )}
        </main>
      )}

      {mode === "loading" && (
        <ComparisonLoader
          docAName={aName}
          docBName={bName}
          onAbort={handleAbort}
        />
      )}

      {mode === "compare" && (
        <main className="flex-1 flex overflow-hidden">
          <div className="flex-1 relative">
            {docA && docB && (
              <ComparisonView
                documentAId={docA}
                documentBId={docB}
                documentAName={aName}
                documentBName={bName}
                onCitationClick={(cit) => setActiveCitation(cit)}
              />
            )}
          </div>

          {activeCitation && (
            <div className="w-[450px] flex-shrink-0 bg-[#0f0f11] border-l border-white/10 z-20 relative">
              <DocumentViewer
                documentId={activeCitation.documentId}
                characterStart={activeCitation.characterStart}
                characterEnd={activeCitation.characterEnd}
                onClose={() => setActiveCitation(null)}
              />
            </div>
          )}
        </main>
      )}
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
