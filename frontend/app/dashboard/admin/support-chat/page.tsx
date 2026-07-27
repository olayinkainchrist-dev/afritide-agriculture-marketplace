"use client";
import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ADMIN_NAV } from "@/components/dashboard/AdminNav";
import apiClient from "@/lib/api/client";
import {
  MessageCircle, Send, Loader2, CheckCheck,
  Search, Filter, RefreshCw, CheckCircle2,
  XCircle, RotateCcw, Trash2, Paperclip,
} from "lucide-react";
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
  id:           string;
  status:       string;
  user:         any;
  last_message: any;
  unread:       number;
  created_at:   string;
  updated_at:   string;
}

export default function AdminSupportChatPage() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [selected,     setSelected]     = useState<Conversation | null>(null);
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [input,        setInput]        = useState("");
  const [sending,      setSending]      = useState(false);
  const [filter,       setFilter]       = useState("all");
  const [search,       setSearch]       = useState("");
  const [userTyping,   setUserTyping]   = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef          = useRef<WebSocket | null>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);

  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "wss://afritide-agriculture-marketplace.onrender.com";

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) router.push("/login");
    else if (user?.role !== "ADMIN") router.push("/dashboard/farmer");
  }, [hasHydrated, isAuthenticated, user, router]);

  const { data: stats } = useQuery({
    queryKey: ["support-stats"],
    queryFn:  async () => {
      const res = await apiClient.get("/support-chat/admin/stats");
      return res.data.data;
    },
    enabled:       isAuthenticated && user?.role === "ADMIN",
    refetchInterval: 10000,
  });

  const { data: convData, isLoading, refetch } = useQuery({
    queryKey: ["support-conversations", filter],
    queryFn:  async () => {
      const params = filter !== "all" ? `?status=${filter.toUpperCase()}` : "";
      const res = await apiClient.get(`/support-chat/admin/conversations${params}`);
      return res.data.data || [];
    },
    enabled:       isAuthenticated && user?.role === "ADMIN",
    refetchInterval: 5000,
  });

  const conversations: Conversation[] = convData || [];
  const filtered = conversations.filter(c =>
    !search ||
    c.user?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.user?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selected?.id) loadMessages(selected.id);
  }, [selected?.id]);

  useEffect(() => {
    if (selected?.id) connectWS(selected.id);
    return () => wsRef.current?.close();
  }, [selected?.id]);

  const loadMessages = async (id: string) => {
    try {
      const res = await apiClient.get(`/support-chat/admin/conversations/${id}`);
      if (res.data?.data) {
        setMessages(res.data.data.messages || []);
        queryClient.invalidateQueries({ queryKey: ["support-conversations"] });
      }
    } catch {
      toast.error("Failed to load messages");
    }
  };

  const connectWS = (convId: string) => {
    wsRef.current?.close();
    const ws = new WebSocket(`${WS_URL}/api/v1/support-chat/ws/${convId}`);
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "new_message") {
        setMessages(prev => [...prev, data.message]);
        queryClient.invalidateQueries({ queryKey: ["support-conversations"] });
      } else if (data.type === "typing" && data.sender_type === "USER") {
        setUserTyping(true);
        setTimeout(() => setUserTyping(false), 3000);
      }
    };
    ws.onclose = () => setTimeout(() => connectWS(convId), 3000);
    wsRef.current = ws;
  };

  const handleReply = async () => {
    if (!input.trim() || !selected || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    try {
      await apiClient.post(`/support-chat/admin/conversations/${selected.id}/reply`, {
        message: text,
      });
      // Send typing indicator
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "typing", sender_type: "ADMIN" }));
      }
    } catch {
      toast.error("Failed to send reply");
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    if (!selected) return;
    try {
      await apiClient.put(`/support-chat/admin/conversations/${selected.id}/resolve`);
      toast.success("Conversation resolved");
      setSelected(prev => prev ? { ...prev, status: "RESOLVED" } : prev);
      queryClient.invalidateQueries({ queryKey: ["support-conversations"] });
    } catch {
      toast.error("Failed to resolve");
    }
  };

  const handleReopen = async () => {
    if (!selected) return;
    try {
      await apiClient.put(`/support-chat/admin/conversations/${selected.id}/reopen`);
      toast.success("Conversation reopened");
      setSelected(prev => prev ? { ...prev, status: "OPEN" } : prev);
      queryClient.invalidateQueries({ queryKey: ["support-conversations"] });
    } catch {
      toast.error("Failed to reopen");
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await apiClient.delete(`/support-chat/admin/messages/${msgId}`);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      toast.success("Message deleted");
    } catch {
      toast.error("Failed to delete message");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post("/support-chat/conversations/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success) {
        await apiClient.post(`/support-chat/admin/conversations/${selected.id}/reply`, {
          attachment_url:  res.data.data.url,
          attachment_type: res.data.data.type,
        });
      }
    } catch {
      toast.error("Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (!hasHydrated || !isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="Support Chat">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-black text-white">Support Center</h2>
          <p className="text-gray-500 text-sm mt-1">Manage user conversations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total",    value: stats?.total    ?? 0, color: "text-white" },
            { label: "Open",     value: stats?.open     ?? 0, color: "text-green-400" },
            { label: "Unread",   value: stats?.unread   ?? 0, color: "text-red-400" },
            { label: "Resolved", value: stats?.resolved ?? 0, color: "text-sky-400" },
            { label: "Closed",   value: stats?.closed   ?? 0, color: "text-gray-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-gray-600 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">

          {/* Conversation list */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl flex flex-col overflow-hidden">
            <div className="p-3 border-b border-white/[0.06] space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-xl text-white text-xs placeholder-gray-600 focus:outline-none" />
              </div>
              <div className="flex gap-1">
                {["all", "open", "resolved", "closed"].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all ${
                      filter === f ? "bg-green-600 text-white" : "text-gray-500 hover:text-white"
                    }`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-600 text-sm">No conversations</p>
                </div>
              ) : filtered.map(conv => (
                <div key={conv.id} onClick={() => setSelected(conv)}
                  className={`p-3 cursor-pointer transition-colors hover:bg-white/[0.03] ${
                    selected?.id === conv.id ? "bg-green-950/30 border-l-2 border-green-600" : ""
                  }`}>
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-green-900/50 border border-green-700/30 flex items-center justify-center text-green-400 text-xs font-black flex-shrink-0">
                      {conv.user?.first_name?.[0]}{conv.user?.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-xs font-bold truncate">
                          {conv.user?.first_name} {conv.user?.last_name}
                        </p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          conv.status === "OPEN"     ? "bg-green-500/20 text-green-400" :
                          conv.status === "RESOLVED" ? "bg-sky-500/20 text-sky-400" :
                          "bg-gray-500/20 text-gray-400"
                        }`}>
                          {conv.status}
                        </span>
                      </div>
                      <p className="text-gray-600 text-[10px] truncate mt-0.5">
                        {conv.last_message?.message || "No messages yet"}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-gray-700 text-[10px]">
                          {conv.last_message ? formatDate(conv.last_message.created_at) : ""}
                        </p>
                        {conv.unread > 0 && (
                          <span className="w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat panel */}
          <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.07] rounded-2xl flex flex-col overflow-hidden">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <MessageCircle className="w-12 h-12 text-green-800" />
                <p className="text-gray-500">Select a conversation to view</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-900/50 border border-green-700/30 flex items-center justify-center text-green-400 text-xs font-black">
                      {selected.user?.first_name?.[0]}{selected.user?.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">
                        {selected.user?.first_name} {selected.user?.last_name}
                      </p>
                      <p className="text-gray-600 text-xs">{selected.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => refetch()} className="p-1.5 text-gray-600 hover:text-white transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    {selected.status === "OPEN" ? (
                      <button onClick={handleResolve}
                        className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-sky-950/30 border border-sky-800/40 text-sky-400 rounded-xl hover:bg-sky-950/50 transition-colors">
                        <CheckCircle2 className="w-3 h-3" /> Resolve
                      </button>
                    ) : (
                      <button onClick={handleReopen}
                        className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-green-950/30 border border-green-800/40 text-green-400 rounded-xl hover:bg-green-950/50 transition-colors">
                        <RotateCcw className="w-3 h-3" /> Reopen
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_type === "ADMIN" ? "justify-end" : "justify-start"} group`}>
                      {msg.sender_type === "USER" && (
                        <div className="w-7 h-7 rounded-full bg-green-900/50 border border-green-700/30 flex items-center justify-center text-green-400 text-[10px] font-black mr-2 flex-shrink-0 mt-1">
                          {selected.user?.first_name?.[0]}
                        </div>
                      )}
                      <div className={`max-w-[70%] flex flex-col ${msg.sender_type === "ADMIN" ? "items-end" : "items-start"}`}>
                        {msg.attachment_url && (
                          msg.attachment_type === "image" ? (
                            <img src={msg.attachment_url} alt="" className="rounded-xl max-w-full mb-1" />
                          ) : (
                            <a href={msg.attachment_url} target="_blank"
                              className="flex items-center gap-2 bg-white/[0.08] border border-white/[0.1] rounded-xl px-3 py-2 text-green-400 text-xs font-medium mb-1">
                              📄 View Document
                            </a>
                          )
                        )}
                        {msg.message && (
                          <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                            msg.sender_type === "ADMIN"
                              ? "bg-green-600 text-white rounded-tr-sm"
                              : "bg-white/[0.07] text-gray-200 rounded-tl-sm"
                          }`}>
                            {msg.message}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-gray-600 text-[10px]">{formatTime(msg.created_at)}</span>
                          {msg.sender_type === "USER" && (
                            <button onClick={() => handleDeleteMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-3 h-3 text-red-500 hover:text-red-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {userTyping && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-900/50 border border-green-700/30 flex items-center justify-center text-green-400 text-[10px] font-black">
                        {selected.user?.first_name?.[0]}
                      </div>
                      <div className="bg-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Reply input */}
                {selected.status === "OPEN" && (
                  <div className="p-3 border-t border-white/[0.06]">
                    <div className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3 py-2">
                      <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                        placeholder="Type your reply..."
                        rows={1}
                        className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm focus:outline-none resize-none max-h-24"
                      />
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                          className="p-1.5 text-gray-600 hover:text-green-400 transition-colors">
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                        </button>
                        <button onClick={handleReply} disabled={sending || !input.trim()}
                          className="w-8 h-8 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 rounded-xl flex items-center justify-center transition-colors">
                          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Send className="w-3.5 h-3.5 text-white" />}
                        </button>
                      </div>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden"
                      onChange={handleFileUpload} />
                  </div>
                )}

                {selected.status !== "OPEN" && (
                  <div className="p-3 border-t border-white/[0.06] text-center">
                    <p className="text-gray-600 text-xs">
                      Conversation {selected.status.toLowerCase()} ·{" "}
                      <button onClick={handleReopen} className="text-green-400 hover:text-green-300 transition-colors">
                        Reopen
                      </button>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}