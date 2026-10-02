/**
 * Step 10 — Full comparison type definitions.
 * Supersedes the old comparison.ts types.
 * Step 11 will consume ComparisonResult and ComparisonChange.
 */

// ──────────────────────────────────────────────────────────────
// Core enums
// ──────────────────────────────────────────────────────────────

export type ChangeType = "ADDED" | "REMOVED" | "MODIFIED";

/**
 * Uppercase significance to distinguish from old lowercase Step 9 type.
 * Exported as ChangeSignificanceV2 to avoid import conflicts.
 */
export type ChangeSignificanceV2 = "LOW" | "MEDIUM" | "HIGH";

// ──────────────────────────────────────────────────────────────
// Source location
// ──────────────────────────────────────────────────────────────

/**
 * Exact location of a piece of text within a document.
 * Derived entirely from database records — never from AI output.
 */
export interface SourceLocation {
  /** ID of the document chunk (UUID) */
  chunkId: string;
  /** Page number (null for DOCX/TXT which have no page info) */
  page: number | null;
  /** Absolute character offset from start of extracted text */
  characterStart: number;
  characterEnd: number;
}

// ──────────────────────────────────────────────────────────────
// Token diff
// ──────────────────────────────────────────────────────────────

export interface TokenDiffEntry {
  op: "equal" | "insert" | "delete";
  text: string;
}

// ──────────────────────────────────────────────────────────────
// Specialized changes
// ──────────────────────────────────────────────────────────────

export interface MoneyChange {
  beforeRaw: string | null;
  afterRaw: string | null;
  beforeValue: number | null;
  afterValue: number | null;
  currency: string;
}

export interface NumberChange {
  beforeRaw: string | null;
  afterRaw: string | null;
  beforeValue: number | null;
  afterValue: number | null;
  unit: string | null;
}

export interface DateChange {
  beforeRaw: string | null;
  afterRaw: string | null;
  beforeIso: string | null;
  afterIso: string | null;
}

// ──────────────────────────────────────────────────────────────
// Verified quote
// ──────────────────────────────────────────────────────────────

export interface VerifiedQuote {
  /** The actual text of the quote */
  text: string;
  /** Whether the quote was found verbatim in the source document */
  verified: boolean;
  /** Absolute character start (only if verified) */
  characterStart?: number;
  /** Absolute character end (only if verified) */
  characterEnd?: number;
}

// ──────────────────────────────────────────────────────────────
// Core change model
// ──────────────────────────────────────────────────────────────

export interface ComparisonChange {
  /** Deterministic ID like "chg_0001" */
  id: string;

  type: ChangeType;

  /** Actual text from Version A (null for ADDED) */
  beforeText: string | null;
  /** Actual text from Version B (null for REMOVED) */
  afterText: string | null;

  /** Exact location in Document A (null for ADDED) */
  beforeLocation: SourceLocation | null;
  /** Exact location in Document B (null for REMOVED) */
  afterLocation: SourceLocation | null;

  /**
   * Word-level diff for MODIFIED changes.
   * Empty for ADDED/REMOVED (the entire text is the diff).
   */
  tokenDiff: TokenDiffEntry[];

  /** Detected monetary value changes */
  moneyChanges: MoneyChange[];
  /** Detected numeric changes */
  numberChanges: NumberChange[];
  /** Detected date changes */
  dateChanges: DateChange[];

  /** Final significance (deterministic + AI) */
  significance: ChangeSignificanceV2;

  /** Gemini plain-language explanation (null if AI unavailable or not sent to AI) */
  aiExplanation: string | null;
  /** Party affected, per AI analysis */
  affectedParty: string | null;
  /** AI summary of what Version A said */
  beforeMeaning: string | null;
  /** AI summary of what Version B says */
  afterMeaning: string | null;

  /** Verified quote from Version A */
  beforeQuote: VerifiedQuote | null;
  /** Verified quote from Version B */
  afterQuote: VerifiedQuote | null;
}

// ──────────────────────────────────────────────────────────────
// Top-level result
// ──────────────────────────────────────────────────────────────

export interface ComparisonDocumentInfo {
  id: string;
  filename: string;
  fileType: string;
}

export interface ComparisonStats {
  total: number;
  byType: { ADDED: number; REMOVED: number; MODIFIED: number };
  bySignificance: { HIGH: number; MEDIUM: number; LOW: number };
}

export interface ComparisonResult {
  documentA: ComparisonDocumentInfo;
  documentB: ComparisonDocumentInfo;

  /** Plain-language executive summary of all changes */
  summary: string;

  /** Full ordered list of changes */
  changes: ComparisonChange[];

  /** Aggregate statistics */
  stats: ComparisonStats;

  /** Whether Gemini analysis was available */
  aiAvailable: boolean;
  /** Gemini error message if unavailable */
  aiError?: string;
}

// ──────────────────────────────────────────────────────────────
// API types
// ──────────────────────────────────────────────────────────────

export interface ComparisonRequest {
  documentAId: string;
  documentBId: string;
}

export interface ComparisonApiResponse {
  success: true;
  comparison: ComparisonResult;
}

export interface ComparisonApiError {
  success: false;
  error: string;
}

// ──────────────────────────────────────────────────────────────
// Backward-compat shims (kept for ComparisonView.tsx until Step 11)
// ──────────────────────────────────────────────────────────────

/** @deprecated Use ChangeSignificanceV2 */
export type ChangeSignificance = "high" | "medium" | "low";

/** @deprecated Use ComparisonChange */
export interface LegacyComparisonEvidence {
  documentId: string;
  chunkIds: string[];
  quote?: string;
  exactQuote?: string;
  verified?: boolean;
  characterStart?: number;
  characterEnd?: number;
  pageStart?: number | null;
}

/** @deprecated Step 9 comparison type. Use ComparisonResult instead. */
export interface LegacyComparisonResult {
  summary: string;
  changes: Array<{
    topic: string;
    changeType: "added" | "removed" | "modified";
    significance?: ChangeSignificance;
    explanation: string;
    documentA?: LegacyComparisonEvidence;
    documentB?: LegacyComparisonEvidence;
  }>;
}

// Partial type used during engine construction
export interface PartialComparisonChange {
  id: string;
  type: ChangeType;
  beforeText: string | null;
  afterText: string | null;
}
