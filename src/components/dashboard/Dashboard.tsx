"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UploadButton } from "@/components/UploadButton";
import { DocumentDeleteButton } from "@/components/DocumentDeleteButton";

export function Dashboard({ initialDocuments, initialConversations }: { initialDocuments: any[], initialConversations: any[] }) {
  const router = useRouter();
  const [documents] = useState(initialDocuments);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredDocs = documents.filter(doc => {
    if (search && !doc.filename.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter !== "all" && doc.fileType?.toLowerCase() !== filter) return false;
    return true;
  });

  const toggleSelect = (id: string, isReady: boolean) => {
    if (!isReady) return; // Cannot select processing/failed documents
    const newlySelected = new Set(selectedIds);
    if (newlySelected.has(id)) {
      newlySelected.delete(id);
    } else {
      newlySelected.add(id);
    }
    setSelectedIds(newlySelected);
  };

  const startMultiChat = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    router.push(`/chat/new?docs=${ids.join(",")}`);
  };

  return (
    <div className="flex-1 bg-[#09090b] text-zinc-300 font-sans tracking-tight h-full overflow-y-auto custom-scrollbar">
      <main className="max-w-7xl mx-auto pt-10 pb-16 px-8">
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-white mb-2">Document Intelligence</h2>
          <p className="text-sm text-zinc-400">Analyze, compare and investigate your legal documents with grounded AI.</p>
        </div>

        {/* Compact Statistics Row */}
        <div className="flex gap-4 mb-10">
          <StatCard label="Total Documents" value={documents.length} />
          <StatCard label="Conversations" value={initialConversations.length} />
          <StatCard label="Indexed Documents" value={documents.filter(d => d.indexingStatus === 'completed').length} />
        </div>

        <div className="bg-[#18181b] border border-white/10 rounded-xl overflow-hidden shadow-sm">
          {/* Controls */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#18181b]">
             <h3 className="font-semibold text-zinc-100">Your Documents</h3>
             <div className="flex items-center gap-3">
               <div className="relative">
                 <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                 <input 
                   type="text" 
                   placeholder="Search documents..."
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   className="bg-[#09090b] border border-white/10 rounded-md pl-9 pr-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 w-64 transition-colors"
                 />
               </div>
               <div className="flex bg-[#09090b] border border-white/10 rounded-md p-0.5">
                 {['all', 'pdf', 'docx', 'txt'].map(type => (
                   <button 
                     key={type} 
                     onClick={() => setFilter(type)}
                     className={`px-3 py-1 text-xs font-medium rounded uppercase transition-colors ${filter === type ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                   >
                     {type}
                   </button>
                 ))}
               </div>
             </div>
          </div>

          {/* Table */}
          {filteredDocs.length === 0 ? (
             <div className="p-16 text-center">
                <p className="text-zinc-200 font-medium mb-2">No documents yet</p>
                <p className="text-sm text-zinc-500 mb-6">Upload a PDF, DOCX or TXT file to begin analyzing your legal documents.</p>
                <UploadButton className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                  Browse files
                </UploadButton>
             </div>
          ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-white/5 text-zinc-500">
                      <th className="font-medium p-4 pl-4 w-8"></th>
                      <th className="font-medium p-4">Name</th>
                      <th className="font-medium p-4">Type</th>
                      <th className="font-medium p-4">Size</th>
                      <th className="font-medium p-4">Added</th>
                      <th className="font-medium p-4">Status</th>
                      <th className="font-medium p-4 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map(doc => (
                       <DocumentRow 
                         key={doc.id} 
                         doc={doc} 
                         conversationsCount={initialConversations.filter(c => c.conversationDocuments.some((cd: any) => cd.documentId === doc.id)).length}
                         selected={selectedIds.has(doc.id)} 
                         onToggle={() => toggleSelect(doc.id, doc.processingStatus === 'completed' && doc.indexingStatus === 'completed')}
                       />
                    ))}
                  </tbody>
               </table>
             </div>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#27272a] text-zinc-200 border border-white/10 shadow-2xl rounded-xl px-6 py-4 flex items-center justify-between gap-8 z-50 animate-in slide-in-from-bottom-5">
            <div>
              <p className="text-sm font-semibold text-white">{selectedIds.size} document{selectedIds.size !== 1 ? 's' : ''} selected</p>
              <p className="text-xs text-zinc-400">Ready for bulk actions</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedIds(new Set())} className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 transition-colors">
                Clear
              </button>
              <button onClick={startMultiChat} className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 py-2 rounded-md shadow-sm transition-colors">
                Start Multi-Document Chat
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="flex-1 bg-[#18181b] p-4 rounded-lg border border-white/10 flex items-center justify-between">
      <span className="text-sm font-medium text-zinc-400">{label}</span>
      <span className="text-lg font-semibold text-zinc-100">{value}</span>
    </div>
  );
}

// Converts raw MIME type or stored type string to a short friendly label
function friendlyType(fileType: string | null | undefined): string {
  if (!fileType) return 'TXT';
  const ft = fileType.toLowerCase();
  if (ft.includes('pdf')) return 'PDF';
  if (ft.includes('docx') || ft.includes('wordprocessingml') || ft.includes('officedoc')) return 'DOCX';
  if (ft.includes('txt') || ft.includes('plain')) return 'TXT';
  return ft.split('/').pop()?.toUpperCase() ?? 'TXT';
}

function DocumentRow({ doc, conversationsCount, selected, onToggle }: { doc: any, conversationsCount: number, selected: boolean, onToggle: () => void }) {
  const isReady = doc.processingStatus === 'completed' && doc.indexingStatus === 'completed';
  const isFailed = doc.processingStatus === 'failed' || doc.indexingStatus === 'failed';
  const ft = friendlyType(doc.fileType);
  const ftColor = ft === 'PDF' ? 'bg-red-500/10 text-red-400' : ft === 'DOCX' ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-500/10 text-zinc-400';

  return (
    <tr className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors group ${selected ? 'bg-blue-500/5' : ''}`}>
      <td className="p-4 pl-4">
         <button 
           disabled={!isReady} 
           onClick={onToggle}
           className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
             !isReady ? "border-white/10 opacity-50 cursor-not-allowed" :
             selected ? "bg-blue-600 border-blue-600 text-white" : "border-white/20 hover:border-blue-400 group-hover:border-white/40"
           }`}
         >
           {selected && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
         </button>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          {/* Clean icon with short type label only */}
          <div className={`w-9 h-9 rounded-md shrink-0 flex items-center justify-center font-bold text-[10px] uppercase tracking-wider ${ftColor}`}>
            {ft}
          </div>
          <Link href={`/documents/${doc.id}`} className="min-w-0 flex-1">
            <p className="font-medium text-zinc-200 truncate max-w-[260px] group-hover:text-blue-400 transition-colors" title={doc.filename}>{doc.filename}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{conversationsCount} conversation{conversationsCount !== 1 ? 's' : ''}</p>
          </Link>
        </div>
      </td>
      <td className="p-4">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${ftColor}`}>{ft}</span>
      </td>
      <td className="p-4 text-zinc-400 text-xs font-mono">{(doc.fileSize / 1024).toFixed(1)} KB</td>
      <td className="p-4 text-zinc-400 text-xs">{new Date(doc.createdAt).toLocaleDateString()}</td>
      <td className="p-4">
        {!isReady && !isFailed ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-medium rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> Processing
          </span>
        ) : isFailed ? (
          <span className="inline-flex items-center px-2 py-1 bg-red-500/10 text-red-400 text-[10px] font-medium rounded">Failed</span>
        ) : (
          <span className="inline-flex items-center px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-medium rounded">Ready</span>
        )}
      </td>
      <td className="p-4 pr-6 text-right">
        <div className="flex items-center justify-end gap-2">
          {isReady && (
             <Link href={`/documents/${doc.id}`} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded text-xs font-medium transition-colors">
               Open
             </Link>
          )}
          <DocumentDeleteButton documentId={doc.id} />
        </div>
      </td>
    </tr>
  );
}
