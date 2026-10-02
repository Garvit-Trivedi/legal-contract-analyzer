"use client";

import React, { useRef, useState } from "react";
import { processUploadedDocument } from "@/lib/document/actions";

interface UploadButtonProps {
  children: React.ReactNode;
  className?: string;
  onUploadStart?: () => void;
}

export function UploadButton({ children, className, onUploadStart }: UploadButtonProps) {
  const [status, setStatus] = useState<"idle" | "uploading" | "failed">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase() || "";
    // Allow any standard MIME if extensions strictly match, since edge case browsers misreport MIME heavily 
    const isValidPdf = extension === "pdf";
    const isValidDocx = extension === "docx";
    const isValidTxt = extension === "txt";

    if (!isValidPdf && !isValidDocx && !isValidTxt) {
      setStatus("failed");
      setErrorMsg(`Unsupported file type: ${file.name}`);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setStatus("failed");
      setErrorMsg("File exceeds 50MB limit.");
      return;
    }

    if (onUploadStart) onUploadStart();
    setStatus("uploading");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await processUploadedDocument(formData);
      if (result.success) {
        setStatus("idle");
      } else {
        setStatus("failed");
        setErrorMsg(result.error || "Processing failed.");
      }
    } catch (err: any) {
      setStatus("failed");
      setErrorMsg(err.message || "Upload failed.");
    }

    // Reset input
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
        <div className="text-red-500 text-xs text-center border border-red-200 bg-red-50 p-2 rounded w-full">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
