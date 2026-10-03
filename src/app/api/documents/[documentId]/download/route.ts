/**
 * GET /api/documents/[documentId]/download
 * Streams the extracted document text as a downloadable .txt file.
 * The original binary file is not stored — only the extracted text is persisted.
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;

  try {
    const [doc] = await db
      .select({
        filename: documents.filename,
        extractedText: documents.extractedText,
        processingStatus: documents.processingStatus,
      })
      .from(documents)
      .where(eq(documents.id, documentId));

    if (!doc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    if (doc.processingStatus !== "completed" || !doc.extractedText) {
      return NextResponse.json(
        { error: "Document text is not yet available. Please wait for processing to complete." },
        { status: 409 }
      );
    }

    // Strip the original extension and serve as .txt
    const baseName = doc.filename.replace(/\.[^.]+$/, "");
    const downloadFilename = `${baseName}.txt`;

    return new Response(doc.extractedText, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${downloadFilename}"`,
        "Content-Length": Buffer.byteLength(doc.extractedText, "utf-8").toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[GET /api/documents/download]", err);
    return NextResponse.json(
      { error: "Failed to prepare document for download." },
      { status: 500 }
    );
  }
}
