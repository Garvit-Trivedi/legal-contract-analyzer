"use client";

import React, { useState, useEffect, useRef, Suspense, useCallback } from "react";
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
      <div className="h-full bg-[#F8F6F2] flex items-center justify-center text-[#77736D] text-sm">
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more-menu when clicking outside
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    // Use globalThis.document to avoid shadowing by the 'document' prop
    globalThis.document.addEventListener("mousedown", handler);
    return () => globalThis.document.removeEventListener("mousedown", handler);
  }, [moreOpen]);

  const ft = friendlyType(document.fileType);
  const isIndexed = document.processingStatus === "completed" && document.indexingStatus === "completed";

  const fetchConversations = useCallback(async () => {
    const allConvs = await getConversations();
    const docConvs = allConvs.filter(
      (c) =>
        c.conversationDocuments.length === 1 &&
        c.conversationDocuments[0].documentId === document.id
    );
    setConversations(docConvs);
    
    // Automatically select the most recent conversation if one exists and none is currently active
    if (!activeConversationId && docConvs.length > 0) {
      setActiveConversationId(docConvs[0].id);
    }
  }, [document.id, activeConversationId]);

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
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#F8F6F2", position: "relative" }}>
      
      {/* Background SVG Decoration */}
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        {/* Top-Right Decorative SVG */}
        <svg fill="none" viewBox="0 0 500 500" style={{ position: "absolute", top: "-50px", right: "-50px", width: "500px", height: "500px", opacity: 0.2 }}>
          <path d="M 0 100 Q 150 -50 300 150 T 600 50" stroke="#F47B20" strokeWidth="1.2" />
          <path d="M 0 120 Q 140 -20 280 170 T 580 80" stroke="#F47B20" strokeWidth="0.8" opacity="0.7" />
          <path d="M 0 140 Q 130 10 260 190 T 560 110" stroke="#F47B20" strokeWidth="0.5" opacity="0.4" />
          <path d="M 0 80 Q 160 -80 320 130 T 620 20" stroke="#111111" strokeWidth="0.5" opacity="0.2" />
        </svg>
        {/* Bottom-left Decorative SVG */}
        <svg fill="none" viewBox="0 0 400 400" style={{ position: "absolute", bottom: "-50px", left: "-50px", width: "400px", height: "400px", opacity: 0.15 }}>
          <path d="M 0 350 Q 150 250 300 350 T 500 200" stroke="#F47B20" strokeWidth="1.2" />
          <path d="M 0 370 Q 160 270 320 370 T 520 220" stroke="#F47B20" strokeWidth="0.8" opacity="0.6" />
          <path d="M 0 390 Q 170 290 340 390 T 540 240" stroke="#F47B20" strokeWidth="0.5" opacity="0.3" />
        </svg>
      </div>

      {/* ─── STICKY DOCUMENT HEADER ─────────────────────── */}
      <header style={{
        height: "72px",
        background: "#FFFFFF",
        borderBottom: "1px solid #E8E4DE",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        flexShrink: 0,
        zIndex: 20
      }}>
        {/* Left: breadcrumb + document identity */}
        <div className="flex items-center gap-3 min-w-0" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
          <Link
            href="/"
            className="flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
            style={{ fontSize: "14px", fontWeight: 500, color: "#5E5A54", transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#111111"}
            onMouseLeave={e => e.currentTarget.style.color = "#5E5A54"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            Documents
          </Link>
          <span style={{ color: "#E8E4DE" }}>/</span>

          <div className="flex items-center gap-3 min-w-0">
            {/* Type badge */}
            <span style={{ 
              background: "#EAF3FF", 
              color: "#1677FF", 
              padding: "4px 8px", 
              borderRadius: "6px", 
              fontSize: "12px", 
              fontWeight: 700, 
              letterSpacing: "0.02em" 
            }}>
              {ft}
            </span>
            <h1 className="truncate max-w-sm" style={{ fontSize: "17px", fontWeight: 600, color: "#111111", letterSpacing: "-0.01em" }} title={document.filename}>
              {document.filename}
            </h1>
          </div>
          
          <span style={{ color: "#E8E4DE" }}>|</span>

          <div className="flex items-center gap-4 shrink-0">
            <span style={{ fontSize: "14px", color: "#77736D" }}>{formatBytes(document.fileSize)}</span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: 500, color: isIndexed ? "#16A34A" : "#F47B20" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isIndexed ? "#16A34A" : "#F47B20", animation: isIndexed ? "none" : "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}></span>
              {isIndexed ? "Indexed" : "Processing"}
            </span>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-3 shrink-0" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
          <Link
            href={`/compare?docA=${document.id}`}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "6px", 
              fontSize: "14px", 
              fontWeight: 500, 
              color: "#111111", 
              background: "#FFFFFF", 
              border: "1px solid #E8E4DE", 
              padding: "8px 16px", 
              borderRadius: "10px", 
              transition: "all 0.15s ease",
              boxShadow: "0 1px 2px rgba(17,17,17,0.02)"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#FAF9F7"}
            onMouseLeave={e => e.currentTarget.style.background = "#FFFFFF"}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>
            Compare
          </Link>

          {/* More menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setMoreOpen(v => !v)}
              style={{ 
                width: "38px", 
                height: "38px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                background: moreOpen ? "#FAF9F7" : "#FFFFFF", 
                border: `1px solid ${moreOpen ? "#D0CBC3" : "#E8E4DE"}`, 
                borderRadius: "10px",
                color: "#111111",
                transition: "all 0.15s ease",
                boxShadow: "0 1px 2px rgba(17,17,17,0.02)"
              }}
              aria-label="More actions"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v.01M12 12v.01M12 19v.01" /></svg>
            </button>
            {moreOpen && (
              <div style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 6px)",
                width: "200px",
                background: "#FFFFFF",
                border: "1px solid #E8E4DE",
                borderRadius: "14px",
                boxShadow: "0 10px 30px -5px rgba(17,17,17,0.08), 0 4px 10px -3px rgba(17,17,17,0.04)",
                zIndex: 50,
                padding: "6px",
                animation: "menu-in 0.12s ease"
              }} role="menu">
                {/* Download */}
                <a
                  href={`/api/documents/${document.id}/download`}
                  download
                  onClick={() => setMoreOpen(false)}
                  className="w-full text-left px-3 py-2.5 text-sm text-[#111111] transition-colors flex items-center gap-2.5 rounded-lg hover:bg-[#F8F6F2]"
                  style={{ fontWeight: 500, textDecoration: "none" }}
                  role="menuitem"
                >
                  <svg className="w-4 h-4 text-[#5E5A54]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download text
                </a>
                {/* Divider */}
                <div className="my-1.5 border-t border-[#F0EDE9]" />
                {/* Delete */}
                <button
                  onClick={() => { setMoreOpen(false); setShowDeleteModal(true); }}
                  className="w-full text-left px-3 py-2.5 text-sm text-red-600 transition-colors flex items-center gap-2.5 rounded-lg hover:bg-red-50"
                  style={{ fontWeight: 500 }}
                  role="menuitem"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Delete document
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── MAIN 2-PANEL BODY ───────────────────────────── */}
      <main className="flex-1 flex gap-5 overflow-hidden min-h-0 relative z-10" style={{ padding: "20px 24px" }}>

        {/* ── CENTER / LEFT: Document Viewer ── */}
        <div className="flex-1 min-w-0 flex flex-col relative" style={{ background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E8E4DE", boxShadow: "0 4px 24px rgba(17,17,17,0.02)" }}>
          <DocumentViewer
            documentId={document.id}
            characterStart={activeCitation?.characterStart ?? null}
            characterEnd={activeCitation?.characterEnd ?? null}
            key={`viewer-${document.id}-${activeCitation?.t ?? "null"}`}
            onClose={() => setActiveCitation(null)}
          />
        </div>

        {/* ── RIGHT: AI Chat Panel ── */}
        <div className="shrink-0 flex flex-col overflow-hidden" style={{ width: "32%", minWidth: "320px", maxWidth: "440px", background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E8E4DE", boxShadow: "0 4px 24px rgba(17,17,17,0.02)" }}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/30 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div style={{ background: "#FFFFFF", border: "1px solid #E8E4DE", borderRadius: "20px", padding: "24px", width: "100%", maxWidth: "380px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#111111", marginBottom: "8px" }}>Delete document?</h2>
            <p style={{ fontSize: "14px", color: "#5E5A54", marginBottom: "20px" }}>
              Are you sure you want to delete <strong style={{ color: "#111111", fontWeight: 600 }}>{document.filename}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDeleteModal(false)} 
                style={{ padding: "10px 16px", fontSize: "14px", fontWeight: 500, color: "#111111", background: "#FFFFFF", border: "1px solid #E8E4DE", borderRadius: "10px" }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm} 
                disabled={deleting} 
                style={{ padding: "10px 16px", fontSize: "14px", fontWeight: 500, color: "#FFFFFF", background: "#E11D48", border: "1px solid transparent", borderRadius: "10px", opacity: deleting ? 0.6 : 1 }}
              >
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
  return (
    <div className="flex-1 overflow-hidden bg-[#FFFFFF] rounded-2xl relative">
      <ChatWindow
        documentIds={[document.id]}
        conversationId={activeConversationId}
        documentsMap={{ [document.id]: document.filename }}
        onConversationCreated={onConversationCreated}
        onCitationClick={onCitationClick}
      />
    </div>
  );
}
