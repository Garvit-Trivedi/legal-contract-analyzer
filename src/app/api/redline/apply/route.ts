import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documentFiles, documents, redlineEdits } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { applyRedlinesToDocx } from "@/lib/redline/redline-engine";
import { buildFullDocxWithRedlines } from "@/lib/redline/pdf-redline";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

export async function POST(req: NextRequest) {
  try {
    const { documentId, editIds } = await req.json();

    if (!documentId || !editIds || !Array.isArray(editIds) || editIds.length === 0) {
      return NextResponse.json({ error: "Missing documentId or editIds" }, { status: 400 });
    }

    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!doc.extractedText) {
      return NextResponse.json(
        { error: "Document has not been processed yet. Please wait for indexing to complete." },
        { status: 400 }
      );
    }

    const editsToApply = await db
      .select()
      .from(redlineEdits)
      .where(inArray(redlineEdits.id, editIds));

    if (editsToApply.length === 0) {
      return NextResponse.json({ error: "No edits found for the provided IDs" }, { status: 400 });
    }

    const unverified = editsToApply.filter((e) => !e.verified);
    if (unverified.length > 0) {
      return NextResponse.json(
        { error: `Cannot apply unverified edits: these could not be located in the document.` },
        { status: 400 }
      );
    }

    const isDocx =
      doc.fileType?.includes("wordprocessingml") ||
      doc.fileType?.includes("docx") ||
      doc.filename?.toLowerCase().endsWith(".docx");

    let updatedBuffer: Buffer;
    let outFilename: string;
    let usedFallback = false;

    if (isDocx) {
      // ── DOCX path: try surgical XML first, fall back to full-text rebuild ──
      const [docFile] = await db
        .select()
        .from(documentFiles)
        .where(eq(documentFiles.documentId, documentId));

      if (docFile?.fileData) {
        // Ideal path: surgically modify original DOCX XML
        updatedBuffer = await applyRedlinesToDocx(docFile.fileData, editsToApply);
      } else {
        // Fallback: rebuild full document from extracted text with tracked changes
        // (happens for documents uploaded before file storage was introduced)
        usedFallback = true;
        updatedBuffer = buildFullDocxWithRedlines(doc.filename, doc.extractedText, editsToApply);
      }

      const baseName = doc.filename.replace(/\.docx$/i, "");
      outFilename = `${baseName}-redlined.docx`;
    } else {
      // ── PDF / TXT path: rebuild full document from extracted text ──────────
      // PDFs cannot be surgically modified (not XML-editable).
      // We generate a complete DOCX from the full extracted text with
      // the tracked changes (w:del / w:ins) embedded at the correct location.
      updatedBuffer = buildFullDocxWithRedlines(doc.filename, doc.extractedText, editsToApply);
      const baseName = doc.filename.replace(/\.(pdf|txt)$/i, "");
      outFilename = `${baseName}-redlined.docx`;
    }

    // ── Save to tmp for download ─────────────────────────────────────────
    const downloadId =
      Date.now().toString() + "-" + Math.random().toString(36).substring(7);
    const tmpPath = path.join(os.tmpdir(), `redline-${downloadId}.docx`);
    await fs.writeFile(tmpPath, updatedBuffer);

    // ── Mark edits as APPLIED ────────────────────────────────────────────
    await db
      .update(redlineEdits)
      .set({ status: "APPLIED" })
      .where(inArray(redlineEdits.id, editIds));

    return NextResponse.json({
      success: true,
      changeCount: editsToApply.length,
      isPdf: !isDocx,
      usedFallback,
      downloadUrl: `/api/redline/download?id=${downloadId}&filename=${encodeURIComponent(outFilename)}`,
    });
  } catch (err: any) {
    console.error("Redline Apply Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
