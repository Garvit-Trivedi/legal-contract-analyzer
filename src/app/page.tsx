import React from "react";
import { getDocuments } from "@/lib/document/actions";
import { UploadButton } from "@/components/UploadButton";
import { DocumentDeleteButton } from "@/components/DocumentDeleteButton";

export default async function Home() {
  const documents = await getDocuments();

  const completedDocs = documents.filter(d => d.processingStatus === "completed");
  const failedDocs = documents.filter(d => d.processingStatus === "failed");
  const processingDocs = documents.filter(d => d.processingStatus === "processing");

  return (
    <div className="flex h-screen w-full bg-[#0a0a0b] text-slate-300 font-sans tracking-tight overflow-hidden selection:bg-amber-500/30">
      {/* Sidebar */}
      <aside className="w-80 border-r border-white/5 bg-[#0f0f11] flex flex-col h-full flex-shrink-0 relative">
        {/* Top Branding */}
        <div className="p-6 border-b border-white/5 bg-gradient-to-b from-[#18181b] to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2h h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
            <h1 className="text-xs font-bold text-amber-500 tracking-[0.2em] uppercase">
              Classified System
            </h1>
          </div>
          <h2 className="text-xl font-medium text-white">
            Legal Intelligence
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            NODE: SECURE-WORKSPACE-01
          </p>
        </div>

        <div className="p-5 border-b border-white/5">
          <UploadButton className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300">
            <UploadIcon className="w-4 h-4 text-emerald-400" />
            Ingest Document
          </UploadButton>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 custom-scrollbar">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
              <FileTextIcon className="w-8 h-8 text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-400">Database Empty</p>
              <p className="text-xs text-slate-600 mt-1">Awaiting contract ingestion.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* COMPLETED */}
              {completedDocs.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                    <CheckIcon className="w-3 h-3" /> Analyzed Archives
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {completedDocs.map(doc => <DocItem key={doc.id} doc={doc} status="success" />)}
                  </ul>
                </div>
              )}

              {/* PROCESSING */}
              {processingDocs.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></span> Active Processing
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {processingDocs.map(doc => <DocItem key={doc.id} doc={doc} status="processing" />)}
                  </ul>
                </div>
              )}

              {/* FAILED */}
              {failedDocs.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold text-rose-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span> Corrupted / Failed
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {failedDocs.map(doc => <DocItem key={doc.id} doc={doc} status="error" />)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-[#0a0a0b] relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        
        {/* Header */}
        <header className="h-16 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md flex items-center justify-between px-8 flex-shrink-0 relative z-10">
          <div>
            <h2 className="text-sm font-medium text-slate-200">
              Analysis Terminal
            </h2>
          </div>
          <div className="flex items-center gap-3 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-slate-600"></div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Awaiting Selection
            </span>
          </div>
        </header>

        {/* Empty Workspace */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto relative z-10">
          <div className="max-w-2xl w-full bg-[#131316] rounded-2xl border border-white/5 p-12 text-center shadow-2xl relative overflow-hidden">
            {/* Ambient Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-[100px] rounded-full"></div>
            
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-white/10 relative z-10">
              <DocumentIcon className="w-8 h-8 text-amber-500/80" />
            </div>

            <h3 className="text-2xl font-light text-white mb-2 relative z-10">
              Initialize Architecture
            </h3>
            <p className="text-sm text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed relative z-10">
              Authorized personnel only. Upload a classified contract (PDF, DOCX) to extract, fragment, and securely index the text vectors.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl mx-auto mb-10 text-left relative z-10">
              <FeatureItem icon={<FileSearchIcon />} text="Deterministic Extraction" />
              <FeatureItem icon={<MessageIcon />} text="Secure Indexing" />
              <FeatureItem icon={<CheckIcon />} text="Verified Citation Engine" />
              <FeatureItem icon={<SearchIcon />} text="Deep Insight Retrieval" />
            </div>

            <div className="relative z-10">
              <UploadButton className="inline-flex items-center justify-center gap-3 bg-amber-500/10 hover:bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] border border-amber-500/30 text-amber-400 px-8 py-3 rounded-xl text-sm font-medium transition-all duration-300">
                <UploadIcon className="w-4 h-4" />
                Select Classified File
              </UploadButton>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function DocItem({ doc, status }: { doc: any, status: 'success' | 'processing' | 'error' }) {
  const styles = {
    success: "bg-white/[0.02] border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/5",
    processing: "bg-white/[0.02] border-amber-500/20 hover:border-amber-500/40 animate-pulse",
    error: "bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40"
  };

  return (
    <li className={`p-4 rounded-xl border transition-all duration-300 text-left group ${styles[status]}`}>
      <div className="flex justify-between items-start gap-2">
        <p className="text-sm font-medium truncate text-slate-200 group-hover:text-white transition-colors" title={doc.filename}>
          {doc.filename}
        </p>
        <DocumentDeleteButton documentId={doc.id} />
      </div>
      <div className="flex justify-between items-center mt-3">
        <span className="text-[10px] font-mono text-slate-500 capitalize">{doc.fileType || "doc"}</span>
        <span className="text-[10px] font-mono text-slate-600">{(doc.fileSize / 1024).toFixed(1)} KB</span>
      </div>
      {status === 'error' && (
        <div className="mt-3 pt-3 border-t border-rose-500/20">
          <p className="text-[10px] text-rose-400 font-mono break-words leading-relaxed">{doc.processingError}</p>
        </div>
      )}
    </li>
  );
}

// Icons
function UploadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}
function FileTextIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}
function DocumentIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function FileSearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <circle cx="10" cy="13" r="2" />
      <line x1="11.4" y1="14.4" x2="14" y2="17" />
    </svg>
  );
}
function MessageIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
    </svg>
  );
}
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
      <div className="text-amber-500/80 flex items-center justify-center w-5 h-5 [&>svg]:w-5 [&>svg]:h-5">
        {icon}
      </div>
      <span className="text-sm text-slate-300">{text}</span>
    </div>
  );
}
