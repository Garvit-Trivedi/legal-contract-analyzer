import { pgTable, uuid, timestamp, customType } from "drizzle-orm/pg-core";
import { documents } from "./documents";

// Define bytea for Drizzle since standard pg-core bytea mapping sometimes needs a custom type for raw Buffers
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver(value: Buffer): Buffer {
    return value;
  },
  fromDriver(value: Buffer): Buffer {
    return value;
  }
});

export const documentFiles = pgTable("document_files", {
  documentId: uuid("document_id").primaryKey().references(() => documents.id, { onDelete: "cascade" }),
  fileData: bytea("file_data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
