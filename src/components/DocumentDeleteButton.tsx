"use client";

import React, { useState } from "react";
import { deleteDocument } from "@/lib/document/actions";

export function DocumentDeleteButton({
  documentId,
  onDeleted,
}: {
  documentId: string;
  onDeleted?: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!confirm) {
      setConfirm(true);
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
      <div
        style={{
          padding: "10px 16px",
          fontSize: "13px",
          color: "#77736D",
        }}
      >
        Deleting…
      </div>
    );
  }

  if (confirm) {
    return (
      <button
        onClick={handleDelete}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          padding: "10px 16px",
          fontSize: "13px",
          fontWeight: 600,
          color: "#E53935",
          background: "#FDECEA",
          border: "none",
          cursor: "pointer",
          animation: "pulse 1s infinite",
        }}
        title="Click again to confirm deletion"
      >
        Confirm delete?
      </button>
    );
  }

  return (
    <button
      disabled={isDeleting}
      onClick={handleDelete}
      title="Delete document"
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "10px 16px",
        fontSize: "13px",
        fontWeight: 500,
        color: "#5E5A54",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        transition: "background 150ms, color 150ms",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#FDECEA";
        (e.currentTarget as HTMLElement).style.color = "#E53935";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        (e.currentTarget as HTMLElement).style.color = "#5E5A54";
      }}
    >
      Delete
    </button>
  );
}
