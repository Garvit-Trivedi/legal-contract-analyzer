"use client";

import React, { useState } from "react";

export function RedlinePanel({
  documentId,
  fileType,
  filename,
  onClose,
}: {
  documentId: string;
  fileType?: string;
  filename?: string;
  onClose: () => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [generating, setGenerating] = useState(false);
  const [edits, setEdits] = useState<any[]>([]);
  const [selectedEdits, setSelectedEdits] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string>("redlined.docx");
  const [error, setError] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  const isDocx =
    fileType?.includes("wordprocessingml") ||
    fileType?.includes("docx") ||
    filename?.toLowerCase().endsWith(".docx");

  const handlePropose = async () => {
    if (!instruction) return;
    setGenerating(true);
    setError(null);
    setDownloadUrl(null);

    try {
      const res = await fetch("/api/redline/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, instruction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEdits(data.edits);
      setSelectedEdits(
        new Set(data.edits.filter((e: any) => e.verified).map((e: any) => e.id))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = async () => {
    const editIds = Array.from(selectedEdits);
    if (editIds.length === 0) return;

    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/redline/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, editIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDownloadUrl(data.downloadUrl);
      setIsPdf(!!data.isPdf);
      setUsedFallback(!!data.usedFallback);
      const urlParams = new URLSearchParams(data.downloadUrl.split("?")[1]);
      setDownloadFilename(urlParams.get("filename") || "redlined.docx");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAF8]">
      {/* Header */}
      <div className="h-[52px] border-b border-[#E8E4DE] bg-[#FFFFFF] flex items-center px-4 justify-between shrink-0 rounded-t-[16px]">
        <h3 className="text-[13px] font-semibold text-[#111111]">Redline Contract</h3>
        <button onClick={onClose} className="text-[#A7A39D] hover:text-[#111111]">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* PDF notice */}
        {!isDocx && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 items-start text-xs text-amber-800">
            <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>
              <strong>PDF document:</strong> Changes will be exported as a new{" "}
              <strong>Redline Summary DOCX</strong> containing real Word tracked changes
              (w:del / w:ins) that you can open in Microsoft Word or LibreOffice.
            </span>
          </div>
        )}

        {!downloadUrl ? (
          <>
            {/* Instruction input */}
            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[#77736D] mb-2">
                Natural-Language Instruction
              </label>
              <textarea
                className="w-full bg-[#FFFFFF] border border-[#E8E4DE] rounded-xl p-3 text-sm text-[#111111] focus:outline-none focus:border-[#F47B20] focus:ring-1 focus:ring-[#F47B20] resize-none"
                rows={3}
                placeholder={
                  isDocx
                    ? "e.g. Make the liability cap mutual."
                    : "e.g. Increase termination notice from 30 to 60 days."
                }
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
              />
              <button
                onClick={handlePropose}
                disabled={generating || !instruction.trim()}
                className="mt-3 w-full bg-[#111111] hover:bg-[#F47B20] disabled:bg-[#E8E4DE] disabled:text-[#A7A39D] transition-colors text-white py-2.5 rounded-lg text-sm font-semibold"
              >
                {generating ? "Analyzing & Generating…" : "Generate Proposal"}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs">
                {error}
              </div>
            )}

            {/* Proposed edits */}
            {edits.length > 0 && (
              <div>
                <h4 className="text-[11px] font-semibold tracking-wider uppercase text-[#77736D] mb-3">
                  Proposed Changes ({edits.length})
                </h4>
                <div className="space-y-3">
                  {edits.map((edit, idx) => (
                    <div
                      key={edit.id}
                      className={`p-4 border rounded-xl bg-[#FFFFFF] transition-colors ${
                        selectedEdits.has(edit.id)
                          ? "border-[#F47B20] ring-1 ring-[#F47B20]/20"
                          : "border-[#E8E4DE]"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold bg-[#F8F6F2] border border-[#E8E4DE] px-2 py-0.5 rounded-md text-[#5E5A54]">
                            Edit #{idx + 1}
                          </span>
                          {edit.verified ? (
                            <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                              Verified
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded-md">
                              Not verified — text not found
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (!edit.verified) return;
                            const s = new Set(selectedEdits);
                            if (s.has(edit.id)) s.delete(edit.id);
                            else s.add(edit.id);
                            setSelectedEdits(s);
                          }}
                          disabled={!edit.verified}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                            selectedEdits.has(edit.id)
                              ? "bg-[#F47B20] text-white"
                              : "bg-[#F8F6F2] text-[#77736D] hover:bg-[#E8E4DE]"
                          }`}
                        >
                          {selectedEdits.has(edit.id) ? "Approved ✓" : "Pending"}
                        </button>
                      </div>

                      <div className="text-[12px] text-[#A7A39D] mb-3 leading-relaxed italic">
                        {edit.instruction}
                      </div>

                      <div className="space-y-2 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                        <div className="bg-red-50 text-red-800 p-2.5 rounded-lg border border-red-100">
                          <span className="font-bold uppercase text-[9px] tracking-wider block mb-1 text-red-500">
                            ✕ Deleted
                          </span>
                          <del className="decoration-red-400">{edit.originalText}</del>
                        </div>
                        <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-100">
                          <span className="font-bold uppercase text-[9px] tracking-wider block mb-1 text-emerald-600">
                            + Inserted
                          </span>
                          {edit.replacementText}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-[#E8E4DE] pt-4">
                  <button
                    onClick={handleApply}
                    disabled={applying || selectedEdits.size === 0}
                    className="w-full bg-[#111111] hover:bg-[#F47B20] disabled:bg-[#E8E4DE] disabled:text-[#A7A39D] transition-colors text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    {applying ? (
                      "Writing OpenXML Tracked Changes…"
                    ) : (
                      <>
                        Generate Redlined DOCX ({selectedEdits.size} change{selectedEdits.size !== 1 ? "s" : ""})
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path d="M5 12h14m-7-7l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Success / Download state */
          <div className="flex flex-col items-center justify-center text-center pt-8 pb-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600 mb-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3 className="text-[18px] font-semibold text-[#111111]">Redline Ready!</h3>
            <p className="text-sm text-[#77736D] leading-relaxed max-w-xs">
              {isPdf
                ? "A Redline Summary DOCX has been generated with real Word tracked changes (w:del / w:ins). Open it in Microsoft Word or LibreOffice to accept or reject each change."
                : "The original DOCX has been surgically modified with native tracked changes. Open in Word to review and accept/reject revisions."}
            </p>

            <a
              href={downloadUrl}
              className="w-full bg-[#F47B20] hover:bg-[#D9651B] transition-colors text-white py-3 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2"
              download={downloadFilename}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download {downloadFilename}
            </a>

            <button
              onClick={() => {
                setEdits([]);
                setInstruction("");
                setDownloadUrl(null);
                setError(null);
              }}
              className="text-sm font-medium text-[#77736D] hover:text-[#111111] underline underline-offset-4"
            >
              Run another redline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
