"use client";

import React, { useState, useEffect, useRef } from "react";
import { ComparisonResult, ComparisonChange, ChangeSignificanceV2 } from "@/types/comparison";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ChatWindow } from "@/components/ChatWindow";

// ─── Loader Steps ─────────────────────────────────────────────────────────────

const LOADER_STEPS = [
  { label: "Loading document contents", duration: 1200 },
  { label: "Normalizing text", duration: 900 },
  { label: "Aligning paragraphs", duration: 1400 },
  { label: "Detecting changes", duration: 1100 },
  { label: "Classifying significance", duration: 900 },
  { label: "Running AI analysis", duration: 0 },
];

// ─── Premium Loading State ────────────────────────────────────────────────────

function ComparisonLoader({
  docAName, docBName, onAbort,
}: { docAName: string; docBName: string; onAbort: () => void }) {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    let currentStep = 0;
    const advance = () => {
      const next = currentStep + 1;
      if (next < LOADER_STEPS.length - 1) {
        currentStep = next;
        setStep(next);
        const dur = LOADER_STEPS[next].duration;
        if (dur > 0) setTimeout(advance, dur);
      } else {
        setStep(LOADER_STEPS.length - 1);
      }
    };
    const dur = LOADER_STEPS[0].duration;
    if (dur > 0) setTimeout(advance, dur);
  }, []);

  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px", background: "#F8F6F2",
    }}>
      <div style={{
        background: "#FFFFFF", border: "1px solid #E8E4DE",
        borderRadius: "24px", padding: "48px 40px",
        boxShadow: "0 8px 40px rgba(17,17,17,0.06)",
        maxWidth: "440px", width: "100%", textAlign: "center",
      }}>
        {/* Animated ring */}
        <div style={{ position: "relative", width: "72px", height: "72px", margin: "0 auto 28px" }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: "3px solid #F0ECE6", borderTopColor: "#F47B20",
            animation: "spin 1s linear infinite",
          }} />
          <div style={{
            position: "absolute", inset: "10px", borderRadius: "50%",
            border: "3px solid #F0ECE6", borderBottomColor: "#1677FF",
            animation: "spin 1.4s linear infinite reverse",
          }} />
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: "10px", height: "10px", borderRadius: "50%",
              background: "#F47B20", animation: "pulse 1.5s ease-in-out infinite",
            }} />
          </div>
        </div>

        <h3 style={{
          fontFamily: "'DM Serif Display', 'Playfair Display', Georgia, serif",
          fontSize: "22px", fontWeight: 400, color: "#111111",
          margin: "0 0 8px", letterSpacing: "-0.01em",
        }}>
          Comparing Documents
        </h3>
        <p style={{ fontSize: "13px", color: "#77736D", margin: "0 0 28px", lineHeight: 1.5 }}>
          <span style={{ color: "#16A34A", fontWeight: 500 }}>{docAName}</span>
          <span style={{ color: "#D4CFC8", margin: "0 8px" }}>vs</span>
          <span style={{ color: "#1677FF", fontWeight: 500 }}>{docBName}</span>
        </p>

        {/* Steps */}
        <div style={{ textAlign: "left", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {LOADER_STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: done ? "#EAF8EF" : active ? "#FFF0E3" : "#F8F6F2",
                  border: `1.5px solid ${done ? "#16A34A" : active ? "#F47B20" : "#E8E4DE"}`,
                  transition: "all 300ms",
                }}>
                  {done && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1.5 5L4 7.5L8.5 2.5" />
                    </svg>
                  )}
                  {active && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#F47B20" }} />}
                </div>
                <span style={{
                  fontSize: "13px", transition: "all 300ms",
                  color: done ? "#A09A93" : active ? "#111111" : "#C8C3BB",
                  fontWeight: active ? 500 : 400,
                  textDecoration: done ? "line-through" : "none",
                }}>
                  {s.label}
                </span>
                {active && (
                  <div style={{
                    marginLeft: "auto", width: "12px", height: "12px",
                    border: "2px solid #F0ECE6", borderTopColor: "#F47B20",
                    borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0,
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div style={{ height: "4px", background: "#F0ECE6", borderRadius: "4px", overflow: "hidden", marginBottom: "20px" }}>
          <div style={{
            height: "100%", borderRadius: "4px",
            background: "linear-gradient(90deg, #F47B20, #1677FF)",
            width: `${((step + 1) / LOADER_STEPS.length) * 100}%`,
            transition: "width 700ms ease",
          }} />
        </div>

        <button
          onClick={onAbort}
          style={{
            padding: "8px 20px", border: "1px solid #E8E4DE",
            background: "#FFFFFF", color: "#77736D", borderRadius: "10px",
            fontSize: "12px", fontWeight: 600, cursor: "pointer",
            transition: "border-color 150ms, color 150ms",
            fontFamily: "inherit",
          }}
          onMouseEnter={e => { (e.currentTarget.style.borderColor = "#DC2626"); (e.currentTarget.style.color = "#DC2626"); }}
          onMouseLeave={e => { (e.currentTarget.style.borderColor = "#E8E4DE"); (e.currentTarget.style.color = "#77736D"); }}
        >
          Cancel
        </button>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );
}

// ─── Main ComparisonView ──────────────────────────────────────────────────────

export function ComparisonView({
  documentAId, documentBId,
  documentAName = "Document A", documentBName = "Document B",
  onAbort,
}: {
  documentAId: string; documentBId: string;
  documentAName?: string; documentBName?: string;
  onAbort?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<string>("");
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<"ALL" | "ADDED" | "REMOVED" | "MODIFIED">("ALL");
  const [filterSig, setFilterSig] = useState<"ALL" | ChangeSignificanceV2>("ALL");

  // Selection state
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);

  // Synchronized scrolling
  const paneARef = useRef<HTMLDivElement>(null);
  const paneBRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);
  const [syncScroll, setSyncScroll] = useState(false);
  const [lenA, setLenA] = useState(1);
  const [lenB, setLenB] = useState(1);

  const handleScroll = (source: "A" | "B", e: React.UIEvent<HTMLDivElement>) => {
    return; // Disabled sync scroll permanently
    if (!syncScroll || !result || result.changes.length === 0) return;
    if (isSyncing.current) return;

    const A = paneARef.current;
    const B = paneBRef.current;
    if (!A || !B) return;

    const sourceEl = source === "A" ? A : B;
    const targetEl = source === "A" ? B : A;
    const sourceLen = source === "A" ? lenA : lenB;
    const targetLen = source === "A" ? lenB : lenA;

    const maxSourceScroll = sourceEl.scrollHeight - sourceEl.clientHeight;
    if (maxSourceScroll <= 0) return;
    const sourceRatio = sourceEl.scrollTop / maxSourceScroll;
    const sourceCharIdx = sourceRatio * (sourceLen || 1);

    let closestChange = null;
    let minDiff = Infinity;
    for (const change of result.changes) {
      const loc = source === "A" ? change.beforeLocation : change.afterLocation;
      if (!loc) continue;
      const diff = Math.abs(loc.characterStart - sourceCharIdx);
      if (diff < minDiff) { minDiff = diff; closestChange = change; }
    }

    let targetRatio = sourceRatio;
    if (closestChange) {
      const targetLoc = source === "A" ? closestChange.afterLocation : closestChange.beforeLocation;
      if (targetLoc && targetLen > 0) targetRatio = targetLoc.characterStart / targetLen;
    }

    const maxTargetScroll = targetEl.scrollHeight - targetEl.clientHeight;
    if (maxTargetScroll <= 0) return;

    isSyncing.current = true;
    targetEl.scrollTop = targetRatio * maxTargetScroll;
    requestAnimationFrame(() => { isSyncing.current = false; });
  };

  useEffect(() => {
    runComparison();
    return () => stopComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentAId, documentBId]);

  const stopComparison = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const runComparison = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    setPhase("Running comparison engine...");

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentAId, documentBId }),
        signal: abortController.signal,
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "An unexpected error occurred during comparison.");
      setResult(data.comparison as ComparisonResult);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("Comparison error:", e);
        setError(e.message);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
        <ComparisonLoader
          docAName={documentAName} docBName={documentBName}
          onAbort={() => { stopComparison(); onAbort?.(); }}
        />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px", background: "#F8F6F2",
      }}>
        <div style={{
          background: "#FFFFFF", border: "1px solid #FECACA",
          borderRadius: "24px", padding: "48px 40px",
          boxShadow: "0 8px 40px rgba(17,17,17,0.06)",
          maxWidth: "480px", width: "100%", textAlign: "center",
        }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%",
            background: "#FEF2F2", border: "1px solid #FECACA",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 style={{
            fontFamily: "'DM Serif Display', 'Playfair Display', Georgia, serif",
            fontSize: "22px", fontWeight: 400, color: "#111111", margin: "0 0 10px",
          }}>
            Analysis Failed
          </h3>
          <p style={{ fontSize: "14px", color: "#77736D", margin: "0 0 28px", lineHeight: 1.6 }}>{error}</p>
          <button
            onClick={runComparison}
            style={{
              padding: "12px 28px", background: "#111111", color: "#FFFFFF",
              borderRadius: "12px", border: "none", fontSize: "14px",
              fontWeight: 600, cursor: "pointer", transition: "background 150ms",
              fontFamily: "inherit",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F47B20")}
            onMouseLeave={e => (e.currentTarget.style.background = "#111111")}
          >
            Retry Comparison
          </button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  // ── Filters ──────────────────────────────────────────────────────────────
  const filteredChanges = result.changes.filter((c) => {
    if (filterType !== "ALL" && c.type !== filterType) return false;
    if (filterSig !== "ALL" && c.significance !== filterSig) return false;
    return true;
  });

  const activeIndex = filteredChanges.findIndex((c) => c.id === selectedChangeId);
  const activeChange = activeIndex >= 0 ? filteredChanges[activeIndex] : null;

  const getHighlightsA = () => {
    if (!activeChange || activeChange.type === "ADDED" || !activeChange.beforeLocation) return undefined;
    if (activeChange.type === "REMOVED") return [{ start: activeChange.beforeLocation.characterStart, end: activeChange.beforeLocation.characterEnd }];
    if (!activeChange.tokenDiff) return undefined;
    const segs: {start: number, end: number}[] = [];
    let curr = activeChange.beforeLocation.characterStart;
    for (const tok of activeChange.tokenDiff) {
      if (tok.op === "equal") curr += tok.text.length;
      else if (tok.op === "delete") {
        segs.push({ start: curr, end: curr + tok.text.length });
        curr += tok.text.length;
      }
    }
    return segs;
  };

  const getHighlightsB = () => {
    if (!activeChange || activeChange.type === "REMOVED" || !activeChange.afterLocation) return undefined;
    if (activeChange.type === "ADDED") return [{ start: activeChange.afterLocation.characterStart, end: activeChange.afterLocation.characterEnd }];
    if (!activeChange.tokenDiff) return undefined;
    const segs: {start: number, end: number}[] = [];
    let curr = activeChange.afterLocation.characterStart;
    for (const tok of activeChange.tokenDiff) {
      if (tok.op === "equal") curr += tok.text.length;
      else if (tok.op === "insert") {
        segs.push({ start: curr, end: curr + tok.text.length });
        curr += tok.text.length;
      }
    }
    return segs;
  };

  const handleNext = () => {
    if (activeIndex < filteredChanges.length - 1) setSelectedChangeId(filteredChanges[activeIndex + 1].id);
  };
  const handlePrev = () => {
    if (activeIndex > 0) setSelectedChangeId(filteredChanges[activeIndex - 1].id);
  };

  const aStat = {
    adds: result.stats.byType.ADDED,
    dels: result.stats.byType.REMOVED,
    mods: result.stats.byType.MODIFIED,
  };

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column", minHeight: 0, width: "100%",
      background: "#F8F6F2", fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        .cmp-filter-btn { transition: all 150ms; }
        .cmp-filter-btn:hover { opacity: 0.85; }
        .cmp-change-card { transition: border-color 150ms, box-shadow 150ms, background 150ms; }
        .cmp-change-card:hover { border-color: #D4CFC8 !important; box-shadow: 0 2px 12px rgba(17,17,17,0.06) !important; }
      `}</style>

      {/* ── Metrics Row ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "14px 20px", borderBottom: "1px solid #E8E4DE",
        background: "#FFFFFF", flexShrink: 0, overflowX: "auto",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", gap: "10px", flex: 1, flexWrap: "wrap" }}>
          <MetricCard label="Total Clauses" value={result.stats.total} accent="#111111" />
          <MetricCard label="Substantive Changes" value={aStat.mods} accent="#F47B20" bg="#FFF0E3" />
          <MetricCard
            label="High Risk Impact"
            value={filteredChanges.filter((c) => c.significance === "HIGH").length}
            accent="#DC2626" bg="#FEF2F2"
          />
          <MetricCard label="Added Clauses" value={`+${aStat.adds}`} accent="#16A34A" bg="#F0FDF4" />
          <MetricCard label="Deleted Clauses" value={`-${aStat.dels}`} accent="#77736D" />
        </div>

        {/* Sync scrolling toggle */}
        <label style={{
          display: "flex", alignItems: "center", gap: "8px",
          cursor: "pointer", userSelect: "none", flexShrink: 0,
          padding: "6px 12px", borderRadius: "10px",
          border: "1px solid #E8E4DE", background: "#FFFFFF",
        }}>
          <input
            type="checkbox"
            checked={syncScroll}
            onChange={(e) => setSyncScroll(e.target.checked)}
            style={{ accentColor: "#F47B20", width: "14px", height: "14px" }}
          />
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#77736D", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Sync Scrolling
          </span>
        </label>
      </div>

      {/* ── 4-Column Workspace ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── Detected Changes Panel ─────────────────────────────────────────── */}
        <aside style={{
          width: "288px", flexShrink: 0,
          display: "flex", flexDirection: "column",
          background: "#FFFFFF", borderRight: "1px solid #E8E4DE",
          zIndex: 5,
          minHeight: 0,
        }}>
          {/* Panel header */}
          <div style={{
            padding: "16px 16px 12px",
            borderBottom: "1px solid #E8E4DE",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h3 style={{
                fontFamily: "'DM Serif Display', 'Playfair Display', Georgia, serif",
                fontSize: "15px", fontWeight: 400, color: "#111111", margin: 0,
              }}>
                Detected Changes
              </h3>
              {filteredChanges.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                  <button
                    onClick={handlePrev} disabled={activeIndex <= 0}
                    aria-label="Previous change"
                    style={{
                      width: "24px", height: "24px", borderRadius: "6px", border: "1px solid #E8E4DE",
                      background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: activeIndex <= 0 ? "not-allowed" : "pointer",
                      opacity: activeIndex <= 0 ? 0.35 : 1, color: "#77736D",
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <span style={{ fontSize: "10px", color: "#77736D", fontVariantNumeric: "tabular-nums", minWidth: "36px", textAlign: "center" }}>
                    {activeIndex >= 0 ? activeIndex + 1 : 0}/{filteredChanges.length}
                  </span>
                  <button
                    onClick={handleNext} disabled={activeIndex === -1 || activeIndex >= filteredChanges.length - 1}
                    aria-label="Next change"
                    style={{
                      width: "24px", height: "24px", borderRadius: "6px", border: "1px solid #E8E4DE",
                      background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: (activeIndex === -1 || activeIndex >= filteredChanges.length - 1) ? "not-allowed" : "pointer",
                      opacity: (activeIndex === -1 || activeIndex >= filteredChanges.length - 1) ? 0.35 : 1, color: "#77736D",
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Filter pills */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {(["ALL", "ADDED", "REMOVED", "MODIFIED"] as const).map((f) => (
                <FilterPill
                  key={f}
                  label={f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                  active={filterType === f}
                  onClick={() => { setFilterType(f); setSelectedChangeId(null); }}
                  color={f === "ADDED" ? "#16A34A" : f === "REMOVED" ? "#DC2626" : f === "MODIFIED" ? "#F47B20" : undefined}
                />
              ))}
            </div>
          </div>

          {/* Change cards list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
            {filteredChanges.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#A09A93", textAlign: "center", padding: "24px 16px", lineHeight: 1.5 }}>
                No changes match the current filter.
              </p>
            ) : (
              filteredChanges.map((change, idx) => (
                <ChangeCard
                  key={change.id}
                  idx={idx + 1}
                  change={change}
                  isSelected={change.id === selectedChangeId}
                  onClick={() => setSelectedChangeId(change.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* ── Document Viewers ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", minWidth: 0 }}>

          {/* Pane A */}
          <div
            style={{ flex: 1, borderRight: "1px solid #E8E4DE", display: "flex", flexDirection: "column", minWidth: 0 }}
            aria-label="Version 1 document pane"
          >
            <div style={{
              height: "40px", background: "#FAFAF8", borderBottom: "1px solid #E8E4DE",
              display: "flex", alignItems: "center", paddingInline: "16px", flexShrink: 0,
              gap: "8px",
            }}>
              <span style={{
                fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "#F47B20",
                background: "#FFF0E3", borderRadius: "5px", padding: "2px 7px",
              }}>V1</span>
              <span style={{
                fontSize: "11px", fontWeight: 600, color: "#77736D",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }} title={documentAName}>
                {documentAName}
              </span>
            </div>
            <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", minHeight: 0 }}>
              <DocumentViewer
                documentId={documentAId}
                characterStart={activeChange?.type !== "ADDED" ? (activeChange?.beforeLocation?.characterStart ?? null) : null}
                characterEnd={activeChange?.type !== "ADDED" ? (activeChange?.beforeLocation?.characterEnd ?? null) : null}
                changedSegments={getHighlightsA()}
                highlightColor={activeChange?.type === "REMOVED" ? "rose" : activeChange?.type === "MODIFIED" ? "purple" : "amber"}
                onClose={() => setSelectedChangeId(null)}
                scrollContainerRef={paneARef}
                onScroll={(e) => handleScroll("A", e)}
                onTextLoaded={setLenA}
              />
            </div>
          </div>

          {/* Pane B */}
          <div
            style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}
            aria-label="Version 2 document pane"
          >
            <div style={{
              height: "40px", background: "#FAFAF8", borderBottom: "1px solid #E8E4DE",
              display: "flex", alignItems: "center", paddingInline: "16px", flexShrink: 0,
              gap: "8px",
            }}>
              <span style={{
                fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "#1677FF",
                background: "#EAF3FF", borderRadius: "5px", padding: "2px 7px",
              }}>V2</span>
              <span style={{
                fontSize: "11px", fontWeight: 600, color: "#77736D",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }} title={documentBName}>
                {documentBName}
              </span>
            </div>
            <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", minHeight: 0 }}>
              <DocumentViewer
                documentId={documentBId}
                characterStart={activeChange?.type !== "REMOVED" ? (activeChange?.afterLocation?.characterStart ?? null) : null}
                characterEnd={activeChange?.type !== "REMOVED" ? (activeChange?.afterLocation?.characterEnd ?? null) : null}
                changedSegments={getHighlightsB()}
                highlightColor={activeChange?.type === "ADDED" ? "emerald" : activeChange?.type === "MODIFIED" ? "purple" : "amber"}
                onClose={() => setSelectedChangeId(null)}
                scrollContainerRef={paneBRef}
                onScroll={(e) => handleScroll("B", e)}
                onTextLoaded={setLenB}
              />
            </div>
          </div>
        </div>

        {/* ── Comparison Assistant ───────────────────────────────────────────── */}
        <div style={{
          width: "340px", flexShrink: 0,
          borderLeft: "1px solid #E8E4DE",
          display: "flex", flexDirection: "column",
          background: "#FFFFFF",
        }}>
          <div style={{
            height: "40px", background: "#FAFAF8", borderBottom: "1px solid #E8E4DE",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            paddingInline: "16px", flexShrink: 0,
          }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#111111", letterSpacing: "-0.01em" }}>
              Comparison Assistant
            </span>
            <span style={{
              fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em",
              textTransform: "uppercase", color: "#77736D",
              border: "1px solid #E8E4DE", borderRadius: "6px",
              padding: "2px 7px", background: "#F8F6F2",
            }}>
              Dual-Authority
            </span>
          </div>
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            <ChatWindow
              documentIds={[documentAId, documentBId]}
              conversationId={null}
              onConversationCreated={() => {}}
              documentsMap={{ [documentAId]: documentAName, [documentBId]: documentBName }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Filter Pill ──────────────────────────────────────────────────────────────

function FilterPill({
  label, active, onClick, color,
}: { label: string; active: boolean; onClick: () => void; color?: string }) {
  const activeColor = color || "#111111";
  return (
    <button
      onClick={onClick}
      className="cmp-filter-btn"
      style={{
        padding: "4px 12px", borderRadius: "20px", border: "1.5px solid",
        fontSize: "11px", fontWeight: 600, cursor: "pointer",
        background: active ? activeColor : "#FFFFFF",
        borderColor: active ? activeColor : "#E8E4DE",
        color: active ? "#FFFFFF" : "#77736D",
        fontFamily: "inherit",
        outline: "none",
        transition: "all 150ms",
      }}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

// ─── Change Card ──────────────────────────────────────────────────────────────

function ChangeCard({
  idx, change, isSelected, onClick,
}: { idx: number; change: ComparisonChange; isSelected: boolean; onClick: () => void }) {
  const typeStyle: Record<string, { bg: string; color: string }> = {
    ADDED:    { bg: "#F0FDF4", color: "#16A34A" },
    REMOVED:  { bg: "#FEF2F2", color: "#DC2626" },
    MODIFIED: { bg: "#FFF0E3", color: "#F47B20" },
  };
  const sigStyle: Record<string, { bg: string; color: string }> = {
    HIGH:   { bg: "#FEF2F2", color: "#DC2626" },
    MEDIUM: { bg: "#FFF0E3", color: "#F47B20" },
    LOW:    { bg: "#F8F6F2", color: "#77736D" },
  };

  const ts = typeStyle[change.type] || typeStyle.MODIFIED;
  const ss = sigStyle[change.significance] || sigStyle.LOW;

  const previewText =
    change.aiExplanation || change.beforeText?.slice(0, 110) || change.afterText?.slice(0, 110) || "";

  return (
    <button
      onClick={onClick}
      className="cmp-change-card"
      style={{
        width: "100%", textAlign: "left",
        padding: "12px", borderRadius: "12px",
        border: `1.5px solid ${isSelected ? "#F47B20" : "#E8E4DE"}`,
        background: isSelected ? "#FFF9F5" : "#FFFFFF",
        boxShadow: isSelected ? "0 0 0 3px rgba(244,123,32,0.08)" : "none",
        cursor: "pointer", marginBottom: "8px",
        outline: "none", fontFamily: "inherit",
        display: "block",
      }}
      aria-pressed={isSelected}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "9px", color: "#A09A93", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
          #{String(idx).padStart(2, "0")}
        </span>
        <span style={{
          fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
          padding: "2px 7px", borderRadius: "5px",
          background: ts.bg, color: ts.color,
        }}>
          {change.type}
        </span>
        <span style={{
          fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
          padding: "2px 7px", borderRadius: "5px",
          background: ss.bg, color: ss.color,
        }}>
          {change.significance}
        </span>
      </div>

      {/* Preview */}
      <p style={{
        fontSize: "12px", color: isSelected ? "#111111" : "#5A5551",
        lineHeight: 1.55, margin: "0 0 8px",
        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        {previewText}
      </p>

      {/* Markers */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {change.moneyChanges.length > 0 && (
          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#92400E", display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#D97706" }} />
            Money
          </span>
        )}
        {change.dateChanges.length > 0 && (
          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6B21A8", display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#7C3AED" }} />
            Date
          </span>
        )}
        {change.numberChanges.length > 0 && (
          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0E5B8E", display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#1677FF" }} />
            Number
          </span>
        )}
      </div>

      {/* Token-level diff (expanded when selected) */}
      {isSelected && change.tokenDiff.length > 0 && (
        <div style={{
          marginTop: "10px", paddingTop: "10px",
          borderTop: "1px solid #F0ECE6",
          fontSize: "10px", fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          lineHeight: 1.6, background: "#F8F6F2",
          borderRadius: "8px", padding: "8px 10px",
          maxHeight: "100px", overflowY: "auto",
          wordBreak: "break-word",
        }}>
          {change.tokenDiff.map((tok, i) => {
            if (tok.op === "equal") return <span key={i} style={{ color: "#77736D" }}>{tok.text}</span>;
            if (tok.op === "delete") return <del key={i} style={{ background: "rgba(220,38,38,0.12)", color: "#DC2626", textDecoration: "line-through" }}>{tok.text}</del>;
            return <ins key={i} style={{ background: "rgba(22,163,74,0.12)", color: "#16A34A", textDecoration: "none" }}>{tok.text}</ins>;
          })}
        </div>
      )}
    </button>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label, value, accent, bg,
}: { label: string; value: string | number; accent: string; bg?: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      padding: "8px 14px",
      background: bg || "#F8F6F2",
      border: "1px solid #E8E4DE",
      borderRadius: "12px",
      minWidth: "110px", flex: "1 1 auto",
    }}>
      <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A09A93", marginBottom: "3px" }}>
        {label}
      </span>
      <span style={{ fontSize: "20px", fontWeight: 700, color: accent, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
      </span>
    </div>
  );
}
