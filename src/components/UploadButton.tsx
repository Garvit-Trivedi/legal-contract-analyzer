"use client";

import React, { useRef, useState } from "react";

interface UploadButtonProps {
  children?: React.ReactNode;
  className?: string;
  onUploadStart?: () => void;
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

    // ── Client-side pre-flight checks (UX only — server re-validates) ──────
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const isValidPdf = extension === "pdf";
    const isValidDocx = extension === "docx";
    const isValidTxt = extension === "txt";

    if (!isValidPdf && !isValidDocx && !isValidTxt) {
      setStatus("failed");
      const msg = `Unsupported file type: ${file.name}`;
      setErrorMsg(msg);
      onUploadError?.(msg);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setStatus("failed");
      const msg = "File exceeds 50MB limit.";
      setErrorMsg(msg);
      onUploadError?.(msg);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    onUploadStart?.();
    setStatus("uploading");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      // POST to the dedicated upload Route Handler.
      // The server returns 201 the moment the file is validated and queued —
      // heavy processing (parse, chunk, embed) runs in the background via after().
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("idle");
        onUploadSuccess?.(data.documentId ?? "");
      } else {
        setStatus("failed");
        const msg = data.error || "Upload failed.";
        setErrorMsg(msg);
        onUploadError?.(msg);
      }
    } catch (err: any) {
      setStatus("failed");
      const msg = err.message || "Network error. Please try again.";
      setErrorMsg(msg);
      onUploadError?.(msg);
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        accept=".pdf,.docx,.txt"
        aria-label="Upload a legal document"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
        className={className}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          margin: 0,
          cursor: status === "uploading" ? "not-allowed" : "pointer",
          opacity: status === "uploading" ? 0.7 : 1,
          display: "inline-block",
        }}
        aria-label="Upload document"
      >
        {status === "uploading" ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0",
              background: "#111111",
              borderRadius: "34px",
              padding: "0 8px 0 8px",
              height: "68px",
              width: "290px",
              opacity: 0.7,
            }}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                background: "#F47B20",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  border: "2px solid white",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
            </div>
            <span
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: "15px",
                fontWeight: 600,
                color: "#FFFFFF",
              }}
            >
              Uploading...
            </span>
          </div>
        ) : (
          children
        )}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
