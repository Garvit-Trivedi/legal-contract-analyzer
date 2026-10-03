/**
 * POST /api/documents/upload
 *
 * Lightning-fast upload endpoint. The workflow is:
 *  1. Validate file size + magic bytes (spoofing-resistant)
 *  2. Write an initial DB record with status "queued"  ← returns 201 to client immediately
 *  3. after() schedules processDocument() to run in the background AFTER the response is sent
 *     queued → extracting → chunking → ready → (indexing handled by indexDocument) → completed
 *
 * The frontend polls /api/documents to observe granular status transitions in real time.
 */
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { processDocument } from "@/lib/document/actions";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/** Derive the canonical file extension from the raw file.type or file.name */
function resolveExtension(fileName: string, mimeType: string): string {
  const fromMime: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
  };
  if (fromMime[mimeType]) return fromMime[mimeType];
  return fileName.split(".").pop()?.toLowerCase() || "";
}

/** Magic-byte validation — ignores file extension to block spoofing */
function validateMagicBytes(buffer: Buffer, extension: string): string | null {
  const isPdfMagic =
    buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46; // %PDF
  const isZipMagic =
    buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04; // PK\x03\x04 (DOCX)

  if (extension === "pdf" && !isPdfMagic) {
    return "File claims to be a PDF but its contents do not match a valid PDF signature.";
  }
  if (extension === "docx" && !isZipMagic) {
    return "File claims to be a DOCX but its contents do not match a valid DOCX signature.";
  }
  return null; // Valid
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });
    }

    // ── 1. Size guard ──────────────────────────────────────────────────────
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File exceeds the maximum limit of 50MB." },
        { status: 413 }
      );
    }

    const extension = resolveExtension(file.name, file.type);
    const allowedExtensions = ["pdf", "docx", "txt"];
    if (!allowedExtensions.includes(extension)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type: .${extension}. Please upload a PDF, DOCX, or TXT file.`,
        },
        { status: 415 }
      );
    }

    // ── 2. Read buffer fully ───────────────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer());

    // ── 3. Magic-byte spoofing check ───────────────────────────────────────
    if (extension !== "txt") {
      const magicError = validateMagicBytes(buffer, extension);
      if (magicError) {
        return NextResponse.json({ success: false, error: magicError }, { status: 415 });
      }
    }

    // ── 4. Instantiate DB record as "queued" ───────────────────────────────
    const [newDoc] = await db
      .insert(documents)
      .values({
        filename: file.name,
        fileType: file.type || `application/${extension}`,
        fileSize: file.size,
        processingStatus: "queued",
      })
      .returning();

    // ── 5. Schedule heavy processing AFTER response is sent ────────────────
    // after() is a Next.js primitive. The callback runs securely on the server
    // after the 201 response has been flushed to the client, so the user never
    // waits for parsing, chunking, or embedding.
    after(async () => {
      await processDocument(newDoc.id, buffer, extension);
    });

    // ── 6. Return 201 instantly ────────────────────────────────────────────
    return NextResponse.json(
      { success: true, documentId: newDoc.id },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/documents/upload]", err);
    return NextResponse.json(
      { success: false, error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
