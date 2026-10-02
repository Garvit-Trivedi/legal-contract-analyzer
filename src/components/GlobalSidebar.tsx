"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function GlobalSidebar() {
  const pathname = usePathname();
  
  // Hide global sidebar inside the document workspace
  if (pathname?.startsWith("/documents/")) {
    return null;
  }

  return (
    <aside className="w-64 flex-shrink-0 border-r border-white/10 bg-[#09090b] flex flex-col h-full z-30">
      <div className="p-4 flex items-center gap-3 border-b border-white/10 shrink-0 h-14">
        <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <span className="text-sm font-semibold text-zinc-100 tracking-tight">Legal Analyzer</span>
      </div>

      <div className="p-4 flex flex-col gap-1 flex-1 overflow-y-auto">

        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest pl-3 mb-2 mt-2">Workspace</p>
        <SidebarLink href="/" icon="dashboard" label="Dashboard" active={pathname === "/"} />
        
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest pl-3 mb-2 mt-6">Intelligence</p>
        <SidebarLink href="/compare" icon="compare" label="Compare Documents" active={pathname === "/compare"} />
        <SidebarLink href="/history" icon="history" label="Chat History" active={pathname === "/history"} />
        
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest pl-3 mb-2 mt-6">System</p>
        <SidebarLink href="#" icon="settings" label="Settings" active={false} />
      </div>

      <div className="p-4 border-t border-white/10 shrink-0">
         <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold uppercase border border-blue-500/30">
               GC
            </div>
            <div>
               <p className="text-sm font-medium text-zinc-200">General Counsel</p>
               <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
               </p>
            </div>
         </div>
      </div>
    </aside>
  );
}

function SidebarLink({ href, icon, label, active }: { href: string, icon: string, label: string, active: boolean }) {
  return (
    <Link 
       href={href}
       className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${active ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200'}`}
    >
       {icon === 'dashboard' && <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
       {icon === 'document' && <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
       {icon === 'compare' && <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
       {icon === 'history' && <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
       {icon === 'settings' && <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
       <span>{label}</span>
    </Link>
  );
}
