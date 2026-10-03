import { ExtractedPage } from "./extraction";

export interface DocumentChunkRecord {
  chunkIndex: number;
  text: string;
  pageStart: number | null;
  pageEnd: number | null;
  characterStart: number;
  characterEnd: number;
}

export interface ChunkingResult {
  fullNormalizedText: string;
  chunks: DocumentChunkRecord[];
}

export function chunkExtractedPages(pages: ExtractedPage[]): ChunkingResult {
  // 1. Normalize text and build a unified string while tracking page boundaries
  let fullNormalizedText = "";
  const pageBoundaries: {
    pageNumber: number | null;
    charStart: number;
    charEnd: number;
  }[] = [];

  for (const page of pages) {
    // Normalization: 
    // - Remove null characters
    // - Clean up consecutive spaces (but keep paragraph spacing intact)
    // - Ensure proper line breaks
    let pageText = page.text.replace(/\0/g, "");
    // Replace multiple spaces with a single space
    pageText = pageText.replace(/[ \t]+/g, " ");
    
    // If not the first page and no trailing space/newline, add a space
    if (fullNormalizedText.length > 0 && !fullNormalizedText.endsWith("\n") && !fullNormalizedText.endsWith(" ")) {
      fullNormalizedText += " ";
    }
    // Add page break explicitly to separate content sensibly
    if (fullNormalizedText.length > 0 && !fullNormalizedText.endsWith("\n\n")) {
      fullNormalizedText += "\n\n";
    }

    const startIdx = fullNormalizedText.length;
    fullNormalizedText += pageText.trim();
    const endIdx = fullNormalizedText.length;

    pageBoundaries.push({
      pageNumber: page.pageNumber,
      charStart: startIdx,
      charEnd: endIdx,
    });
  }

  // 2. Deterministic Chunking
  // Max chunk size targeted around ~1500 chars (approx 350-400 tokens), preserving word/paragraph boundaries for good semantic value
  const MAX_CHUNK_SIZE = 1500;
  const chunks: DocumentChunkRecord[] = [];
  let currentChunkIndex = 0;
  
  // Split the full text roughly by paragraphs
  const paragraphs = fullNormalizedText.split(/(?<=\n\n)/);
  
  let currentChunkText = "";
  let currentChunkStart = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    
    // If a single paragraph is larger than our target, we might need to split it by sentences
    if (currentChunkText.length + paragraph.length > MAX_CHUNK_SIZE && currentChunkText.length > 0) {
      // Finalize current chunk
      finalizeChunk(currentChunkText, currentChunkStart, currentChunkIndex, chunks, pageBoundaries);
      currentChunkIndex++;
      currentChunkStart = currentChunkStart + currentChunkText.length;
      currentChunkText = paragraph;
    } else {
      currentChunkText += paragraph;
    }
  }

  if (currentChunkText.trim().length > 0) {
    finalizeChunk(currentChunkText, currentChunkStart, currentChunkIndex, chunks, pageBoundaries);
  }

  return {
    fullNormalizedText,
    chunks,
  };
}

function finalizeChunk(
  text: string,
  charStart: number,
  chunkIndex: number,
  chunks: DocumentChunkRecord[],
  pageBoundaries: { pageNumber: number | null; charStart: number; charEnd: number }[]
) {
  const cleanText = text.trim();
  if (cleanText.length === 0) return;

  // We need to adjust charStart slightly by the left trim offset if we strictly want exact boundaries.
  // We'll calculate exact bounds within the full unified string.
  const exactStartOffsetInFullText = charStart + text.indexOf(cleanText[0]);
  const exactEndOffsetInFullText = exactStartOffsetInFullText + cleanText.length;

  let pageStart: number | null = null;
  let pageEnd: number | null = null;

  for (const pb of pageBoundaries) {
    if (pb.pageNumber === null) continue;
    // Condition for overlapping
    if (exactStartOffsetInFullText <= pb.charEnd && exactEndOffsetInFullText >= pb.charStart) {
      if (pageStart === null || pb.pageNumber < pageStart) pageStart = pb.pageNumber;
      if (pageEnd === null || pb.pageNumber > pageEnd) pageEnd = pb.pageNumber;
    }
  }

  chunks.push({
    chunkIndex,
    text: cleanText,
    characterStart: exactStartOffsetInFullText,
    characterEnd: exactEndOffsetInFullText,
    pageStart,
    pageEnd,
  });
}
