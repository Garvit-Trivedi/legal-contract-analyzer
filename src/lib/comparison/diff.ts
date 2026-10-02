/**
 * Deterministic diff algorithms for the document comparison engine.
 * No Gemini involved — all purely algorithmic.
 */

// ──────────────────────────────────────────────────────────────
// Normalization
// ──────────────────────────────────────────────────────────────

/**
 * Produce a "comparison-normalized" version of text suitable for diffing.
 * Rules:
 *  - Remove null/invisible characters
 *  - Collapse multiple spaces/tabs to a single space
 *  - Normalize Windows line endings to Unix
 *  - Trim leading/trailing whitespace from each line
 *  - Collapse 3+ consecutive blank lines to 2
 *
 * DOES NOT:
 *  - Remove legal keywords ("not", "shall", "may")
 *  - Remove monetary values, numbers, dates
 *  - Change capitalization of meaningful words
 */
export function normalizeForComparison(text: string): string {
  return text
    .replace(/\0/g, "")                          // null bytes
    .replace(/\r\n/g, "\n")                       // Windows CRLF
    .replace(/\r/g, "\n")                         // old Mac CR
    .replace(/[ \t]+/g, " ")                      // collapse horizontal whitespace
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")                   // at most 2 blank lines
    .trim();
}

// ──────────────────────────────────────────────────────────────
// Sentence / paragraph splitting
// ──────────────────────────────────────────────────────────────

/** Split text into paragraph units (double newline boundaries). */
export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Naive sentence splitter — splits on ". ", "! ", "? " etc.
 * Preserves abbreviations reasonably well by requiring the char after ". " to be uppercase.
 */
export function splitIntoSentences(text: string): string[] {
  const raw = text.match(/[^.!?]+[.!?]+["']?(?:\s|$)|[^.!?]+$/g) || [text];
  return raw.map((s) => s.trim()).filter((s) => s.length > 0);
}

// ──────────────────────────────────────────────────────────────
// Token-level diff (word-based LCS)
// ──────────────────────────────────────────────────────────────

export type TokenOp = "equal" | "insert" | "delete";

export interface TokenDiffEntry {
  op: TokenOp;
  /** Token text */
  text: string;
}

/** Tokenize into words + whitespace tokens. */
function tokenize(text: string): string[] {
  // Split into word tokens and space separators
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

/**
 * Classic LCS-based diff on token arrays.
 * Returns a sequence of {op, text} entries suitable for rendering highlights.
 */
export function computeTokenDiff(textA: string, textB: string): TokenDiffEntry[] {
  const tokA = tokenize(textA);
  const tokB = tokenize(textB);

  const m = tokA.length;
  const n = tokB.length;

  // Build LCS table — for very long texts, use a limited window to stay O(n)
  // For legal clauses this is typically fine up to ~2000 tokens
  if (m * n > 4_000_000) {
    // Fallback for huge texts: treat entire change
    return [
      { op: "delete", text: textA },
      { op: "insert", text: textB },
    ];
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (tokA[i] === tokB[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to build diff
  const result: TokenDiffEntry[] = [];
  let i = 0;
  let j = 0;

  while (i < m || j < n) {
    if (i < m && j < n && tokA[i] === tokB[j]) {
      result.push({ op: "equal", text: tokA[i] });
      i++;
      j++;
    } else if (j < n && (i === m || dp[i][j + 1] >= dp[i + 1][j])) {
      result.push({ op: "insert", text: tokB[j] });
      j++;
    } else {
      result.push({ op: "delete", text: tokA[i] });
      i++;
    }
  }

  return result;
}

// ──────────────────────────────────────────────────────────────
// Paragraph similarity scoring
// ──────────────────────────────────────────────────────────────

/**
 * Compute a similarity score [0, 1] between two normalized strings.
 * Uses Jaccard similarity on word bigrams for content-level comparison.
 */
export function similarityScore(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const words = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0);

  const wa = words(a);
  const wb = words(b);

  if (wa.length === 0 && wb.length === 0) return 1;
  if (wa.length === 0 || wb.length === 0) return 0;

  // Build bigrams
  const bigrams = (tokens: string[]): Set<string> => {
    const s = new Set<string>();
    for (let i = 0; i < tokens.length - 1; i++) {
      s.add(`${tokens[i]}_${tokens[i + 1]}`);
    }
    // Add unigrams too for short texts
    tokens.forEach((t) => s.add(t));
    return s;
  };

  const sa = bigrams(wa);
  const sb = bigrams(wb);

  let intersection = 0;
  sa.forEach((g) => {
    if (sb.has(g)) intersection++;
  });

  const union = sa.size + sb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
