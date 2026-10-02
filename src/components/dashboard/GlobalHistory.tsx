"use client";

import React from "react";
import Link from "next/link";
import { DocumentDeleteButton } from "@/components/DocumentDeleteButton"; // maybe chat delete?

export function GlobalHistory({ documents, conversations }: { documents: any[], conversations: any[] }) {
  // Sort conversations by most recent
  const sorted = [...conversations].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-slate-300 font-sans tracking-tight">
      <header className="h-16 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md flex items-center justify-between px-8 absolute top-0 w-full z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1.5 font-medium">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Dashboard
          </Link>
          <span className="text-slate-600">/</span>
          <h1 className="text-sm font-semibold text-white tracking-widest uppercase">
            Global Activity Logs
          </h1>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto pt-28 pb-12 px-8">
         <div className="mb-10">
            <h2 className="text-2xl font-light text-white mb-2">Chat History</h2>
            <p className="text-sm text-slate-400">Activity across all isolated document workspaces.</p>
         </div>

         {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
              <p className="text-lg font-medium text-white mb-2">No interactions logged</p>
              <p className="text-sm text-slate-400">Open a document workspace and ask AI a question.</p>
           </div>
         ) : (
            <div className="space-y-4">
               {sorted.map(conv => {
                  const docMapping = conv.conversationDocuments[0]; // assuming strictly 1-to-1 in new model
                  if (!docMapping) return null;
                  
                  const doc = documents.find(d => d.id === docMapping.documentId);
                  if (!doc) return null;

                  return (
                     <Link 
                        key={conv.id} 
                        href={`/documents/${doc.id}?conv=${conv.id}`}
                        className="block bg-[#131316] border border-white/5 rounded-xl p-5 hover:border-amber-500/30 hover:bg-white/5 transition-all group"
                     >
                        <div className="flex justify-between items-start mb-2">
                           <h3 className="text-base font-medium text-amber-500 group-hover:text-amber-400">{conv.title}</h3>
                           <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">
                              {new Date(conv.updatedAt).toLocaleDateString()} {new Date(conv.updatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                           </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                           {doc.filename}
                        </div>
                     </Link>
                  );
               })}
            </div>
         )}
      </main>
    </div>
  );
}
