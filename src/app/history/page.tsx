import React from "react";
import { getDocuments } from "@/lib/document/actions";
import { getConversations } from "@/lib/ai/chat.actions";
import { GlobalHistory } from "@/components/dashboard/GlobalHistory";

export default async function HistoryPage() {
  const documents = await getDocuments();
  const conversations = await getConversations();

  return <GlobalHistory documents={documents} conversations={conversations} />;
}
