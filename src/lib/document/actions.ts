"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../db";
import { documents, documentChunks } from "../../db/schema";
import { eq } from "drizzle-orm";
import { extractTextFromFile, ExtractionError } from "./extraction";
import { chunkExtractedPages } from "./chunking";
import { indexDocument } from "../ai/retrieval";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function processUploadedDocument(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file uploaded.");
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || "";
  const isValidPdf = extension === "pdf";
  const isValidDocx = extension === "docx";
  const isValidTxt = extension === "txt";

  if (!isValidPdf && !isValidDocx && !isValidTxt) {
    throw new Error(`Unsupported file type: ${file.name}. Please upload a PDF, DOCX, or TXT file.`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File exceeds the maximum limit of 50MB.");
  }

  // 2. Initial DB Record
  const [initalDoc] = await db
    .insert(documents)
    .values({
      filename: file.name,
      fileType: file.type,
      fileSize: file.size,
      processingStatus: "processing",
    })
    .returning();

  try {
    // 3. Extraction
    const buffer = Buffer.from(await file.arrayBuffer());
    const extractionResult = await extractTextFromFile(buffer, extension);
    
    // 4. Chunking
    const { fullNormalizedText, chunks } = chunkExtractedPages(extractionResult.pages);

    // 5. Database Persistence within a Transaction
    await db.transaction(async (tx) => {
      // Safely ensure no stale chunks just in case
      await tx.delete(documentChunks).where(eq(documentChunks.documentId, initalDoc.id));

      if (chunks.length > 0) {
        // Insert chunks
        await tx.insert(documentChunks).values(
          chunks.map((chunk) => ({
            documentId: initalDoc.id,
            chunkIndex: chunk.chunkIndex,
            text: chunk.text,
            pageStart: chunk.pageStart,
            pageEnd: chunk.pageEnd,
            characterStart: chunk.characterStart,
            characterEnd: chunk.characterEnd,
            embedding: null, // explicit per instructions
          }))
        );
      }

      // Mark completed
      await tx
        .update(documents)
        .set({
          extractedText: fullNormalizedText,
          processingStatus: "completed",
          updatedAt: new Date(),
        })
        .where(eq(documents.id, initalDoc.id));
    });

    try { revalidatePath("/"); } catch(e) {}
    
    // Fire indexing process
    try {
      await indexDocument(initalDoc.id);
    } catch (indexErr) {
      console.error("Indexing failed for document", initalDoc.id, indexErr);
    }

    return { success: true, documentId: initalDoc.id };
  } catch (err: any) {
    const errorMessage = err instanceof ExtractionError ? err.message : "An unexpected error occurred during processing.";
    
    // Mark failed
    await db
      .update(documents)
      .set({
        processingStatus: "failed",
        processingError: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, initalDoc.id));
      
    try { revalidatePath("/"); } catch(e) {}
    return { success: false, error: errorMessage };
  }
}

export async function getDocuments() {
  return await db.query.documents.findMany({
    orderBy: (documents, { desc }) => [desc(documents.createdAt)],
  });
}

export async function getDocumentText(documentId: string) {
  const [doc] = await db.select({ text: documents.extractedText }).from(documents).where(eq(documents.id, documentId));
  return doc?.text || "";
}

export async function deleteDocument(documentId: string) {
  // Cascading deletes are not strictly enforced in our Drizzle schema for chunks,
  // so we must delete chunks explicitly within a transaction to avoid orphan chunks.
  await db.transaction(async (tx) => {
    await tx.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
    await tx.delete(documents).where(eq(documents.id, documentId));
  });
  try { revalidatePath("/"); } catch(e) {}
  return { success: true };
}
