"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChatWindow } from "@/components/ChatWindow";
import { DocumentViewer } from "@/components/DocumentViewer";
import { getConversations } from "@/lib/ai/chat.actions";

export function DocumentWorkspace({ document }: { document: any }) {
  return (
    <Suspense fallback={<div className="h-screen bg-[#0a0a0b] flex items-center justify-center">Loading Workspace...</div>}>
      <DocumentWorkspaceContent document={document} />
    </Suspense>
  );
}

function DocumentWorkspaceContent({ document }: { document: any }) {
  const searchParams = useSearchParams();
  const initConv = searchParams.get("conv") as string | null;

  const [activeCitation, setActiveCitation] = useState<any | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initConv);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch only conversations relevant to this exact document
  const fetchConversations = async () => {
    const allConvs = await getConversations();
    // Filter to ones mapping EXACTLY to this document, or at least including it if we allow multi
    // Since UI requests strict isolation, we filter for single-document convs matching this
    const docConvs = allConvs.filter(c => 
      c.conversationDocuments.length === 1 && 
      c.conversationDocuments[0].documentId === document.id
    );
    setConversations(docConvs);
  };

  useEffect(() => {
    fetchConversations();
  }, [document.id]);

  const handleCitationClick = (citation: any) => {
    // When a citation is clicked in the chat, it opens inside the Document Viewer 
    // DocumentViewer already scrolls/scrollIntoView inside itself!
    setActiveCitation({
      ...citation,
      t: Date.now() // force re-trigger if same citation clicked twice
    });
  };
  
  const startNewChat = () => {
    setActiveConversationId(null);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0b] text-slate-300 font-sans tracking-tight overflow-hidden">
      {/* Top Header / Breadcrumbs */}
      <header className="h-14 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md flex items-center justify-between px-6 flex-shrink-0 z-20 relative">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1.5 font-medium">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Documents
          </Link>
          <span className="text-slate-600">/</span>
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-sm flex items-center justify-center font-bold text-[8px] ${
              document.fileType === 'pdf' ? 'bg-rose-500/10 text-rose-500' :
              document.fileType === 'docx' ? 'bg-blue-500/10 text-blue-500' :
              'bg-slate-500/10 text-slate-400'
            }`}>
              {document.fileType?.toUpperCase() || 'TXT'}
            </div>
            <h1 className="text-sm font-medium text-slate-200">{document.filename}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
            {document.indexingStatus === 'completed' ? '✓ Indexed' : 'Processing'}
          </span>
          <div className="w-px h-4 bg-white/10 mx-1"></div>
          <button 
             onClick={() => setSidebarOpen(!sidebarOpen)}
             className="text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 transition-colors border border-white/10 rounded-md"
          >
             {sidebarOpen ? 'Hide History' : 'Chat History'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Document Viewer (60%) */}
        <div className="w-[60%] border-r border-white/5 bg-[#0f0f11] relative z-10 flex flex-col h-full">
           <DocumentViewer 
             documentId={document.id} 
             characterStart={activeCitation?.characterStart}
             characterEnd={activeCitation?.characterEnd}
             // Use key to trigger re-renders or internal useEffect handling in existing component
             key={`viewer-${document.id}-${activeCitation?.t || 'null'}`}
             onClose={() => setActiveCitation(null)} 
           />
        </div>

        {/* Chat Interface (40%) */}
        <div className="w-[40%] flex flex-col bg-[#0a0a0b] relative z-10">
           {/* Chat Header */}
           <div className="px-6 py-4 border-b border-white/5 bg-[#0a0a0b] flex items-center justify-between">
              <div>
                 <h2 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                    AI Assistant
                 </h2>
                 <p className="text-[10px] text-slate-500">Ask questions about {document.filename}</p>
              </div>
              <button 
                onClick={startNewChat}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
              >
                <span>+</span> New Chat
              </button>
           </div>
           
           <div className="flex-1 overflow-hidden relative flex">
              {/* Optional Sidebar overlay inside chat area for histories */}
              {sidebarOpen && (
                <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#0f0f11] border-r border-white/5 z-20 flex flex-col custom-scrollbar overflow-y-auto">
                   <div className="p-4 border-b border-white/5">
                      <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Document Chat History</h3>
                   </div>
                   {conversations.length === 0 ? (
                     <div className="p-6 text-center">
                        <p className="text-xs text-slate-500 italic">No questions yet</p>
                     </div>
                   ) : (
                     <ul className="p-2 space-y-1">
                        {conversations.map(conv => (
                           <li key={conv.id}>
                              <button 
                                onClick={() => setActiveConversationId(conv.id)}
                                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                  activeConversationId === conv.id 
                                    ? 'bg-amber-500/10 border-amber-500/30' 
                                    : 'bg-transparent border-transparent hover:bg-white/5'
                                }`}
                              >
                                 <p className={`text-xs truncate ${activeConversationId === conv.id ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
                                    {conv.title}
                                 </p>
                                 <p className="text-[9px] text-slate-600 mt-1 whitespace-nowrap">
                                    {new Date(conv.updatedAt).toLocaleDateString()}
                                 </p>
                              </button>
                           </li>
                        ))}
                     </ul>
                   )}
                </div>
              )}

              {/* Chat View */}
              <div className="flex-1 w-full h-full relative z-10 transition-all">
                <ChatWindow 
                  documentIds={[document.id]}
                  conversationId={activeConversationId}
                  onConversationCreated={(id) => {
                     setActiveConversationId(id);
                     fetchConversations();
                  }}
                  onCitationClick={handleCitationClick}
                />
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
