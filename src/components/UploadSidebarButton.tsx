"use client";

import React from "react";
import { UploadButton } from "./UploadButton";

export function UploadSidebarButton() {
  return (
    <UploadButton className="w-full bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2">
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
      <span>Upload Document</span>
    </UploadButton>
  );
}
