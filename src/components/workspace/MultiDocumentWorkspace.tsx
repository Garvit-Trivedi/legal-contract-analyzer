"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChatWindow } from "@/components/ChatWindow";
import { DocumentViewer } from "@/components/DocumentViewer";
import { useRouter } from "next/navigation";

export function MultiDocumentWorkspace({ 
  documents, 
  conversationId, 
  title,
  allConversations
}: { 
  documents: any[];
  conversationId: string | null;
  title: string;
  allConversations: any[];
}) {
  const router = useRouter();
  const [activeCitation, setActiveCitation] = useState<any | null>(null);

  const documentIds = documents.map(d => d.id);

  const handleCitationClick = (citation: any) => {
    setActiveCitation({ ...citation, t: Date.now() });
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-300 overflow-hidden">
      {/* HEADER */}
      <header className="h-14 border-b border-white/10 bg-[#09090b] flex items-center justify-between px-5 shrink-0 z-20 relative">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors shrink-0 font-medium"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            Dashboard
          </Link>
          <span className="text-zinc-700 text-xs">/</span>
          <h1 className="text-sm font-medium text-zinc-100 truncate">
            {title}
          </h1>
          <div className="flex items-center gap-1.5 ml-2">
             <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">
               Multi-Document
             </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden min-h-0">
         {/* CENTER: Main Chat Interface */}
         <div className="flex-1 flex flex-col bg-[#0b0b0e] relative border-r border-white/10">
            {/* Source Document Context Bar */}
            <div className="bg-[#111115] border-b border-white/5 p-4 shrink-0 flex flex-col items-center">
               <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-3">Active Sources ({documents.length})</p>
               <div className="flex flex-wrap justify-center gap-2 max-w-3xl">
                 {documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-1.5 bg-zinc-800/50 border border-white/10 rounded-md px-2 py-1">
                      <span className="text-[9px] font-bold uppercase text-zinc-400">{doc.fileType || 'TXT'}</span>
                      <span className="text-xs text-zinc-300 max-w-[200px] truncate" title={doc.filename}>{doc.filename}</span>
                    </div>
                 ))}
               </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
               <ChatWindow
                 documentIds={documentIds}
                 conversationId={conversationId}
                 documentsMap={documents.reduce((acc, d) => ({...acc, [d.id]: d.filename}), {})}
                 onConversationCreated={(id) => {
                    router.replace(`/chat/${id}`);
                 }}
                 onCitationClick={handleCitationClick}
               />
            </div>
         </div>

         {/* RIGHT/SIDE PANEL: Document Viewer for Citations */}
         {activeCitation && (
            <div className="w-[450px] xl:w-[500px] flex-shrink-0 bg-[#0f0f11] z-20 relative">
                <DocumentViewer 
                  documentId={activeCitation.documentId}
                  characterStart={activeCitation.characterStart}
                  characterEnd={activeCitation.characterEnd}
                  onClose={() => setActiveCitation(null)}
                  key={`viewer-${activeCitation.t}`}
                />
            </div>
         )}
      </main>
    </div>
  );
}
