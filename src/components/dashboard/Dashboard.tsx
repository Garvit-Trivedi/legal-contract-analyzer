"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UploadButton } from "@/components/UploadButton";
import { DocumentDeleteButton } from "@/components/DocumentDeleteButton";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface DocumentRecord {
  id: string;
  filename: string;
  fileType: string | null;
  fileSize: number;
  processingStatus: string;
  processingError: string | null;
  indexingStatus: string;
  indexingError: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// ──────────────────────────────────────────────────────────────
// Dashboard component
// ──────────────────────────────────────────────────────────────

export function Dashboard({
  initialDocuments,
  initialConversations,
}: {
  initialDocuments: any[];
  initialConversations: any[];
}) {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments);
  const [conversations] = useState(initialConversations);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [uploadToast, setUploadToast] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch fresh document list from /api/documents ────────────
  const refreshDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.documents)) {
        setDocuments(data.documents);
      }
    } catch {
      // Silently ignore network errors — keep showing current list
    }
  }, []);

  // ── Polling: start when any doc is still processing/indexing ─
  const startPolling = useCallback(() => {
    if (pollRef.current) return; // already polling
    pollRef.current = setInterval(async () => {
      await refreshDocuments();
      // Stop polling once all docs are in a terminal state
      setDocuments((prev) => {
        const stillPending = prev.some(
          (d) =>
            d.processingStatus === "processing" ||
            d.processingStatus === "pending" ||
            d.indexingStatus === "indexing" ||
            d.indexingStatus === "pending"
        );
        if (!stillPending && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        return prev;
      });
    }, 2500);
  }, [refreshDocuments]);

  // ── Cleanup polling on unmount ───────────────────────────────
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Start polling if initial docs have pending items ─────────
  useEffect(() => {
    const hasPending = documents.some(
      (d) =>
        d.processingStatus === "processing" ||
        d.processingStatus === "pending" ||
        d.indexingStatus === "indexing" ||
        d.indexingStatus === "pending"
    );
    if (hasPending) startPolling();
  }, []); // only on mount

  // ── Upload callbacks ─────────────────────────────────────────
  const handleUploadSuccess = useCallback(
    async (documentId: string) => {
      // Show toast
      setUploadToast("Document uploaded! Processing...");
      setTimeout(() => setUploadToast(null), 4000);

      // Immediately fetch fresh list (the new doc will be there)
      await refreshDocuments();

      // Start polling until processing completes
      startPolling();
    },
    [refreshDocuments, startPolling]
  );

  const handleUploadError = useCallback((msg: string) => {
    setUploadToast(`Upload failed: ${msg}`);
    setTimeout(() => setUploadToast(null), 5000);
  }, []);

  // ── Delete: remove optimistically, then refresh ──────────────
  const handleDelete = useCallback(
    async (id: string) => {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      // Small delay then refresh to confirm
      setTimeout(refreshDocuments, 800);
    },
    [refreshDocuments]
  );

  // ── Filters ──────────────────────────────────────────────────
  const filteredDocs = documents.filter((doc) => {
    if (search && !doc.filename.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter !== "all") {
      const ft = friendlyType(doc.fileType).toLowerCase();
      if (ft !== filter) return false;
    }
    return true;
  });

  const toggleSelect = (id: string, isReady: boolean) => {
    if (!isReady) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const startMultiChat = () => {
    if (selectedIds.size === 0) return;
    router.push(`/chat/new?docs=${Array.from(selectedIds).join(",")}`);
  };

  // ── Stats ────────────────────────────────────────────────────
  const indexed = documents.filter((d) => d.indexingStatus === "completed").length;
  const processing = documents.filter(
    (d) => d.processingStatus === "processing" || d.processingStatus === "pending"
  ).length;

  return (
    <div className="flex-1 bg-[#09090b] text-zinc-300 font-sans tracking-tight h-full overflow-y-auto custom-scrollbar">
      <main className="max-w-7xl mx-auto pt-10 pb-16 px-8">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2">Document Intelligence</h2>
            <p className="text-sm text-zinc-400">
              Analyze, compare and investigate your legal documents with grounded AI.
            </p>
          </div>
          {/* Upload button in header for quick access */}
          <UploadButton
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Document
          </UploadButton>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 mb-10 flex-wrap">
          <StatCard label="Total Documents" value={documents.length} />
          <StatCard label="Conversations" value={conversations.length} />
          <StatCard label="Indexed" value={indexed} />
          {processing > 0 && (
            <StatCard
              label="Processing"
              value={processing}
              highlight
            />
          )}
        </div>

        {/* Document table */}
        <div className="bg-[#18181b] border border-white/10 rounded-xl overflow-hidden shadow-sm">
          {/* Controls */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#18181b] flex-wrap gap-3">
            <h3 className="font-semibold text-zinc-100">Your Documents</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <svg
                  className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-[#09090b] border border-white/10 rounded-md pl-9 pr-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 w-64 transition-colors"
                />
              </div>
              <div className="flex bg-[#09090b] border border-white/10 rounded-md p-0.5">
                {["all", "pdf", "docx", "txt"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-3 py-1 text-xs font-medium rounded uppercase transition-colors ${
                      filter === type
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              {/* Refresh button */}
              <button
                onClick={refreshDocuments}
                title="Refresh document list"
                className="p-1.5 rounded-md hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Table body */}
          {filteredDocs.length === 0 && documents.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-zinc-200 font-medium mb-2">No documents yet</p>
              <p className="text-sm text-zinc-500 mb-6">
                Upload a PDF, DOCX or TXT file to begin analyzing your legal documents.
              </p>
              <UploadButton
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Browse files
              </UploadButton>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-zinc-500 text-sm">No documents match your search or filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-500">
                    <th className="font-medium p-4 pl-4 w-8"></th>
                    <th className="font-medium p-4">Name</th>
                    <th className="font-medium p-4">Type</th>
                    <th className="font-medium p-4">Size</th>
                    <th className="font-medium p-4">Added</th>
                    <th className="font-medium p-4">Status</th>
                    <th className="font-medium p-4 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      conversationsCount={conversations.filter((c: any) =>
                        c.conversationDocuments?.some((cd: any) => cd.documentId === doc.id)
                      ).length}
                      selected={selectedIds.has(doc.id)}
                      onToggle={() =>
                        toggleSelect(
                          doc.id,
                          doc.processingStatus === "completed" &&
                            doc.indexingStatus === "completed"
                        )
                      }
                      onDeleted={() => handleDelete(doc.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Multi-select action bar */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#27272a] text-zinc-200 border border-white/10 shadow-2xl rounded-xl px-6 py-4 flex items-center justify-between gap-8 z-50">
            <div>
              <p className="text-sm font-semibold text-white">
                {selectedIds.size} document{selectedIds.size !== 1 ? "s" : ""} selected
              </p>
              <p className="text-xs text-zinc-400">Ready for bulk actions</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={startMultiChat}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 py-2 rounded-md shadow-sm transition-colors"
              >
                Start Multi-Document Chat
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Upload toast notification */}
      {uploadToast && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 bg-[#1c1c1f] border border-white/15 text-zinc-200 text-sm px-4 py-3 rounded-xl shadow-2xl max-w-sm animate-in slide-in-from-bottom-3 fade-in duration-300">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
          <span>{uploadToast}</span>
          <button
            onClick={() => setUploadToast(null)}
            className="ml-2 text-zinc-500 hover:text-white transition-colors flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex-1 min-w-[120px] p-4 rounded-lg border flex items-center justify-between transition-colors ${
        highlight
          ? "bg-blue-500/5 border-blue-500/20"
          : "bg-[#18181b] border-white/10"
      }`}
    >
      <span className={`text-sm font-medium ${highlight ? "text-blue-400" : "text-zinc-400"}`}>
        {label}
        {highlight && (
          <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        )}
      </span>
      <span className={`text-lg font-semibold ${highlight ? "text-blue-300" : "text-zinc-100"}`}>
        {value}
      </span>
    </div>
  );
}

function friendlyType(fileType: string | null | undefined): string {
  if (!fileType) return "TXT";
  const ft = fileType.toLowerCase();
  if (ft.includes("pdf")) return "PDF";
  if (
    ft.includes("docx") ||
    ft.includes("wordprocessingml") ||
    ft.includes("officedoc")
  )
    return "DOCX";
  if (ft.includes("txt") || ft.includes("plain")) return "TXT";
  return ft.split("/").pop()?.toUpperCase() ?? "TXT";
}

function DocumentRow({
  doc,
  conversationsCount,
  selected,
  onToggle,
  onDeleted,
}: {
  doc: DocumentRecord;
  conversationsCount: number;
  selected: boolean;
  onToggle: () => void;
  onDeleted: () => void;
}) {
  const isReady =
    doc.processingStatus === "completed" && doc.indexingStatus === "completed";
  const isFailed =
    doc.processingStatus === "failed" || doc.indexingStatus === "failed";
  const isProcessing =
    !isReady &&
    !isFailed &&
    (doc.processingStatus === "processing" || doc.processingStatus === "pending");
  const isIndexing =
    isReady === false &&
    !isFailed &&
    (doc.indexingStatus === "indexing" || doc.indexingStatus === "pending") &&
    doc.processingStatus === "completed";

  const ft = friendlyType(doc.fileType);
  const ftColor =
    ft === "PDF"
      ? "bg-red-500/10 text-red-400"
      : ft === "DOCX"
      ? "bg-blue-500/10 text-blue-400"
      : "bg-zinc-500/10 text-zinc-400";

  return (
    <tr
      className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors group ${
        selected ? "bg-blue-500/5" : ""
      }`}
    >
      {/* Checkbox */}
      <td className="p-4 pl-4">
        <button
          disabled={!isReady}
          onClick={onToggle}
          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
            !isReady
              ? "border-white/10 opacity-50 cursor-not-allowed"
              : selected
              ? "bg-blue-600 border-blue-600 text-white"
              : "border-white/20 hover:border-blue-400 group-hover:border-white/40"
          }`}
        >
          {selected && (
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </td>

      {/* Name + type icon */}
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-md shrink-0 flex items-center justify-center font-bold text-[10px] uppercase tracking-wider ${ftColor}`}
          >
            {ft}
          </div>
          <Link href={`/documents/${doc.id}`} className="min-w-0 flex-1">
            <p
              className="font-medium text-zinc-200 truncate max-w-[260px] group-hover:text-blue-400 transition-colors"
              title={doc.filename}
            >
              {doc.filename}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {conversationsCount} conversation{conversationsCount !== 1 ? "s" : ""}
            </p>
          </Link>
        </div>
      </td>

      {/* Type badge */}
      <td className="p-4">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${ftColor}`}
        >
          {ft}
        </span>
      </td>

      {/* Size */}
      <td className="p-4 text-zinc-400 text-xs font-mono">
        {(doc.fileSize / 1024).toFixed(1)} KB
      </td>

      {/* Date */}
      <td className="p-4 text-zinc-400 text-xs">
        {new Date(doc.createdAt).toLocaleDateString()}
      </td>

      {/* Status */}
      <td className="p-4">
        {isProcessing ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-medium rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Processing
          </span>
        ) : isIndexing ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 text-purple-400 text-[10px] font-medium rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            Indexing
          </span>
        ) : isFailed ? (
          <span
            className="inline-flex items-center px-2 py-1 bg-red-500/10 text-red-400 text-[10px] font-medium rounded cursor-help"
            title={doc.processingError || doc.indexingError || "Processing failed"}
          >
            Failed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-medium rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Ready
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="p-4 pr-6 text-right">
        <div className="flex items-center justify-end gap-2">
          {isReady && (
            <Link
              href={`/documents/${doc.id}`}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded text-xs font-medium transition-colors"
            >
              Open
            </Link>
          )}
          <DocumentDeleteButton documentId={doc.id} onDeleted={onDeleted} />
        </div>
      </td>
    </tr>
  );
}
