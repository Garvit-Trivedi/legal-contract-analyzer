export * from "./documents";
export * from "./documentChunks";
export * from "./conversations";
export * from "./conversationDocuments";
export * from "./messages";
export * from "./citations";
export * from "./documentFiles";
export * from "./redlines";

import { relations } from "drizzle-orm";
import { documents } from "./documents";
import { documentChunks } from "./documentChunks";
import { conversations } from "./conversations";
import { conversationDocuments } from "./conversationDocuments";
import { messages } from "./messages";
import { citations } from "./citations";

export const documentsRelations = relations(documents, ({ many }) => ({
  chunks: many(documentChunks),
  conversationDocuments: many(conversationDocuments),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
  conversationDocuments: many(conversationDocuments),
}));

export const conversationDocumentsRelations = relations(conversationDocuments, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationDocuments.conversationId],
    references: [conversations.id],
  }),
  document: one(documents, {
    fields: [conversationDocuments.documentId],
    references: [documents.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  citations: many(citations),
}));

export const citationsRelations = relations(citations, ({ one }) => ({
  message: one(messages, {
    fields: [citations.messageId],
    references: [messages.id],
  }),
  document: one(documents, {
    fields: [citations.documentId],
    references: [documents.id],
  }),
  chunk: one(documentChunks, {
    fields: [citations.chunkId],
    references: [documentChunks.id],
  }),
}));
