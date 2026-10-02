"use client";

import React, { useState, useEffect, useRef } from "react";
import { ComparisonResult } from "@/types/comparison";

export function ComparisonView({
  documentAId,
  documentBId,
  documentAName = "Document A",
  documentBName = "Document B",
  onCitationClick
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

  useEffect(() => {
    runComparison();
    return () => stopComparison();
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
    setPhase("Initializing engine...");

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentAId, documentBId }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "An unexpected error occurred during comparison.");
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let readBuffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          readBuffer += decoder.decode(value, { stream: true });
          const lines = readBuffer.split('\\n');
          readBuffer = lines.pop() || "";
          
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              if (data.type === 'progress') {
                setPhase(data.phase);
              } else if (data.type === 'done') {
                setResult(data.result);
                setLoading(false);
              } else if (data.type === 'error') {
                throw new Error(data.error);
              } else if (data.error && !data.type) { 
                throw new Error(data.error);
              }
            } catch (e: any) {
              if (e.message && e.message !== "Unexpected end of JSON input") {
                 throw e;
              }
            }
          }
        }
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        console.log("Comparison aborted");
      } else {
        console.error("Comparison error:", e);
        setError(e.message);
      }
      setLoading(false);
    } finally {
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

  return (
    <div className="flex flex-col h-full bg-[#0a0a0b] overflow-y-auto custom-scrollbar relative z-10">
      <div className="p-8 max-w-4xl mx-auto w-full">
        <header className="mb-8 border-b border-white/10 pb-6">
          <h2 className="text-2xl font-light text-white mb-2">Automated Document Comparison</h2>
          <div className="flex items-center gap-4 text-sm font-mono text-slate-400">
             <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> A: {documentAName}</span>
             <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> B: {documentBName}</span>
          </div>
        </header>

        <section className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 shadow-sm">
          <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-3">Executive Summary</h3>
          <p className="text-slate-200 text-sm leading-relaxed">{result.summary}</p>
        </section>

        {result.changes.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
             <p className="text-slate-400 font-medium">No substantive contractual differences were detected.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Identified Substantive Changes</h3>
            {result.changes.map((change, idx) => (
              <div key={idx} className="bg-[#131316] border border-white/5 rounded-xl overflow-hidden shadow-md group">
                <div className="p-5">
                   <div className="flex justify-between flex-wrap gap-4 mb-3">
                      <div className="flex items-center gap-3">
                         <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                           change.changeType === 'added' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                           change.changeType === 'removed' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                           'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                         }`}>
                           {change.changeType}
                         </span>
                         <h4 className="text-base font-medium text-slate-200 capitalize">{change.topic}</h4>
                      </div>
                      
                      {change.significance && (
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                           change.significance === 'high' ? 'text-rose-500 bg-rose-500/5' : 
                           change.significance === 'medium' ? 'text-amber-500 bg-amber-500/5' : 
                           'text-slate-400 bg-slate-500/10'
                        }`}>
                          {change.significance} Risk
                        </span>
                      )}
                   </div>
                   
                   <p className="text-sm text-slate-300 leading-relaxed mb-5">{change.explanation}</p>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Document A Evidence */}
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                         <p className="text-[10px] font-mono text-emerald-400/70 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Document A
                         </p>
                         {change.documentA && change.documentA.quote ? (
                           <div className="space-y-3">
                             <p className="text-xs text-slate-400 italic">"{change.documentA.quote}"</p>
                             <CitationBadge citation={change.documentA} onClick={() => onCitationClick && onCitationClick(change.documentA)} />
                           </div>
                         ) : (
                           <p className="text-xs text-slate-600 font-mono italic">No relevant provision found.</p>
                         )}
                      </div>
                      
                      {/* Document B Evidence */}
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                         <p className="text-[10px] font-mono text-blue-400/70 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Document B
                         </p>
                         {change.documentB && change.documentB.quote ? (
                           <div className="space-y-3">
                             <p className="text-xs text-slate-400 italic">"{change.documentB.quote}"</p>
                             <CitationBadge citation={change.documentB} onClick={() => onCitationClick && onCitationClick(change.documentB)} />
                           </div>
                         ) : (
                           <p className="text-xs text-slate-600 font-mono italic">No relevant provision found.</p>
                         )}
                      </div>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CitationBadge({ citation, onClick }: { citation: any, onClick: () => void }) {
  if (citation.verified) {
    return (
      <button 
        onClick={onClick}
        className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-[9px] uppercase font-bold tracking-wider text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
      >
        ✓ VERIFIED {citation.pageStart !== undefined && citation.pageStart !== null ? `(PG ${citation.pageStart})` : ''}
      </button>
    );
  }
  return (
    <div className="px-2 py-1 bg-rose-500/5 border border-rose-500/30 rounded text-[9px] uppercase font-bold tracking-wider text-rose-400 flex items-center gap-1.5 opacity-80 cursor-help" title="Could not algorithmically map quote to exact source characters.">
      ⚠ UNVERIFIED
    </div>
  );
}
