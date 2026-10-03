import { db } from "../../db";
import { documentChunks, documents } from "../../db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { generateEmbeddings, generateEmbedding } from "./embeddings";
import { cosineDistance, desc } from "drizzle-orm";

export async function indexDocument(documentId: string, precalculatedTotalChunks?: number) {
  // Update status to indexing
  await db.update(documents)
    .set({ 
      indexingStatus: "indexing", 
      processingStatus: "processing", // Ensure it isn't completely 'done' yet if UI depends on it
      progress: 0,
      totalChunks: precalculatedTotalChunks || 0,
      processedChunks: 0,
      indexingError: null, 
      updatedAt: new Date() 
    })
    .where(eq(documents.id, documentId));

  try {
    // Find chunks that need embeddings (idempotent: only embed nulls if doing delta, but let's re-embed all for idempotency maybe? 
    // Requirement says: "The implementation should support re-indexing a document... find the document's chunks, generate missing embeddings, update/rewrite embeddings". 
    // Wait, "generate missing embeddings, update/rewrite as appropriate." Either is fine. Let's just do all chunks whose embeddings are null. If we want full re-index, we can set them to null first, or just process them.
    const chunks = await db.query.documentChunks.findMany({
      where: eq(documentChunks.documentId, documentId),
      orderBy: (chunks, { asc }) => [asc(chunks.chunkIndex)]
    });

    if (chunks.length === 0) {
      await db.update(documents).set({ indexingStatus: "completed" }).where(eq(documents.id, documentId));
      return;
    }

    const BATCH_SIZE = 100;
    
    let processedCount = 0;
    const initialTotal = precalculatedTotalChunks || chunks.length;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const toEmbed = batch.filter(c => c.embedding === null);
      if (toEmbed.length > 0) {
        const texts = toEmbed.map(c => c.text);
        const vectors = await generateEmbeddings(texts);
        
        // Bulk-update all embeddings in one transaction (much faster than one-by-one)
        await db.transaction(async (tx) => {
          for (let j = 0; j < toEmbed.length; j++) {
            await tx.update(documentChunks)
              .set({ embedding: vectors[j] })
              .where(eq(documentChunks.id, toEmbed[j].id));
          }
        });
      }
      
      // Update progress
      processedCount += batch.length;
      const progressPercent = Math.min(99, Math.floor((processedCount / initialTotal) * 100)) || 0;
      await db.update(documents)
        .set({ progress: progressPercent, processedChunks: processedCount, updatedAt: new Date() })
        .where(eq(documents.id, documentId));
    }

    await db.update(documents)
      .set({ 
        indexingStatus: "completed", 
        processingStatus: "completed",
        progress: 100,
        updatedAt: new Date() 
      })
      .where(eq(documents.id, documentId));
  } catch (error: any) {
    const msg = String(error?.message || "");
    const isQuotaError = error?.status === 429 || msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED");
    
    if (isQuotaError) {
      // Quota exhausted — mark as pending so it can be retried later
      // Document remains fully usable via keyword fallback search
      console.warn("Embedding quota exhausted — marking document indexing as pending for later retry.");
      await db.update(documents)
        .set({
          indexingStatus: "pending",
          indexingError: "Embedding quota exceeded. Indexing will resume automatically. Document is searchable via keyword fallback.",
          updatedAt: new Date()
        })
        .where(eq(documents.id, documentId));
    } else {
      console.error("Indexing failed:", error);
      await db.update(documents)
        .set({ 
          indexingStatus: "failed", 
          indexingError: error.message || "Failed to generate embeddings",
          updatedAt: new Date()
        })
        .where(eq(documents.id, documentId));
      throw error;
    }
  }
}

/**
 * Keyword-based fallback search (BM25-style term frequency ranking).
 * Used when vector embeddings are unavailable (quota exhausted / pending indexing).
 */
async function keywordSearchDocuments({ query, documentIds, topK = 6 }: { query: string; documentIds?: string[]; topK?: number }) {
  let condition = sql`1=1`;
  if (documentIds && documentIds.length > 0) {
    condition = inArray(documentChunks.documentId, documentIds);
  }
  
  const allChunks = await db
    .select({
      id: documentChunks.id,
      chunkIndex: documentChunks.chunkIndex,
      documentId: documentChunks.documentId,
      text: documentChunks.text,
      pageStart: documentChunks.pageStart,
      pageEnd: documentChunks.pageEnd,
      characterStart: documentChunks.characterStart,
      characterEnd: documentChunks.characterEnd,
    })
    .from(documentChunks)
    .where(condition);

  // Simple TF score: count query term hits in each chunk (case-insensitive)
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  
  const scored = allChunks.map(chunk => {
    const lowerText = chunk.text.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      const matches = lowerText.split(term).length - 1;
      score += matches;
    }
    return { ...chunk, similarity: score };
  });

  return scored
    .filter(c => c.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

export async function searchDocuments({ query, documentIds, topK = 6 }: { query: string; documentIds?: string[]; topK?: number }) {
  try {
    const queryEmbedding = await generateEmbedding(query);
    
    // Base condition: valid embeddings
    let condition = sql`${documentChunks.embedding} IS NOT NULL`;
    
    if (documentIds && documentIds.length > 0) {
      condition = sql`${condition} AND ${inArray(documentChunks.documentId, documentIds)}`;
    }

    // Use cosine distance for similarity
    const similarity = sql<number>`1 - (${cosineDistance(documentChunks.embedding, queryEmbedding)})`;

    const results = await db
      .select({
        id: documentChunks.id,
        chunkIndex: documentChunks.chunkIndex,
        documentId: documentChunks.documentId,
        text: documentChunks.text,
        pageStart: documentChunks.pageStart,
        pageEnd: documentChunks.pageEnd,
        characterStart: documentChunks.characterStart,
        characterEnd: documentChunks.characterEnd,
        similarity: similarity
      })
      .from(documentChunks)
      .where(condition)
      .orderBy(desc(similarity))
      .limit(topK);

    // If no embedded chunks exist yet, fallback to keyword search
    if (results.length === 0) {
      console.log("No embedded chunks found — falling back to keyword search.");
      return await keywordSearchDocuments({ query, documentIds, topK });
    }

    return results;
  } catch (err: any) {
    // If the embedding API quota is exhausted or unavailable, use keyword search
    const msg = String(err?.message || "");
    const isQuotaError = err?.status === 429 || msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED");
    if (isQuotaError) {
      console.warn("Embedding quota exceeded — falling back to keyword search for this query.");
      return await keywordSearchDocuments({ query, documentIds, topK });
    }
    throw err;
  }
}
