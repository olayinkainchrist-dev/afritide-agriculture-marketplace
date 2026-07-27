"use client";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import apiClient from "@/lib/api/client";
import {
  MessageCircle, X, Send, Paperclip, Loader2,
  CheckCheck, Minimize2,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Message {
  id:              string;
  conversation_id: string;
  sender_type:     "USER" | "ADMIN";
  message:         string | null;
  attachment_url:  string | null;
  attachment_type: string | null;
  is_read:         boolean;
  created_at:      string;
}

interface Conversation {
  id:         string;
  status:     string;
  user:       any;
  last_message: any;
  unread:     number;
}

export default function ChatWidget() {
  const { user, isAuthenticated }   = useAuthStore();
  const [open,          setOpen]    = useState(false);
  const [loading,       setLoading] = useState(false);
  const [sending,       setSending] = useState(false);
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [conversation,  setConversation]  = useState<Conversation | null>(null);
  const [input,         setInput]         = useState("");
  const [typing,        setTyping]        = useState(false);
  const [adminTyping,   setAdminTyping]   = useState(false);
  const [unread,        setUnread]        = useState(0);
  const [uploading,     setUploading]     = useState(false);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const wsRef           = useRef<WebSocket | null>(null);
  const typingTimeout   = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);

  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "wss://afritide-agriculture-marketplace.onrender.com";

  useEffect(() => {
    if (open && isAuthenticated) loadConversation();
  }, [open, isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (conversation?.id) connectWebSocket(conversation.id);
    return () => wsRef.current?.close();
  }, [conversation?.id]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/support-chat/conversations/my");
      if (res.data?.data) {
        setConversation(res.data.data.conversation);
        setMessages(res.data.data.messages || []);
        setUnread(0);
      }
    } catch {
      // no conversation yet
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post("/support-chat/conversations/start");
      if (res.data?.data) {
        setConversation(res.data.data);
        await loadConversation();
      }
    } catch {
      toast.error("Failed to start conversation");
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = (convId: string) => {
    wsRef.current?.close();
    const ws = new WebSocket(`${WS_URL}/api/v1/support-chat/ws/${convId}`);

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "new_message") {
        setMessages(prev => [...prev, data.message]);
        if (data.message.sender_type === "ADMIN" && !open) {
          setUnread(prev => prev + 1);
        }
      } else if (data.type === "typing") {
        if (data.sender_type === "ADMIN") {
          setAdminTyping(true);
          setTimeout(() => setAdminTyping(false), 3000);
        }
      } else if (data.type === "conversation_resolved") {
        setConversation(prev => prev ? { ...prev, status: "RESOLVED" } : prev);
      }
    };

    ws.onclose = () => {
      setTimeout(() => connectWebSocket(convId), 3000);
    };

    wsRef.current = ws;
  };

  const sendTyping = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing", sender_type: "USER" }));
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTyping(false), 2000);
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    if (!conversation) {
      await startConversation();
      return;
    }
    setSending(true);
    const text = input.trim();
    setInput("");
    try {
      await apiClient.post("/support-chat/conversations/message", {
        conversation_id: conversation.id,
        message:         text,
      });
    } catch {
      toast.error("Failed to send message");
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post("/support-chat/conversations/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success) {
        await apiClient.post("/support-chat/conversations/message", {
          conversation_id: conversation?.id,
          attachment_url:  res.data.data.url,
          attachment_type: res.data.data.type,
        });
      }
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const groupedMessages = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    messages.forEach(msg => {
      const date = formatDate(msg.created_at);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    });
    return groups;
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(!open); setUnread(0); }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-600 hover:bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-900/50 transition-all hover:scale-105">
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-6 h-6 text-white" />
            {unread > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                {unread}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] h-[520px] bg-[#0a1a0f] border border-white/[0.1] rounded-3xl shadow-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="bg-green-700 px-5 py-4 flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center font-black text-white text-sm">
                AF
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-green-700" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Afritide Support</p>
              <p className="text-green-200 text-xs">Typically replies within 5 minutes</p>
            </div>
            <button onClick={() => setOpen(false)}>
              <Minimize2 className="w-4 h-4 text-green-200 hover:text-white transition-colors" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!isAuthenticated ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <MessageCircle className="w-12 h-12 text-green-700" />
                <div>
                  <p className="text-white font-bold mb-1">Chat with Afritide Support</p>
                  <p className="text-gray-500 text-sm">Please login to start a conversation</p>
                </div>
                <Link href="/login"
                  className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
                  Login
                </Link>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
              </div>
            ) : !conversation ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-green-950/50 border border-green-800/40 flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-bold mb-1">👋 Welcome to Afritide Support</p>
                  <p className="text-gray-500 text-sm">How can we help you today?</p>
                </div>
                <button onClick={startConversation}
                  className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
                  Start Conversation
                </button>
              </div>
            ) : (
              <>
                {groupedMessages().map(group => (
                  <div key={group.date}>
                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px bg-white/[0.06]" />
                      <span className="text-gray-600 text-[10px] font-medium">{group.date}</span>
                      <div className="flex-1 h-px bg-white/[0.06]" />
                    </div>
                    {group.messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender_type === "USER" ? "justify-end" : "justify-start"} mb-2`}>
                        {msg.sender_type === "ADMIN" && (
                          <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center text-white text-[10px] font-black mr-2 flex-shrink-0 mt-1">
                            AF
                          </div>
                        )}
                        <div className={`max-w-[75%] ${msg.sender_type === "USER" ? "items-end" : "items-start"} flex flex-col`}>
                          {msg.attachment_url && (
                            msg.attachment_type === "image" ? (
                              <img src={msg.attachment_url} alt="attachment"
                                className="rounded-xl max-w-full mb-1 border border-white/[0.08]" />
                            ) : (
                              <a href={msg.attachment_url} target="_blank"
                                className="flex items-center gap-2 bg-white/[0.08] border border-white/[0.1] rounded-xl px-3 py-2 text-green-400 text-xs font-medium hover:bg-white/[0.12] transition-colors mb-1">
                                📄 View Document
                              </a>
                            )
                          )}
                          {msg.message && (
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              msg.sender_type === "USER"
                                ? "bg-green-600 text-white rounded-tr-sm"
                                : "bg-white/[0.07] text-gray-200 rounded-tl-sm"
                            }`}>
                              {msg.message}
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-gray-600 text-[10px]">{formatTime(msg.created_at)}</span>
                            {msg.sender_type === "USER" && (
                              <CheckCheck className={`w-3 h-3 ${msg.is_read ? "text-green-400" : "text-gray-600"}`} />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {adminTyping && (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center text-white text-[10px] font-black">
                      AF
                    </div>
                    <div className="bg-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                )}

                {conversation.status !== "OPEN" && (
                  <div className="text-center py-3">
                    <span className="text-xs text-gray-500 bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 rounded-full">
                      Conversation {conversation.status.toLowerCase()}
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          {isAuthenticated && conversation?.status === "OPEN" && (
            <div className="p-3 border-t border-white/[0.06]">
              <div className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3 py-2">
                <textarea
                  value={input}
                  onChange={e => { setInput(e.target.value); sendTyping(); }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type your message..."
                  rows={1}
                  className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm focus:outline-none resize-none max-h-24"
                />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="p-1.5 text-gray-600 hover:text-green-400 transition-colors">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  </button>
                  <button onClick={handleSend} disabled={sending || !input.trim()}
                    className="w-8 h-8 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 rounded-xl flex items-center justify-center transition-colors">
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Send className="w-3.5 h-3.5 text-white" />}
                  </button>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden"
                onChange={handleFileUpload} />
              <p className="text-gray-700 text-[10px] text-center mt-1.5">
                {input.length}/500 · Press Enter to send
              </p>
            </div>
          )}

          {isAuthenticated && conversation && conversation.status !== "OPEN" && (
            <div className="p-3 border-t border-white/[0.06] text-center">
              <button onClick={startConversation}
                className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors">
                Start new conversation
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}