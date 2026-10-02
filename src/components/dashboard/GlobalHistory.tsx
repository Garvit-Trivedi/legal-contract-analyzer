"use client";

import React from "react";
import Link from "next/link";
import { DocumentDeleteButton } from "@/components/DocumentDeleteButton"; 

export function GlobalHistory({ documents, conversations }: { documents: any[], conversations: any[] }) {
  const sorted = [...conversations].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="flex-1 bg-[#09090b] text-zinc-300 font-sans tracking-tight h-full overflow-y-auto custom-scrollbar">
      <main className="max-w-4xl mx-auto pt-10 pb-12 px-8">
         <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-2">Chat History</h2>
            <p className="text-sm text-zinc-400">Review your past conversations across all documents.</p>
         </div>

         {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-center border border-white/10 rounded-xl bg-[#18181b]">
              <p className="text-base font-medium text-white mb-1">No interactions logged</p>
              <p className="text-sm text-zinc-500">Open a document workspace and ask AI a question to start.</p>
           </div>
         ) : (
            <div className="space-y-3">
               {sorted.map(conv => {
                  const isMultiDoc = conv.conversationDocuments.length > 1;
                  
                  if (conv.conversationDocuments.length === 0) return null;
                  
                  const docIds = conv.conversationDocuments.map((m: any) => m.documentId);
                  const convDocs = documents.filter(d => docIds.includes(d.id));
                  
                  if (convDocs.length === 0) return null;

                  const url = isMultiDoc ? `/chat/${conv.id}` : `/documents/${convDocs[0].id}?conv=${conv.id}`;

                  return (
                     <Link 
                        key={conv.id} 
                        href={url}
                        className="block bg-[#18181b] border border-white/5 rounded-lg p-5 hover:border-white/20 transition-all group shadow-sm"
                     >
                        <div className="flex justify-between items-start mb-2">
                           <h3 className="text-sm font-medium text-zinc-200 group-hover:text-blue-400 transition-colors">
                             {isMultiDoc && <span className="mr-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">Multi</span>}
                             {conv.title}
                           </h3>
                           <span className="text-xs text-zinc-500 shrink-0 ml-4">
                              {new Date(conv.updatedAt).toLocaleDateString()} {new Date(conv.updatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                           </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                           <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                           <span className="truncate">
                             {isMultiDoc 
                               ? `${convDocs.length} documents attached` 
                               : convDocs[0].filename}
                           </span>
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
