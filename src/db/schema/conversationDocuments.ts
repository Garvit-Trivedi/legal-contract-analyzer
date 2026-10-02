import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { conversations } from "./conversations";
import { documents } from "./documents";

export const conversationDocuments = pgTable(
  "conversation_documents",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.documentId] }),
  ]
);
