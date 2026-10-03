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
  const contentRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (documentId) {
      setLoading(true);
      getDocumentText(documentId).then(t => {
        const fullText = t || "";
        setText(fullText);
        if (onTextLoaded) onTextLoaded(fullText.length);
        setLoading(false);
      });
    }
  }, [documentId, onTextLoaded]);

  // Scroll to citation highlight whenever it changes
  useEffect(() => {
    if (!loading && characterStart != null && characterEnd != null) {
      // Small RAF to let React paint first
      requestAnimationFrame(() => {
        const el = contentRef.current?.querySelector(".citation-highlight");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }
  }, [loading, characterStart, characterEnd]);

  // Build search matches
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
    while (true) {
      idx = t.indexOf(q, idx);
      if (idx === -1) break;
      matches.push(idx);
      idx += q.length;
    }
    setSearchMatches(matches);
    setCurrentMatch(0);
  }, [searchQuery, text]);

  // Scroll to current search match
  useEffect(() => {
    if (searchMatches.length > 0) {
      requestAnimationFrame(() => {
        const el = contentRef.current?.querySelectorAll(".search-highlight")?.[currentMatch];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [currentMatch, searchMatches]);

  const renderContent = useCallback(() => {
    if (!text) return null;

    // If we have a citation highlight, bake it into segments
    if (characterStart != null && characterEnd != null &&
        characterStart >= 0 && characterEnd <= text.length && characterEnd > characterStart) {

      // Determine highlight classes based on highlightColor prop
      let hlBg = "bg-amber-500/25";
      let hlBorder = "border-amber-500/50";
      let textDecoration = "";
      
      if (highlightColor === "emerald") {
        hlBg = "bg-emerald-500/25";
        hlBorder = "border-emerald-500/50";
        textDecoration = "underline decoration-emerald-500/50 decoration-2 underline-offset-2";
      } else if (highlightColor === "rose") {
        hlBg = "bg-rose-500/25";
        hlBorder = "border-rose-500/50";
        textDecoration = "line-through decoration-rose-500/50 decoration-2";
      }
      
      const citeClass = `citation-highlight text-zinc-100 ${hlBg} border-b-2 ${hlBorder} rounded-[2px] transition-all px-0.5 ${textDecoration}`;

      // Also apply search highlights within segments
      const segments: React.ReactNode[] = [];
      const addSegment = (chunk: string, isCitation: boolean, keyPfx: string) => {
        if (!searchQuery.trim() || !chunk) {
          segments.push(isCitation
            ? <mark key={keyPfx} ref={el => { if (el) highlightRef.current = el; }} className={`${citeClass} animate-pulse-once`}>{chunk}</mark>
            : <span key={keyPfx}>{chunk}</span>
          );
          return;
        }
        // Split by searchQuery
        const q = searchQuery.toLowerCase();
        const lower = chunk.toLowerCase();
        let last = 0, si = 0;
        const parts: React.ReactNode[] = [];
        while (true) {
          const found = lower.indexOf(q, last);
          if (found === -1) { parts.push(<span key={`${keyPfx}-t${si}`}>{chunk.slice(last)}</span>); break; }
          parts.push(<span key={`${keyPfx}-t${si}`}>{chunk.slice(last, found)}</span>);
          parts.push(<mark key={`${keyPfx}-s${si}`} className="search-highlight bg-blue-400/30 border-b border-blue-400 text-inherit">{chunk.slice(found, found + q.length)}</mark>);
          last = found + q.length;
          si++;
        }
        segments.push(isCitation
          ? <mark key={keyPfx} ref={el => { if (el) highlightRef.current = el; }} className={citeClass}>{parts}</mark>
          : <span key={keyPfx}>{parts}</span>
        );
      };

      addSegment(text.slice(0, characterStart), false, "pre");
      addSegment(text.slice(characterStart, characterEnd), true, "cite");
      addSegment(text.slice(characterEnd), false, "post");
      return <>{segments}</>;
    }

    // No citation — just search highlights
    if (searchQuery.trim() && searchMatches.length > 0) {
      const q = searchQuery;
      const lower = text.toLowerCase();
      const ql = q.toLowerCase();
      const parts: React.ReactNode[] = [];
      let last = 0;
      searchMatches.forEach((idx, i) => {
        parts.push(<span key={`t${i}`}>{text.slice(last, idx)}</span>);
        parts.push(<mark key={`s${i}`} className={`search-highlight border-b ${i === currentMatch ? 'bg-blue-400/40 border-blue-400' : 'bg-blue-400/20 border-blue-300'}`}>{text.slice(idx, idx + ql.length)}</mark>);
        last = idx + ql.length;
      });
      parts.push(<span key="tail">{text.slice(last)}</span>);
      return <>{parts}</>;
    }

    return <>{text}</>;
  }, [text, characterStart, characterEnd, searchQuery, searchMatches, currentMatch]);

  const fileTypeLabel = (ft: string | null | undefined) => {
    if (!ft) return "TXT";
    if (ft.includes("pdf")) return "PDF";
    if (ft.includes("wordprocessingml") || ft.includes("docx")) return "DOCX";
    return ft.split("/").pop()?.toUpperCase() ?? "TXT";
  };

  if (loading) {
    return (
      <div className="absolute inset-0 flex flex-col bg-[#111113]">
        <div className="h-11 border-b border-white/10 bg-[#111113] flex items-center px-4 gap-3 shrink-0 animate-pulse">
          <div className="h-3 w-32 bg-zinc-700 rounded"></div>
          <div className="h-3 w-16 bg-zinc-800 rounded ml-auto"></div>
        </div>
        <div className="flex-1 p-8 space-y-3 animate-pulse">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className={`h-3 bg-zinc-800 rounded ${i % 5 === 4 ? 'w-1/3' : 'w-full'}`}></div>
          ))}
        </div>
      </div>
    );
  }

  if (!text) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#111113] text-zinc-500 text-sm flex-col gap-2">
        <svg className="w-8 h-8 mb-2 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <p>No document content available.</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-[#111113] overflow-hidden">
      {/* Viewer Toolbar */}
      <div className="h-11 border-b border-white/10 bg-[#111113] flex items-center px-4 gap-3 shrink-0">
        {/* Search */}
        <div className="relative flex items-center flex-1 max-w-xs">
          <svg className="w-3.5 h-3.5 absolute left-2.5 text-zinc-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search ..."
            className="w-full bg-[#1a1a1e] border border-white/10 rounded pl-8 pr-3 py-1 text-xs text-zinc-300 focus:outline-none focus:border-blue-500/50 placeholder-zinc-600"
          />
          {searchQuery && (
            <span className="absolute right-2 text-[10px] text-zinc-500">
              {searchMatches.length > 0 ? `${currentMatch + 1}/${searchMatches.length}` : "0 matches"}
            </span>
          )}
        </div>

        {searchMatches.length > 0 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentMatch(m => Math.max(0, m - 1))} disabled={currentMatch === 0} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-zinc-400 disabled:opacity-30 transition-colors" aria-label="Previous match">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button onClick={() => setCurrentMatch(m => Math.min(searchMatches.length - 1, m + 1))} disabled={currentMatch === searchMatches.length - 1} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-zinc-400 disabled:opacity-30 transition-colors" aria-label="Next match">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Citation clear */}
        {characterStart != null && onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 border border-amber-400/30 bg-amber-400/10 px-2 py-1 rounded transition-colors"
            aria-label="Clear citation highlight"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            Clear highlight
          </button>
        )}
      </div>

      {/* Citation banner */}
      {characterStart != null && (
        <div className={`shrink-0 border-b px-4 py-2 flex items-center justify-between gap-2 ${
          highlightColor === "emerald" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            : highlightColor === "rose"
            ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
            : "bg-amber-500/10 border-amber-500/20 text-amber-300"
        }`}>
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-[11px] font-medium tracking-tight">Source block mapped — see highlighted text below</p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase font-bold tracking-wider">
            {highlightColor === "emerald" && <span>[+] ADDED</span>}
            {highlightColor === "rose" && <span>[-] REMOVED</span>}
            {highlightColor === "amber" && <span>[↻] MODIFIED</span>}
          </div>
        </div>
      )}

      {/* Document content area */}
      <div 
        ref={scrollContainerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto custom-scrollbar"
      >
        <div className="px-12 py-10 max-w-4xl mx-auto">
          {/* Document "paper" */}
          <div
            ref={contentRef}
            className="bg-[#16161a] border border-white/[0.06] rounded-lg shadow-xl px-10 py-10 text-sm leading-7 text-zinc-300 font-mono whitespace-pre-wrap selection:bg-blue-500/30 min-h-[70vh]"
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace", letterSpacing: "0.01em" }}
          >
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
