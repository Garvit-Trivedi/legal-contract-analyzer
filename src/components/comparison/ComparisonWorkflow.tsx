"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ComparisonView } from "@/components/ComparisonView";

// ─── Decorative background SVG ───────────────────────────────────────────────

function PageDecoration() {
  return (
    <div
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}
    >
      {/* Top-right flowing lines */}
      <svg
        style={{ position: "absolute", top: -30, right: -30, opacity: 0.55 }}
        width="480" height="320" viewBox="0 0 480 320" fill="none"
      >
        <path d="M480 0 Q360 80 200 60 Q100 50 0 120" stroke="#D4CFC8" strokeWidth="1" fill="none" />
        <path d="M480 20 Q370 95 210 78 Q112 68 10 138" stroke="#D4CFC8" strokeWidth="0.8" fill="none" />
        <path d="M480 40 Q380 110 220 96 Q124 86 20 156" stroke="#D4CFC8" strokeWidth="0.7" fill="none" />
        <path d="M480 60 Q390 125 230 114 Q136 104 30 174" stroke="#D4CFC8" strokeWidth="0.6" fill="none" />
        <path d="M480 80 Q400 140 240 132 Q148 122 40 192" stroke="#D4CFC8" strokeWidth="0.5" fill="none" />
        <path d="M480 160 Q440 200 280 204 Q196 194 80 264" stroke="#F47B20" strokeWidth="0.45" fill="none" />
        <path d="M480 180 Q450 215 290 222 Q208 212 90 282" stroke="#F47B20" strokeWidth="0.35" fill="none" />
      </svg>

      {/* Bottom-left flowing lines */}
      <svg
        style={{ position: "absolute", bottom: -20, left: -20, opacity: 0.45 }}
        width="400" height="260" viewBox="0 0 400 260" fill="none"
      >
        <path d="M0 260 Q100 180 240 200 Q340 210 400 140" stroke="#D4CFC8" strokeWidth="1" fill="none" />
        <path d="M0 240 Q110 165 250 185 Q350 195 400 120" stroke="#D4CFC8" strokeWidth="0.8" fill="none" />
        <path d="M0 220 Q120 150 260 170 Q360 180 400 100" stroke="#D4CFC8" strokeWidth="0.6" fill="none" />
        <path d="M0 200 Q130 135 270 155 Q365 162 400 80" stroke="#F47B20" strokeWidth="0.4" fill="none" />
      </svg>
    </div>
  );
}

// ─── Main Workflow ────────────────────────────────────────────────────────────

export function ComparisonWorkflow({ documents }: { documents: any[] }) {
  const [docA, setDocA] = useState<string | null>(null);
  const [docB, setDocB] = useState<string | null>(null);
  const [mode, setMode] = useState<"setup" | "compare">("setup");

  const aName = documents.find((d) => d.id === docA)?.filename || "Document A";
  const bName = documents.find((d) => d.id === docB)?.filename || "Document B";

  const startComparison = () => {
    if (docA && docB && docA !== docB) setMode("compare");
  };

  const handleAbort = () => setMode("setup");

  const swapDocs = () => {
    const tmp = docA;
    setDocA(docB);
    setDocB(tmp);
    setMode("setup");
  };

  const canRun = !!docA && !!docB && docA !== docB;

  // ── Compare mode: full-screen ComparisonView ─────────────────────────────
  if (mode === "compare" && docA && docB) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#F8F6F2", position: "relative" }}>
        <PageDecoration />
        {/* Minimal workspace header */}
        <header style={{
          position: "relative", zIndex: 10,
          height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingInline: "28px", background: "#FFFFFF",
          borderBottom: "1px solid #E8E4DE",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={handleAbort}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                fontSize: "13px", fontWeight: 500, color: "#77736D",
                background: "none", border: "none", cursor: "pointer", padding: "6px 10px",
                borderRadius: "8px", transition: "background 150ms",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F8F6F2")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
              aria-label="Back to documents"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M5 12l7-7M5 12l7 7" />
              </svg>
              Documents
            </button>
            <span style={{ color: "#D4CFC8" }}>/</span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#111111" }}>Compare Documents</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              fontSize: "11px", fontWeight: 600, color: "#77736D",
              background: "#F8F6F2", border: "1px solid #E8E4DE",
              borderRadius: "8px", padding: "4px 10px",
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>
              {aName.length > 18 ? aName.slice(0, 16) + "…" : aName}
            </span>
            <span style={{ color: "#D4CFC8", fontSize: "14px" }}>⇄</span>
            <span style={{
              fontSize: "11px", fontWeight: 600, color: "#77736D",
              background: "#F8F6F2", border: "1px solid #E8E4DE",
              borderRadius: "8px", padding: "4px 10px",
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>
              {bName.length > 18 ? bName.slice(0, 16) + "…" : bName}
            </span>
          </div>
        </header>

        <div style={{ flex: 1, overflow: "hidden", position: "relative", zIndex: 1 }}>
          <ComparisonView
            documentAId={docA}
            documentBId={docB}
            documentAName={aName}
            documentBName={bName}
            onAbort={handleAbort}
          />
        </div>
      </div>
    );
  }

  // ── Setup mode: premium design landing ───────────────────────────────────
  return (
    <div style={{
      flex: 1, minHeight: "100%", background: "#F8F6F2",
      display: "flex", flexDirection: "column", position: "relative",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <PageDecoration />

      {/* ── Workspace Header ───────────────────────────────────────────────── */}
      <header style={{
        position: "relative", zIndex: 10,
        height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingInline: "40px", background: "#FFFFFF",
        borderBottom: "1px solid #E8E4DE", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/" style={{
            display: "flex", alignItems: "center", gap: "6px",
            fontSize: "13px", fontWeight: 500, color: "#77736D",
            textDecoration: "none", padding: "6px 10px",
            borderRadius: "8px", transition: "background 150ms",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F8F6F2")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" />
            </svg>
            Documents
          </Link>
          <span style={{ color: "#D4CFC8" }}>/</span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#111111" }}>Compare Documents</span>
        </div>
      </header>

      {/* ── Page Content ───────────────────────────────────────────────────── */}
      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: "900px", margin: "0 auto", padding: "52px 40px 80px", width: "100%",
      }}>

        {/* Page Heading */}
        <div style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span style={{ width: "28px", height: "1px", background: "#F47B20" }} />
            <span style={{
              fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "#F47B20",
            }}>Compare Documents</span>
          </div>

          <h1 style={{
            fontFamily: "'DM Serif Display', 'Playfair Display', Georgia, serif",
            fontSize: "clamp(32px, 4vw, 48px)",
            fontWeight: 400,
            color: "#111111",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            margin: 0,
            marginBottom: "14px",
          }}>
            Compare contracts<br />
            <span style={{ color: "#F47B20" }}>side by side.</span>
          </h1>
          <p style={{ fontSize: "15px", color: "#77736D", margin: 0, lineHeight: 1.6, maxWidth: "540px" }}>
            Identify clause-level differences, assess risk exposure, and get AI-powered legal insights.
          </p>
        </div>

        {/* Not Enough Docs */}
        {documents.length < 2 && (
          <div style={{
            background: "#FFFFFF", border: "1px solid #E8E4DE",
            borderRadius: "20px", padding: "48px",
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(17,17,17,0.04)",
          }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%",
              background: "#FFF0E3", border: "1px solid rgba(244,123,32,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F47B20" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 style={{ fontSize: "17px", fontWeight: 600, color: "#111111", margin: "0 0 8px" }}>Insufficient Documents</h3>
            <p style={{ fontSize: "14px", color: "#77736D", margin: "0 0 24px", lineHeight: 1.6 }}>
              You need at least 2 indexed documents to run a comparison.
            </p>
            <Link href="/" style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "10px 22px", background: "#111111", color: "#FFFFFF",
              borderRadius: "12px", fontSize: "13px", fontWeight: 600,
              textDecoration: "none",
            }}>
              Upload Documents
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        )}

        {/* Document Selection Card */}
        {documents.length >= 2 && (
          <div style={{
            background: "#FFFFFF", border: "1px solid #E8E4DE",
            borderRadius: "24px", padding: "36px 40px",
            boxShadow: "0 4px 24px rgba(17,17,17,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", flexWrap: "wrap" }}>

              {/* Version 1 Selector */}
              <div style={{ flex: "1 1 240px", minWidth: "220px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <span style={{
                    fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: "#F47B20",
                    background: "#FFF0E3", borderRadius: "6px", padding: "3px 8px",
                  }}>Version 1</span>
                  <span style={{ fontSize: "12px", color: "#77736D", fontWeight: 500 }}>Original</span>
                </div>
                <label style={{ display: "block", fontSize: "12px", color: "#77736D", marginBottom: "8px", fontWeight: 500 }}>
                  Select base document
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    value={docA || ""}
                    onChange={(e) => { setDocA(e.target.value); setMode("setup"); }}
                    aria-label="Select Version 1 document"
                    style={{
                      width: "100%", padding: "12px 40px 12px 14px",
                      border: "1.5px solid #E8E4DE", borderRadius: "12px",
                      fontSize: "14px", color: docA ? "#111111" : "#77736D",
                      background: "#FFFFFF", outline: "none", cursor: "pointer",
                      appearance: "none", transition: "border-color 150ms",
                      fontFamily: "inherit",
                    }}
                    onFocus={e => (e.target.style.borderColor = "#F47B20")}
                    onBlur={e => (e.target.style.borderColor = "#E8E4DE")}
                  >
                    <option value="" disabled>— Select document —</option>
                    {documents.map((d) => (
                      <option key={d.id} value={d.id} disabled={d.id === docB}>{d.filename}</option>
                    ))}
                  </select>
                  <svg
                    style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#77736D" }}
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
                {docA && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16A34A" }} />
                    <span style={{ fontSize: "11px", color: "#16A34A", fontWeight: 500 }}>Document loaded</span>
                  </div>
                )}
              </div>

              {/* Swap Button */}
              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "2px", flexShrink: 0 }}>
                <button
                  onClick={swapDocs}
                  disabled={!docA && !docB}
                  aria-label="Swap documents"
                  title="Swap Version 1 and Version 2"
                  style={{
                    width: "44px", height: "44px", borderRadius: "50%",
                    border: "1.5px solid #E8E4DE", background: "#FFFFFF",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: (!docA && !docB) ? "not-allowed" : "pointer",
                    opacity: (!docA && !docB) ? 0.4 : 1,
                    transition: "border-color 150ms, background 150ms, transform 200ms",
                    fontSize: "18px", color: "#77736D",
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    if (docA || docB) {
                      (e.currentTarget.style.borderColor = "#F47B20");
                      (e.currentTarget.style.background = "#FFF0E3");
                      (e.currentTarget.style.transform = "rotate(180deg)");
                    }
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget.style.borderColor = "#E8E4DE");
                    (e.currentTarget.style.background = "#FFFFFF");
                    (e.currentTarget.style.transform = "rotate(0deg)");
                  }}
                >
                  ⇄
                </button>
              </div>

              {/* Version 2 Selector */}
              <div style={{ flex: "1 1 240px", minWidth: "220px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <span style={{
                    fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: "#1677FF",
                    background: "#EAF3FF", borderRadius: "6px", padding: "3px 8px",
                  }}>Version 2</span>
                  <span style={{ fontSize: "12px", color: "#77736D", fontWeight: 500 }}>Revised</span>
                </div>
                <label style={{ display: "block", fontSize: "12px", color: "#77736D", marginBottom: "8px", fontWeight: 500 }}>
                  Select revised document
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    value={docB || ""}
                    onChange={(e) => { setDocB(e.target.value); setMode("setup"); }}
                    aria-label="Select Version 2 document"
                    style={{
                      width: "100%", padding: "12px 40px 12px 14px",
                      border: "1.5px solid #E8E4DE", borderRadius: "12px",
                      fontSize: "14px", color: docB ? "#111111" : "#77736D",
                      background: "#FFFFFF", outline: "none", cursor: "pointer",
                      appearance: "none", transition: "border-color 150ms",
                      fontFamily: "inherit",
                    }}
                    onFocus={e => (e.target.style.borderColor = "#1677FF")}
                    onBlur={e => (e.target.style.borderColor = "#E8E4DE")}
                  >
                    <option value="" disabled>— Select document —</option>
                    {documents.map((d) => (
                      <option key={d.id} value={d.id} disabled={d.id === docA}>{d.filename}</option>
                    ))}
                  </select>
                  <svg
                    style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#77736D" }}
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
                {docB && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#1677FF" }} />
                    <span style={{ fontSize: "11px", color: "#1677FF", fontWeight: 500 }}>Document loaded</span>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "#F0ECE6", margin: "28px 0" }} />

            {/* Run Comparison */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
              <div>
                {docA === docB && docA !== null && (
                  <p style={{ fontSize: "13px", color: "#DC2626", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>⚠</span> Please select two different documents.
                  </p>
                )}
                {canRun && (
                  <p style={{ fontSize: "13px", color: "#77736D", margin: 0 }}>
                    Ready to compare <strong style={{ color: "#111111" }}>{aName}</strong> against <strong style={{ color: "#111111" }}>{bName}</strong>.
                  </p>
                )}
                {!docA && !docB && (
                  <p style={{ fontSize: "13px", color: "#77736D", margin: 0 }}>
                    Select two documents above to begin the analysis.
                  </p>
                )}
              </div>

              <button
                disabled={!canRun}
                onClick={startComparison}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "10px",
                  padding: "13px 28px",
                  background: canRun ? "#111111" : "#E8E4DE",
                  color: canRun ? "#FFFFFF" : "#77736D",
                  borderRadius: "12px", border: "none",
                  fontSize: "14px", fontWeight: 600,
                  cursor: canRun ? "pointer" : "not-allowed",
                  transition: "background 150ms, transform 100ms",
                  outline: "none",
                  fontFamily: "inherit",
                  letterSpacing: "-0.01em",
                }}
                onMouseEnter={e => { if (canRun) (e.currentTarget.style.background = "#F47B20"); }}
                onMouseLeave={e => { if (canRun) (e.currentTarget.style.background = "#111111"); }}
                aria-label="Run side-by-side comparison"
              >
                Run Comparison
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* How it Works — Info cards */}
        {documents.length >= 2 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginTop: "32px" }}>
            {[
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F47B20" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414A1 1 0 0120 8.414V15a2 2 0 01-2 2h-2" />
                    <path d="M4 11V9a2 2 0 012-2" />
                  </svg>
                ),
                title: "Clause Alignment",
                desc: "Structural paragraph-level matching across both documents.",
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F47B20" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                ),
                title: "Risk Analysis",
                desc: "HIGH / MEDIUM / LOW risk classification for each detected change.",
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F47B20" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                ),
                title: "AI Assistant",
                desc: "Ask questions grounded in both documents with zero-trust citations.",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  background: "#FFFFFF", border: "1px solid #E8E4DE",
                  borderRadius: "16px", padding: "22px 20px",
                  boxShadow: "0 2px 10px rgba(17,17,17,0.03)",
                }}
              >
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: "#FFF0E3", display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "12px",
                }}>
                  {item.icon}
                </div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#111111", margin: "0 0 4px" }}>{item.title}</p>
                <p style={{ fontSize: "12px", color: "#77736D", margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
