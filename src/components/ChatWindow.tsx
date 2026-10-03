"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { getMessages } from "@/lib/ai/chat.actions";

// ─── Render AI message content, highlighting <quote>…</quote> sections ─────────
function renderMessageContent(content: string): React.ReactNode {
  if (!content) return null;
  // Split on <quote>…</quote> boundaries
  const parts = content.split(/(<quote>[\s\S]*?<\/quote>)/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^<quote>([\s\S]*?)<\/quote>$/);
        if (match) {
          return (
            <mark
              key={i}
              className="inline rounded-[4px] px-1.5 py-0.5 mx-0.5 font-medium"
              style={{
                background: "rgba(251,191,36,0.22)",
                borderBottom: "2px solid rgba(245,158,11,0.7)",
                color: "#78350F",
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                fontSize: "0.92em",
                lineHeight: 1.6,
              }}
            >
              {/* Tiny quote-pin icon */}
              <svg
                style={{ display: "inline", verticalAlign: "middle", marginRight: "3px", marginBottom: "2px", flexShrink: 0 }}
                width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
              </svg>
              {match[1]}
            </mark>
          );
        }
        // Plain text — preserve whitespace/newlines
        return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>;
      })}
    </>
  );
}

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
    <div className="flex flex-col h-full bg-[#FFFFFF] relative">
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-28 space-y-5 bg-[#FFFFFF]">
          {messages.length === 0 ? (
            <div className="flex flex-col items-start justify-start h-full py-4 mt-2">
              <div className="w-12 h-12 bg-[#FFF0E3] rounded-full flex flex-shrink-0 items-center justify-center mb-5 border border-[#F47B20]/10">
                <ShieldCheckIcon className="w-6 h-6 text-[#F47B20]" />
              </div>
              <h3 className="text-[24px] text-[#111111] mb-3 leading-tight max-w-[280px]" style={{ fontFamily: "var(--font-dm-serif), serif" }}>
                Contract Clause & Evidence Inquiry
              </h3>
              <p className="text-[13px] text-[#77736D] mb-8 max-w-[340px] leading-relaxed">
                Every assertion is cross-verified against indexed document clauses with zero-trust token matching. Click verified citations to inspect exact source clauses.
              </p>
              
              <div className="w-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-3 bg-[#F47B20] rounded-sm"></div>
                  <p className="text-[11px] font-bold text-[#77736D] uppercase tracking-wider">Suggested Inquiries</p>
                </div>
                <div className="space-y-3">
                  {[
                    "What is the liability cap and financial limit?",
                    "What are the termination provisions and notice periods?",
                    "What are the governing law and jurisdiction terms?",
                  ].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={async () => {
                        setInput(suggestion);
                        const userMessage = { role: "user", content: suggestion, id: Date.now().toString() };
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
                                  if (data.type === 'init' && !activeConvId && data.conversationId) { setActiveConvId(data.conversationId); onConversationCreated(data.conversationId); }
                                  else if (data.type === 'text') { textBuffer += data.content; setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: textBuffer, loading: false } : m)); }
                                  else if (data.type === 'done') { if (!activeConvId && data.conversationId) { setActiveConvId(data.conversationId); onConversationCreated(data.conversationId); } setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: data.text || textBuffer, citations: data.citations, timeline: [...(m.timeline || []), { type: 'research_completed' }] } : m)); }
                                  else if (data.type === 'error') { setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: textBuffer + "\n\n[Error: " + data.error + "]", loading: false } : m)); }
                                  else if (['research_started', 'agent_thinking', 'tool_call', 'tool_result', 'research_round', 'research_completed', 'tool_limit_reached'].includes(data.type)) { setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, timeline: [...(m.timeline || []), data] } : m)); }
                                } catch (e) {}
                              }
                            }
                          }
                        } catch (e: any) { if (e.name !== "AbortError") console.error(e); }
                        finally { setIsLoading(false); abortControllerRef.current = null; }
                      }}
                      className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-[#E8E4DE] bg-[#FFFFFF] hover:border-[#F47B20]/40 text-[13px] text-[#111111] transition-all group shadow-sm text-left font-medium"
                    >
                      <span className="leading-snug pr-4">{suggestion}</span>
                      <svg className="w-4 h-4 text-[#F47B20] transition-transform group-hover:translate-x-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={msg.id || i}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end mt-2">
                    <div className="max-w-[85%] bg-[#F47B20] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-[14px] leading-snug shadow-sm">
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
                    <div className="pl-8 mt-1">
                      {/* Timeline Area (if agentic) */}
                      {msg.timeline && msg.timeline.length > 0 && (
                        <div className="mb-3 space-y-1.5 border-l-2 border-[#E8E4DE] pl-3 py-1">
                          {msg.timeline.map((event: any, idx: number) => {
                            if (event.type === 'research_started') return <div key={idx} className="text-xs text-[#77736D] font-mono">Initializing research agent...</div>;
                            if (event.type === 'research_round') return <div key={idx} className="text-xs text-[#1677FF] font-mono mt-1">Starting Round {event.round}...</div>;
                            if (event.type === 'agent_thinking') return <div key={idx} className="text-[11px] text-[#77736D]">Agent is contemplating next steps...</div>;
                            if (event.type === 'tool_call') {
                              return (
                                <div key={idx} className="text-[11px] text-[#16A34A] flex items-center gap-1.5">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                  {event.tool === 'search_document' ? `Searching context for "${event.query}"...` : (event.tool === 'get_section' ? `Retrieving section ${event.chunkId}...` : `Invoking ${event.tool}...`)}
                                </div>
                              );
                            }
                            if (event.type === 'tool_result') {
                              return <div key={idx} className="text-[11px] text-[#77736D] pl-4">Found {event.resultCount} relevant matches.</div>;
                            }
                            if (event.type === 'tool_limit_reached') {
                              return (
                                <div key={idx} className="text-[11px] text-[#F47B20] flex items-center gap-1.5 mt-1">
                                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  {event.message || "Maximum tool calls reached. Generating answer from collected evidence."}
                                </div>
                              );
                            }
                            if (event.type === 'research_completed') return <div key={idx} className="text-xs text-[#77736D] font-mono mt-1">Research phase complete. Synthesizing answer...</div>;
                            return null;
                          })}
                        </div>
                      )}

                      <div
                        className="text-[14px] leading-relaxed text-[#1A1A1A]"
                        style={{
                          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                          fontWeight: 400,
                          letterSpacing: "-0.01em",
                          lineHeight: 1.75,
                        }}
                      >
                        {msg.content
                          ? renderMessageContent(msg.content)
                          : (msg.loading && (!msg.timeline || msg.timeline.length === 0) && (
                            <span className="flex items-center gap-2 text-zinc-500">
                              <span className="inline-flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1677FF] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1677FF] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1677FF] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                              </span>
                              Generating response…
                            </span>
                          ))
                        }
                      </div>

                      {/* Citations */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {msg.citations.map((c: any, idx: number) => (
                            <button
                              key={idx}
                              disabled={!c.verified}
                              onClick={() => c.verified && onCitationClick && onCitationClick(c)}
                              className="flex items-start gap-2.5 w-full text-left text-[13px] transition-all rounded-xl border"
                              style={c.verified ? {
                                background: "linear-gradient(135deg, #052E16 0%, #064E26 100%)",
                                borderColor: "#16A34A",
                                padding: "10px 14px",
                                cursor: "pointer",
                                boxShadow: "0 1px 8px rgba(22,163,74,0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
                              } : {
                                background: "#FFF7ED",
                                borderColor: "rgba(244,123,32,0.3)",
                                padding: "10px 14px",
                                cursor: "not-allowed",
                                opacity: 0.82,
                              }}
                            >
                              {/* Badge icon */}
                              <span
                                className="shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black"
                                style={c.verified ? {
                                  background: "#16A34A",
                                  color: "#FFFFFF",
                                  boxShadow: "0 0 0 2px rgba(22,163,74,0.35)",
                                } : {
                                  background: "#FED7AA",
                                  color: "#C2410C",
                                }}
                              >
                                {c.verified ? '✓' : '⚠'}
                              </span>

                              <div className="min-w-0 flex-1">
                                {/* Header row */}
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p
                                    className="font-bold text-[12px] tracking-wide uppercase"
                                    style={c.verified ? { color: "#4ADE80" } : { color: "#92400E" }}
                                  >
                                    {c.verified ? 'Verified Source' : 'Unverified Source'}
                                  </p>
                                  {c.verified && c.pageStart != null && (
                                    <span
                                      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                      style={{ background: "rgba(74,222,128,0.15)", color: "#86EFAC" }}
                                    >
                                      p.{c.pageStart}
                                    </span>
                                  )}
                                </div>

                                {/* Document name */}
                                {documentsMap[c.documentId] && (
                                  <p
                                    className="text-[10px] font-medium mb-1"
                                    style={{ color: c.verified ? "#6EE7B7" : "#A16207" }}
                                  >
                                    {documentsMap[c.documentId]}
                                  </p>
                                )}

                                {/* Quote text */}
                                {c.quote && (
                                  <p
                                    className="text-[12px] leading-relaxed mt-1 truncate"
                                    style={c.verified ? {
                                      color: "#D1FAE5",
                                      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                                      background: "rgba(255,255,255,0.07)",
                                      borderLeft: "3px solid #16A34A",
                                      paddingLeft: "8px",
                                      paddingTop: "3px",
                                      paddingBottom: "3px",
                                      borderRadius: "0 4px 4px 0",
                                    } : {
                                      color: "#92400E",
                                    }}
                                  >
                                    &ldquo;{c.quote}&rdquo;
                                  </p>
                                )}

                                {/* Unverified warning */}
                                {!c.verified && (
                                  <p className="text-[#F47B20]/80 text-[10px] mt-1 font-medium">
                                    Could not verify quote in document
                                  </p>
                                )}
                              </div>

                              {/* Jump arrow */}
                              {c.verified && (
                                <svg
                                  className="w-4 h-4 shrink-0 mt-0.5 ml-auto"
                                  style={{ color: "#4ADE80" }}
                                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
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
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-4 bg-gradient-to-t from-[#FFFFFF] via-[#FFFFFF] to-transparent">
        
        {/* Agentic Research Toggle */}
        <div className="flex items-center justify-end mb-3">
          <label className="flex items-center gap-2.5 cursor-pointer group hover:bg-[#F8F6F2] py-1 px-2 rounded-lg transition-colors">
            <svg className={`w-3.5 h-3.5 ${useResearchMode ? 'text-[#F47B20]' : 'text-[#77736D]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            <span className={`text-[11px] font-bold tracking-wide uppercase transition-colors ${useResearchMode ? 'text-[#F47B20]' : 'text-[#77736D] group-hover:text-[#5E5A54]'}`}>Deep Research Mode</span>
            <div className={`relative w-9 h-5 rounded-full transition-colors ${useResearchMode ? 'bg-[#F47B20]' : 'bg-[#E8E4DE]'}`}>
               <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${useResearchMode ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}></div>
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

        <form onSubmit={handleSubmit} className="relative flex flex-col gap-2">
          <div className="flex border border-[#DAD6D0] rounded-[16px] overflow-hidden bg-[#FFFFFF] focus-within:border-[#F47B20] focus-within:ring-2 focus-within:ring-[#F47B20]/10 transition-all shadow-sm">
            <textarea
              disabled={isLoading}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); } }}
              placeholder="Ask a question about this document..."
              rows={1}
              className="flex-1 bg-transparent px-4 py-4 text-[14px] text-[#111111] focus:outline-none disabled:opacity-50 resize-none placeholder-[#77736D] overflow-hidden leading-tight"
              style={{ minHeight: '56px', maxHeight: '140px' }}
            />
            <div className="shrink-0 flex items-end p-2 self-end">
              {isLoading ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="w-10 h-10 rounded-xl bg-[#E8E4DE] hover:bg-[#DAD6D0] text-[#111111] flex items-center justify-center transition-colors shadow-sm"
                  aria-label="Stop generation"
                >
                  <StopIcon className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="w-10 h-10 rounded-xl bg-[#111111] hover:bg-[#0D0D0D] focus:outline-none text-[#F47B20] flex items-center justify-center disabled:opacity-30 transition-colors shadow-sm"
                  aria-label="Send message"
                >
                  {/* Paper airplane send icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                </button>
              )}
            </div>
          </div>
        </form>
        <p className="text-[11px] text-[#77736D] mt-3 text-center">Responses grounded in document content · Shift+Enter for new line</p>
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

function ShieldCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
