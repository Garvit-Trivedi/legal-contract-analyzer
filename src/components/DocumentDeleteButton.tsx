"use client";

import React, { useState } from "react";
import { deleteDocument } from "@/lib/document/actions";

export function DocumentDeleteButton({
  documentId,
  onDeleted,
}: {
  documentId: string;
  /** Called after successful deletion so the parent can update its list */
  onDeleted?: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!confirm) {
      setConfirm(true);
      // Auto-dismiss confirm after 3 seconds
      setTimeout(() => setConfirm(false), 3000);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteDocument(documentId);
      onDeleted?.();
    } catch {
      setIsDeleting(false);
      setConfirm(false);
    }
  };

  if (isDeleting) {
    return (
      <span className="text-xs text-zinc-600 font-mono px-2">deleting…</span>
    );
  }

  if (confirm) {
    return (
      <button
        onClick={handleDelete}
        className="text-[10px] font-bold text-red-400 hover:text-red-300 border border-red-500/30 px-2 py-1 rounded transition-colors animate-pulse"
        title="Click again to confirm deletion"
      >
        Confirm?
      </button>
    );
  }

  return (
    <button
      disabled={isDeleting}
      className="text-slate-500 hover:text-red-500 transition-colors p-1 rounded"
      title="Delete document"
      onClick={handleDelete}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      </svg>
    </button>
  );
}
