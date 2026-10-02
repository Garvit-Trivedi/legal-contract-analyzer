import React from "react";
import { getDocuments } from "@/lib/document/actions";
import { getConversations } from "@/lib/ai/chat.actions";
import { MultiDocumentWorkspace } from "@/components/workspace/MultiDocumentWorkspace";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { conversationDocuments, conversations } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ docs?: string }>;
}) {
  // In Next.js 15+, params and searchParams are Promises — must be awaited
  const { id } = await params;
  const { docs } = await searchParams;

  const isNew = id === "new";
  let documentIds: string[] = [];
  let conversationId: string | null = null;
  let title = "New Multi-Document Chat";

  if (isNew) {
    if (!docs) return redirect("/");
    documentIds = docs.split(",").filter(Boolean);
  } else {
    conversationId = id;

    const dbConvDocs = await db
      .select()
      .from(conversationDocuments)
      .where(eq(conversationDocuments.conversationId, conversationId));

    if (dbConvDocs.length === 0) return redirect("/");
    documentIds = dbConvDocs.map(cd => cd.documentId);

    const convRows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (convRows[0]) title = convRows[0].title;
  }

  const allDocs = await getDocuments();
  const activeDocs = allDocs.filter(d => documentIds.includes(d.id));
  const allConversations = await getConversations();

  if (activeDocs.length === 0) return redirect("/");

  return (
    <div className="flex-1 overflow-hidden h-full">
      <MultiDocumentWorkspace
        documents={activeDocs}
        conversationId={conversationId}
        title={title}
        allConversations={allConversations}
      />
    </div>
  );
}
