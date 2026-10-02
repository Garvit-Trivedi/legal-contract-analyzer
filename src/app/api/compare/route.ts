/**
 * POST /api/compare
 *
 * Step 10 — Document Comparison Engine API
 *
 * Request body:
 *   { documentAId: string, documentBId: string }
 *
 * Response:
 *   { success: true, comparison: ComparisonResult }
 *   or
 *   { success: false, error: string }     (status 4xx/5xx)
 *
 * This route delegates all comparison logic to the engine.
 * No hardcoded topics, no fake data, no setTimeout simulation.
 */

import { NextRequest, NextResponse } from "next/server";
import { runComparison, ComparisonValidationError, isValidUUID } from "@/lib/comparison/engine";

export async function POST(req: NextRequest) {
  let documentAId: string | undefined;
  let documentBId: string | undefined;

  try {
    const body = await req.json();
    documentAId = body?.documentAId;
    documentBId = body?.documentBId;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON in request body." },
      { status: 400 }
    );
  }

  // Input validation
  if (!documentAId || typeof documentAId !== "string") {
    return NextResponse.json(
      { success: false, error: "documentAId is required." },
      { status: 400 }
    );
  }
  if (!documentBId || typeof documentBId !== "string") {
    return NextResponse.json(
      { success: false, error: "documentBId is required." },
      { status: 400 }
    );
  }
  if (!isValidUUID(documentAId)) {
    return NextResponse.json(
      { success: false, error: `documentAId is not a valid UUID: ${documentAId}` },
      { status: 400 }
    );
  }
  if (!isValidUUID(documentBId)) {
    return NextResponse.json(
      { success: false, error: `documentBId is not a valid UUID: ${documentBId}` },
      { status: 400 }
    );
  }
  if (documentAId === documentBId) {
    return NextResponse.json(
      { success: false, error: "documentAId and documentBId must be different documents." },
      { status: 400 }
    );
  }

  try {
    const comparison = await runComparison(documentAId, documentBId);

    return NextResponse.json(
      { success: true, comparison },
      { status: 200 }
    );
  } catch (err: any) {
    if (err instanceof ComparisonValidationError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode }
      );
    }

    // Unexpected server error — log but do not leak internals
    console.error("[/api/compare] Unexpected error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "An internal error occurred during document comparison. Please try again.",
      },
      { status: 500 }
    );
  }
}
