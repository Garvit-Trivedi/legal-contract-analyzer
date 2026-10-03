"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { getDocumentText } from "@/lib/document/actions";

interface DocumentViewerProps {
  documentId: string;
  characterStart?: number | null;
  characterEnd?: number | null;
  onClose?: () => void;
  totalPages?: number | null;
  highlightColor?: "amber" | "emerald" | "rose";
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onTextLoaded?: (textLength: number) => void;
}

const ZOOM_LEVELS = [75, 90, 100, 115, 130, 150];
const CHARS_PER_VIRTUAL_PAGE = 3000; // ~half a printed page of dense text

export function DocumentViewer({ 
  documentId, 
  characterStart, 
  characterEnd,
  onClose,
  totalPages,
  highlightColor = "amber",
  onScroll,
  scrollContainerRef,
  onTextLoaded,
}: DocumentViewerProps) {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(2); // index into ZOOM_LEVELS → 100%
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Derived values ──────────────────────────────────────────
  const totalVirtualPages = text ? Math.max(1, Math.ceil(text.length / CHARS_PER_VIRTUAL_PAGE)) : 1;
  const fontSize = ZOOM_LEVELS[zoomLevel];

  // ── Load text ────────────────────────────────────────────────
  useEffect(() => {
    if (documentId) {
      setLoading(true);
      getDocumentText(documentId).then(t => {
        const fullText = t || "";
        setText(fullText);
        if (onTextLoaded) onTextLoaded(fullText.length);
        setLoading(false);
      }).catch(err => {
        console.error("Failed to load document text:", err);
        setText("Error loading document text from server. Please check your connection.");
        setLoading(false);
      });
    }
  }, [documentId, onTextLoaded]);

  // ── Sync page from citation highlight ───────────────────────
  useEffect(() => {
    if (!loading && characterStart != null && text) {
      const targetPage = Math.floor(characterStart / CHARS_PER_VIRTUAL_PAGE) + 1;
      setCurrentPage(Math.min(targetPage, totalVirtualPages));
    }
  }, [loading, characterStart, text, totalVirtualPages]);

  // ── Scroll to citation highlight ─────────────────────────────
  useEffect(() => {
    if (!loading && characterStart != null && characterEnd != null) {
      requestAnimationFrame(() => {
        const el = contentRef.current?.querySelector(".citation-highlight");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }
  }, [loading, characterStart, characterEnd, currentPage]);

  // ── Build search matches ──────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim() || !text) {
      setSearchMatches([]);
      setCurrentMatch(0);
      return;
    }
    const q = searchQuery.toLowerCase();
    const t = text.toLowerCase();
    const matches: number[] = [];
    let idx = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      idx = t.indexOf(q, idx);
      if (idx === -1) break;
      matches.push(idx);
      idx += q.length;
    }
    setSearchMatches(matches);
    setCurrentMatch(0);
  }, [searchQuery, text]);

  // ── Jump page when match is outside current page ─────────────
  useEffect(() => {
    if (searchMatches.length > 0) {
      const matchPos = searchMatches[currentMatch];
      const matchPage = Math.floor(matchPos / CHARS_PER_VIRTUAL_PAGE) + 1;
      if (matchPage !== currentPage) setCurrentPage(matchPage);
      requestAnimationFrame(() => {
        const el = contentRef.current?.querySelectorAll(".search-highlight")?.[
          searchMatches.slice(currentPage === matchPage ? 0 : 0).findIndex(
            (_, i) => {
              const pg = Math.floor(searchMatches[i] / CHARS_PER_VIRTUAL_PAGE) + 1;
              return pg === matchPage;
            }
          )
        ];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [currentMatch, searchMatches]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fullscreen handling ──────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // ── Download ─────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    window.open(`/api/documents/${documentId}/download`, "_blank");
  }, [documentId]);

  // ── Page text slice ───────────────────────────────────────────
  const getPageText = useCallback(() => {
    if (!text) return "";
    const start = (currentPage - 1) * CHARS_PER_VIRTUAL_PAGE;
    const end = start + CHARS_PER_VIRTUAL_PAGE;
    return text.slice(start, end);
  }, [text, currentPage]);

  // ── Render content with highlights ──────────────────────────
  const renderContent = useCallback(() => {
    const pageText = getPageText();
    if (!pageText) return null;

    const pageOffset = (currentPage - 1) * CHARS_PER_VIRTUAL_PAGE;

    // Compute in-page citation bounds
    const citeStart = characterStart != null ? characterStart - pageOffset : null;
    const citeEnd = characterEnd != null ? characterEnd - pageOffset : null;
    const hasCite = citeStart != null && citeEnd != null &&
      citeStart >= 0 && citeEnd <= pageText.length && citeEnd > citeStart;

    let hlBg = "bg-amber-500/25";
    let hlBorder = "border-amber-500/50";
    let textDecoration = "";
    if (highlightColor === "emerald") {
      hlBg = "bg-emerald-500/25"; hlBorder = "border-emerald-500/50";
      textDecoration = "underline decoration-emerald-500/50 decoration-2 underline-offset-2";
    } else if (highlightColor === "rose") {
      hlBg = "bg-rose-500/25"; hlBorder = "border-rose-500/50";
      textDecoration = "line-through decoration-rose-500/50 decoration-2";
    }
    const citeClass = `citation-highlight text-[#111111] ${hlBg} border-b-2 ${hlBorder} rounded-[2px] transition-all px-0.5 ${textDecoration}`;

    // Helper: split a chunk by searchQuery, return array of JSX
    const withSearchHighlights = (chunk: string, isCite: boolean, keyPfx: string): React.ReactNode[] => {
      if (!searchQuery.trim() || !chunk) {
        if (isCite) return [<mark key={`${keyPfx}-cite`} ref={el => { if (el) highlightRef.current = el; }} className={`${citeClass} animate-pulse-once`}>{chunk}</mark>];
        return [<span key={keyPfx}>{chunk}</span>];
      }
      const q = searchQuery.toLowerCase();
      const lower = chunk.toLowerCase();
      const parts: React.ReactNode[] = [];
      let last = 0, si = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const found = lower.indexOf(q, last);
        if (found === -1) {
          const rest = chunk.slice(last);
          if (rest) parts.push(<span key={`${keyPfx}-t${si}`}>{rest}</span>);
          break;
        }
        if (found > last) parts.push(<span key={`${keyPfx}-t${si}`}>{chunk.slice(last, found)}</span>);
        parts.push(<mark key={`${keyPfx}-s${si}`} className="search-highlight bg-amber-200 border-b border-amber-400 text-inherit">{chunk.slice(found, found + q.length)}</mark>);
        last = found + q.length;
        si++;
      }
      if (isCite) return [<mark key={`${keyPfx}-cite`} ref={el => { if (el) highlightRef.current = el; }} className={citeClass}>{parts}</mark>];
      return parts;
    };

    if (hasCite) {
      return <>
        {...withSearchHighlights(pageText.slice(0, citeStart!), false, "pre")}
        {...withSearchHighlights(pageText.slice(citeStart!, citeEnd!), true, "cite")}
        {...withSearchHighlights(pageText.slice(citeEnd!), false, "post")}
      </>;
    }

    // No cite — just search highlights across whole page
    if (searchQuery.trim() && searchMatches.length > 0) {
      const q = searchQuery.toLowerCase();
      const lowerPage = pageText.toLowerCase();
      // Find matches within this page only
      const pageMatches: number[] = [];
      let idx = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        idx = lowerPage.indexOf(q, idx);
        if (idx === -1) break;
        pageMatches.push(idx);
        idx += q.length;
      }
      if (pageMatches.length > 0) {
        const parts: React.ReactNode[] = [];
        let last = 0;
        pageMatches.forEach((idx, i) => {
          if (idx > last) parts.push(<span key={`t${i}`}>{pageText.slice(last, idx)}</span>);
          // Determine if this is the current focused match
          const globalMatchIdx = searchMatches.findIndex(m => m === idx + pageOffset);
          const isCurrent = globalMatchIdx === currentMatch;
          parts.push(<mark key={`s${i}`} className={`search-highlight border-b ${isCurrent ? "bg-amber-300 border-amber-500" : "bg-amber-100 border-amber-300"} text-[#111111]`}>{pageText.slice(idx, idx + q.length)}</mark>);
          last = idx + q.length;
        });
        if (last < pageText.length) parts.push(<span key="tail">{pageText.slice(last)}</span>);
        return <>{parts}</>;
      }
    }

    return <>{pageText}</>;
  }, [getPageText, currentPage, characterStart, characterEnd, highlightColor, searchQuery, searchMatches, currentMatch]);

  // ── Loading skeleton ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="absolute inset-0 flex flex-col bg-[#FFFFFF] rounded-[16px]">
        <div className="h-[52px] border-b border-[#E8E4DE] bg-[#FFFFFF] flex items-center px-4 gap-3 shrink-0 rounded-t-[16px] animate-pulse">
          <div className="h-3 w-40 bg-[#E8E4DE] rounded"></div>
          <div className="h-3 w-24 bg-[#E8E4DE] rounded ml-auto"></div>
          <div className="h-6 w-20 bg-[#E8E4DE] rounded"></div>
        </div>
        <div className="flex-1 p-8 space-y-4 animate-pulse bg-[#F8F6F2] rounded-b-[16px]">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className={`h-3.5 bg-[#E8E4DE] rounded ${i % 6 === 5 ? "w-1/3" : i % 3 === 2 ? "w-4/5" : "w-full"}`}></div>
          ))}
        </div>
      </div>
    );
  }

  if (!text) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#FFFFFF] text-[#77736D] text-sm flex-col gap-2 rounded-[16px]">
        <svg className="w-8 h-8 mb-2 text-[#DAD6D0]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <p>No document content available.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0 flex flex-col bg-[#FFFFFF] overflow-hidden rounded-[16px]">
      {/* ─── Viewer Toolbar ─────────────────────────────────── */}
      <div className="h-[52px] border-b border-[#E8E4DE] bg-[#FFFFFF] flex items-center pl-3 pr-4 gap-2 shrink-0 rounded-t-[16px]">

        {/* Search input */}
        <div className="relative flex items-center w-44">
          <svg className="w-3.5 h-3.5 absolute left-2.5 text-[#A7A39D] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search…"
            className="w-full bg-[#F8F6F2] border border-[#E8E4DE] rounded-lg pl-7 pr-3 py-1.5 text-[12px] text-[#111111] focus:outline-none focus:border-[#F47B20] focus:bg-[#FFFFFF] placeholder-[#A7A39D] transition-all"
          />
          {searchQuery && (
            <span className="absolute right-2 text-[10px] font-medium text-[#77736D] pointer-events-none">
              {searchMatches.length > 0 ? `${currentMatch + 1}/${searchMatches.length}` : "0"}
            </span>
          )}
        </div>

        {/* Search navigation */}
        {searchMatches.length > 0 && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setCurrentMatch(m => Math.max(0, m - 1))}
              disabled={currentMatch === 0}
              className="w-6 h-6 rounded flex items-center justify-center border border-[#E8E4DE] bg-[#FFFFFF] hover:bg-[#F8F6F2] text-[#111111] disabled:opacity-30 transition-colors"
              aria-label="Previous match"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button
              onClick={() => setCurrentMatch(m => Math.min(searchMatches.length - 1, m + 1))}
              disabled={currentMatch === searchMatches.length - 1}
              className="w-6 h-6 rounded flex items-center justify-center border border-[#E8E4DE] bg-[#FFFFFF] hover:bg-[#F8F6F2] text-[#111111] disabled:opacity-30 transition-colors"
              aria-label="Next match"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-5 bg-[#E8E4DE] mx-1" />

        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="w-6 h-6 rounded flex items-center justify-center border border-[#E8E4DE] bg-[#FFFFFF] hover:bg-[#F8F6F2] text-[#111111] disabled:opacity-30 transition-colors"
            aria-label="Previous page"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span className="text-[12px] text-[#5E5A54] font-medium tabular-nums whitespace-nowrap">
            {currentPage} / {totalVirtualPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalVirtualPages, p + 1))}
            disabled={currentPage >= totalVirtualPages}
            className="w-6 h-6 rounded flex items-center justify-center border border-[#E8E4DE] bg-[#FFFFFF] hover:bg-[#F8F6F2] text-[#111111] disabled:opacity-30 transition-colors"
            aria-label="Next page"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-[#E8E4DE] mx-1" />

        {/* Zoom */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setZoomLevel(z => Math.max(0, z - 1))}
            disabled={zoomLevel === 0}
            className="w-6 h-6 rounded flex items-center justify-center border border-[#E8E4DE] bg-[#FFFFFF] hover:bg-[#F8F6F2] text-[#111111] disabled:opacity-30 transition-colors"
            aria-label="Zoom out"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4" /></svg>
          </button>
          <button
            onClick={() => setZoomLevel(ZOOM_LEVELS.indexOf(100))}
            className="px-2 h-6 rounded border border-[#E8E4DE] bg-[#F8F6F2] hover:bg-[#FFFFFF] text-[11px] font-medium text-[#5E5A54] transition-colors tabular-nums min-w-[42px] text-center"
            aria-label="Reset zoom to 100%"
            title="Click to reset to 100%"
          >
            {fontSize}%
          </button>
          <button
            onClick={() => setZoomLevel(z => Math.min(ZOOM_LEVELS.length - 1, z + 1))}
            disabled={zoomLevel === ZOOM_LEVELS.length - 1}
            className="w-6 h-6 rounded flex items-center justify-center border border-[#E8E4DE] bg-[#FFFFFF] hover:bg-[#F8F6F2] text-[#111111] disabled:opacity-30 transition-colors"
            aria-label="Zoom in"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16M4 12h16" /></svg>
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Citation clear */}
        {characterStart != null && onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs text-[#F47B20] hover:text-[#D9651B] border border-[#F47B20]/30 bg-[#F47B20]/8 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
            aria-label="Clear citation highlight"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            Clear
          </button>
        )}

        {/* Divider */}
        <div className="w-px h-5 bg-[#E8E4DE]" />

        {/* Download + Fullscreen group — extra right buffer so buttons aren't clipped by rounded corner */}
        <div className="flex items-center gap-1">
        {/* Download */}
        <button
          onClick={handleDownload}
          className="w-7 h-7 rounded flex items-center justify-center border border-[#E8E4DE] bg-[#FFFFFF] hover:bg-[#F8F6F2] text-[#5E5A54] hover:text-[#111111] transition-colors"
          aria-label="Download document"
          title="Download document"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </button>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="w-7 h-7 rounded flex items-center justify-center border border-[#E8E4DE] bg-[#FFFFFF] hover:bg-[#F8F6F2] text-[#5E5A54] hover:text-[#111111] transition-colors"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" /></svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" /></svg>
          )}
        </button>
        </div>
      </div>

      {/* ─── Citation banner ─────────────────────────────────── */}
      {characterStart != null && (
        <div className={`shrink-0 border-b px-4 py-2 flex items-center justify-between gap-2 ${
          highlightColor === "emerald"
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : highlightColor === "rose"
            ? "bg-rose-50 border-rose-200 text-rose-700"
            : "bg-amber-50 border-amber-200 text-amber-700"
        }`}>
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-[11px] font-medium">Source block mapped — highlighted text shown below</p>
          </div>
          <span className="font-mono text-[9px] uppercase font-bold tracking-wider">
            {highlightColor === "emerald" && "[+] ADDED"}
            {highlightColor === "rose" && "[-] REMOVED"}
            {highlightColor === "amber" && "[↻] SOURCE"}
          </span>
        </div>
      )}

      {/* ─── Document content area ──────────────────────────── */}
      <div
        ref={scrollContainerRef ?? scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto bg-[#F8F6F2] rounded-b-[16px]"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="px-6 py-8 md:px-10 md:py-10 max-w-4xl mx-auto">
          {/* Document "paper" */}
          <div
            ref={contentRef}
            className="bg-[#FFFFFF] border border-[#E8E4DE] shadow-sm px-8 py-10 md:px-12 whitespace-pre-wrap min-h-[70vh] selection:bg-amber-100"
            style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
              fontSize: `${fontSize}%`,
              lineHeight: "1.9",
              letterSpacing: "0.01em",
              color: "#3B3833",
            }}
          >
            {renderContent()}
          </div>

          {/* Page footer indicator */}
          {totalVirtualPages > 1 && (
            <div className="flex items-center justify-center gap-6 mt-6 mb-2">
              <button
                onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
                disabled={currentPage <= 1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E8E4DE] bg-[#FFFFFF] hover:bg-[#F8F6F2] text-[13px] font-medium text-[#5E5A54] disabled:opacity-30 transition-colors shadow-sm"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 18l-6-6 6-6" /></svg>
                Previous
              </button>
              <span className="text-[12px] text-[#77736D]">
                Page {currentPage} of {totalVirtualPages}
              </span>
              <button
                onClick={() => { setCurrentPage(p => Math.min(totalVirtualPages, p + 1)); scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
                disabled={currentPage >= totalVirtualPages}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E8E4DE] bg-[#FFFFFF] hover:bg-[#F8F6F2] text-[13px] font-medium text-[#5E5A54] disabled:opacity-30 transition-colors shadow-sm"
              >
                Next
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
