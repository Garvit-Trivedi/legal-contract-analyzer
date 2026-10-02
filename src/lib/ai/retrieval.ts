import { db } from "../../db";
import { documentChunks, documents } from "../../db/schema";
import { eq, isNull, sql, inArray, count } from "drizzle-orm";
import { generateEmbeddings, generateEmbedding } from "./embeddings";
import { cosineDistance, desc } from "drizzle-orm";

export async function indexDocument(documentId: string) {
  // Update status to indexing
  await db.update(documents)
    .set({ indexingStatus: "indexing", indexingError: null, updatedAt: new Date() })
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

    const BATCH_SIZE = 100; // Gemini limit per batch is typically 100
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      // We will only embed chunks that don't have embeddings to save quota during re-runs.
      // But for a full rewrite if forced, caller can clear them.
      const toEmbed = batch.filter(c => c.embedding === null);
      if (toEmbed.length > 0) {
        const texts = toEmbed.map(c => c.text);
        const vectors = await generateEmbeddings(texts);
        
        // Update chunks
        await db.transaction(async (tx) => {
          for (let j = 0; j < toEmbed.length; j++) {
            await tx.update(documentChunks)
              .set({ embedding: vectors[j] })
              .where(eq(documentChunks.id, toEmbed[j].id));
          }
        });
      }
    }

    await db.update(documents)
      .set({ indexingStatus: "completed", updatedAt: new Date() })
      .where(eq(documents.id, documentId));
  } catch (error: any) {
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

export async function searchDocuments({ query, documentIds, topK = 6 }: { query: string; documentIds?: string[]; topK?: number }) {
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

  return results;
}
