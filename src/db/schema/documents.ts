import { pgTable, uuid, varchar, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const processingStatusEnum = pgEnum("processing_status", [
  "pending",
  "queued",
  "extracting",
  "chunking",
  "processing",
  "ready",
  "completed",
  "failed",
]);

export const indexingStatusEnum = pgEnum("indexing_status", [
  "pending",
  "indexing",
  "completed",
  "failed",
]);

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileSize: integer("file_size").notNull(),
  extractedText: text("extracted_text"),
  processingStatus: processingStatusEnum("processing_status").notNull().default("pending"),
  processingError: text("processing_error"),
  indexingStatus: indexingStatusEnum("indexing_status").notNull().default("pending"),
  indexingError: text("indexing_error"),
  progress: integer("progress").notNull().default(0),
  totalChunks: integer("total_chunks").notNull().default(0),
  processedChunks: integer("processed_chunks").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
