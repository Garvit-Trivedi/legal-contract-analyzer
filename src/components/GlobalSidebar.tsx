"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconCompare() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M9 3v18M15 3v18" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

// ─── Decorative flowing SVG lines ────────────────────────────────────────────

function SidebarDecoration() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "280px",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <svg
        width="280"
        height="280"
        viewBox="0 0 280 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", bottom: 0, left: 0 }}
      >
        {/* Flowing orange wave lines */}
        <path d="M-20 260 Q60 220 140 250 Q220 280 300 240" stroke="#F47B20" strokeWidth="1.2" strokeOpacity="0.5" fill="none" />
        <path d="M-20 248 Q70 208 150 238 Q230 268 310 228" stroke="#F47B20" strokeWidth="1" strokeOpacity="0.4" fill="none" />
        <path d="M-20 236 Q80 196 160 226 Q240 256 320 216" stroke="#F47B20" strokeWidth="0.9" strokeOpacity="0.35" fill="none" />
        <path d="M-20 224 Q90 184 170 214 Q250 244 330 204" stroke="#F47B20" strokeWidth="0.8" strokeOpacity="0.28" fill="none" />
        <path d="M-20 212 Q100 172 180 202 Q260 232 340 192" stroke="#F47B20" strokeWidth="0.7" strokeOpacity="0.22" fill="none" />
        <path d="M-20 200 Q110 160 190 190 Q270 220 350 180" stroke="#FF8A24" strokeWidth="0.6" strokeOpacity="0.18" fill="none" />
        <path d="M-20 188 Q120 148 200 178 Q280 208 360 168" stroke="#FF8A24" strokeWidth="0.5" strokeOpacity="0.14" fill="none" />
        <path d="M-20 176 Q130 136 210 166 Q290 196 370 156" stroke="#FF8A24" strokeWidth="0.4" strokeOpacity="0.10" fill="none" />

        {/* Secondary darker curves */}
        <path d="M-40 270 Q40 240 120 265 Q200 290 280 260" stroke="#F47B20" strokeWidth="1.4" strokeOpacity="0.3" fill="none" />
        <path d="M-40 282 Q40 252 120 277 Q200 302 280 272" stroke="#F47B20" strokeWidth="1.6" strokeOpacity="0.2" fill="none" />
      </svg>
    </div>
  );
}

// ─── Nav Link ─────────────────────────────────────────────────────────────────

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 16px",
        borderRadius: "14px",
        fontSize: "15px",
        fontWeight: 500,
        letterSpacing: "-0.01em",
        textDecoration: "none",
        position: "relative",
        transition: "background 150ms ease-out, color 150ms ease-out",
        color: active ? "#F47B20" : "#8A8580",
        background: active ? "rgba(244,123,32,0.1)" : "transparent",
        marginBottom: "2px",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
          (e.currentTarget as HTMLElement).style.color = "#D4CFC8";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = "#8A8580";
        }
      }}
    >
      {/* Active indicator */}
      {active && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: "3px",
            height: "22px",
            background: "#F47B20",
            borderRadius: "0 4px 4px 0",
          }}
          aria-hidden="true"
        />
      )}
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

// ─── Global Sidebar ───────────────────────────────────────────────────────────

export function GlobalSidebar() {
  const pathname = usePathname();

  // Hide inside document workspace
  if (pathname?.startsWith("/documents/")) return null;

  return (
    <aside
      style={{
        width: "280px",
        flexShrink: 0,
        background: "#0D0D0D",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
        zIndex: 30,
        overflow: "hidden",
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          padding: "28px 24px 24px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        {/* Orange rounded square icon */}
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "#F47B20",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="15" y2="17" />
          </svg>
        </div>
        {/* Brand name */}
        <div>
          <span
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "19px",
              color: "#FFFFFF",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            Legal{" "}
            <span style={{ color: "#F47B20" }}>Analyzer</span>
          </span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav
        className="sidebar-scrollbar"
        style={{
          flex: 1,
          padding: "8px 16px",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
        aria-label="Main navigation"
      >
        <NavLink
          href="/"
          label="Dashboard"
          icon={<IconDashboard />}
          active={pathname === "/"}
        />
        <NavLink
          href="/compare"
          label="Compare Documents"
          icon={<IconCompare />}
          active={pathname === "/compare"}
        />
        <NavLink
          href="/history"
          label="Chat History"
          icon={<IconHistory />}
          active={pathname === "/history"}
        />

        {/* Divider */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            margin: "16px 0",
          }}
        />

        <NavLink
          href="#"
          label="Settings"
          icon={<IconSettings />}
          active={false}
        />
      </nav>

      {/* ── Decorative flowing lines at bottom ── */}
      <SidebarDecoration />
    </aside>
  );
}
