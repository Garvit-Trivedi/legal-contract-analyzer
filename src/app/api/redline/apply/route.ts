import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documentFiles, documents, redlineEdits } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { applyRedlinesToDocx } from "@/lib/redline/redline-engine";
import { buildRedlineSummaryDocx } from "@/lib/redline/pdf-redline";
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
        { error: `Cannot apply unverified edits: ${unverified.map((e) => e.id).join(", ")}` },
        { status: 400 }
      );
    }

    const isDocx =
      doc.fileType?.includes("wordprocessingml") ||
      doc.fileType?.includes("docx") ||
      doc.filename?.toLowerCase().endsWith(".docx");

    let updatedBuffer: Buffer;
    let outFilename: string;

    if (isDocx) {
      // ── DOCX: Surgical XML tracked-change injection ─────────────────────
      const [docFile] = await db
        .select()
        .from(documentFiles)
        .where(eq(documentFiles.documentId, documentId));

      if (!docFile?.fileData) {
        return NextResponse.json(
          {
            error:
              "Original DOCX binary not found. Please re-upload the document to enable redlining.",
          },
          { status: 400 }
        );
      }

      updatedBuffer = await applyRedlinesToDocx(docFile.fileData, editsToApply);
      const baseName = doc.filename.replace(/\.docx$/i, "");
      outFilename = `${baseName}-redlined.docx`;
    } else {
      // ── PDF / TXT: Generate a Redline Summary DOCX ──────────────────────
      // PDFs cannot be surgically modified because they are not XML-editable.
      // We generate a proper DOCX summary document with real <w:del>/<w:ins>
      // tracked changes that can be opened in Word/LibreOffice.
      updatedBuffer = buildRedlineSummaryDocx(doc.filename, editsToApply);
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
      downloadUrl: `/api/redline/download?id=${downloadId}&filename=${encodeURIComponent(
        outFilename
      )}`,
    });
  } catch (err: any) {
    console.error("Redline Apply Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
