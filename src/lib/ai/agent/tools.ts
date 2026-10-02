import { db } from "@/db";
import { documentChunks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { searchDocuments } from "../retrieval";
import { Type } from "@google/genai";

export const agentTools: any[] = [
  {
    name: "search_document",
    description: "Search the selected document(s) for information relevant to a query using semantic search.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "The concept, clause, or question to search for.",
        },
        documentIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of document IDs to search within. MUST be a subset of the currently authorized document IDs.",
        },
      },
      required: ["query", "documentIds"],
    },
  },
  {
    name: "get_section",
    description: "Retrieve a specific document chunk by its ID.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        documentId: {
          type: Type.STRING,
          description: "The ID of the document.",
        },
        chunkId: {
          type: Type.STRING,
          description: "The ID of the chunk to retrieve.",
        },
      },
      required: ["documentId", "chunkId"],
    },
  },
  {
    name: "list_clauses",
    description: "Provide a quick overview of the first few chunks/sections in the specified document to understand its structure.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        documentId: {
          type: Type.STRING,
          description: "The ID of the document to inspect.",
        },
      },
      required: ["documentId"],
    },
  },
];

export async function executeTool(name: string, args: any, allowedDocumentIds: string[]) {
  try {
    if (name === "search_document") {
      const { query, documentIds } = args;
      if (!query || typeof query !== "string") return { error: "query must be a non-empty string" };
      if (!documentIds || !Array.isArray(documentIds)) return { error: "documentIds must be an array of strings" };
      
      // Enforce scope
      const secureIds = documentIds.filter((id: string) => allowedDocumentIds.includes(id));
      if (secureIds.length === 0) {
        return { error: "No authorized documentIds provided. You can only search within the documents assigned to this conversation." };
      }

      const results = await searchDocuments({
        query,
        documentIds: secureIds,
        topK: 8,
      });
      
      if (results.length === 0) return { result: "No relevant information found." };
      
      return {
        results: results.map((r, i) => ({
          rank: i + 1,
          documentId: r.documentId,
          chunkId: r.id,
          pageStart: r.pageStart,
          pageEnd: r.pageEnd,
          characterStart: r.characterStart,
          characterEnd: r.characterEnd,
          text: r.text,
        }))
      };
    } 
    
    if (name === "get_section") {
      const { documentId, chunkId } = args;
      if (!allowedDocumentIds.includes(documentId)) {
        return { error: "Unauthorized documentId. You cannot access this document." };
      }
      
      const chunk = await db.query.documentChunks.findFirst({
        where: and(
          eq(documentChunks.id, chunkId),
          eq(documentChunks.documentId, documentId)
        )
      });
      
      if (!chunk) return { error: "Chunk not found in the specified document." };
      
      return {
        documentId: chunk.documentId,
        chunkId: chunk.id,
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
        characterStart: chunk.characterStart,
        characterEnd: chunk.characterEnd,
        text: chunk.text
      };
    }
    
    if (name === "list_clauses") {
      const { documentId } = args;
      if (!allowedDocumentIds.includes(documentId)) {
        return { error: "Unauthorized documentId. You cannot access this document." };
      }
      
      // Get the first 5 chunks to summarize document structure
      const chunks = await db.query.documentChunks.findMany({
        where: eq(documentChunks.documentId, documentId),
        orderBy: (chunks, { asc }) => [asc(chunks.chunkIndex)],
        limit: 5
      });
      
      return {
        overview: chunks.map(c => ({
          chunkId: c.id,
          page: c.pageStart,
          preview: c.text.substring(0, 150) + "..."
        }))
      };
    }

    return { error: `Unknown tool: ${name}` };
  } catch (err: any) {
    return { error: `Tool execution failed: ${err.message}` };
  }
}
