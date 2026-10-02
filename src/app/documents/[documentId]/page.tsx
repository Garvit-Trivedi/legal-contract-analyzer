import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DocumentWorkspace } from "@/components/workspace/DocumentWorkspace";

export default async function DocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;

  const document = await db.query.documents.findFirst({
    where: eq(documents.id, documentId)
  });

  if (!document) {
    notFound();
  }

  return <DocumentWorkspace document={document} />;
}
