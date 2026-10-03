"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../db";
import { documents, documentChunks, documentFiles } from "../../db/schema";
import { eq } from "drizzle-orm";
import { extractTextFromFile, ExtractionError } from "./extraction";
import { chunkExtractedPages } from "./chunking";
import { indexDocument } from "../ai/retrieval";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ─────────────────────────────────────────────────────────────────────────────
// Magic-byte validation (spoofing-resistant)
// ─────────────────────────────────────────────────────────────────────────────

function detectFileTypeFromBuffer(buffer: Buffer): "pdf" | "docx" | "txt" | null {
  // PDF: %PDF  (25 50 44 46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "pdf";
  }
  // DOCX/ZIP: PK\x03\x04  (50 4B 03 04)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return "docx";
  }
  // TXT: treat any readable UTF-8 content as txt
  return "txt";
}

// ─────────────────────────────────────────────────────────────────────────────
// Background processor — called by the upload Route Handler via after()
// Not a Server Action; exported as a plain async function.
// ─────────────────────────────────────────────────────────────────────────────

export async function processDocument(documentId: string, buffer: Buffer, extension: string) {
  const perfStart = performance.now();

  try {
    // ── Phase 1: Extracting ────────────────────────────────────────────────
    await db
      .update(documents)
      .set({ processingStatus: "extracting", updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    const tParseStart = performance.now();
    const extractionResult = await extractTextFromFile(buffer, extension);
    const tParseEnd = performance.now();

    // ── Phase 2: Chunking ─────────────────────────────────────────────────
    await db
      .update(documents)
      .set({ processingStatus: "chunking", updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    const tChunkStart = performance.now();
    const { fullNormalizedText, chunks } = chunkExtractedPages(extractionResult.pages);
    const tChunkEnd = performance.now();

    // ── Phase 3: Atomic DB Persistence ───────────────────────────────────
    const tDbStart = performance.now();
    await db.transaction(async (tx) => {
      // Idempotency: clear any stale chunks first
      await tx.delete(documentChunks).where(eq(documentChunks.documentId, documentId));

      if (chunks.length > 0) {
        const CHUNK_INSERT_BATCH = 100; // Prevent Postgres parameter overflow
        for (let i = 0; i < chunks.length; i += CHUNK_INSERT_BATCH) {
          const batch = chunks.slice(i, i + CHUNK_INSERT_BATCH);
          await tx.insert(documentChunks).values(
            batch.map((chunk) => ({
              documentId,
              chunkIndex: chunk.chunkIndex,
              text: chunk.text,
              pageStart: chunk.pageStart,
              pageEnd: chunk.pageEnd,
              characterStart: chunk.characterStart,
              characterEnd: chunk.characterEnd,
              embedding: null,
            }))
          );
        }
      }

      // Mark as "ready" (text extracted + chunked, indexing not yet done)
      await tx
        .update(documents)
        .set({
          processingStatus: "ready",
          extractedText: fullNormalizedText,
          totalChunks: chunks.length,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));
        

    });
    const tDbEnd = performance.now();

    // ── Save raw bytes for redlining (DOCX only, best-effort) ────────────
    if (extension === "docx") {
      try {
        await db.delete(documentFiles).where(eq(documentFiles.documentId, documentId));
        await db.insert(documentFiles).values({ documentId, fileData: buffer });
      } catch (err) {
        console.warn("[processDocument] Could not save raw bytes (tables may not exist yet):", err);
      }
    }

    // ── Phase 4: Semantic Indexing ────────────────────────────────────────
    const tIndexStart = performance.now();
    await indexDocument(documentId, chunks.length);
    const tIndexEnd = performance.now();

    console.log(`
--- PERFORMANCE METRICS ---
Document ID: ${documentId} (${extension})
Pages: ${extractionResult.pages.length}
Chunks: ${chunks.length}
---------------------------
Parse:           ${((tParseEnd - tParseStart) / 1000).toFixed(2)}s
Chunk:           ${((tChunkEnd - tChunkStart) / 1000).toFixed(2)}s
DB Insert:       ${((tDbEnd - tDbStart) / 1000).toFixed(2)}s
Retrieval Index: ${((tIndexEnd - tIndexStart) / 1000).toFixed(2)}s
---------------------------
Total background: ${((performance.now() - perfStart) / 1000).toFixed(2)}s
    `);
  } catch (err: any) {
    console.error("[processDocument] Background processing failed:", err);
    const errorMessage =
      err instanceof ExtractionError
        ? err.message
        : err.message || "An unexpected error occurred during background processing.";

    await db
      .update(documents)
      .set({
        processingStatus: "failed",
        processingError: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Server Actions (used by legacy paths / non-upload mutations)
// ─────────────────────────────────────────────────────────────────────────────

export async function getDocuments() {
  return await db.query.documents.findMany({
    orderBy: (documents, { desc }) => [desc(documents.createdAt)],
  });
}

export async function getDocumentText(documentId: string) {
  const [doc] = await db
    .select({ text: documents.extractedText })
    .from(documents)
    .where(eq(documents.id, documentId));
  return doc?.text || "";
}

export async function deleteDocument(documentId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
    await tx.delete(documents).where(eq(documents.id, documentId));
  });
  try {
    revalidatePath("/");
  } catch (e) {}
  return { success: true };
}
