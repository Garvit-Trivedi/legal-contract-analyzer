"use client";

import React, { useState, useEffect, useRef } from "react";
import { ComparisonResult, ComparisonChange, ChangeSignificanceV2 } from "@/types/comparison";

export function ComparisonView({
  documentAId,
  documentBId,
  documentAName = "Document A",
  documentBName = "Document B",
  onCitationClick,
}: {
  documentAId: string;
  documentBId: string;
  documentAName?: string;
  documentBName?: string;
  onCitationClick?: (citation: any) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<string>("");
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Filter state for Step 11 readiness
  const [filterType, setFilterType] = useState<"ALL" | "ADDED" | "REMOVED" | "MODIFIED">("ALL");
  const [filterSig, setFilterSig] = useState<"ALL" | ChangeSignificanceV2>("ALL");

  useEffect(() => {
    runComparison();
    return () => stopComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentAId, documentBId]);

  const stopComparison = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const runComparison = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    setPhase("Running comparison engine...");

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentAId, documentBId }),
        signal: abortController.signal,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "An unexpected error occurred during comparison.");
      }

      setResult(data.comparison as ComparisonResult);
    } catch (e: any) {
      if (e.name === "AbortError") {
        console.log("Comparison aborted");
      } else {
        console.error("Comparison error:", e);
        setError(e.message);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-full">
        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-6"></div>
        <h3 className="text-xl font-medium text-white mb-2">Analyzing Documents</h3>
        <p className="text-sm text-slate-400 font-mono tracking-widest uppercase">{phase}</p>
        <button
          onClick={stopComparison}
          className="mt-8 px-4 py-2 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
        >
          Abort Analysis
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-full text-center">
        <div className="w-16 h-16 bg-rose-500/10 rounded-full flex flex-col items-center justify-center border border-rose-500/20 mb-6">
          <span className="text-rose-500 font-bold text-xl">!</span>
        </div>
        <h3 className="text-xl font-medium text-rose-100 mb-2">Analysis Failed</h3>
        <p className="text-sm text-rose-400/80 max-w-lg mb-8">{error}</p>
        <button
          onClick={runComparison}
          className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-full text-sm font-bold transition-colors shadow-lg"
        >
          Retry Comparison
        </button>
      </div>
    );
  }

  if (!result) return null;

  // Apply filters
  const filteredChanges = result.changes.filter((c) => {
    if (filterType !== "ALL" && c.type !== filterType) return false;
    if (filterSig !== "ALL" && c.significance !== filterSig) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#0a0a0b] overflow-y-auto custom-scrollbar relative z-10">
      <div className="p-8 max-w-5xl mx-auto w-full">
        {/* Header */}
        <header className="mb-8 border-b border-white/10 pb-6">
          <h2 className="text-2xl font-light text-white mb-3">Document Comparison Report</h2>
          <div className="flex items-center gap-6 text-sm font-mono text-slate-400 flex-wrap">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div> A: {documentAName}
            </span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div> B: {documentBName}
            </span>
            {!result.aiAvailable && (
              <span className="text-amber-500/80 text-xs">⚠ AI analysis unavailable</span>
            )}
          </div>
        </header>

        {/* Stats bar */}
        {result.stats.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            <StatBadge label="Total" value={result.stats.total} color="slate" />
            <StatBadge label="Added" value={result.stats.byType.ADDED} color="emerald" />
            <StatBadge label="Removed" value={result.stats.byType.REMOVED} color="rose" />
            <StatBadge label="Modified" value={result.stats.byType.MODIFIED} color="amber" />
            <StatBadge label="High" value={result.stats.bySignificance.HIGH} color="red" />
            <StatBadge label="Medium" value={result.stats.bySignificance.MEDIUM} color="orange" />
          </div>
        )}

        {/* Summary */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 shadow-sm">
          <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-3">
            Executive Summary
          </h3>
          <p className="text-slate-200 text-sm leading-relaxed">{result.summary}</p>
        </section>

        {/* Filters */}
        {result.changes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <FilterButton active={filterType === "ALL"} onClick={() => setFilterType("ALL")}>All Types</FilterButton>
            <FilterButton active={filterType === "ADDED"} onClick={() => setFilterType("ADDED")} color="emerald">Added</FilterButton>
            <FilterButton active={filterType === "REMOVED"} onClick={() => setFilterType("REMOVED")} color="rose">Removed</FilterButton>
            <FilterButton active={filterType === "MODIFIED"} onClick={() => setFilterType("MODIFIED")} color="amber">Modified</FilterButton>
            <div className="w-px bg-white/10 mx-1"></div>
            <FilterButton active={filterSig === "ALL"} onClick={() => setFilterSig("ALL")}>All Significance</FilterButton>
            <FilterButton active={filterSig === "HIGH"} onClick={() => setFilterSig("HIGH")} color="red">High</FilterButton>
            <FilterButton active={filterSig === "MEDIUM"} onClick={() => setFilterSig("MEDIUM")} color="orange">Medium</FilterButton>
            <FilterButton active={filterSig === "LOW"} onClick={() => setFilterSig("LOW")} color="slate">Low</FilterButton>
          </div>
        )}

        {/* Inline legend */}
        <InlineLegend />

        {/* Changes list */}
        {result.changes.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
            <p className="text-slate-400 font-medium text-lg mb-2">No Differences Detected</p>
            <p className="text-slate-600 text-sm">These documents are substantively identical.</p>
          </div>
        ) : filteredChanges.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
            <p className="text-slate-500 text-sm">No changes match the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 uppercase tracking-wider">
              Showing {filteredChanges.length} of {result.changes.length} changes
            </p>
            {filteredChanges.map((change) => (
              <ChangeCard
                key={change.id}
                change={change}
                documentAName={documentAName}
                documentBName={documentBName}
                onCitationClick={onCitationClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    slate: "border-white/10 text-slate-300",
    emerald: "border-emerald-500/20 text-emerald-400",
    rose: "border-rose-500/20 text-rose-400",
    amber: "border-amber-500/20 text-amber-400",
    red: "border-red-500/20 text-red-400",
    orange: "border-orange-500/20 text-orange-400",
  };

  return (
    <div
      className={`bg-white/3 border rounded-lg p-3 text-center ${colorMap[color] || colorMap.slate}`}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-70 mt-0.5">{label}</div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  const activeColors: Record<string, string> = {
    emerald: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
    rose: "bg-rose-500/20 border-rose-500/40 text-rose-300",
    amber: "bg-amber-500/20 border-amber-500/40 text-amber-300",
    red: "bg-red-500/20 border-red-500/40 text-red-300",
    orange: "bg-orange-500/20 border-orange-500/40 text-orange-300",
    slate: "bg-slate-500/20 border-slate-500/40 text-slate-300",
  };

  const activeStyle = active
    ? (color ? activeColors[color] : "bg-white/10 border-white/20 text-white")
    : "bg-transparent border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20";

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${activeStyle}`}
    >
      {children}
    </button>
  );
}

function ChangeCard({
  change,
  documentAName,
  documentBName,
  onCitationClick,
}: {
  change: ComparisonChange;
  documentAName: string;
  documentBName: string;
  onCitationClick?: (citation: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const typeColors: Record<string, string> = {
    ADDED: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    REMOVED: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    MODIFIED: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  };

  const sigColors: Record<string, string> = {
    HIGH: "text-red-400 bg-red-500/5 border-red-500/20",
    MEDIUM: "text-amber-400 bg-amber-500/5 border-amber-500/20",
    LOW: "text-slate-400 bg-slate-500/5 border-slate-500/20",
  };

  return (
    <div className="bg-[#131316] border border-white/5 rounded-xl overflow-hidden shadow-md">
      {/* Header row */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full p-5 text-left flex justify-between items-start gap-4 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${typeColors[change.type]}`}>
            {change.type}
          </span>
          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 border ${sigColors[change.significance]}`}>
            {change.significance}
          </span>

          {/* Specialized change badges */}
          {change.moneyChanges.length > 0 && (
            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex-shrink-0">
              💰 Money
            </span>
          )}
          {change.dateChanges.length > 0 && (
            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 flex-shrink-0">
              📅 Date
            </span>
          )}
          {change.numberChanges.length > 0 && (
            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex-shrink-0">
              # Number
            </span>
          )}

          {/* Short preview of the change */}
          <p className="text-slate-300 text-xs truncate min-w-0">
            {change.aiExplanation
              ? change.aiExplanation.substring(0, 120)
              : ((change.beforeText || change.afterText || "").substring(0, 120))}
          </p>
        </div>
        <span className="text-slate-600 flex-shrink-0 text-sm">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Expandable detail */}
      {expanded && (
        <div className="px-5 pb-6 space-y-4 border-t border-white/5 pt-4">
          {/* AI Explanation */}
          {change.aiExplanation && (
            <div className="bg-white/3 border border-white/8 rounded-lg p-4">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">
                AI Analysis
              </p>
              <p className="text-sm text-slate-200 leading-relaxed">{change.aiExplanation}</p>
              {change.affectedParty && (
                <p className="text-xs text-slate-500 mt-2">
                  Affected party: <span className="text-slate-300">{change.affectedParty}</span>
                </p>
              )}
            </div>
          )}

          {/* Money change breakdown */}
          {change.moneyChanges.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {change.moneyChanges.map((m, i) => (
                <div key={i} className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest mb-1.5">
                    Monetary Change
                  </p>
                  <div className="flex items-center gap-2 text-sm font-mono">
                    <span className="text-rose-300">{m.beforeRaw || "—"}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-emerald-300">{m.afterRaw || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Number change breakdown */}
          {change.numberChanges.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {change.numberChanges.map((n, i) => (
                <div key={i} className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                  <p className="text-[9px] font-bold text-cyan-500 uppercase tracking-widest mb-1.5">
                    Numeric Change {n.unit ? `(${n.unit})` : ""}
                  </p>
                  <div className="flex items-center gap-2 text-sm font-mono">
                    <span className="text-rose-300">{n.beforeRaw || "—"}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-emerald-300">{n.afterRaw || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Date change breakdown */}
          {change.dateChanges.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {change.dateChanges.map((d, i) => (
                <div key={i} className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                  <p className="text-[9px] font-bold text-purple-500 uppercase tracking-widest mb-1.5">
                    Date Change
                  </p>
                  <div className="flex items-center gap-2 text-sm font-mono">
                    <span className="text-rose-300">{d.beforeRaw || "—"}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-emerald-300">{d.afterRaw || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Token diff */}
          {change.tokenDiff.length > 0 && (
            <div className="bg-white/3 border border-white/8 rounded-lg p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Exact Diff
              </p>
              <p className="text-xs font-mono leading-relaxed break-words">
                {change.tokenDiff.map((tok, i) => {
                  if (tok.op === "equal")
                    return (
                      <span key={i} className="text-slate-400">
                        {tok.text}
                      </span>
                    );
                  if (tok.op === "delete")
                    return (
                      <span key={i} className="bg-rose-900/50 text-rose-300 line-through">
                        {tok.text}
                      </span>
                    );
                  return (
                    <span key={i} className="bg-emerald-900/50 text-emerald-300">
                      {tok.text}
                    </span>
                  );
                })}
              </p>
            </div>
          )}

          {/* Before / After quotes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Version A */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <p className="text-[10px] font-mono text-emerald-400/70 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {documentAName}
              </p>
              {change.beforeText ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 italic leading-relaxed line-clamp-6">
                    &ldquo;{(change.beforeQuote?.text || change.beforeText).substring(0, 400)}&rdquo;
                  </p>
                  {change.beforeLocation && (
                    <LocationBadge
                      location={change.beforeLocation}
                      verified={change.beforeQuote?.verified}
                      documentId={change.beforeLocation.chunkId}
                      onClick={() =>
                        onCitationClick &&
                        change.beforeLocation &&
                        onCitationClick({
                          documentId: change.beforeLocation.chunkId,
                          characterStart: change.beforeLocation.characterStart,
                          characterEnd: change.beforeLocation.characterEnd,
                        })
                      }
                    />
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-600 font-mono italic">
                  Not present in Version A (added in B).
                </p>
              )}
            </div>

            {/* Version B */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <p className="text-[10px] font-mono text-blue-400/70 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> {documentBName}
              </p>
              {change.afterText ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 italic leading-relaxed line-clamp-6">
                    &ldquo;{(change.afterQuote?.text || change.afterText).substring(0, 400)}&rdquo;
                  </p>
                  {change.afterLocation && (
                    <LocationBadge
                      location={change.afterLocation}
                      verified={change.afterQuote?.verified}
                      documentId={change.afterLocation.chunkId}
                      onClick={() =>
                        onCitationClick &&
                        change.afterLocation &&
                        onCitationClick({
                          documentId: change.afterLocation.chunkId,
                          characterStart: change.afterLocation.characterStart,
                          characterEnd: change.afterLocation.characterEnd,
                        })
                      }
                    />
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-600 font-mono italic">
                  Not present in Version B (removed from A).
                </p>
              )}
            </div>
          </div>

          {/* Change ID for debugging */}
          <p className="text-[9px] text-slate-700 font-mono">{change.id}</p>
        </div>
      )}
    </div>
  );
}

function LocationBadge({
  location,
  verified,
  documentId,
  onClick,
}: {
  location: { page: number | null; characterStart: number; characterEnd: number };
  verified?: boolean;
  documentId: string;
  onClick: () => void;
}) {
  if (verified) {
    return (
      <button
        onClick={onClick}
        className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-[9px] uppercase font-bold tracking-wider text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
      >
        ✓ VERIFIED {location.page !== null ? `· PG ${location.page}` : ""}
      </button>
    );
  }
  return (
    <div
      className="px-2 py-1 bg-rose-500/5 border border-rose-500/30 rounded text-[9px] uppercase font-bold tracking-wider text-rose-400 flex items-center gap-1.5 opacity-80 cursor-help"
      title="Quote could not be algorithmically mapped to exact source characters."
    >
      ⚠ UNVERIFIED {location.page !== null ? `· PG ${location.page}` : ""}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Inline legend (collapsible)
// ──────────────────────────────────────────────────────────────

function InlineLegend() {
  const [open, setOpen] = useState(false);

  const TERMS = [
    // Change types
    {
      badge: "ADDED",
      color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      desc: "New clause/text that appears in Version B but was absent in Version A.",
    },
    {
      badge: "REMOVED",
      color: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      desc: "Clause/text that existed in Version A but has been deleted in Version B.",
    },
    {
      badge: "MODIFIED",
      color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      desc: "Clause present in both versions but with different wording, values, or dates.",
    },
    // Significance
    {
      badge: "HIGH",
      color: "bg-red-500/15 text-red-400 border-red-500/30",
      desc: "Core legal exposure — liability caps, payment obligations, termination rights, IP, governing law.",
    },
    {
      badge: "MEDIUM",
      color: "bg-orange-500/15 text-orange-400 border-orange-500/30",
      desc: "Procedural obligations — notice periods, schedules, operational requirements, renewal terms.",
    },
    {
      badge: "LOW",
      color: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      desc: "Minor wording or formatting differences with limited substantive legal impact.",
    },
    // Specialized
    {
      badge: "💰 MONEY",
      color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
      desc: "A monetary amount (e.g. $100,000 → $250,000) changed between versions.",
    },
    {
      badge: "📅 DATE",
      color: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      desc: "A date, year, or deadline changed between versions.",
    },
    {
      badge: "# NUMBER",
      color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
      desc: "A numeric value with context (e.g. 30 days → 60 days, 5% → 10%) changed.",
    },
  ];

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-[10px] text-slate-500 hover:text-slate-300 uppercase tracking-widest font-semibold transition-colors group"
      >
        <span
          className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        <span>Legend — what do these badges mean?</span>
      </button>

      {open && (
        <div className="mt-3 bg-[#111114] border border-white/8 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TERMS.map((t) => (
            <div key={t.badge} className="flex items-start gap-2.5">
              <span
                className={`flex-shrink-0 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider mt-0.5 ${t.color}`}
              >
                {t.badge}
              </span>
              <span className="text-[11px] text-slate-400 leading-relaxed">{t.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

