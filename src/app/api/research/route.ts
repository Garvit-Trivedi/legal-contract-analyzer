import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, messages as messagesTable, citations as citationsTable, conversationDocuments, documents } from "@/db/schema";
import { runAgenticResearch, AgentEvent } from "@/lib/ai/agent/loop";
import { eq, inArray } from "drizzle-orm";
import { verifyQuote } from "@/lib/ai/verification";

export async function POST(req: NextRequest) {
  try {
    const { message, documentIds, conversationId: existingConversationId } = await req.json();

    if (!message || !documentIds || documentIds.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let conversationId = existingConversationId;
    let documentIdsToUse = [...documentIds];

    if (conversationId) {
      // Secure load
      const dbConvDocs = await db.query.conversationDocuments.findMany({
        where: eq(conversationDocuments.conversationId, conversationId)
      });
      if (dbConvDocs.length === 0) {
        return NextResponse.json({ error: "Conversation has no associated documents" }, { status: 400 });
      }
      documentIdsToUse = dbConvDocs.map(cd => cd.documentId);
    } else {
      const [newConv] = await db.insert(conversations).values({
        title: "[Research] " + message.substring(0, 50) + (message.length > 50 ? "..." : ""),
      }).returning();
      conversationId = newConv.id;
      
      await db.insert(conversationDocuments).values(
        documentIdsToUse.map((id: string) => ({
          conversationId,
          documentId: id
        }))
      );
    }

    // Persist the user message
    await db.insert(messagesTable).values({
      conversationId,
      role: "user",
      content: message,
    });

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const streamEvent = (data: any) => {
          controller.enqueue(new TextEncoder().encode(JSON.stringify(data) + '\n'));
        };

        try {
          // Tell the UI about the conversation ID early if it's new
          streamEvent({ type: "init", conversationId });
          
          let allToolContexts: any[] = [];
          
          const docs = await db.query.documents.findMany({
            where: inArray(documents.id, documentIdsToUse)
          });
          const docMap = Object.fromEntries(docs.map(d => [d.id, d.filename]));
          
          const { answer, history, hitLimit } = await runAgenticResearch(
            message,
            documentIdsToUse,
            docMap,
            (event: AgentEvent) => {
              streamEvent(event);
            },
            6 // Max rounds
          );

          // We must persist the assistant message
          const [assistantMsg] = await db.insert(messagesTable).values({
            conversationId,
            role: "assistant",
            content: answer, // finalized text
          }).returning();

          // Re-extract all context used during research for quote verification
          // We look at all "functionResponse" blocks in the history
          for (const ht of history) {
            if (ht.role === "user" && ht.parts && Array.isArray(ht.parts)) {
              for (const part of ht.parts) {
                if (part.functionResponse && part.functionResponse.response) {
                  const fr = part.functionResponse.response;
                  if (fr.results) {
                    for (const r of fr.results) {
                      allToolContexts.push({
                        documentId: r.documentId,
                        id: r.chunkId, // for matching
                        text: r.text,
                        pageStart: r.pageStart,
                        pageEnd: r.pageEnd,
                        characterStart: r.characterStart, // These might be empty if we didn't return them in search
                        // Actually, searchDocuments DOES return page/character offsets! Let's ensure the tool returned them.
                        // Wait, tools.ts returned: documentId, chunkId, pageStart, text. It didn't return character offsets. 
                        // It's okay, verifyQuote can still find it but offsets are better. 
                      });
                    }
                  } else if (fr.text) { // get_section result
                    allToolContexts.push({
                      documentId: fr.documentId,
                      id: fr.chunkId,
                      text: fr.text,
                      pageStart: fr.pageStart,
                      pageEnd: fr.pageEnd,
                      characterStart: fr.characterStart,
                      characterEnd: fr.characterEnd,
                    });
                  }
                }
              }
            }
          }

          let savedCitations: any[] = [];
          
          // Quote verification
          if (answer && allToolContexts.length > 0) {
            const candidateMatches = Array.from(answer.matchAll(/<quote>([\s\S]*?)<\/quote>/g));
            const candidates = candidateMatches.map(m => m[1].trim()).filter(Boolean);
            
            for (const candidate of candidates) {
               let verified = false;
               let bestMatch: any = null;
               
               for (const chunk of allToolContexts) {
                 const res = verifyQuote(chunk.text || "", candidate, chunk.characterStart || 0);
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
                   documentId: allToolContexts[0].documentId,
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

          streamEvent({ 
            type: "done", 
            messageId: assistantMsg.id,
            text: answer,
            citations: savedCitations,
            hitLimit
          });

          controller.close();
        } catch (e: any) {
          console.error("Agent error:", e);
          let cleanMessage = "An internal agent error occurred.";
          try {
            if (e.message) cleanMessage = e.message;
          } catch (pe) {}
          streamEvent({ type: "error", error: cleanMessage });
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
    console.error("Research API error:", error);
    return NextResponse.json({ error: "An overarching service error occurred." }, { status: 500 });
  }
}
