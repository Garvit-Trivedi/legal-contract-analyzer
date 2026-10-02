import { InferSelectModel } from "drizzle-orm";
import {
  documents,
  documentChunks,
  conversations,
  conversationDocuments,
  messages,
  citations,
} from "../db/schema/index";

export type Document = InferSelectModel<typeof documents>;
export type DocumentChunk = InferSelectModel<typeof documentChunks>;
export type Conversation = InferSelectModel<typeof conversations>;
export type ConversationDocument = InferSelectModel<typeof conversationDocuments>;
export type Message = InferSelectModel<typeof messages>;
export type Citation = InferSelectModel<typeof citations>;
