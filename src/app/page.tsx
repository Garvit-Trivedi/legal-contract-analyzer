import React from "react";
import { getDocuments } from "@/lib/document/actions";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { getConversations } from "@/lib/ai/chat.actions";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const documents = await getDocuments();
  const conversations = await getConversations();

  return <Dashboard initialDocuments={documents} initialConversations={conversations} />;
}
