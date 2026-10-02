"use client";

import React, { useRef, useState } from "react";
import { processUploadedDocument } from "@/lib/document/actions";

interface UploadButtonProps {
  children?: React.ReactNode;
  className?: string;
  onUploadStart?: () => void;
  /** Called when upload + processing succeeds. Receives the new documentId. */
  onUploadSuccess?: (documentId: string) => void;
  onUploadError?: (message: string) => void;
}

export function UploadButton({
  children,
  className,
  onUploadStart,
  onUploadSuccess,
  onUploadError,
}: UploadButtonProps) {
  const [status, setStatus] = useState<"idle" | "uploading" | "failed">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const isValidPdf = extension === "pdf";
    const isValidDocx = extension === "docx";
    const isValidTxt = extension === "txt";

    if (!isValidPdf && !isValidDocx && !isValidTxt) {
      setStatus("failed");
      const msg = `Unsupported file type: ${file.name}`;
      setErrorMsg(msg);
      onUploadError?.(msg);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setStatus("failed");
      const msg = "File exceeds 50MB limit.";
      setErrorMsg(msg);
      onUploadError?.(msg);
      return;
    }

    onUploadStart?.();
    setStatus("uploading");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await processUploadedDocument(formData);
      if (result.success) {
        setStatus("idle");
        onUploadSuccess?.(result.documentId ?? "");
      } else {
        setStatus("failed");
        const msg = result.error || "Processing failed.";
        setErrorMsg(msg);
        onUploadError?.(msg);
      }
    } catch (err: any) {
      setStatus("failed");
      const msg = err.message || "Upload failed.";
      setErrorMsg(msg);
      onUploadError?.(msg);
    }

    // Reset so same file can be uploaded again
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full items-center">
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.docx,.txt"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
        className={className}
      >
        {status === "uploading" ? "Processing..." : children}
      </button>

      {status === "failed" && errorMsg && (
        <div className="text-red-400 text-xs text-center border border-red-500/20 bg-red-500/10 p-2 rounded w-full">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
