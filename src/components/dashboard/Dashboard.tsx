"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UploadButton } from "@/components/UploadButton";
import { DocumentDeleteButton } from "@/components/DocumentDeleteButton";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function friendlyType(fileType: string | null | undefined): string {
  if (!fileType) return "TXT";
  const ft = fileType.toLowerCase();
  if (ft.includes("pdf")) return "PDF";
  if (ft.includes("docx") || ft.includes("wordprocessingml") || ft.includes("officedoc")) return "DOCX";
  if (ft.includes("txt") || ft.includes("plain")) return "TXT";
  return ft.split("/").pop()?.toUpperCase() ?? "TXT";
}

// ─────────────────────────────────────────────────────────────────────────────
// Decorative SVG — Hero right side
// ─────────────────────────────────────────────────────────────────────────────

function HeroDecoration() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Top-right flowing lines */}
      <svg
        style={{ position: "absolute", top: -20, right: -20 }}
        width="480"
        height="320"
        viewBox="0 0 480 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M480 0 Q360 80 200 60 Q100 50 0 120" stroke="#D4CFC8" strokeWidth="1" strokeOpacity="0.6" fill="none" />
        <path d="M480 20 Q370 95 210 78 Q112 68 10 138" stroke="#D4CFC8" strokeWidth="0.8" strokeOpacity="0.5" fill="none" />
        <path d="M480 40 Q380 110 220 96 Q124 86 20 156" stroke="#D4CFC8" strokeWidth="0.7" strokeOpacity="0.4" fill="none" />
        <path d="M480 60 Q390 125 230 114 Q136 104 30 174" stroke="#D4CFC8" strokeWidth="0.6" strokeOpacity="0.35" fill="none" />
        <path d="M480 80 Q400 140 240 132 Q148 122 40 192" stroke="#D4CFC8" strokeWidth="0.5" strokeOpacity="0.3" fill="none" />
        <path d="M480 100 Q410 155 250 150 Q160 140 50 210" stroke="#D4CFC8" strokeWidth="0.5" strokeOpacity="0.25" fill="none" />
        <path d="M480 120 Q420 170 260 168 Q172 158 60 228" stroke="#D4CFC8" strokeWidth="0.4" strokeOpacity="0.2" fill="none" />
        <path d="M480 140 Q430 185 270 186 Q184 176 70 246" stroke="#D4CFC8" strokeWidth="0.4" strokeOpacity="0.18" fill="none" />
        <path d="M480 160 Q440 200 280 204 Q196 194 80 264" stroke="#F47B20" strokeWidth="0.5" strokeOpacity="0.2" fill="none" />
        <path d="M480 180 Q450 215 290 222 Q208 212 90 282" stroke="#F47B20" strokeWidth="0.4" strokeOpacity="0.15" fill="none" />
        <path d="M480 200 Q460 230 300 240 Q220 230 100 300" stroke="#D4CFC8" strokeWidth="0.4" strokeOpacity="0.15" fill="none" />
      </svg>

      {/* Large soft orange circle */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: -60,
          transform: "translateY(-50%)",
          width: "180px",
          height: "180px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(244,123,32,0.22) 0%, rgba(244,123,32,0.05) 60%, transparent 80%)",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────────────────────

function MiniChart({ color }: { color: string }) {
  // Simple decorative sparkline
  return (
    <svg width="72" height="32" viewBox="0 0 72 32" fill="none" aria-hidden="true">
      <path
        d="M2 26 Q18 18 36 20 Q54 22 70 8"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        strokeOpacity="0.7"
      />
    </svg>
  );
}

function StatCard({
  icon,
  label,
  value,
  growth,
  chartColor,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  growth?: string;
  chartColor?: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E8E4DE",
        borderRadius: "28px",
        padding: "24px",
        boxShadow: "0 4px 20px rgba(17,17,17,0.035)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        minHeight: "150px",
        position: "relative",
        overflow: "hidden",
        flex: 1,
        minWidth: "180px",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: highlight ? "rgba(244,123,32,0.12)" : "#FFF0E3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#F47B20",
          marginBottom: "4px",
        }}
      >
        {icon}
      </div>

      {/* Label */}
      <p
        style={{
          fontSize: "13px",
          fontWeight: 500,
          color: "#77736D",
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {label}
      </p>

      {/* Value */}
      <p
        style={{
          fontSize: "38px",
          fontWeight: 700,
          color: "#111111",
          margin: 0,
          lineHeight: 1,
          letterSpacing: "-0.03em",
        }}
      >
        {value}
      </p>

      {/* Growth */}
      {growth && (
        <p
          style={{
            fontSize: "12px",
            color: "#16A34A",
            fontWeight: 500,
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>↑</span>
          <span style={{ color: "#16A34A" }}>{growth}</span>
          <span style={{ color: "#77736D", fontSize: "11px", fontWeight: 400 }}>vs last month</span>
        </p>
      )}

      {/* Mini chart positioned bottom-right */}
      {chartColor && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
          }}
        >
          <MiniChart color={chartColor} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Document Row
// ─────────────────────────────────────────────────────────────────────────────

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isReady = (doc.processingStatus === "completed" || doc.processingStatus === "ready") && doc.indexingStatus === "completed";
  const isFailed = doc.processingStatus === "failed" || doc.indexingStatus === "failed";
  const isProcessing =
    !isReady &&
    !isFailed &&
    (doc.processingStatus === "processing" || doc.processingStatus === "pending" || doc.processingStatus === "queued" || doc.processingStatus === "extracting" || doc.processingStatus === "chunking");
  const isIndexing =
    isReady === false &&
    !isFailed &&
    (doc.indexingStatus === "indexing" || doc.indexingStatus === "pending") &&
    doc.processingStatus === "completed";

  const ft = friendlyType(doc.fileType);

  // File type icon colors
  const ftBg = ft === "PDF" ? "#FDECEA" : ft === "DOCX" ? "#1677FF" : "#EEF0F2";
  const ftIconColor = ft === "PDF" ? "#E53935" : "#FFFFFF";

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <tr
      style={{
        borderBottom: "1px solid #F0ECE6",
        background: selected ? "rgba(244,123,32,0.03)" : "transparent",
        transition: "background 150ms ease-out",
      }}
      onMouseEnter={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = "#FAFAF8";
      }}
      onMouseLeave={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {/* Checkbox */}
      <td style={{ padding: "20px 16px 20px 20px", width: "44px" }}>
        <button
          disabled={!isReady}
          onClick={onToggle}
          aria-label={selected ? "Deselect document" : "Select document"}
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "7px",
            border: selected ? "2px solid #F47B20" : "2px solid #D4CFC8",
            background: selected ? "#F47B20" : "transparent",
            cursor: isReady ? "pointer" : "not-allowed",
            opacity: isReady ? 1 : 0.4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            flexShrink: 0,
            transition: "border-color 150ms, background 150ms",
          }}
        >
          {selected && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1.5 5L4 7.5L8.5 2.5" />
            </svg>
          )}
        </button>
      </td>

      {/* Name */}
      <td style={{ padding: "20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* File icon */}
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: ftBg,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ftIconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14,2 14,8 20,8" />
            </svg>
            <span
              style={{
                fontSize: "7px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: ftIconColor,
                marginTop: "-2px",
                lineHeight: 1,
              }}
            >
              {ft}
            </span>
          </div>

          {/* Filename + conversation count */}
          <Link href={`/documents/${doc.id}`} style={{ textDecoration: "none", minWidth: 0, flex: 1 }}>
            <p
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#111111",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "260px",
                transition: "color 150ms",
              }}
              title={doc.filename}
            >
              {doc.filename}
            </p>
            <p style={{ fontSize: "11px", color: "#77736D", margin: "2px 0 0", lineHeight: 1 }}>
              {conversationsCount} conversation{conversationsCount !== 1 ? "s" : ""}
            </p>
          </Link>
        </div>
      </td>

      {/* Type badge */}
      <td style={{ padding: "20px 16px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "3px 10px",
            borderRadius: "10px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            background:
              ft === "PDF" ? "#FDECEA" : ft === "DOCX" ? "#EAF3FF" : "#F0F0F0",
            color:
              ft === "PDF" ? "#E53935" : ft === "DOCX" ? "#1677FF" : "#555",
          }}
        >
          {ft}
        </span>
      </td>

      {/* Size */}
      <td
        style={{
          padding: "20px 16px",
          fontSize: "13px",
          color: "#77736D",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {(doc.fileSize / 1024).toFixed(1)} KB
      </td>

      {/* Added date */}
      <td style={{ padding: "20px 16px", fontSize: "13px", color: "#77736D" }}>
        {new Date(doc.createdAt).toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
          year: "numeric",
        })}
      </td>

      {/* Status */}
      <td style={{ padding: "20px 16px" }}>
        {isProcessing ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "24px",
              fontSize: "12px",
              fontWeight: 500,
              background: "#EAF3FF",
              color: "#1677FF",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#1677FF",
                animation: "pulse 1.5s infinite",
              }}
            />
            Processing
          </span>
        ) : isIndexing ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "24px",
              fontSize: "12px",
              fontWeight: 500,
              background: "#F3EAFF",
              color: "#7C3AED",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#7C3AED",
                animation: "pulse 1.5s infinite",
              }}
            />
            Indexing
          </span>
        ) : isFailed ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 12px",
              borderRadius: "24px",
              fontSize: "12px",
              fontWeight: 500,
              background: "#FDECEA",
              color: "#E53935",
              cursor: "help",
            }}
            title={doc.processingError || doc.indexingError || "Processing failed"}
          >
            Failed
          </span>
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "24px",
              fontSize: "12px",
              fontWeight: 500,
              background: "#EAF8EF",
              color: "#16803C",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#16A34A",
              }}
            />
            Ready
          </span>
        )}
      </td>

      {/* Actions */}
      <td style={{ padding: "20px 20px 20px 16px", textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
          {isReady && (
            <Link
              href={`/documents/${doc.id}`}
              style={{
                padding: "7px 18px",
                background: "#111111",
                color: "#FFFFFF",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
                transition: "background 150ms ease-out",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#333")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#111111")}
            >
              Open
            </Link>
          )}

          {/* Action menu (⋮) */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="More actions"
              aria-expanded={menuOpen}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "12px",
                border: "1px solid #E8E4DE",
                background: "#FFFFFF",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#77736D",
                fontSize: "16px",
                fontWeight: 700,
                lineHeight: 1,
                transition: "background 150ms, border-color 150ms",
                padding: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#F8F6F2";
                (e.currentTarget as HTMLElement).style.borderColor = "#C8C3BB";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#FFFFFF";
                (e.currentTarget as HTMLElement).style.borderColor = "#E8E4DE";
              }}
            >
              ⋮
            </button>

            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 4px)",
                  background: "#FFFFFF",
                  border: "1px solid #E8E4DE",
                  borderRadius: "16px",
                  boxShadow: "0 8px 24px rgba(17,17,17,0.1)",
                  zIndex: 100,
                  minWidth: "140px",
                  overflow: "hidden",
                }}
              >
                <DocumentDeleteButton
                  documentId={doc.id}
                  onDeleted={() => {
                    setMenuOpen(false);
                    onDeleted();
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

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
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPollingRef = useRef(false);

  const PENDING_STATUSES = ["processing", "pending", "indexing", "queued", "extracting", "chunking"];

  // ── Fetch fresh document list ──────────────────────────────────────────────
  // Returns the fresh docs array on success, or null on network failure
  const refreshDocuments = useCallback(async (): Promise<DocumentRecord[] | null> => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return null;
    }
    try {
      const res = await fetch("/api/documents", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.documents)) {
        setDocuments(data.documents);
        return data.documents;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // ── Polling — only active while at least one document is pending/processing ─
  const startPolling = useCallback(() => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    const poll = async () => {
      if (!isPollingRef.current) return;

      const freshDocs = await refreshDocuments();

      if (freshDocs === null) {
        // Network error — back off and retry
        pollRef.current = setTimeout(poll, 5000);
        return;
      }

      // Check directly on fresh data — avoids React batching issues
      const stillPending = freshDocs.some(
        (d) =>
          PENDING_STATUSES.includes(d.processingStatus ?? "") ||
          PENDING_STATUSES.includes(d.indexingStatus ?? "")
      );

      if (stillPending) {
        pollRef.current = setTimeout(poll, 2500);
      } else {
        // All done — stop polling
        isPollingRef.current = false;
      }
    };

    poll();
  }, [refreshDocuments]);

  useEffect(() => {
    return () => {
      isPollingRef.current = false;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  useEffect(() => {
    const hasPending = documents.some(
      (d) =>
        PENDING_STATUSES.includes(d.processingStatus ?? "") ||
        PENDING_STATUSES.includes(d.indexingStatus ?? "")
    );
    if (hasPending) startPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Upload callbacks ───────────────────────────────────────────────────────
  const handleUploadSuccess = useCallback(
    async (documentId: string) => {
      setUploadToast("Document uploaded! Processing...");
      setTimeout(() => setUploadToast(null), 4000);
      await refreshDocuments();
      startPolling();
    },
    [refreshDocuments, startPolling]
  );

  const handleUploadError = useCallback((msg: string) => {
    setUploadToast(`Upload failed: ${msg}`);
    setTimeout(() => setUploadToast(null), 5000);
  }, []);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (id: string) => {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setTimeout(refreshDocuments, 800);
    },
    [refreshDocuments]
  );

  // ── Filters ───────────────────────────────────────────────────────────────
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

  // ── Stats ──────────────────────────────────────────────────────────────────
  const indexed = documents.filter((d) => d.indexingStatus === "completed").length;
  const processing = documents.filter(
    (d) => d.processingStatus === "processing" || d.processingStatus === "pending" || d.processingStatus === "queued" || d.processingStatus === "extracting" || d.processingStatus === "chunking"
  ).length;

  return (
    <div
      className="custom-scrollbar"
      style={{
        flex: 1,
        background: "#F8F6F2",
        minHeight: "100%",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 52px 80px",
        }}
      >
        {/* ────────────────────────────────────────────────────────────────── */}
        {/* HERO SECTION                                                        */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "40px",
            paddingTop: "52px",
            paddingBottom: "52px",
            overflow: "hidden",
          }}
        >
          {/* Hero decoration (background) */}
          <HeroDecoration />

          {/* LEFT — Headline */}
          <div style={{ position: "relative", zIndex: 1, maxWidth: "560px" }}>
            {/* Eyebrow */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "1.5px",
                  background: "#F47B20",
                }}
                aria-hidden="true"
              />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "3px",
                  color: "#F47B20",
                  textTransform: "uppercase",
                }}
              >
                Document Intelligence
              </span>
            </div>

            {/* Main heading - serif display */}
            <h1
              className="font-display"
              style={{
                fontSize: "clamp(44px, 5vw, 62px)",
                lineHeight: 1.02,
                letterSpacing: "-0.02em",
                color: "#111111",
                margin: "0 0 20px 0",
                fontWeight: 400,
              }}
            >
              Your legal documents,{" "}
              <em
                style={{
                  color: "#F47B20",
                  fontStyle: "italic",
                  fontFamily: "'DM Serif Display', Georgia, serif",
                }}
              >
                smarter
              </em>{" "}
              with AI.
            </h1>

            {/* Description */}
            <p
              style={{
                fontSize: "16px",
                lineHeight: 1.6,
                color: "#5E5A54",
                margin: "0 0 36px 0",
                maxWidth: "480px",
              }}
            >
              Upload, analyze, compare, and investigate your legal documents
              with accurate and reliable AI insights.
            </p>
          </div>

          {/* RIGHT — Upload CTA */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "16px",
              flexShrink: 0,
            }}
          >
            {/* "Get instant insights" annotation */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                marginBottom: "4px",
              }}
              aria-hidden="true"
            >
              <span
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: "14px",
                  color: "#5E5A54",
                  fontStyle: "italic",
                }}
              >
                Get instant insights
              </span>
              <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                <path d="M20 2 Q30 8 28 18" stroke="#77736D" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                <path d="M24 15 L28 18 L30 13" stroke="#77736D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>

            {/* Upload button */}
            <UploadButton
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
              className=""
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0",
                  background: "#111111",
                  borderRadius: "34px",
                  padding: "0 8px 0 8px",
                  height: "68px",
                  cursor: "pointer",
                  width: "290px",
                  transition: "background 150ms ease-out",
                  boxShadow: "0 4px 16px rgba(17,17,17,0.15)",
                }}
              >
                {/* Orange circle with + */}
                <div
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    background: "#F47B20",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>

                {/* Label */}
                <span
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#FFFFFF",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Upload Document
                </span>

                {/* Arrow */}
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </UploadButton>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* STATISTICS                                                          */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <StatCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="15" y2="17" />
              </svg>
            }
            label="Total Documents"
            value={documents.length}
            growth="+100%"
            chartColor="#F47B20"
          />
          <StatCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            }
            label="Conversations"
            value={conversations.length}
            growth="+25%"
            chartColor="#F47B20"
          />
          <StatCard
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            }
            label="Indexed"
            value={indexed}
            growth="+100%"
            chartColor="#F47B20"
            highlight={processing > 0}
          />
        </div>

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* DOCUMENTS PANEL                                                     */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8E4DE",
            borderRadius: "28px",
            boxShadow: "0 4px 20px rgba(17,17,17,0.035)",
            overflow: "hidden",
          }}
        >
          {/* Documents Header */}
          <div
            style={{
              padding: "28px 28px 20px",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "20px",
              flexWrap: "wrap",
              borderBottom: "1px solid #F0ECE6",
            }}
          >
            {/* Title */}
            <div>
              <h2
                className="font-display"
                style={{
                  fontSize: "28px",
                  fontWeight: 400,
                  color: "#111111",
                  margin: "0 0 4px 0",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                Your Documents
              </h2>
              <p style={{ fontSize: "14px", color: "#77736D", margin: 0 }}>
                Manage and analyze your legal documents
              </p>
            </div>

            {/* Search + Filters + Refresh */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              {/* Search */}
              <div style={{ position: "relative" }}>
                <svg
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#B0A99F",
                  }}
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search documents"
                  style={{
                    background: "#F8F6F2",
                    border: "1px solid #E8E4DE",
                    borderRadius: "14px",
                    paddingLeft: "36px",
                    paddingRight: "14px",
                    paddingTop: "8px",
                    paddingBottom: "8px",
                    fontSize: "13px",
                    color: "#111111",
                    width: "210px",
                    outline: "none",
                    transition: "border-color 150ms",
                  }}
                  onFocus={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#F47B20")}
                  onBlur={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#E8E4DE")}
                />
              </div>

              {/* Filter pills */}
              {["all", "pdf", "docx", "txt"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "26px",
                    border: filter === type ? "none" : "1px solid #E8E4DE",
                    background: filter === type ? "#111111" : "#FFFFFF",
                    color: filter === type ? "#FFFFFF" : "#5E5A54",
                    fontSize: "11px",
                    fontWeight: 500,
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                    transition: "all 150ms ease-out",
                    textTransform: "uppercase" as const,
                  }}
                >
                  {type}
                </button>
              ))}

              {/* Refresh button */}
              <button
                onClick={refreshDocuments}
                title="Refresh document list"
                aria-label="Refresh document list"
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "12px",
                  border: "1px solid #E8E4DE",
                  background: "#FFFFFF",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#77736D",
                  transition: "background 150ms, border-color 150ms",
                  padding: 0,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#F8F6F2";
                  (e.currentTarget as HTMLElement).style.borderColor = "#C8C3BB";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#FFFFFF";
                  (e.currentTarget as HTMLElement).style.borderColor = "#E8E4DE";
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Table body */}
          {filteredDocs.length === 0 && documents.length === 0 ? (
            /* Empty state */
            <div
              style={{
                padding: "72px 40px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "#F8F6F2",
                  border: "1px solid #E8E4DE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#B0A99F",
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#111111", margin: "0 0 6px" }}>
                  No documents yet
                </p>
                <p style={{ fontSize: "14px", color: "#77736D", margin: 0 }}>
                  Upload your first legal document to begin analyzing it.
                </p>
              </div>
              <UploadButton
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                className=""
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 24px",
                    background: "#111111",
                    color: "#FFFFFF",
                    borderRadius: "14px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    marginTop: "8px",
                    transition: "background 150ms",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Upload Document
                </div>
              </UploadButton>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div style={{ padding: "48px 40px", textAlign: "center" }}>
              <p style={{ fontSize: "14px", color: "#77736D", margin: 0 }}>
                No documents match your search or filter.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "14px",
                  whiteSpace: "nowrap",
                }}
              >
                <thead>
                  <tr style={{ background: "#FAFAF8" }}>
                    <th style={{ padding: "12px 16px 12px 20px", width: "44px", textAlign: "left" }} />
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#77736D",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Name
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#77736D",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Type
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#77736D",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Size
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#77736D",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Added
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#77736D",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        padding: "12px 20px 12px 16px",
                        textAlign: "right",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#77736D",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      Actions
                    </th>
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
                          doc.processingStatus === "completed" && doc.indexingStatus === "completed"
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
      </div>

      {/* ── Multi-select action bar ── */}
      {selectedIds.size > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "32px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#FFFFFF",
            border: "1px solid #E8E4DE",
            borderRadius: "24px",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "32px",
            zIndex: 50,
            boxShadow: "0 8px 32px rgba(17,17,17,0.12)",
            whiteSpace: "nowrap",
          }}
        >
          <div>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#111111", margin: 0 }}>
              {selectedIds.size} document{selectedIds.size !== 1 ? "s" : ""} selected
            </p>
            <p style={{ fontSize: "12px", color: "#77736D", margin: "2px 0 0" }}>
              Ready for bulk actions
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{
                fontSize: "13px",
                color: "#77736D",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "6px 12px",
                borderRadius: "12px",
                transition: "color 150ms",
              }}
            >
              Clear
            </button>
            <button
              onClick={startMultiChat}
              style={{
                background: "#F47B20",
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: "13px",
                padding: "9px 18px",
                borderRadius: "14px",
                border: "none",
                cursor: "pointer",
                transition: "background 150ms",
              }}
            >
              Start Multi-Document Chat
            </button>
          </div>
        </div>
      )}

      {/* ── Upload toast ── */}
      {uploadToast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: "#FFFFFF",
            border: "1px solid #E8E4DE",
            color: "#111111",
            fontSize: "14px",
            padding: "14px 18px",
            borderRadius: "20px",
            boxShadow: "0 8px 28px rgba(17,17,17,0.12)",
            maxWidth: "360px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#F47B20",
              flexShrink: 0,
              animation: "pulse 1.5s infinite",
            }}
          />
          <span style={{ flex: 1 }}>{uploadToast}</span>
          <button
            onClick={() => setUploadToast(null)}
            style={{
              background: "none",
              border: "none",
              color: "#77736D",
              cursor: "pointer",
              fontSize: "16px",
              padding: "0 4px",
              lineHeight: 1,
              flexShrink: 0,
            }}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Pulse keyframe */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
