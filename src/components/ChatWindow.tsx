"use client";

import React, { useState, useEffect, useRef } from "react";
import { getMessages } from "@/lib/ai/chat.actions";

export function ChatWindow({ 
  documentIds, 
  conversationId, 
  onConversationCreated,
  onCitationClick
}: { 
  documentIds: string[], 
  conversationId: string | null,
  onConversationCreated: (id: string) => void,
  onCitationClick?: (citation: any) => void
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(conversationId);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveConvId(conversationId);
    if (conversationId) {
      getMessages(conversationId).then(setMessages);
    } else {
      setMessages([]);
    }
  }, [conversationId, documentIds]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input, id: Date.now().toString() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const assistantId = "assistant-" + Date.now().toString();
      setMessages(prev => [...prev, { role: "assistant", content: "", id: assistantId, loading: true }]);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          documentIds,
          conversationId: activeConvId,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || "An unexpected error occurred.";
        setMessages(prev => prev.map(m => 
          m.id === assistantId ? { ...m, content: "[Error: " + errorMessage + "]", loading: false } : m
        ));
        return;
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let textBuffer = ""; // assistant's response text
      let readBuffer = ""; // raw incoming stream text

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          readBuffer += decoder.decode(value, { stream: true });
          const lines = readBuffer.split('\n');
          readBuffer = lines.pop() || "";
          
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              if (data.type === 'text') {
                textBuffer += data.content;
                setMessages(prev => prev.map(m => 
                  m.id === assistantId ? { ...m, content: textBuffer, loading: false } : m
                ));
              } else if (data.type === 'done') {
                if (!activeConvId && data.conversationId) {
                  setActiveConvId(data.conversationId);
                  onConversationCreated(data.conversationId);
                }
                setMessages(prev => prev.map(m => 
                  m.id === assistantId ? { ...m, citations: data.citations } : m
                ));
              } else if (data.type === 'error') {
                console.error("API error:", data.error);
                setMessages(prev => prev.map(m => 
                  m.id === assistantId ? { ...m, content: textBuffer + "\n\n[Error: " + data.error + "]", loading: false } : m
                ));
              }
            } catch (e) {
              console.warn("Failed to parse chunk line:", line);
            }
          }
        }
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        console.log("Chat aborted");
      } else {
        console.error("Chat error:", e);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      // Ensure the UI removes the "loading" state
      setMessages(prev => prev.map(m => 
        m.loading ? { ...m, loading: false, content: m.content + " [Aborted]" } : m
      ));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0b]">
      <div className="flex-1 overflow-y-auto p-8 pt-10 pb-32">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                 <SparklesIcon className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-200">Legal Intelligence Ready</h3>
              <p className="text-sm text-slate-500 mt-2">Ask questions based on the selected document(s).</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={msg.id || i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm border ${msg.role === 'user' ? 'bg-amber-500/10 border-amber-500/20 text-slate-200' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                   {msg.role === 'assistant' && (
                     <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                        <SparklesIcon className="w-4 h-4 text-amber-500" />
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">AI Analyst</span>
                     </div>
                   )}
                   
                   <div className="whitespace-pre-wrap text-sm leading-relaxed">
                     {msg.content || (msg.loading && <span className="animate-pulse">Retrieving facts...</span>)}
                   </div>

                   {msg.citations && msg.citations.length > 0 && (
                     <div className="mt-4 pt-3 border-t border-white/5">
                        <p className="text-[10px] font-mono text-slate-500 uppercase mb-2 flex items-center gap-2">Source References</p>
                        <div className="flex flex-wrap gap-2">
                           {msg.citations.map((c: any, idx: number) => (
                              <div 
                                key={idx} 
                                onClick={() => c.verified && onCitationClick && onCitationClick(c)}
                                className={`px-2 py-1 bg-white/5 border rounded text-[9px] uppercase font-bold tracking-wider group relative transition-all ${
                                  c.verified 
                                    ? 'border-emerald-500/30 text-emerald-400 cursor-pointer hover:bg-emerald-500/10 shadow-[0_0_8px_rgba(16,185,129,0.1)] hover:shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
                                    : 'border-rose-500/30 text-rose-400 opacity-80 cursor-not-allowed hover:bg-rose-500/10'
                                }`}
                              >
                                 <span className="flex items-center gap-1.5">
                                    {c.verified ? '✓ VERIFIED' : '⚠ UNVERIFIED'}
                                    {c.verified && c.pageStart !== null ? ` (PG ${c.pageStart})` : ''}
                                 </span>
                                 <div className="absolute bottom-full left-0 mb-2 w-72 p-3 bg-[#18181b] border border-white/10 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-xs font-serif normal-case font-normal text-slate-200">
                                    "{c.quote}"
                                    {!c.verified && (
                                       <p className="text-[10px] text-rose-400 normal-case font-sans mt-2 border-t border-rose-500/30 pt-1">
                                          Could not verify this exact quote in the document text.
                                       </p>
                                    )}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                   )}
                 </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/90 to-transparent">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative flex items-center">
          <input
            type="text"
            disabled={isLoading}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Interrogate document..."
            className="w-full bg-[#131316] border border-white/10 rounded-full pl-6 pr-24 py-4 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 shadow-lg disabled:opacity-50 transition-all placeholder-slate-600"
          />
          <div className="absolute right-2 flex items-center gap-2">
            {isLoading ? (
              <button
                type="button"
                onClick={handleStop}
                className="w-10 h-10 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 flex items-center justify-center transition-colors"
                title="Stop Analysis"
              >
                <StopIcon className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-[#0a0a0b] flex items-center justify-center disabled:opacity-50 disabled:hover:bg-amber-500 transition-colors shadow-[0_0_10px_rgba(245,158,11,0.3)]"
              >
                <ArrowUpIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function ArrowUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </svg>
  );
}

function StopIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
