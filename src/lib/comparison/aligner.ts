/**
 * Structural alignment of paragraphs between two documents.
 *
 * Takes chunk arrays from both documents and produces aligned pairs
 * describing which paragraphs in Doc A correspond to which in Doc B.
 *
 * Algorithm:
 *   1. Collapse chunks to paragraph units (a chunk may contain multiple paragraphs).
 *   2. Score all (A, B) paragraph pairs with Jaccard bigram similarity.
 *   3. Use a greedy LCS-style matching: iterate A in order, for each A paragraph
 *      find the best unmatched B paragraph with similarity >= MATCH_THRESHOLD.
 *   4. Unmatched A paragraphs → REMOVED
 *      Unmatched B paragraphs → ADDED
 *      Matched pairs with similarity < 1 → MODIFIED
 *      Matched pairs with exact normalized equality → UNCHANGED
 */

import { normalizeForComparison, splitIntoParagraphs, similarityScore } from "./diff";

export interface AlignedChunk {
  /** Source chunk record */
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  pageStart: number | null;
  pageEnd: number | null;
  characterStart: number;
  characterEnd: number;
}

export type AlignmentType = "UNCHANGED" | "MODIFIED" | "ADDED" | "REMOVED";

export interface AlignedParagraph {
  type: AlignmentType;
  /** Paragraph text from Version A (null for ADDED) */
  textA: string | null;
  /** Paragraph text from Version B (null for REMOVED) */
  textB: string | null;
  /** Similarity score [0,1] */
  similarity: number;
  /** Which chunk in A contains this paragraph */
  chunkA: AlignedChunk | null;
  /** Which chunk in B contains this paragraph */
  chunkB: AlignedChunk | null;
  /** Character offsets within the chunk text (for MODIFIED/UNCHANGED/REMOVED) */
  charStartInChunkA: number | null;
  charEndInChunkA: number | null;
  /** Character offsets within the chunk text (for MODIFIED/UNCHANGED/ADDED) */
  charStartInChunkB: number | null;
  charEndInChunkB: number | null;
}

/** Minimum similarity to consider paragraphs as matching. */
const MATCH_THRESHOLD = 0.35;

/**
 * Expand chunks into (paragraph, chunk) pairs, keeping offset within chunk.
 */
function expandChunksToParagraphs(
  chunks: AlignedChunk[]
): Array<{ text: string; normText: string; chunk: AlignedChunk; localStart: number; localEnd: number }> {
  const result: Array<{
    text: string;
    normText: string;
    chunk: AlignedChunk;
    localStart: number;
    localEnd: number;
  }> = [];

  for (const chunk of chunks) {
    const paras = splitIntoParagraphs(chunk.text);
    let searchFrom = 0;
    for (const para of paras) {
      if (!para.trim()) continue;
      // Find char offsets within the chunk text
      const localStart = chunk.text.indexOf(para, searchFrom);
      const localEnd = localStart >= 0 ? localStart + para.length : searchFrom + para.length;
      searchFrom = localEnd;
      result.push({
        text: para,
        normText: normalizeForComparison(para),
        chunk,
        localStart: localStart >= 0 ? localStart : 0,
        localEnd,
      });
    }
  }

  return result;
}

/**
 * Main alignment function.
 * Produces a list of AlignedParagraph describing the structural relationship.
 */
export function alignDocuments(
  chunksA: AlignedChunk[],
  chunksB: AlignedChunk[]
): AlignedParagraph[] {
  const parasA = expandChunksToParagraphs(chunksA);
  const parasB = expandChunksToParagraphs(chunksB);

  // Handle edge cases: empty documents
  if (parasA.length === 0 && parasB.length === 0) return [];

  if (parasA.length === 0) {
    return parasB.map((pb) => ({
      type: "ADDED" as AlignmentType,
      textA: null,
      textB: pb.text,
      similarity: 0,
      chunkA: null,
      chunkB: pb.chunk,
      charStartInChunkA: null,
      charEndInChunkA: null,
      charStartInChunkB: pb.localStart,
      charEndInChunkB: pb.localEnd,
    }));
  }

  if (parasB.length === 0) {
    return parasA.map((pa) => ({
      type: "REMOVED" as AlignmentType,
      textA: pa.text,
      textB: null,
      similarity: 0,
      chunkA: pa.chunk,
      chunkB: null,
      charStartInChunkA: pa.localStart,
      charEndInChunkA: pa.localEnd,
      charStartInChunkB: null,
      charEndInChunkB: null,
    }));
  }

  // Build similarity matrix (capped)
  const MAX_PARA = 800; // guard against quadratic blowup
  const sliceA = parasA.slice(0, MAX_PARA);
  const sliceB = parasB.slice(0, MAX_PARA);

  const simMatrix: number[][] = sliceA.map((pa) =>
    sliceB.map((pb) => similarityScore(pa.normText, pb.normText))
  );

  // Greedy sequence-preserving matching
  const usedB = new Set<number>();
  const matchedA = new Map<number, number>(); // indexA → indexB

  for (let i = 0; i < sliceA.length; i++) {
    let bestScore = MATCH_THRESHOLD;
    let bestJ = -1;

    // Search forward in B for the best match (within a window to preserve order)
    const windowEnd = Math.min(sliceB.length, i + Math.max(sliceB.length - sliceA.length + 5, 10));
    for (let j = 0; j < windowEnd; j++) {
      if (usedB.has(j)) continue;
      if (simMatrix[i][j] > bestScore) {
        bestScore = simMatrix[i][j];
        bestJ = j;
      }
    }

    if (bestJ >= 0) {
      matchedA.set(i, bestJ);
      usedB.add(bestJ);
    }
  }

  // Build merged sequence preserving relative order
  const alignments: AlignedParagraph[] = [];
  let bIdx = 0;

  for (let ai = 0; ai < sliceA.length; ai++) {
    const pa = sliceA[ai];
    const bi = matchedA.get(ai);

    // Emit any B paragraphs that come BEFORE the matched bi as ADDED
    if (bi !== undefined) {
      while (bIdx < bi) {
        if (!usedB.has(bIdx) || bIdx === bi) {
          // This B paragraph wasn't matched or is inserted before our match
          if (!matchedA.values().next || !Array.from(matchedA.values()).includes(bIdx)) {
            const pb = sliceB[bIdx];
            alignments.push({
              type: "ADDED",
              textA: null,
              textB: pb.text,
              similarity: 0,
              chunkA: null,
              chunkB: pb.chunk,
              charStartInChunkA: null,
              charEndInChunkA: null,
              charStartInChunkB: pb.localStart,
              charEndInChunkB: pb.localEnd,
            });
          }
        }
        bIdx++;
      }
    }

    if (bi !== undefined) {
      const pb = sliceB[bi];
      const sim = simMatrix[ai][bi];
      const isIdentical = pa.normText === pb.normText;

      alignments.push({
        type: isIdentical ? "UNCHANGED" : "MODIFIED",
        textA: pa.text,
        textB: pb.text,
        similarity: sim,
        chunkA: pa.chunk,
        chunkB: pb.chunk,
        charStartInChunkA: pa.localStart,
        charEndInChunkA: pa.localEnd,
        charStartInChunkB: pb.localStart,
        charEndInChunkB: pb.localEnd,
      });
      bIdx = bi + 1;
    } else {
      // No match → REMOVED
      alignments.push({
        type: "REMOVED",
        textA: pa.text,
        textB: null,
        similarity: 0,
        chunkA: pa.chunk,
        chunkB: null,
        charStartInChunkA: pa.localStart,
        charEndInChunkA: pa.localEnd,
        charStartInChunkB: null,
        charEndInChunkB: null,
      });
    }
  }

  // Emit any trailing B paragraphs as ADDED
  while (bIdx < sliceB.length) {
    if (!Array.from(matchedA.values()).includes(bIdx)) {
      const pb = sliceB[bIdx];
      alignments.push({
        type: "ADDED",
        textA: null,
        textB: pb.text,
        similarity: 0,
        chunkA: null,
        chunkB: pb.chunk,
        charStartInChunkA: null,
        charEndInChunkA: null,
        charStartInChunkB: pb.localStart,
        charEndInChunkB: pb.localEnd,
      });
    }
    bIdx++;
  }

  // Handle overflow if documents were sliced
  const overflowA = parasA.slice(MAX_PARA);
  const overflowB = parasB.slice(MAX_PARA);
  for (const pa of overflowA) {
    alignments.push({
      type: "REMOVED",
      textA: pa.text,
      textB: null,
      similarity: 0,
      chunkA: pa.chunk,
      chunkB: null,
      charStartInChunkA: pa.localStart,
      charEndInChunkA: pa.localEnd,
      charStartInChunkB: null,
      charEndInChunkB: null,
    });
  }
  for (const pb of overflowB) {
    alignments.push({
      type: "ADDED",
      textA: null,
      textB: pb.text,
      similarity: 0,
      chunkA: null,
      chunkB: pb.chunk,
      charStartInChunkA: null,
      charEndInChunkA: null,
      charStartInChunkB: pb.localStart,
      charEndInChunkB: pb.localEnd,
    });
  }

  return alignments;
}
