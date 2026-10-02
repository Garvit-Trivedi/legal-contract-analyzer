"use client";

import React, { useEffect, useState, useRef } from "react";
import { getDocumentText } from "@/lib/document/actions";

export function DocumentViewer({ 
  documentId, 
  characterStart, 
  characterEnd,
  onClose
}: { 
  documentId: string; 
  characterStart: number | null;
  characterEnd: number | null;
  onClose: () => void;
}) {
  const [text, setText] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (documentId) {
      getDocumentText(documentId).then(setText);
    }
  }, [documentId]);
  
  useEffect(() => {
    if (text && characterStart !== null && characterEnd !== null && contentRef.current) {
       const highlightEl = contentRef.current.querySelector('.citation-highlight');
       if (highlightEl) {
         highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
       }
    }
  }, [text, characterStart, characterEnd]);

  if (!text) {
    return <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs animate-pulse bg-[#0f0f11]">RETRIEVING SOURCE DOCUMENT...</div>;
  }
  
  let content: React.ReactNode = text;
  
  if (characterStart !== null && characterEnd !== null && characterStart >= 0 && characterEnd <= text.length) {
     const before = text.substring(0, characterStart);
     const highlight = text.substring(characterStart, characterEnd);
     const after = text.substring(characterEnd);
     
     content = (
       <>
         {before}
         <mark className="citation-highlight bg-emerald-500/40 text-white rounded px-1 shadow-[0_0_10px_rgba(16,185,129,0.3)]">{highlight}</mark>
         {after}
       </>
     );
  }

  return (
    <div className="h-full w-full bg-[#0f0f11] flex flex-col font-sans border-l border-white/5 relative shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
       <header className="h-16 border-b border-white/5 bg-[#131316]/80 backdrop-blur-md flex items-center justify-between px-6 flex-shrink-0">
          <h2 className="text-sm font-medium text-emerald-500 tracking-[0.1em] uppercase flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Source Verification
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
       </header>
       <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
         <div 
           ref={contentRef}
           className="text-sm text-slate-300 leading-relaxed max-w-3xl whitespace-pre-wrap font-serif selection:bg-emerald-500/30"
         >
           {content}
         </div>
       </div>
    </div>
  );
}
