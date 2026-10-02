"use client";

import React, { useState, useEffect, useRef } from "react";
import { getMessages } from "@/lib/ai/chat.actions";

export function ChatWindow({ 
  documentIds, 
  conversationId, 
  onConversationCreated,
  onCitationClick,
  documentsMap = {}
}: { 
  documentIds: string[], 
  conversationId: string | null,
  onConversationCreated: (id: string) => void,
  onCitationClick?: (citation: any) => void,
  documentsMap?: Record<string, string>
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useResearchMode, setUseResearchMode] = useState(false);
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

      const endpoint = useResearchMode ? "/api/research" : "/api/chat";
      const res = await fetch(endpoint, {
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
              
              if (data.type === 'init') {
                if (!activeConvId && data.conversationId) {
                  setActiveConvId(data.conversationId);
                  onConversationCreated(data.conversationId);
                }
              } else if (data.type === 'text') {
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
                  m.id === assistantId ? { 
                    ...m, 
                    content: data.text || textBuffer, 
                    citations: data.citations,
                    timeline: [...(m.timeline || []), { type: 'research_completed' }]
                  } : m
                ));
              } else if (data.type === 'error') {
                console.error("API error:", data.error);
                setMessages(prev => prev.map(m => 
                  m.id === assistantId ? { ...m, content: textBuffer + "\n\n[Error: " + data.error + "]", loading: false } : m
                ));
              } else if (['research_started', 'agent_thinking', 'tool_call', 'tool_result', 'research_round', 'research_completed', 'tool_limit_reached'].includes(data.type)) {
                // Agent event
                setMessages(prev => prev.map(m => 
                  m.id === assistantId ? { ...m, timeline: [...(m.timeline || []), data] } : m
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
    <div className="flex flex-col h-full bg-[#09090b] relative">
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
              <div className="w-10 h-10 bg-blue-600/10 border border-blue-500/20 rounded-full flex items-center justify-center mb-4">
                <SparklesIcon className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">Ask about this document</h3>
              <p className="text-xs text-zinc-500 mb-6 max-w-xs">Get instant answers, summaries, and insights from the document content.</p>
              <div className="space-y-2 w-full max-w-xs">
                {[
                  "Summarize this document",
                  "What are the key obligations?",
                  "What are the termination conditions?",
                  "Identify important dates and amounts",
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={async () => {
                      setInput(suggestion);
                      // Submit programmatically via synthetic event is unreliable,
                      // instead set and trigger via handleSubmit directly
                      const userMessage = { role: "user", content: suggestion, id: Date.now().toString() };
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
                          body: JSON.stringify({ message: suggestion, documentIds, conversationId: activeConvId }),
                          signal: abortController.signal,
                        });
                        if (!res.ok) {
                          const errorData = await res.json().catch(() => ({}));
                          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "[Error: " + (errorData.error || "unexpected error") + "]", loading: false } : m));
                          return;
                        }
                        const reader = res.body!.getReader();
                        const decoder = new TextDecoder();
                        let done = false;
                        let textBuffer = "";
                        let readBuffer = "";
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
                                if (data.type === 'text') { textBuffer += data.content; setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: textBuffer, loading: false } : m)); }
                                else if (data.type === 'done') { if (!activeConvId && data.conversationId) { setActiveConvId(data.conversationId); onConversationCreated(data.conversationId); } setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, citations: data.citations } : m)); }
                                else if (data.type === 'error') { setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: textBuffer + "\n\n[Error: " + data.error + "]", loading: false } : m)); }
                              } catch (e) {}
                            }
                          }
                        }
                      } catch (e: any) { if (e.name !== "AbortError") console.error(e); }
                      finally { setIsLoading(false); abortControllerRef.current = null; }
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-white/[0.08] bg-[#111115] hover:bg-[#18181c] hover:border-white/15 text-xs text-zinc-300 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={msg.id || i}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-zinc-800 border border-white/10 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-zinc-200">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* AI icon row */}
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                        <SparklesIcon className="w-3 h-3 text-blue-400" />
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">AI</span>
                    </div>
                    {/* Message body — no card border, just good prose */}
                    <div className="pl-7">
                      {/* Timeline Area (if agentic) */}
                      {msg.timeline && msg.timeline.length > 0 && (
                        <div className="mb-3 space-y-1.5 border-l-2 border-white/5 pl-3 py-1">
                          {msg.timeline.map((event: any, idx: number) => {
                            if (event.type === 'research_started') return <div key={idx} className="text-xs text-zinc-500 font-mono">Initializing research agent...</div>;
                            if (event.type === 'research_round') return <div key={idx} className="text-xs text-blue-500/80 font-mono mt-1">Starting Round {event.round}...</div>;
                            if (event.type === 'agent_thinking') return <div key={idx} className="text-[11px] text-zinc-500">Agent is contemplating next steps...</div>;
                            if (event.type === 'tool_call') {
                              return (
                                <div key={idx} className="text-[11px] text-emerald-500/90 flex items-center gap-1.5">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                  {event.tool === 'search_document' ? `Searching context for "${event.query}"...` : (event.tool === 'get_section' ? `Retrieving section ${event.chunkId}...` : `Invoking ${event.tool}...`)}
                                </div>
                              );
                            }
                            if (event.type === 'tool_result') {
                              return <div key={idx} className="text-[11px] text-zinc-400 pl-4">Found {event.resultCount} relevant matches.</div>;
                            }
                            if (event.type === 'tool_limit_reached') {
                              return (
                                <div key={idx} className="text-[11px] text-amber-400/90 flex items-center gap-1.5 mt-1">
                                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  {event.message || "Maximum tool calls reached. Generating answer from collected evidence."}
                                </div>
                              );
                            }
                            if (event.type === 'research_completed') return <div key={idx} className="text-xs text-zinc-500 font-mono mt-1">Research phase complete. Synthesizing answer...</div>;
                            return null;
                          })}
                        </div>
                      )}

                      <div className="text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap">
                        {msg.content || (msg.loading && (!msg.timeline || msg.timeline.length === 0) && (
                          <span className="flex items-center gap-2 text-zinc-500">
                            <span className="inline-flex gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </span>
                            Generating response…
                          </span>
                        ))}
                      </div>

                      {/* Citations */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {msg.citations.map((c: any, idx: number) => (
                            <button
                              key={idx}
                              disabled={!c.verified}
                              onClick={() => c.verified && onCitationClick && onCitationClick(c)}
                              className={`flex items-start gap-2 w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                                c.verified
                                  ? 'border-emerald-500/25 bg-emerald-500/[0.06] hover:bg-emerald-500/10 cursor-pointer'
                                  : 'border-amber-500/20 bg-amber-500/[0.05] cursor-not-allowed opacity-70'
                              }`}
                            >
                              <span className={`mt-0.5 shrink-0 text-[10px] font-bold ${c.verified ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {c.verified ? '✓' : '⚠'}
                              </span>
                              <div className="min-w-0">
                                <p className={`font-semibold ${c.verified ? 'text-emerald-300' : 'text-amber-300'}`}>
                                  {c.verified ? 'Verified source' : 'Unverified source'}
                                  {c.verified && c.pageStart != null ? ` · p. ${c.pageStart}` : ''}
                                </p>
                                {documentsMap[c.documentId] && (
                                  <p className="text-[10px] text-zinc-500 font-medium my-0.5">{documentsMap[c.documentId]}</p>
                                )}
                                {c.quote && <p className="text-zinc-400 truncate mt-0.5">&ldquo;{c.quote}&rdquo;</p>}
                                {!c.verified && <p className="text-amber-500/80 text-[10px] mt-0.5">Could not verify quote in document</p>}
                              </div>
                              {c.verified && (
                                <svg className="w-3.5 h-3.5 text-emerald-500/50 shrink-0 mt-0.5 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-3 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent">
        
        {/* Agentic Research Toggle */}
        <div className="flex items-center justify-end mb-2 mr-1">
          <label className="flex items-center gap-2 cursor-pointer group">
            <span className={`text-[10px] font-semibold tracking-wide uppercase transition-colors ${useResearchMode ? 'text-blue-400' : 'text-zinc-600 group-hover:text-zinc-400'}`}>Deep Research Mode</span>
            <div className={`relative w-8 h-4 rounded-full transition-colors ${useResearchMode ? 'bg-blue-600/50 border border-blue-500/50' : 'bg-zinc-800 border border-white/10'}`}>
               <div className={`absolute top-[1px] w-3 h-3 rounded-full transition-transform ${useResearchMode ? 'bg-blue-400 translate-x-[15px]' : 'bg-zinc-500 translate-x-[2px]'}`}></div>
            </div>
            <input 
              type="checkbox" 
              className="sr-only" 
              checked={useResearchMode} 
              onChange={(e) => setUseResearchMode(e.target.checked)} 
              disabled={isLoading}
            />
          </label>
        </div>

        <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
          <textarea
            disabled={isLoading}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); } }}
            placeholder="Ask about this document…"
            rows={1}
            className="flex-1 bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 transition-all resize-none placeholder-zinc-600 overflow-hidden"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          {isLoading ? (
            <button
              type="button"
              onClick={handleStop}
              className="shrink-0 w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors border border-white/10"
              aria-label="Stop generation"
            >
              <StopIcon className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="shrink-0 w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm"
              aria-label="Send message"
            >
              <ArrowUpIcon className="w-4 h-4" />
            </button>
          )}
        </form>
        <p className="text-[10px] text-zinc-600 mt-2 text-center">Responses grounded in document content · Shift+Enter for new line</p>
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
