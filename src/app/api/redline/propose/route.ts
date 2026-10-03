import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documents, redlineEdits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getGeminiClient, getChatModel } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
  try {
    const { documentId, instruction } = await req.json();
    if (!documentId || !instruction) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
    if (!doc || !doc.extractedText) {
      return NextResponse.json({ error: "Document not found or has no text" }, { status: 404 });
    }

    const ai = getGeminiClient();
    const prompt = `You are an expert contract redlining AI. The user has requested changes to a contract.
Document Text:
---
${doc.extractedText}
---

User Instruction: "${instruction}"

Extract exactly the original text snippet that needs to be replaced, and provide the exact replacement text snippet. Make sure the original text matches the document EXACTLY. If the instruction asks for multiple distinct changes, return multiple objects in the array.

Output JSON exactly in this format, and nothing else (no markdown wrapping):
[
  {
    "instruction": "The atomic instruction (e.g. Make liability mutual)",
    "originalText": "Supplier's aggregate liability",
    "replacementText": "Each party's aggregate liability",
    "reason": "Why this change is made"
  }
]`;

    const modelOptions = {
        model: getChatModel(),
        generationConfig: {
           responseMimeType: "application/json",
        }
    };
    const responseStream = await ai.models.generateContent({
        ...modelOptions,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    
    const text = (responseStream.text as string) || "[]";
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // fallback manual parse
      data = JSON.parse(text.replace(/```(?:json)?/g, ""));
    }
    
    if (!Array.isArray(data)) {
       throw new Error("AI did not return an array");
    }
    
    const editsToSave = data.map((d: any) => {
       const verified = doc.extractedText!.includes(d.originalText);
       return {
         documentId,
         instruction: d.instruction || instruction,
         originalText: d.originalText,
         replacementText: d.replacementText,
         reason: d.reason || "",
         verified: verified,
         status: "PROPOSED",
       };
    });
    
    const inserted = await db.insert(redlineEdits).values(editsToSave).returning();
    
    return NextResponse.json({
       status: "PROPOSED",
       edits: inserted.map(e => ({
          id: e.id,
          instruction: e.instruction,
          originalText: e.originalText,
          replacementText: e.replacementText,
          reason: e.reason,
          verified: e.verified,
          status: e.status,
       }))
    });

  } catch (err: any) {
    console.error("Redline Propose Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
