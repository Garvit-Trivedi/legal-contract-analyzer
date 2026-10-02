/**
 * Specialized detectors for monetary values, numbers, and dates.
 * All purely deterministic — no AI involved.
 */

// ──────────────────────────────────────────────────────────────
// Money detection
// ──────────────────────────────────────────────────────────────

export interface DetectedMoney {
  /** The raw matched string, e.g. "$100,000" */
  raw: string;
  /** Numeric value, e.g. 100000 */
  value: number;
  /** Currency symbol/code, e.g. "$", "USD", "€" */
  currency: string;
  /** Character offset in the source text */
  offset: number;
}

function parseMoney(raw: string, currency: string): number {
  const cleaned = raw.replace(/,/g, "").replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  const lc = currency.toLowerCase();
  if (lc === "thousand") return num * 1_000;
  if (lc === "million") return num * 1_000_000;
  if (lc === "billion") return num * 1_000_000_000;
  return num;
}

/**
 * Detect monetary values in text using positional-group regexes (ES2017 compatible).
 * Patterns:
 *  - $100,000 | €50,000 | £10,000
 *  - USD 100,000 | EUR 100,000
 *  - 100,000 USD | 100,000 million
 */
export function detectMoneyValues(text: string): DetectedMoney[] {
  const results: DetectedMoney[] = [];

  // Pattern 1: Optional currency code, then symbol, then number, then optional suffix
  // Groups: [1]=currencyCode, [2]=symbol, [3]=number, [4]=suffix
  const pattern1 =
    /((?:USD|EUR|GBP|CAD|AUD|CHF|JPY|CNY|INR)\s+)?([$€£¥₹])?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,4})?|\d+(?:\.\d{1,4})?)(?:\s*(USD|EUR|GBP|CAD|AUD|CHF|JPY|CNY|INR|thousand|million|billion))?/gi;

  let m: RegExpExecArray | null;
  while ((m = pattern1.exec(text)) !== null) {
    const currencyCode = (m[1] || "").trim();
    const sym = (m[2] || "").trim();
    const numStr = (m[3] || "").trim();
    const suffix = (m[4] || "").trim();

    if (!numStr) continue;

    const value = parseMoney(numStr, suffix || sym || currencyCode);

    // Must have some currency indicator to avoid false positives
    if (!sym && !suffix && !currencyCode) {
      if (value < 100) continue;
    }
    if (!sym && !suffix && !currencyCode && value < 1000) continue;

    const currency = currencyCode || sym || suffix || "?";

    results.push({
      raw: m[0].trim(),
      value,
      currency,
      offset: m.index,
    });
  }

  return results;
}

// ──────────────────────────────────────────────────────────────
// Number detection
// ──────────────────────────────────────────────────────────────

export interface DetectedNumber {
  raw: string;
  value: number;
  unit: string;
  offset: number;
}

const NUMBER_UNITS = [
  "days", "day", "months", "month", "years", "year",
  "weeks", "week", "hours", "hour",
  "%", "percent", "percentage",
  "business days", "calendar days",
  "copies", "employees", "users",
];

// Match numbers followed by optional units
const NUM_RE = /\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(%|percent|percentage|days?|months?|years?|weeks?|hours?|business days?|calendar days?|copies|employees|users)?\b/gi;

export function detectNumbers(text: string): DetectedNumber[] {
  const results: DetectedNumber[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(NUM_RE.source, "gi");

  while ((match = re.exec(text)) !== null) {
    const numStr = match[1] || "";
    const unit = (match[2] || "").trim().toLowerCase();
    if (!numStr) continue;
    const value = parseFloat(numStr.replace(/,/g, ""));
    // Skip years that look like calendar years (handled by date detector)
    if (!unit && value >= 1900 && value <= 2100) continue;
    // Skip single-digit section numbers with no context
    if (!unit && value <= 9 && !isNaN(value)) continue;

    results.push({ raw: match[0].trim(), value, unit, offset: match.index });
  }

  return results;
}

// ──────────────────────────────────────────────────────────────
// Date detection
// ──────────────────────────────────────────────────────────────

export interface DetectedDate {
  raw: string;
  /** ISO 8601 string if parseable, otherwise null */
  iso: string | null;
  offset: number;
}

const MONTHS =
  "January|February|March|April|May|June|July|August|September|October|November|December";
const MONTHS_SHORT = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";

const DATE_PATTERNS = [
  // January 1, 2025 or January 1st, 2025
  new RegExp(`\\b(${MONTHS})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "gi"),
  // Jan 1, 2025
  new RegExp(`\\b(${MONTHS_SHORT})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "gi"),
  // 01/01/2025 or 1/1/2025
  /\b(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/g,
  // 2025-01-01 (ISO)
  /\b(\d{4})-(\d{2})-(\d{2})\b/g,
  // 1 January 2025
  new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS}),?\\s+(\\d{4})\\b`, "gi"),
  // standalone year reference like "in 2025" "by 2026"
  /\b(in|by|for|of|from|until|through)\s+(20\d{2}|19\d{2})\b/gi,
];

function tryParseDate(m: RegExpExecArray, pattern: RegExp): DetectedDate | null {
  const src = pattern.source;
  const raw = m[0];
  let iso: string | null = null;

  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      iso = d.toISOString().substring(0, 10);
    }
  } catch {
    iso = null;
  }

  return { raw: raw.trim(), iso, offset: m.index };
}

export function detectDates(text: string): DetectedDate[] {
  const results: DetectedDate[] = [];
  const seen = new Set<number>();

  for (const pattern of DATE_PATTERNS) {
    // Reset lastIndex
    const re = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      // Deduplicate by offset
      if (!seen.has(match.index)) {
        const entry = tryParseDate(match, re);
        if (entry) {
          seen.add(match.index);
          results.push(entry);
        }
      }
    }
  }

  // Sort by offset
  return results.sort((a, b) => a.offset - b.offset);
}

// ──────────────────────────────────────────────────────────────
// Substantive change keywords — deterministic first-pass signal
// ──────────────────────────────────────────────────────────────

const SUBSTANTIVE_KEYWORDS = [
  "termination", "terminate", "expire", "expiration", "renewal", "renew",
  "liability", "liable", "indemnif", "indemnification", "warranty", "warrant",
  "fee", "fees", "payment", "pay", "compensation", "remuneration", "price",
  "penalty", "liquidated damages", "interest",
  "notice", "days", "months", "years", "period",
  "intellectual property", "ip", "copyright", "patent", "trademark",
  "confidential", "confidentiality", "non-disclosure", "nda",
  "governing law", "jurisdiction", "arbitration", "dispute",
  "data protection", "privacy", "gdpr",
  "insurance", "coverage", "insured",
  "force majeure", "act of god",
  "assignment", "assign", "transfer",
  "non-compete", "non-solicitation", "restraint",
  "obligation", "obligat", "duties", "duty",
  "warranty", "representation", "covenant",
  "material breach", "breach",
  "remedies", "remedy",
  "late payment", "interest rate",
  "discount", "rebate",
  "exclusive", "non-exclusive",
];

/**
 * Returns true if the text contains any substantive keyword signal.
 * Used to classify a change as potentially substantive.
 */
export function hasSubstantiveKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return SUBSTANTIVE_KEYWORDS.some((kw) => lower.includes(kw));
}
