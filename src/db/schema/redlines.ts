import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { documents } from "./documents";

export const redlineEdits = pgTable("redline_edits", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  instruction: text("instruction").notNull(),
  originalText: text("original_text").notNull(),
  replacementText: text("replacement_text").notNull(),
  reason: text("reason"),
  verified: boolean("verified").notNull().default(false),
  status: text("status").notNull().default("PROPOSED"), // PROPOSED, APPROVED, REJECTED
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
