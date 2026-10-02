import { pgTable, uuid, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { messages } from "./messages";
import { documents } from "./documents";

export const citations = pgTable("citations", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  quote: text("quote").notNull(),
  verified: boolean("verified").notNull().default(false),
  characterStart: integer("character_start"),
  characterEnd: integer("character_end"),
  pageStart: integer("page_start"),
  pageEnd: integer("page_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
