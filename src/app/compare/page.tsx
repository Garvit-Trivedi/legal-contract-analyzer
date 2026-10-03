import React from "react";
import { getDocuments } from "@/lib/document/actions";
import { ComparisonWorkflow } from "@/components/comparison/ComparisonWorkflow";

export const dynamic = 'force-dynamic';

export default async function ComparePage() {
  const documents = await getDocuments();
  // Filter only ready docs
  const readyDocs = documents.filter(d => d.processingStatus === 'completed' && d.indexingStatus === 'completed');

  return <ComparisonWorkflow documents={readyDocs} />;
}
