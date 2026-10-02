"use client";

import React, { useState } from "react";
import { deleteDocument } from "@/lib/document/actions";

export function DocumentDeleteButton({ documentId }: { documentId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <button
      disabled={isDeleting}
      className="text-slate-400 hover:text-red-500 transition-colors p-1"
      title="Delete document"
      onClick={async (e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsDeleting(true);
        try {
          await deleteDocument(documentId);
        } catch {
          setIsDeleting(false);
        }
      }}
    >
      {isDeleting ? (
        "..."
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      )}
    </button>
  );
}
