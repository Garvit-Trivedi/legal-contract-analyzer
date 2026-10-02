import { NextRequest, NextResponse } from "next/server";
import { searchDocuments } from "@/lib/ai/retrieval";
import { getGeminiClient, getChatModel, isTransientError } from "@/lib/ai/gemini";
import { verifyQuote } from "@/lib/ai/verification";
import { ComparisonResult } from "@/types/comparison";

export async function POST(req: NextRequest) {
  try {
    const { documentAId, documentBId } = await req.json();

    if (!documentAId || !documentBId) {
      return NextResponse.json({ error: "Missing both documents for comparison" }, { status: 400 });
    }
    if (documentAId === documentBId) {
      return NextResponse.json({ error: "Cannot compare a document to itself." }, { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const sendUpdate = (phase: string) => {
          controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'progress', phase }) + '\\n'));
        };

        try {
          sendUpdate("Retrieving relevant clauses...");
          const topicsToSearch = [
            "termination renewal notice period",
            "payment fees compensation",
            "liability indemnification warranties"
          ];

          const retrievedChunks = new Map<string, any>();
          for (const topic of topicsToSearch) {
            const results = await searchDocuments({
              query: topic,
              documentIds: [documentAId, documentBId],
              topK: 6,
            });

            for (const res of results) {
              if ((res.similarity ?? 0) > 0.45) retrievedChunks.set(res.id, res);
            }
          }

          const contextChunks = Array.from(retrievedChunks.values());

          if (contextChunks.length === 0) {
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
               type: 'done', 
               result: {
                 summary: "No substantive comparable content was found between the selected documents based on core contractual elements.",
                 changes: []
               }
            }) + '\\n'));
            controller.close();
            return;
          }

          sendUpdate("Comparing contractual terms...");
          let documentsContent = "";
          for (const chunk of contextChunks) {
            const docLabel = chunk.documentId === documentAId ? "DOCUMENT A" : "DOCUMENT B";
            documentsContent += `[${docLabel}]\nchunkId: ${chunk.id}\npage: ${chunk.pageStart}-${chunk.pageEnd}\nTEXT:\n${chunk.text}\n\n---\n`;
          }

          const systemPrompt = `You are a high-level legal AI assistant analyzing two documents constraint by the supplied evidence.
Compare the provisions found in DOCUMENT A with DOCUMENT B from the source context below.
Rules:
1. ONLY compare based on the supplied source evidence. Do not invent any clauses.
2. If the meaning is identical but formatted differently, do not consider it a substantive change.
3. Identify substantive additions, removals, and modifications.
4. Set significance to "high" (liability/core exposure), "medium" (obligations), or "low" (minor/wording).
5. For EVERY change, you MUST provide precise source information (the chunkId and exact quote) from Document A and/or B.
6. The output MUST strictly match this JSON schema:
{
  "summary": "Overall plain-language summary...",
  "changes": [
    {
      "topic": "Termination",
      "changeType": "added" | "removed" | "modified",
      "significance": "high" | "medium" | "low",
      "explanation": "Brief explanation...",
      "documentA": { "documentId": "ID FOR A", "chunkIds": ["chunk1"], "quote": "exact quote" },
      "documentB": { "documentId": "ID FOR B", "chunkIds": ["chunk2"], "quote": "exact quote" }
    }
  ]
}

DO NOT include markdown block markers like \`\`\`json outside the JSON. Return raw valid JSON.
If there are no substantive changes, return {"summary": "These documents are substantively identical.", "changes": []}.

Context:
${documentsContent}
`;
          const ai = getGeminiClient();
          const modelName = getChatModel();
          
          let resultJSON = null;
          let connected = false;
          let attempts = 0;
          let lastError: any = null;

          while (attempts < 2 && !connected) {
            try {
              const response = await ai.models.generateContent({
                 model: modelName,
                 contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
                 config: { responseMimeType: "application/json" }
              });
              
              const text = response.text;
              resultJSON = JSON.parse(text || "{}");
              if (resultJSON.changes) {
                  resultJSON.changes.forEach((c: any) => {
                     const verifyDocQuote = (docObj: any) => {
                        if (docObj && docObj.quote && docObj.chunkIds && docObj.chunkIds.length > 0) {
                           const chunkId = docObj.chunkIds[0];
                           const chunk = retrievedChunks.get(chunkId);
                           if (chunk) {
                              const res = verifyQuote(chunk.text, docObj.quote, chunk.characterStart || 0);
                              docObj.verified = res.verified;
                              if (res.verified) {
                                 docObj.exactQuote = res.exactQuote;
                                 docObj.characterStart = res.characterStart;
                                 docObj.characterEnd = res.characterEnd;
                                 docObj.pageStart = chunk.pageStart;
                              }
                           } else {
                              docObj.verified = false;
                           }
                        }
                     };
                     
                     if (c.documentA) {
                        c.documentA.documentId = documentAId;
                        verifyDocQuote(c.documentA);
                     }
                     if (c.documentB) {
                        c.documentB.documentId = documentBId;
                        verifyDocQuote(c.documentB);
                     }
                  });
              }

              connected = true;
            } catch (err: any) {
              lastError = err;
              if (isTransientError(err)) {
                attempts++;
                await new Promise(r => setTimeout(r, Math.random() * 500 + 500));
              } else {
                break;
              }
            }
          }

          if (!connected) {
             let cleanMessage = "The AI service is currently unavailable for comparisons.";
             if (isTransientError(lastError)) {
                cleanMessage = "This model is currently experiencing high demand. Please try again later.";
             } else if (lastError?.message) {
                try {
                  const parsed = JSON.parse(lastError.message);
                  cleanMessage = parsed.error?.message || lastError.message;
                } catch {
                  cleanMessage = lastError.message;
                }
             }
             controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'error', error: cleanMessage }) + '\\n'));
          } else {
             sendUpdate("Preparing comparison...");
             controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'done', result: resultJSON }) + '\\n'));
          }
          
          controller.close();
        } catch (e: any) {
          controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'error', error: e.message }) + '\\n'));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error("Comparison API error:", error);
    return NextResponse.json({ error: "Failed to compare documents: " + error.message }, { status: 500 });
  }
}
