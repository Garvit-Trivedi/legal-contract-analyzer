import { pgTable, uuid, integer, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { documents } from "./documents";
import { vector } from "drizzle-orm/pg-core";

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    text: text("text").notNull(),
    pageStart: integer("page_start"),
    pageEnd: integer("page_end"),
    characterStart: integer("character_start"),
    characterEnd: integer("character_end"),
    section: text("section"),
    // Gemini gemini-embedding-2 has 3072 dimensions
    embedding: vector("embedding", { dimensions: 3072 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("unique_chunk_index").on(table.documentId, table.chunkIndex),
  ]
);
