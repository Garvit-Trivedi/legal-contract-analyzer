"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ComparisonView } from "@/components/ComparisonView";
import { DocumentViewer } from "@/components/DocumentViewer"; // Need a fallback doc viewer?
// Actually if activeCitation triggers, we might want to pop up the document viewer here!
// Let's implement a dual-viewer or overlay.

export function ComparisonWorkflow({ documents }: { documents: any[] }) {
  const [docA, setDocA] = useState<string | null>(null);
  const [docB, setDocB] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'compare'>('select');
  const [activeCitation, setActiveCitation] = useState<any | null>(null);

  const startComparison = () => {
    if (docA && docB && docA !== docB) {
       setMode('compare');
    }
  };

  const aName = documents.find(d => d.id === docA)?.filename || "Document A";
  const bName = documents.find(d => d.id === docB)?.filename || "Document B";

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0b] text-slate-300 font-sans tracking-tight overflow-hidden">
      <header className="h-16 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md flex items-center justify-between px-8 absolute top-0 w-full z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1.5 font-medium">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Dashboard
          </Link>
          <span className="text-slate-600">/</span>
          <h1 className="text-sm font-semibold text-white uppercase tracking-widest">
            Cross-Document Alignment
          </h1>
        </div>
      </header>
      
      {mode === 'select' ? (
        <main className="flex-1 max-w-4xl mx-auto w-full pt-32 p-8">
           <div className="text-center mb-12">
              <h2 className="text-2xl font-light text-white mb-3">Compare Two Agreements</h2>
              <p className="text-sm text-slate-400">Select two documents to trigger automated Substantive Change discovery via AI.</p>
           </div>
           
           <div className="grid grid-cols-2 gap-8 mb-12">
              {/* Box A */}
              <div className="bg-[#131316] p-6 rounded-xl border border-white/10 shadow-lg">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-4 pb-2 border-b border-white/5">Select Document A</h3>
                 <select 
                    value={docA || ""}
                    onChange={e => setDocA(e.target.value)}
                    className="w-full bg-[#1c1c1f] border border-white/10 rounded-md p-3 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                 >
                    <option value="" disabled>-- Select First File --</option>
                    {documents.map(d => (
                       <option key={d.id} value={d.id} disabled={d.id === docB}>{d.filename}</option>
                    ))}
                 </select>
              </div>

              {/* Box B */}
              <div className="bg-[#131316] p-6 rounded-xl border border-white/10 shadow-lg">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-4 pb-2 border-b border-white/5">Select Document B</h3>
                 <select 
                    value={docB || ""}
                    onChange={e => setDocB(e.target.value)}
                    className="w-full bg-[#1c1c1f] border border-white/10 rounded-md p-3 text-sm text-white focus:outline-none focus:border-blue-500/50"
                 >
                    <option value="" disabled>-- Select Second File --</option>
                    {documents.map(d => (
                       <option key={d.id} value={d.id} disabled={d.id === docA}>{d.filename}</option>
                    ))}
                 </select>
              </div>
           </div>
           
           <div className="flex justify-center">
              <button 
                 disabled={!docA || !docB || docA === docB}
                 onClick={startComparison}
                 className="px-8 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-black font-bold uppercase tracking-widest rounded-full transition-colors shadow-lg"
              >
                 Initialize Comparison Engine
              </button>
           </div>
        </main>
      ) : (
        <main className="flex-1 flex overflow-hidden pt-16">
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
           
           {/* Slide out Reference viewer */}
           {activeCitation && (
              <div className="w-[450px] flex-shrink-0 bg-[#0f0f11] border-l border-white/5 z-20 shadow-2xl relative">
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
