"use client";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import {
  Bot, X, Send, Loader2, Sparkles,
  ChevronDown, Copy, Check, Minimize2,
} from "lucide-react";

interface Message {
  role:    "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "What's the current price of cocoa?",
  "Who sells sesame on Afritide?",
  "Should I sell maize now or wait?",
  "Estimate transport from Kano to Lagos",
  "What documents do I need to export to Europe?",
  "What's trending in the market today?",
];

function formatMessage(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul style='margin: 8px 0; padding-left: 16px;'>$1</ul>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

export default function TradingAssistant() {
  const { user, isAuthenticated } = useAuthStore();
  const [open,       setOpen]       = useState(false);
  const [minimized,  setMinimized]  = useState(false);
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [copied,     setCopied]     = useState<number | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  const { data: commoditiesData } = useQuery({
    queryKey: ["ai-commodities"],
    queryFn:  async () => {
      const res = await apiClient.get("/commodities?page_size=50");
      return res.data;
    },
    enabled:   open,
    staleTime: 60_000,
  });

  const { data: productsData } = useQuery({
    queryKey: ["ai-products"],
    queryFn:  async () => {
      const res = await apiClient.get("/products?page_size=50&sort_by=created_at&sort_order=desc");
      return res.data;
    },
    enabled:   open,
    staleTime: 60_000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, minimized]);

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    const userMessage: Message = { role: "user", content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          context: {
            commodities:  commoditiesData?.data || [],
            products:     productsData?.data    || [],
            userRole:     user?.role            || "visitor",
            userCountry:  user?.country         || "Unknown",
          },
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please check your internet and try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const clearChat = () => setMessages([]);

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-600 hover:bg-green-500 text-white rounded-2xl shadow-2xl shadow-green-900/50 flex items-center justify-center transition-all hover:scale-110 group"
        >
          <Bot className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
          <div className="absolute right-16 bg-[#0a1a0f] border border-white/[0.1] text-white text-xs font-medium px-3 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            AI Trading Assistant
          </div>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className={`fixed bottom-6 right-6 z-50 w-96 bg-[#0a1a0f] border border-white/[0.08] rounded-3xl shadow-2xl shadow-black/50 flex flex-col transition-all ${
          minimized ? "h-16" : "h-[600px]"
        }`}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Afritide AI</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-emerald-400 text-[10px] font-medium">Trading Assistant</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button onClick={clearChat}
                  className="text-gray-600 hover:text-gray-400 text-[10px] font-medium transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.05]">
                  Clear
                </button>
              )}
              <button onClick={() => setMinimized(!minimized)}
                className="text-gray-600 hover:text-white transition-colors p-1">
                {minimized ? <ChevronDown className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button onClick={() => { setOpen(false); setMinimized(false); }}
                className="text-gray-600 hover:text-white transition-colors p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">

                {messages.length === 0 && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                        <p className="text-gray-300 text-sm leading-relaxed">
                          Hello{user?.first_name ? `, ${user.first_name}` : ""}! 👋 I'm your Afritide AI Trading Assistant.
                          I can help you with prices, suppliers, export requirements, market trends, and more.
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-600 text-xs font-medium mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> Suggested questions
                      </p>
                      <div className="space-y-2">
                        {SUGGESTED_QUESTIONS.map((q) => (
                          <button key={q} onClick={() => sendMessage(q)}
                            className="w-full text-left text-xs text-gray-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] hover:border-white/[0.12] px-3 py-2.5 rounded-xl transition-all">
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className={`relative group max-w-[85%] ${msg.role === "user" ? "items-end" : ""}`}>
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-green-600 text-white rounded-tr-sm"
                          : "bg-white/[0.04] border border-white/[0.06] text-gray-300 rounded-tl-sm"
                      }`}>
                        {msg.role === "assistant"
                          ? <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                          : msg.content
                        }
                      </div>
                      {msg.role === "assistant" && (
                        <button
                          onClick={() => copyMessage(msg.content, idx)}
                          className="absolute -bottom-5 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400">
                          {copied === idx
                            ? <><Check className="w-3 h-3 text-green-400" /> Copied</>
                            : <><Copy className="w-3 h-3" /> Copy</>
                          }
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/[0.06] flex-shrink-0">
                <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] focus-within:border-green-700/50 rounded-2xl px-4 py-3 transition-colors">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Ask about prices, suppliers, export..."
                    className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm focus:outline-none"
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    className="w-8 h-8 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                    {loading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Send className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
                <p className="text-gray-700 text-[10px] text-center mt-2">
                  Powered by Claude AI · Afritide Trading Intelligence
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}