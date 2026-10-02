"use client";

import React, { useState } from "react";
import Link from "next/link";
import { UploadButton } from "@/components/UploadButton";
import { DocumentDeleteButton } from "@/components/DocumentDeleteButton";

export function Dashboard({ initialDocuments, initialConversations }: { initialDocuments: any[], initialConversations: any[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filteredDocs = documents.filter(doc => {
    if (search && !doc.filename.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter !== "all" && doc.fileType?.toLowerCase() !== filter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-slate-300 font-sans tracking-tight">
      <header className="h-16 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md flex items-center justify-between px-8 absolute top-0 w-full z-10">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center">
            <span className="text-black font-bold text-xs uppercase">LC</span>
          </div>
          <h1 className="text-sm font-semibold text-white tracking-widest uppercase">
            Legal Contract Analyzer
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/compare" className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 transition-colors">
            Compare Documents
          </Link>
          <Link href="/history" className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 transition-colors">
            Chat History
          </Link>
          <div className="w-px h-4 bg-white/10 mx-2"></div>
          <UploadButton className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-1.5 rounded text-xs font-bold transition-colors shadow-lg">
            Upload Document
          </UploadButton>
        </div>
      </header>

      <main className="max-w-6xl mx-auto pt-28 pb-12 px-8">
        {/* Metric Summary */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="bg-[#131316] p-6 rounded-xl border border-white/5 shadow-sm">
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Documents Analyzed</h3>
            <p className="text-3xl font-light text-white">{documents.length}</p>
          </div>
          <div className="bg-[#131316] p-6 rounded-xl border border-white/5 shadow-sm">
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Total Conversations</h3>
            <p className="text-3xl font-light text-white">{initialConversations.length}</p>
          </div>
          <div className="bg-[#131316] p-6 rounded-xl border border-white/5 shadow-sm">
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">System Status</h3>
            <p className="text-3xl font-light text-emerald-400">Online</p>
          </div>
        </div>

        {/* Dashboard Title & Filters */}
        <div className="flex items-end justify-between mb-6 border-b border-white/5 pb-4">
           <div>
             <h2 className="text-xl font-medium text-white mb-2">Document Library</h2>
             <p className="text-sm text-slate-400">All intelligent legal contracts actively indexed in the system.</p>
           </div>
           <div className="flex items-center gap-4">
             <input 
               type="text" 
               placeholder="Search filename..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="bg-[#131316] border border-white/10 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500/50 w-64 transition-all"
             />
             <div className="flex bg-[#131316] border border-white/10 rounded-md p-1">
               {['all', 'pdf', 'docx', 'txt'].map(type => (
                 <button 
                   key={type} 
                   onClick={() => setFilter(type)}
                   className={`px-3 py-1 text-xs font-medium rounded transition-colors uppercase ${filter === type ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                   {type}
                 </button>
               ))}
             </div>
           </div>
        </div>

        {/* Document Grid */}
        {filteredDocs.length === 0 ? (
           <div className="flex flex-col items-center justify-center p-20 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                 <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <p className="text-lg font-medium text-white mb-2">No documents found</p>
              <p className="text-sm text-slate-400 mb-6">Upload a PDF, DOCX, or TXT document to begin.</p>
              <UploadButton className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-2 rounded-full text-sm font-bold transition-colors shadow-lg">
                Upload Document
              </UploadButton>
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map(doc => (
                 <DocumentCard key={doc.id} doc={doc} />
              ))}
           </div>
        )}
      </main>
    </div>
  );
}

function DocumentCard({ doc }: { doc: any }) {
  const isReady = doc.processingStatus === 'completed' && doc.indexingStatus === 'completed';
  const isFailed = doc.processingStatus === 'failed' || doc.indexingStatus === 'failed';
  
  return (
    <div className="bg-[#131316] border border-white/5 rounded-xl p-5 hover:border-amber-500/30 transition-all group flex flex-col">
       <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${
               doc.fileType === 'pdf' ? 'bg-rose-500/10 text-rose-500' :
               doc.fileType === 'docx' ? 'bg-blue-500/10 text-blue-500' :
               'bg-slate-500/10 text-slate-400'
             }`}>
                {doc.fileType?.toUpperCase() || 'TXT'}
             </div>
             <div>
               <h4 className="font-medium text-slate-200 text-sm truncate w-40 group-hover:text-amber-400 transition-colors" title={doc.filename}>{doc.filename}</h4>
               <p className="text-[10px] text-slate-500 font-mono tracking-wider">{(doc.fileSize / 1024).toFixed(1)} KB</p>
             </div>
          </div>
          <div>
            <DocumentDeleteButton documentId={doc.id} />
          </div>
       </div>
       
       <div className="mb-6 flex-1">
          <p className="text-xs text-slate-400 flex items-center gap-2 mb-2">
             <span className="w-2 h-2 rounded-full bg-slate-700"></span> Added: {new Date(doc.createdAt).toLocaleDateString()}
          </p>
          <div className="flex items-center gap-2">
             {!isReady && !isFailed ? (
               <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase rounded flex items-center gap-1">
                 <span className="w-1 h-1 rounded-full bg-amber-500 animate-ping mr-1"></span> Processing...
               </span>
             ) : isFailed ? (
               <span className="px-2 py-1 bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase rounded">Status: Failed</span>
             ) : (
               <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase rounded flex items-center gap-1">
                 ✓ Ready
               </span>
             )}
          </div>
       </div>

       <Link 
         href={`/documents/${doc.id}`} 
         className={`w-full py-2 rounded text-center text-xs font-bold uppercase tracking-widest transition-colors ${
           isReady ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-white/5 text-slate-500 cursor-not-allowed opacity-50'
         }`}
         onClick={e => (!isReady) && e.preventDefault()}
       >
         Open Workspace
       </Link>
    </div>
  );
}
