/**
 * Main document comparison engine.
 *
 * Orchestrates:
 *  1. Document + chunk retrieval from PostgreSQL
 *  2. Normalization
 *  3. Structural paragraph alignment (deterministic)
 *  4. Change classification (ADDED / REMOVED / MODIFIED)
 *  5. Token-level diff inside modified paragraphs
 *  6. Money / Number / Date change detection
 *  7. Substantive-change classification
 *  8. Gemini plain-language explanation (only for changed text)
 *  9. Quote verification using existing verifyQuote engine
 * 10. Comparison result assembly
 */

import { db } from "@/db";
import { documents, documentChunks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

import { normalizeForComparison, computeTokenDiff, TokenDiffEntry } from "./diff";
import { alignDocuments, AlignedChunk, AlignedParagraph, AlignmentType } from "./aligner";
import {
  detectMoneyValues,
  detectNumbers,
  detectDates,
  hasSubstantiveKeyword,
  DetectedMoney,
  DetectedNumber,
  DetectedDate,
} from "./detectors";
import { verifyQuote } from "@/lib/ai/verification";
import { analyzeChangesWithGemini } from "./gemini-analysis";
import {
  ComparisonResult,
  ComparisonChange,
  SourceLocation,
  MoneyChange,
  NumberChange,
  DateChange,
  VerifiedQuote,
  ChangeSignificanceV2,
} from "@/types/comparison";

// UUID format validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(s: string): boolean {
  return UUID_RE.test(s);
}

// ──────────────────────────────────────────────────────────────
// Document retrieval
// ──────────────────────────────────────────────────────────────

interface DocumentRecord {
  id: string;
  filename: string;
  fileType: string;
  extractedText: string | null;
  processingStatus: string;
}

interface ChunkRecord {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  pageStart: number | null;
  pageEnd: number | null;
  characterStart: number | null;
  characterEnd: number | null;
}

export class ComparisonValidationError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ComparisonValidationError";
    this.statusCode = statusCode;
  }
}

async function fetchDocument(docId: string): Promise<DocumentRecord> {
  const [doc] = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      fileType: documents.fileType,
      extractedText: documents.extractedText,
      processingStatus: documents.processingStatus,
    })
    .from(documents)
    .where(eq(documents.id, docId));

  if (!doc) {
    throw new ComparisonValidationError(`Document not found: ${docId}`, 404);
  }
  if (doc.processingStatus !== "completed" && doc.processingStatus !== "ready") {
    throw new ComparisonValidationError(
      `Document "${doc.filename}" has not been fully processed (status: ${doc.processingStatus}).`,
      422
    );
  }
  if (!doc.extractedText || doc.extractedText.trim().length === 0) {
    throw new ComparisonValidationError(
      `Document "${doc.filename}" has no extractable text.`,
      422
    );
  }

  return doc;
}

async function fetchChunks(docId: string): Promise<ChunkRecord[]> {
  const chunks = await db
    .select({
      id: documentChunks.id,
      documentId: documentChunks.documentId,
      chunkIndex: documentChunks.chunkIndex,
      text: documentChunks.text,
      pageStart: documentChunks.pageStart,
      pageEnd: documentChunks.pageEnd,
      characterStart: documentChunks.characterStart,
      characterEnd: documentChunks.characterEnd,
    })
    .from(documentChunks)
    .where(eq(documentChunks.documentId, docId))
    .orderBy(asc(documentChunks.chunkIndex));

  if (chunks.length === 0) {
    throw new ComparisonValidationError(
      `Document ${docId} has no text chunks. Please re-upload the document.`,
      422
    );
  }

  return chunks;
}

function toAlignedChunk(c: ChunkRecord): AlignedChunk {
  return {
    id: c.id,
    documentId: c.documentId,
    chunkIndex: c.chunkIndex,
    text: c.text,
    pageStart: c.pageStart,
    pageEnd: c.pageEnd,
    characterStart: c.characterStart ?? 0,
    characterEnd: c.characterEnd ?? c.text.length,
  };
}

// ──────────────────────────────────────────────────────────────
// Source location builder
// ──────────────────────────────────────────────────────────────

function buildSourceLocation(
  chunk: AlignedChunk | null,
  localStart: number | null,
  localEnd: number | null
): SourceLocation | null {
  if (!chunk) return null;

  const absStart = localStart !== null ? chunk.characterStart + localStart : chunk.characterStart;
  const absEnd = localEnd !== null ? chunk.characterStart + localEnd : chunk.characterEnd;

  return {
    chunkId: chunk.id,
    page: chunk.pageStart,
    characterStart: absStart,
    characterEnd: absEnd,
  };
}

// ──────────────────────────────────────────────────────────────
// Significance scoring (deterministic first-pass)
// ──────────────────────────────────────────────────────────────

function computeDeterministicSignificance(
  textA: string | null,
  textB: string | null,
  moneyChanges: MoneyChange[],
  numberChanges: NumberChange[],
  dateChanges: DateChange[]
): ChangeSignificanceV2 {
  // Any monetary change → HIGH
  if (moneyChanges.length > 0) return "HIGH";

  // Any date change → MEDIUM (may be upgraded by keywords)
  const combinedText = ((textA || "") + " " + (textB || "")).toLowerCase();

  // Substantive keyword → MEDIUM at least
  const isSubstantive = hasSubstantiveKeyword(combinedText);

  // Number change in a notice period / timing context → HIGH
  if (numberChanges.length > 0) {
    if (/days?|months?|years?|weeks?|notice|period|term/i.test(combinedText)) {
      return "HIGH";
    }
    return "MEDIUM";
  }

  if (dateChanges.length > 0) return "MEDIUM";

  if (isSubstantive) return "MEDIUM";

  return "LOW";
}

// ──────────────────────────────────────────────────────────────
// Quote verification
// ──────────────────────────────────────────────────────────────

function buildVerifiedQuote(
  sourceText: string,
  candidateText: string,
  chunkCharStart: number
): VerifiedQuote {
  if (!candidateText || !candidateText.trim()) {
    return { text: candidateText, verified: false };
  }

  const result = verifyQuote(sourceText, candidateText, chunkCharStart);

  if (result.verified) {
    return {
      text: result.exactQuote || candidateText,
      verified: true,
      characterStart: result.characterStart,
      characterEnd: result.characterEnd,
    };
  }

  return { text: candidateText, verified: false };
}

// ──────────────────────────────────────────────────────────────
// Change construction from aligned paragraph
// ──────────────────────────────────────────────────────────────

function buildChangeId(idx: number): string {
  return `chg_${String(idx + 1).padStart(4, "0")}`;
}

function extractMoneyChanges(textA: string | null, textB: string | null): MoneyChange[] {
  const moneyA = textA ? detectMoneyValues(textA) : [];
  const moneyB = textB ? detectMoneyValues(textB) : [];

  const changes: MoneyChange[] = [];

  // Match by position in the sentence (best-effort pairing)
  const maxLen = Math.max(moneyA.length, moneyB.length);
  for (let i = 0; i < maxLen; i++) {
    const a = moneyA[i];
    const b = moneyB[i];

    if (a && b && a.value !== b.value) {
      changes.push({
        beforeRaw: a.raw,
        afterRaw: b.raw,
        beforeValue: a.value,
        afterValue: b.value,
        currency: a.currency || b.currency,
      });
    } else if (a && !b) {
      changes.push({
        beforeRaw: a.raw,
        afterRaw: null,
        beforeValue: a.value,
        afterValue: null,
        currency: a.currency,
      });
    } else if (!a && b) {
      changes.push({
        beforeRaw: null,
        afterRaw: b.raw,
        beforeValue: null,
        afterValue: b.value,
        currency: b.currency,
      });
    }
  }

  return changes;
}

function extractNumberChanges(textA: string | null, textB: string | null): NumberChange[] {
  const numsA = textA ? detectNumbers(textA) : [];
  const numsB = textB ? detectNumbers(textB) : [];

  const changes: NumberChange[] = [];

  // Pair by index — imperfect but deterministic
  const maxLen = Math.max(numsA.length, numsB.length);
  for (let i = 0; i < maxLen; i++) {
    const a = numsA[i];
    const b = numsB[i];

    if (a && b && a.value !== b.value) {
      changes.push({
        beforeRaw: a.raw,
        afterRaw: b.raw,
        beforeValue: a.value,
        afterValue: b.value,
        unit: a.unit || b.unit || null,
      });
    } else if (a && !b) {
      changes.push({
        beforeRaw: a.raw,
        afterRaw: null,
        beforeValue: a.value,
        afterValue: null,
        unit: a.unit || null,
      });
    } else if (!a && b) {
      changes.push({
        beforeRaw: null,
        afterRaw: b.raw,
        beforeValue: null,
        afterValue: b.value,
        unit: b.unit || null,
      });
    }
  }

  return changes;
}

function extractDateChanges(textA: string | null, textB: string | null): DateChange[] {
  const datesA = textA ? detectDates(textA) : [];
  const datesB = textB ? detectDates(textB) : [];

  const changes: DateChange[] = [];

  const maxLen = Math.max(datesA.length, datesB.length);
  for (let i = 0; i < maxLen; i++) {
    const a = datesA[i];
    const b = datesB[i];

    if (a && b && a.raw !== b.raw) {
      changes.push({
        beforeRaw: a.raw,
        afterRaw: b.raw,
        beforeIso: a.iso,
        afterIso: b.iso,
      });
    } else if (a && !b) {
      changes.push({ beforeRaw: a.raw, afterRaw: null, beforeIso: a.iso, afterIso: null });
    } else if (!a && b) {
      changes.push({ beforeRaw: null, afterRaw: b.raw, beforeIso: null, afterIso: b.iso });
    }
  }

  return changes;
}

// ──────────────────────────────────────────────────────────────
// Main engine
// ──────────────────────────────────────────────────────────────

export async function runComparison(
  documentAId: string,
  documentBId: string
): Promise<ComparisonResult> {
  // ── Phase 1: Validate inputs ──────────────────────────────────
  if (!isValidUUID(documentAId)) {
    throw new ComparisonValidationError(`Invalid document ID format: ${documentAId}`);
  }
  if (!isValidUUID(documentBId)) {
    throw new ComparisonValidationError(`Invalid document ID format: ${documentBId}`);
  }
  if (documentAId === documentBId) {
    throw new ComparisonValidationError("Cannot compare a document to itself.");
  }

  // ── Phase 2: Retrieve documents + chunks ──────────────────────
  const [docA, docB] = await Promise.all([
    fetchDocument(documentAId),
    fetchDocument(documentBId),
  ]);

  const [rawChunksA, rawChunksB] = await Promise.all([
    fetchChunks(documentAId),
    fetchChunks(documentBId),
  ]);

  const chunksA = rawChunksA.map(toAlignedChunk);
  const chunksB = rawChunksB.map(toAlignedChunk);

  // ── Phase 3: Check for identical documents ────────────────────
  const normA = normalizeForComparison(docA.extractedText!);
  const normB = normalizeForComparison(docB.extractedText!);

  if (normA === normB) {
    return {
      documentA: { id: docA.id, filename: docA.filename, fileType: docA.fileType },
      documentB: { id: docB.id, filename: docB.filename, fileType: docB.fileType },
      summary: "These documents are substantively identical. No differences were detected after normalization.",
      changes: [],
      stats: {
        total: 0,
        byType: { ADDED: 0, REMOVED: 0, MODIFIED: 0 },
        bySignificance: { HIGH: 0, MEDIUM: 0, LOW: 0 },
      },
      aiAvailable: true,
    };
  }

  // ── Phase 4: Structural alignment ─────────────────────────────
  const alignments = alignDocuments(chunksA, chunksB);

  // ── Phase 5: Build change records ─────────────────────────────
  const significantAlignments = alignments.filter((a) => a.type !== "UNCHANGED");

  interface ChangeCandidate {
    id: string;
    alignment: AlignedParagraph;
    moneyChanges: MoneyChange[];
    numberChanges: NumberChange[];
    dateChanges: DateChange[];
    deterministicSignificance: ChangeSignificanceV2;
    tokenDiff: TokenDiffEntry[];
    beforeLocation: SourceLocation | null;
    afterLocation: SourceLocation | null;
    beforeQuote: VerifiedQuote | null;
    afterQuote: VerifiedQuote | null;
  }

  const candidates: ChangeCandidate[] = significantAlignments.map((alignment, idx) => {
    const changeId = buildChangeId(idx);

    const moneyChanges = extractMoneyChanges(alignment.textA, alignment.textB);
    const numberChanges = extractNumberChanges(alignment.textA, alignment.textB);
    const dateChanges = extractDateChanges(alignment.textA, alignment.textB);

    const deterministicSignificance = computeDeterministicSignificance(
      alignment.textA,
      alignment.textB,
      moneyChanges,
      numberChanges,
      dateChanges
    );

    // Token-level diff only for MODIFIED
    const tokenDiff: TokenDiffEntry[] =
      alignment.type === "MODIFIED" && alignment.textA && alignment.textB
        ? computeTokenDiff(alignment.textA, alignment.textB)
        : [];

    // Source locations
    const beforeLocation = buildSourceLocation(
      alignment.chunkA,
      alignment.charStartInChunkA,
      alignment.charEndInChunkA
    );
    const afterLocation = buildSourceLocation(
      alignment.chunkB,
      alignment.charStartInChunkB,
      alignment.charEndInChunkB
    );

    // Quote verification
    let beforeQuote: VerifiedQuote | null = null;
    let afterQuote: VerifiedQuote | null = null;

    if (alignment.textA && alignment.chunkA) {
      // Use the first meaningful sentence as the quote (up to 300 chars)
      const quoteText = alignment.textA.substring(0, 300);
      beforeQuote = buildVerifiedQuote(alignment.chunkA.text, quoteText, alignment.chunkA.characterStart);
    }

    if (alignment.textB && alignment.chunkB) {
      const quoteText = alignment.textB.substring(0, 300);
      afterQuote = buildVerifiedQuote(alignment.chunkB.text, quoteText, alignment.chunkB.characterStart);
    }

    return {
      id: changeId,
      alignment,
      moneyChanges,
      numberChanges,
      dateChanges,
      deterministicSignificance,
      tokenDiff,
      beforeLocation,
      afterLocation,
      beforeQuote,
      afterQuote,
    };
  });

  // ── Phase 6: Gemini analysis (only for substantive changes) ───
  // Cap the number of changes sent to Gemini for large documents
  const MAX_AI_CHANGES = 30;
  const changesForAI = candidates
    .filter((c) => c.deterministicSignificance !== "LOW" || c.moneyChanges.length > 0 || c.dateChanges.length > 0)
    .slice(0, MAX_AI_CHANGES)
    .map((c) => ({
      changeId: c.id,
      type: c.alignment.type,
      beforeText: c.alignment.textA,
      afterText: c.alignment.textB,
      contextHint: c.deterministicSignificance,
    }));

  const aiResult = await analyzeChangesWithGemini(
    changesForAI,
    docA.filename,
    docB.filename
  );

  // Build AI analysis map
  const aiMap = new Map<string, (typeof aiResult.changes)[0]>(
    aiResult.changes.map((c) => [c.changeId, c])
  );

  // ── Phase 7: Assemble final ComparisonChange list ─────────────
  const finalChanges: ComparisonChange[] = candidates.map((c) => {
    const aiEntry = aiMap.get(c.id);

    // Final significance: AI can upgrade but not downgrade
    let finalSignificance: ChangeSignificanceV2 = c.deterministicSignificance;
    if (aiEntry) {
      // If AI says HIGH and deterministic says MEDIUM/LOW → upgrade
      const sigOrder: Record<ChangeSignificanceV2, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
      if (sigOrder[aiEntry.significance] > sigOrder[finalSignificance]) {
        finalSignificance = aiEntry.significance;
      }
    }

    return {
      id: c.id,
      type: c.alignment.type as "ADDED" | "REMOVED" | "MODIFIED",
      beforeText: c.alignment.textA,
      afterText: c.alignment.textB,
      beforeLocation: c.beforeLocation,
      afterLocation: c.afterLocation,
      tokenDiff: c.tokenDiff,
      moneyChanges: c.moneyChanges,
      numberChanges: c.numberChanges,
      dateChanges: c.dateChanges,
      significance: finalSignificance,
      aiExplanation: aiEntry?.explanation || null,
      affectedParty: aiEntry?.affectedParty || null,
      beforeMeaning: aiEntry?.beforeMeaning || null,
      afterMeaning: aiEntry?.afterMeaning || null,
      beforeQuote: c.beforeQuote,
      afterQuote: c.afterQuote,
    };
  });

  // ── Phase 8: Summary ──────────────────────────────────────────
  const stats = {
    total: finalChanges.length,
    byType: {
      ADDED: finalChanges.filter((c) => c.type === "ADDED").length,
      REMOVED: finalChanges.filter((c) => c.type === "REMOVED").length,
      MODIFIED: finalChanges.filter((c) => c.type === "MODIFIED").length,
    },
    bySignificance: {
      HIGH: finalChanges.filter((c) => c.significance === "HIGH").length,
      MEDIUM: finalChanges.filter((c) => c.significance === "MEDIUM").length,
      LOW: finalChanges.filter((c) => c.significance === "LOW").length,
    },
  };

  // Use AI summary if available, otherwise build deterministic summary
  let summary: string;
  if (aiResult.aiAvailable && aiResult.summary && aiResult.summary.trim().length > 10) {
    summary = aiResult.summary;
  } else {
    const highlights: string[] = [];

    const highMoneyChanges = finalChanges.filter((c) => c.moneyChanges.length > 0);
    if (highMoneyChanges.length > 0) {
      const m = highMoneyChanges[0].moneyChanges[0];
      if (m.beforeRaw && m.afterRaw) {
        highlights.push(`Monetary value changed from ${m.beforeRaw} to ${m.afterRaw}`);
      }
    }

    const highDateChanges = finalChanges.filter((c) => c.dateChanges.length > 0);
    if (highDateChanges.length > 0) {
      const d = highDateChanges[0].dateChanges[0];
      if (d.beforeRaw && d.afterRaw) {
        highlights.push(`Date changed from ${d.beforeRaw} to ${d.afterRaw}`);
      }
    }

    const highNumChanges = finalChanges.filter((c) => c.numberChanges.length > 0);
    if (highNumChanges.length > 0) {
      const n = highNumChanges[0].numberChanges[0];
      if (n.beforeRaw && n.afterRaw) {
        highlights.push(`Numeric value changed from ${n.beforeRaw} to ${n.afterRaw}`);
      }
    }

    summary =
      `${stats.total} change${stats.total !== 1 ? "s" : ""} detected between "${docA.filename}" and "${docB.filename}". ` +
      `${stats.bySignificance.HIGH} high-significance, ${stats.bySignificance.MEDIUM} medium-significance, ${stats.bySignificance.LOW} low-significance. ` +
      (highlights.length > 0 ? `Key changes include: ${highlights.join("; ")}.` : "");
  }

  return {
    documentA: { id: docA.id, filename: docA.filename, fileType: docA.fileType },
    documentB: { id: docB.id, filename: docB.filename, fileType: docB.fileType },
    summary,
    changes: finalChanges,
    stats,
    aiAvailable: aiResult.aiAvailable,
    aiError: aiResult.aiError,
  };
}
