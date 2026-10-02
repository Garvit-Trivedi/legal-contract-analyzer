"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChatWindow } from "@/components/ChatWindow";
import { DocumentViewer } from "@/components/DocumentViewer";
import { getConversations } from "@/lib/ai/chat.actions";
import { deleteDocument } from "@/lib/document/actions";
import { useRouter } from "next/navigation";

function friendlyType(fileType: string | null | undefined) {
  if (!fileType) return "TXT";
  if (fileType.includes("pdf")) return "PDF";
  if (fileType.includes("wordprocessingml") || fileType.includes("docx")) return "DOCX";
  return fileType.split("/").pop()?.toUpperCase() ?? "TXT";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentWorkspace({ document }: { document: any }) {
  return (
    <Suspense fallback={
      <div className="h-full bg-[#09090b] flex items-center justify-center text-zinc-500 text-sm">
        Loading workspace…
      </div>
    }>
      <DocumentWorkspaceContent document={document} />
    </Suspense>
  );
}

function DocumentWorkspaceContent({ document }: { document: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initConv = searchParams.get("conv") as string | null;

  const [activeCitation, setActiveCitation] = useState<any | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initConv);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const ft = friendlyType(document.fileType);
  const isIndexed = document.processingStatus === "completed" && document.indexingStatus === "completed";

  const fetchConversations = useCallback(async () => {
    const allConvs = await getConversations();
    // Strict document isolation: only conversations exclusively for this document
    const docConvs = allConvs.filter(
      (c) =>
        c.conversationDocuments.length === 1 &&
        c.conversationDocuments[0].documentId === document.id
    );
    setConversations(docConvs);
  }, [document.id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleCitationClick = (citation: any) => {
    setActiveCitation({ ...citation, t: Date.now() });
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    await deleteDocument(document.id);
    router.push("/");
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-300 overflow-hidden">
      {/* ─── STICKY DOCUMENT HEADER ─────────────────────── */}
      <header className="h-14 border-b border-white/10 bg-[#09090b] flex items-center justify-between px-5 shrink-0 z-20 relative">
        {/* Left: breadcrumb + document identity */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors shrink-0 font-medium"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            Documents
          </Link>
          <span className="text-zinc-700 text-xs">/</span>

          <div className="flex items-center gap-2 min-w-0">
            {/* Type badge */}
            <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
              ft === "PDF" ? "bg-red-500/15 text-red-400 border border-red-500/20" :
              ft === "DOCX" ? "bg-blue-500/15 text-blue-400 border border-blue-500/20" :
              "bg-zinc-500/15 text-zinc-400 border border-zinc-500/20"
            }`}>
              {ft}
            </span>
            <h1 className="text-sm font-medium text-zinc-100 truncate max-w-xs" title={document.filename}>
              {document.filename}
            </h1>
          </div>

          <div className="flex items-center gap-2 ml-1 shrink-0">
            <span className="text-[10px] text-zinc-500">{formatBytes(document.fileSize)}</span>
            <span className="text-zinc-700">·</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${isIndexed ? "text-emerald-400" : "text-amber-400"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isIndexed ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`}></span>
              {isIndexed ? "Indexed" : "Processing"}
            </span>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/compare?docA=${document.id}`}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-md transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            Compare
          </Link>

          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setMoreOpen(v => !v)}
              className="w-8 h-8 rounded-md border border-white/10 hover:border-white/20 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
              aria-label="More actions"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01" /></svg>
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-[#1a1a1e] border border-white/10 rounded-lg shadow-xl z-50 py-1" role="menu">
                <button
                  onClick={() => { setMoreOpen(false); setShowDeleteModal(true); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Delete document
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── MAIN 3-PANEL BODY ───────────────────────────── */}
      <main className="flex-1 flex overflow-hidden min-h-0">

        {/* ── LEFT: Document Sidebar ── */}
        <aside className={`flex-shrink-0 border-r border-white/10 bg-[#0d0d10] flex flex-col transition-all duration-200 ${leftCollapsed ? "w-10" : "w-52"}`}>
          <div className={`flex items-center justify-between p-3 border-b border-white/10 shrink-0 ${leftCollapsed ? "justify-center" : ""}`}>
            {!leftCollapsed && <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Document</span>}
            <button
              onClick={() => setLeftCollapsed(v => !v)}
              className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
              aria-label={leftCollapsed ? "Expand panel" : "Collapse panel"}
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${leftCollapsed ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m15 18-6-6 6-6" /></svg>
            </button>
          </div>

          {!leftCollapsed && (
            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-2 mb-2 mt-1">Navigation</p>
              <a href="#doc-top" className="flex items-center gap-2 px-2 py-2 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Overview
              </a>
              <a href="#doc-top" className="flex items-center gap-2 px-2 py-2 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                Full Text
              </a>

              <div className="my-3 border-t border-white/5"></div>
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-2 mb-2">Document info</p>
              <div className="px-2 space-y-2">
                <div>
                  <p className="text-[10px] text-zinc-600 mb-0.5">Type</p>
                  <p className="text-xs text-zinc-300 font-medium">{ft}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-600 mb-0.5">Size</p>
                  <p className="text-xs text-zinc-300">{formatBytes(document.fileSize)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-600 mb-0.5">Added</p>
                  <p className="text-xs text-zinc-300">{new Date(document.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-600 mb-0.5">Status</p>
                  <p className={`text-xs font-medium ${isIndexed ? "text-emerald-400" : "text-amber-400"}`}>
                    {isIndexed ? "Indexed & Ready" : "Processing…"}
                  </p>
                </div>
              </div>

              {conversations.length > 0 && (
                <>
                  <div className="my-3 border-t border-white/5"></div>
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-2 mb-2">
                    Conversations ({conversations.length})
                  </p>
                  <ul className="space-y-0.5">
                    {conversations.map(conv => (
                      <li key={conv.id}>
                        <button
                          onClick={() => setActiveConversationId(conv.id)}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors truncate ${
                            activeConversationId === conv.id
                              ? "bg-blue-500/15 text-blue-300 font-medium"
                              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                          }`}
                        >
                          {conv.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </nav>
          )}
        </aside>

        {/* ── CENTER: Document Viewer ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#111113]">
          <DocumentViewer
            documentId={document.id}
            characterStart={activeCitation?.characterStart ?? null}
            characterEnd={activeCitation?.characterEnd ?? null}
            key={`viewer-${document.id}-${activeCitation?.t ?? "null"}`}
            onClose={() => setActiveCitation(null)}
          />
        </div>

        {/* ── RIGHT: AI Chat Panel ── */}
        <div className="w-[400px] xl:w-[440px] shrink-0 border-l border-white/10 flex flex-col bg-[#09090b] overflow-hidden">
          <ChatPanel
            document={document}
            conversations={conversations}
            activeConversationId={activeConversationId}
            setActiveConversationId={setActiveConversationId}
            onCitationClick={handleCitationClick}
            onConversationCreated={(id) => {
              setActiveConversationId(id);
              fetchConversations();
            }}
          />
        </div>
      </main>

      {/* ─── Delete confirmation modal ─── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-[#1a1a1e] border border-white/10 rounded-xl p-6 shadow-2xl w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold text-white mb-2">Delete document?</h2>
            <p className="text-sm text-zinc-400 mb-1">
              <span className="text-zinc-200 font-medium">{document.filename}</span>
            </p>
            <p className="text-xs text-zinc-500 mb-6">This will permanently remove the document, its extracted content, embeddings, conversations, and citations.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 rounded-md transition-colors">Cancel</button>
              <button onClick={handleDeleteConfirm} disabled={deleting} className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-md transition-colors">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Chat Panel Subcomponent ─────────────────────────── */
function ChatPanel({
  document,
  conversations,
  activeConversationId,
  setActiveConversationId,
  onCitationClick,
  onConversationCreated,
}: {
  document: any;
  conversations: any[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  onCitationClick: (citation: any) => void;
  onConversationCreated: (id: string) => void;
}) {
  const [tab, setTab] = useState<"chat" | "history">("chat");
  const ft = friendlyType(document.fileType);

  return (
    <>
      {/* Panel Header */}
      <div className="border-b border-white/10 shrink-0">
        <div className="px-4 pt-3 pb-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <span className="text-xs font-semibold text-zinc-100">AI Assistant</span>
          </div>
          <button
            onClick={() => setActiveConversationId(null)}
            className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            New chat
          </button>
        </div>

        {/* Source badge */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-1.5 bg-zinc-800/60 border border-white/[0.07] rounded-md px-2.5 py-1.5">
            <span className={`shrink-0 inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold uppercase ${
              ft === "PDF" ? "bg-red-500/15 text-red-400" :
              ft === "DOCX" ? "bg-blue-500/15 text-blue-400" :
              "bg-zinc-500/15 text-zinc-400"
            }`}>{ft}</span>
            <span className="text-xs text-zinc-300 truncate" title={document.filename}>{document.filename}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-white/10">
          {(["chat", "history"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-medium transition-colors capitalize border-b-2 ${
                tab === t
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t === "chat" ? "Chat" : `History (${conversations.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Tab */}
      {tab === "chat" ? (
        <div className="flex-1 overflow-hidden">
          <ChatWindow
            documentIds={[document.id]}
            conversationId={activeConversationId}
            documentsMap={{ [document.id]: document.filename }}
            onConversationCreated={onConversationCreated}
            onCitationClick={onCitationClick}
          />
        </div>
      ) : (
        /* History Tab */
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <svg className="w-8 h-8 text-zinc-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <p className="text-sm text-zinc-400 font-medium mb-1">No conversations yet</p>
              <p className="text-xs text-zinc-600">Ask a question to start your first conversation.</p>
              <button onClick={() => setTab("chat")} className="mt-4 text-xs text-blue-400 hover:text-blue-300 font-medium">
                Start a conversation →
              </button>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => { setActiveConversationId(conv.id); setTab("chat"); }}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  activeConversationId === conv.id
                    ? "bg-blue-500/10 border-blue-500/30"
                    : "bg-[#111115] border-white/[0.07] hover:border-white/15"
                }`}
              >
                <p className={`text-xs font-medium truncate mb-1 ${activeConversationId === conv.id ? "text-blue-300" : "text-zinc-200"}`}>
                  {conv.title}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {new Date(conv.updatedAt).toLocaleDateString()} · {new Date(conv.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </>
  );
}
