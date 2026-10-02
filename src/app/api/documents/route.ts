/**
 * GET /api/documents
 * Returns the full list of documents from the database.
 * Used by the Dashboard client component to refresh without a full page reload.
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const docs = await db
      .select({
        id: documents.id,
        filename: documents.filename,
        fileType: documents.fileType,
        fileSize: documents.fileSize,
        processingStatus: documents.processingStatus,
        processingError: documents.processingError,
        indexingStatus: documents.indexingStatus,
        indexingError: documents.indexingError,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .orderBy(desc(documents.createdAt));

    return NextResponse.json({ success: true, documents: docs });
  } catch (err: any) {
    console.error("[GET /api/documents]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch documents." }, { status: 500 });
  }
}
