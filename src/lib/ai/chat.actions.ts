"use server";

import { db } from "@/db";
import { conversations, messages, conversationDocuments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getConversations() {
  return await db.query.conversations.findMany({
    orderBy: [desc(conversations.updatedAt)],
    with: {
      conversationDocuments: true,
    }
  });
}

export async function getMessages(conversationId: string) {
  return await db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
    with: {
      citations: true
    }
  });
}

export async function deleteConversation(conversationId: string) {
  await db.delete(conversations).where(eq(conversations.id, conversationId));
}
