"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ComparisonView } from "@/components/ComparisonView";
import { DocumentViewer } from "@/components/DocumentViewer";

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
    <div className="flex-1 flex flex-col h-full bg-[#09090b] text-zinc-300 font-sans tracking-tight overflow-hidden">
      {mode === 'select' ? (
        <main className="flex-1 max-w-4xl mx-auto w-full pt-16 p-8 overflow-y-auto custom-scrollbar">
           <div className="text-center mb-12">
              <h2 className="text-2xl font-semibold text-white mb-3">Compare Documents</h2>
              <p className="text-sm text-zinc-400">Select two indexed documents to trigger automated semantic change discovery.</p>
           </div>
           
           <div className="grid grid-cols-2 gap-8 mb-12">
              <div className="bg-[#18181b] p-6 rounded-xl border border-white/10 shadow-sm">
                 <h3 className="text-xs font-semibold uppercase text-zinc-400 mb-4 pb-2 border-b border-white/10">Base Document</h3>
                 <select 
                    value={docA || ""}
                    onChange={e => setDocA(e.target.value)}
                    className="w-full bg-[#09090b] border border-white/10 rounded-md p-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50"
                 >
                    <option value="" disabled>-- Select First File --</option>
                    {documents.map(d => (
                       <option key={d.id} value={d.id} disabled={d.id === docB}>{d.filename}</option>
                    ))}
                 </select>
              </div>

              <div className="bg-[#18181b] p-6 rounded-xl border border-white/10 shadow-sm">
                 <h3 className="text-xs font-semibold uppercase text-zinc-400 mb-4 pb-2 border-b border-white/10">Target Document</h3>
                 <select 
                    value={docB || ""}
                    onChange={e => setDocB(e.target.value)}
                    className="w-full bg-[#09090b] border border-white/10 rounded-md p-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50"
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
                 className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-medium rounded-md transition-colors shadow-sm"
              >
                 Run Comparison
              </button>
           </div>
        </main>
      ) : (
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
