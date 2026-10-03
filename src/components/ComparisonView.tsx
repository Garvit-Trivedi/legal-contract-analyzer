"use client";

import React, { useState, useEffect, useRef } from "react";
import { ComparisonResult, ComparisonChange, ChangeSignificanceV2 } from "@/types/comparison";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ChatWindow } from "@/components/ChatWindow";

export function ComparisonView({
  documentAId,
  documentBId,
  documentAName = "Document A",
  documentBName = "Document B",
}: {
  documentAId: string;
  documentBId: string;
  documentAName?: string;
  documentBName?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<string>("");
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<"ALL" | "ADDED" | "REMOVED" | "MODIFIED">("ALL");
  const [filterSig, setFilterSig] = useState<"ALL" | ChangeSignificanceV2>("ALL");

  // Selection state
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);

  // Synchronized scrolling refs
  const paneARef = useRef<HTMLDivElement>(null);
  const paneBRef = useRef<HTMLDivElement>(null);
  const isHoveringA = useRef(false);
  const isHoveringB = useRef(false);

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
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0b]">
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
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0b] text-center">
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

  // Derived active change state
  const activeIndex = filteredChanges.findIndex(c => c.id === selectedChangeId);
  const activeChange = activeIndex >= 0 ? filteredChanges[activeIndex] : null;

  const handleNext = () => {
    if (activeIndex < filteredChanges.length - 1) {
      setSelectedChangeId(filteredChanges[activeIndex + 1].id);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setSelectedChangeId(filteredChanges[activeIndex - 1].id);
    }
  };

  // Build header stats safely
  const aStat = {
    adds: result.stats.byType.ADDED,
    dels: result.stats.byType.REMOVED,
    mods: result.stats.byType.MODIFIED
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-[#09090b] text-zinc-300">
      {/* Metrics Row */}
      <div className="flex gap-4 p-5 border-b border-white/10 shrink-0 bg-[#0b0b0e] overflow-x-auto custom-scrollbar">
         <MetricCard label="TOTAL CLAUSES" value={result.stats.total} color="text-white" borderClr="border-white/10" />
         <MetricCard label="SUBSTANTIVE CHANGES" value={aStat.mods} color="text-amber-500" borderClr="border-amber-500/20" />
         <MetricCard label="HIGH RISK IMPACT" value={filteredChanges.filter(c => c.significance === 'HIGH').length} color="text-red-500" borderClr="border-red-500/20" />
         <MetricCard label="ADDED CLAUSES" value={`+${aStat.adds}`} color="text-emerald-500" borderClr="border-emerald-500/20" />
         <MetricCard label="DELETED CLAUSES" value={`-${aStat.dels}`} color="text-slate-400" borderClr="border-slate-500/20" />
      </div>

      {/* 4-Column Layout Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Sidebar (List of Changes) */}
        <aside className="w-[300px] xl:w-[320px] flex-shrink-0 flex flex-col bg-[#0d0d0f] z-20 border-r border-white/10">
          
          {/* Sidebar Filter Area */}
          <div className="p-4 border-b border-white/10 shrink-0 bg-[#0f0f11]">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-semibold text-white">Detected Changes</h3>
               {filteredChanges.length > 0 && (
                 <div className="flex items-center gap-1">
                   <button onClick={handlePrev} disabled={activeIndex <= 0} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-zinc-400 disabled:opacity-30 transition-colors" title="Previous Change">
                     <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 18l-6-6 6-6" /></svg>
                   </button>
                   <span className="text-[10px] font-mono text-zinc-500 w-10 text-center">
                     {activeIndex >= 0 ? activeIndex + 1 : 0}/{filteredChanges.length}
                   </span>
                   <button onClick={handleNext} disabled={activeIndex === -1 || activeIndex >= filteredChanges.length - 1} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-zinc-400 disabled:opacity-30 transition-colors" title="Next Change">
                     <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 18l6-6-6-6" /></svg>
                   </button>
                 </div>
               )}
             </div>

             {/* Simple Filters */}
             <div className="flex flex-wrap gap-1.5">
               <FilterButton active={filterType === "ALL"} onClick={() => { setFilterType("ALL"); setSelectedChangeId(null); }}>All</FilterButton>
               <FilterButton active={filterType === "ADDED"} onClick={() => { setFilterType("ADDED"); setSelectedChangeId(null); }} color="emerald">Added</FilterButton>
               <FilterButton active={filterType === "REMOVED"} onClick={() => { setFilterType("REMOVED"); setSelectedChangeId(null); }} color="rose">Removed</FilterButton>
               <FilterButton active={filterType === "MODIFIED"} onClick={() => { setFilterType("MODIFIED"); setSelectedChangeId(null); }} color="amber">Modified</FilterButton>
             </div>
          </div>

          {/* Change List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {filteredChanges.length === 0 ? (
               <p className="text-xs text-zinc-500 text-center p-4">No changes match criteria.</p>
            ) : (
              filteredChanges.map((change, idx) => (
                <SidebarChangeCard 
                  key={change.id} 
                  idx={idx + 1}
                  change={change} 
                  isSelected={change.id === selectedChangeId} 
                  onClick={() => setSelectedChangeId(change.id)} 
                />
              ))
            )}
          </div>
        </aside>

        {/* Viewers Area */}
        <div className="flex-1 flex min-w-0">
           {/* Pane A */}
           <div className="flex-1 border-r border-white/10 flex flex-col min-w-0">
             <div className="h-11 bg-[#16161a] border-b border-white/5 flex items-center justify-center shrink-0">
               <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-emerald-500/70 truncate px-4" title={documentAName}>Version A: {documentAName}</span>
             </div>
             <div className="flex-1 relative flex flex-col min-h-0">
                <DocumentViewer 
                  documentId={documentAId} 
                  characterStart={activeChange?.beforeLocation?.characterStart ?? null}
                  characterEnd={activeChange?.beforeLocation?.characterEnd ?? null}
                  highlightColor={activeChange?.type === "REMOVED" ? "rose" : "amber"}
                  onClose={() => setSelectedChangeId(null)}
                />
             </div>
           </div>

           {/* Pane B */}
           <div className="flex-1 flex flex-col min-w-0">
             <div className="h-11 bg-[#16161a] border-b border-white/5 flex items-center justify-center shrink-0">
               <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-blue-500/70 truncate px-4" title={documentBName}>Version B: {documentBName}</span>
             </div>
             <div className="flex-1 relative flex flex-col min-h-0">
                <DocumentViewer 
                  documentId={documentBId} 
                  characterStart={activeChange?.afterLocation?.characterStart ?? null}
                  characterEnd={activeChange?.afterLocation?.characterEnd ?? null}
                  highlightColor={activeChange?.type === "ADDED" ? "emerald" : "amber"}
                  onClose={() => setSelectedChangeId(null)}
                />
             </div>
           </div>
        </div>

        {/* Right Panel - Comparison Assistant */}
        <div className="w-[340px] xl:w-[380px] flex-shrink-0 border-l border-white/10 flex flex-col bg-[#111115]">
          <div className="h-11 bg-[#16161a] border-b border-white/5 flex items-center justify-between px-4 shrink-0">
            <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              Comparison Assistant
            </span>
            <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold border border-white/10 px-1.5 py-0.5 rounded shadow-sm">Dual-Authority</span>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <ChatWindow 
              documentIds={[documentAId, documentBId]} 
              conversationId={null} 
              onConversationCreated={() => {}} 
              documentsMap={{[documentAId]: documentAName, [documentBId]: documentBName}} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Sidebar Change Card
// ──────────────────────────────────────────────────────────────

function SidebarChangeCard({
  idx,
  change,
  isSelected,
  onClick,
}: {
  idx: number,
  change: ComparisonChange;
  isSelected: boolean;
  onClick: () => void;
}) {
  const typeColors: Record<string, string> = {
    ADDED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    REMOVED: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    MODIFIED: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  const sigColors: Record<string, string> = {
    HIGH: "text-red-400 bg-red-500/10 border-red-500/20",
    MEDIUM: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    LOW: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  };

  // Preview text is AI explanation if available, otherwise raw diff or slice
  const previewText = change.aiExplanation || change.beforeText?.slice(0, 100) || change.afterText?.slice(0, 100) || "";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 outline-none focus-visible:ring-2 ring-blue-500 group ${
        isSelected 
          ? "bg-blue-500/5- border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)] bg-[#1a1a24]" 
          : "bg-[#16161a] border-white/5 hover:border-white/15 hover:bg-[#1c1c20]"
      }`}
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-zinc-500 mr-1">#{String(idx).padStart(2,'0')}</span>
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider flex-shrink-0 border ${typeColors[change.type]}`}>
            {change.type}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider flex-shrink-0 border ${sigColors[change.significance]}`}>
            {change.significance}
          </span>
        </div>
      </div>
      
      <p className={`text-xs leading-relaxed line-clamp-3 mb-2 min-w-0 ${isSelected ? 'text-zinc-200' : 'text-zinc-400'}`}>
        {previewText}
      </p>

      {/* Special Markers */}
      <div className="flex items-center gap-1.5 flex-wrap font-mono text-[9px] uppercase tracking-wider font-bold">
        {change.moneyChanges.length > 0 && <span className="text-yellow-500 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span> Money</span>}
        {change.dateChanges.length > 0 && <span className="text-purple-500 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> Date</span>}
        {change.numberChanges.length > 0 && <span className="text-cyan-500 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span> Number</span>}
      </div>

      {isSelected && change.tokenDiff.length > 0 && (
         <div className="mt-3 pt-3 border-t border-white/10 text-[10px] font-mono leading-relaxed break-words bg-black/20 p-2 rounded max-h-32 overflow-y-auto">
            {change.tokenDiff.map((tok, i) => {
              if (tok.op === "equal") return <span key={i} className="text-zinc-500">{tok.text}</span>;
              if (tok.op === "delete") return <span key={i} className="bg-rose-900/40 text-rose-300 line-through">{tok.text}</span>;
              return <span key={i} className="bg-emerald-900/40 text-emerald-300">{tok.text}</span>;
            })}
         </div>
      )}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

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
  };

  const activeStyle = active
    ? (color ? activeColors[color] : "bg-white/10 border-white/30 text-white")
    : "bg-transparent border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/20 hover:bg-white/5";

  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded border text-[10px] font-medium transition-all ${activeStyle}`}
    >
      {children}
    </button>
  );
}

function MetricCard({ label, value, color, borderClr }: { label: string, value: string | number, color: string, borderClr: string }) {
  return (
    <div className={`flex flex-col flex-1 min-w-[140px] px-4 py-3 bg-[#16161a] border ${borderClr} rounded-xl shadow-sm`}>
      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{label}</span>
      <span className={`text-xl font-bold ${color}`}>{value}</span>
    </div>
  );
}
