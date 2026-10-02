import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, messages as messagesTable, citations as citationsTable, conversationDocuments } from "@/db/schema";
import { searchDocuments } from "@/lib/ai/retrieval";
import { getGeminiClient, getChatModel, isTransientError } from "@/lib/ai/gemini";
import { eq, inArray, and } from "drizzle-orm";
import { verifyQuote } from "@/lib/ai/verification";

export async function POST(req: NextRequest) {
  try {
    const { message, documentIds, conversationId: existingConversationId } = await req.json();

    if (!message || !documentIds || documentIds.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let conversationId = existingConversationId;

    if (!conversationId) {
      const [newConv] = await db.insert(conversations).values({
        title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
      }).returning();
      conversationId = newConv.id;
      
      await db.insert(conversationDocuments).values(
        documentIds.map((id: string) => ({
          conversationId,
          documentId: id
        }))
      );
    }

    // Semantic Retrieval
    const results = await searchDocuments({
      query: message,
      documentIds,
      topK: 6,
    });

    const relevantChunks = results.filter(r => (r.similarity ?? 0) > 0.4);
    
    let systemPrompt = "";
    let contextCitations: any[] = [];
    
    if (relevantChunks.length === 0) {
       systemPrompt = `You are a helpful legal assistant. The user asked a question, but there is no provided context from the selected documents that contains the answer. You MUST reply explicitly stating that you couldn't find enough information in the provided document(s) to answer the question. Do not guess or use prior knowledge.`;
    } else {
       const contextElements = relevantChunks.map((chunk, i) => {
         return `[DOCUMENT]
chunkId: ${chunk.id}
page: ${chunk.pageStart}-${chunk.pageEnd}
TEXT:
${chunk.text}`;
       });
       
       systemPrompt = `You are an expert legal assistant. Answer the user's question ONLY using the supplied document context below.
Rules:
1. Do not invent clauses, dates, parties, obligations, or monetary values.
2. If you extract specific phrases or sentences from the text to support your answer, you MUST wrap them in <quote>...</quote> tags. Example: As stated in the document, <quote>thirty days written notice</quote>.
3. If the retrieved context does not contain enough information, explicitly say so (e.g. "I couldn't find enough information in the provided document...").
4. Never use general legal knowledge as if it came from the document.
5. Never fabricate a citation.

Context provided:
${contextElements.join("\n\n---\n\n")}
`;
       contextCitations = relevantChunks;
    }

    const ai = getGeminiClient();
    const modelName = getChatModel();
    
    let responseStream: any;
    let streamIterator: any;
    let firstChunkValue: any = null;
    let connected = false;
    let attempts = 0;
    const maxRetries = 3;
    let lastError: any = null;

    while (attempts < maxRetries && !connected) {
      try {
        responseStream = await ai.models.generateContentStream({
          model: modelName,
          contents: [
            { role: "user", parts: [{ text: systemPrompt + "\n\nUser Question: " + message }] }
          ],
        });
        
        streamIterator = responseStream[Symbol.asyncIterator]();
        const firstResult = await streamIterator.next();
        if (!firstResult.done) {
          firstChunkValue = firstResult.value;
        }
        connected = true;
      } catch (err: any) {
        lastError = err;
        if (isTransientError(err)) {
          attempts++;
          if (attempts < maxRetries) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 500));
          }
        } else {
          break; // Don't retry permanent errors
        }
      }
    }

    if (!connected) {
       console.error("Gemini connection failed after retries:", lastError);
       let status = isTransientError(lastError) ? 503 : 500;
       if (lastError?.status) status = lastError.status;
       
       // Output a clean message, never leak the API key or internals
       let cleanMessage = "The AI service is currently unavailable.";
       if (status === 503 && isTransientError(lastError)) {
          cleanMessage = "This model is currently experiencing high demand. Please try again later.";
       } else if (lastError?.message && !lastError.message.includes("key") && !lastError.message.includes("postgres")) {
          try {
            const parsedError = JSON.parse(lastError.message);
            if (parsedError.error && parsedError.error.message) {
              cleanMessage = parsedError.error.message;
            } else {
              cleanMessage = lastError.message;
            }
          } catch (e) {
            cleanMessage = lastError.message;
          }
       }
       
       return NextResponse.json({ error: cleanMessage }, { status });
    }

    // Now that connection succeeds, persist the user message
    await db.insert(messagesTable).values({
      conversationId,
      role: "user",
      content: message,
    });
    
    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        try {
          if (firstChunkValue && firstChunkValue.text) {
             fullResponse += firstChunkValue.text;
             controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'text', content: firstChunkValue.text }) + '\n'));
          }

          for await (const chunk of streamIterator) {
            if (chunk.text) {
              fullResponse += chunk.text;
              controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'text', content: chunk.text }) + '\n'));
            }
          }

          const [assistantMsg] = await db.insert(messagesTable).values({
            conversationId,
            role: "assistant",
            content: fullResponse,
          }).returning();

          let savedCitations: any[] = [];
          if (contextCitations.length > 0) {
            const candidateMatches = Array.from(fullResponse.matchAll(/<quote>([\s\S]*?)<\/quote>/g));
            const candidates = candidateMatches.map(m => m[1].trim()).filter(Boolean);
            
            for (const candidate of candidates) {
               let verified = false;
               let bestMatch: any = null;
               
               for (const chunk of contextCitations) {
                 const res = verifyQuote(chunk.text, candidate, chunk.characterStart || 0);
                 if (res.verified) {
                   verified = true;
                   bestMatch = { ...res, chunk };
                   break;
                 }
               }
               
               if (bestMatch) {
                 savedCitations.push({
                   messageId: assistantMsg.id,
                   documentId: bestMatch.chunk.documentId,
                   chunkId: bestMatch.chunk.id,
                   quote: bestMatch.exactQuote || candidate,
                   verified: true,
                   pageStart: bestMatch.chunk.pageStart,
                   pageEnd: bestMatch.chunk.pageEnd,
                   characterStart: bestMatch.characterStart,
                   characterEnd: bestMatch.characterEnd,
                 });
               } else {
                 savedCitations.push({
                   messageId: assistantMsg.id,
                   documentId: contextCitations[0].documentId,
                   chunkId: null,
                   quote: candidate,
                   verified: false,
                   pageStart: null,
                   pageEnd: null,
                   characterStart: null,
                   characterEnd: null,
                 });
               }
            }
            
            if (savedCitations.length > 0) {
              savedCitations = await db.insert(citationsTable).values(savedCitations).returning();
            }
          }

          controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
            type: 'done', 
            conversationId, 
            messageId: assistantMsg.id,
            citations: savedCitations 
          }) + '\n'));

          controller.close();
        } catch (e: any) {
          console.error("Chat generation error during stream:", e);
          controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'error', error: "Stream interrupted due to a temporary service error." }) + '\n'));
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
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "An overarching service error occurred: " + error.message, stack: error.stack }, { status: 500 });
  }
}
