"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth.store";
import { Send, ArrowLeft, Loader2, MessageSquare, Package } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface Props {
  conversationId: string;
  backHref: string;
}

export default function MessageThread({ conversationId, backHref }: Props) {
  const { user } = useAuthStore();
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/messages/conversations/${conversationId}?page_size=50`
      );
      return res.data;
    },
    refetchInterval: 5_000,
  });

  const messages = [...(data?.data || [])].reverse();

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);

    // Get receiver from first message or conversation
    const receiverId = messages.length > 0
      ? messages[0].sender_id === user?.id
        ? messages[0].receiver_id
        : messages[0].sender_id
      : null;

    if (!receiverId) {
      setSending(false);
      return;
    }

    try {
      await apiClient.post("/messages", {
        receiver_id: receiverId,
        content: newMessage.trim(),
      });
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["farmer-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["buyer-conversations"] });
    } catch {
      // silent fail
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.06] bg-white/[0.02] flex-shrink-0">
        <Link
          href={backHref}
          className="p-2 text-gray-500 hover:text-white rounded-xl hover:bg-white/[0.05] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-green-900/40 flex items-center justify-center text-green-400 font-black text-xs flex-shrink-0">
          ?
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">Conversation</p>
          <p className="text-gray-600 text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Active
          </p>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-10 h-10 text-gray-700 mb-3" />
            <p className="text-gray-500 font-medium">No messages yet</p>
            <p className="text-gray-700 text-sm mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          <>
            {messages.map((msg: any) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? "bg-green-600 text-white rounded-br-sm"
                        : "bg-white/[0.06] text-gray-200 border border-white/[0.07] rounded-bl-sm"
                    }`}>
                      {msg.content}
                    </div>
                    <p className="text-gray-700 text-[10px] px-1">
                      {formatDate(msg.created_at)}
                      {isMe && msg.is_read && <span className="ml-1 text-green-600">✓✓</span>}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ── Input ──────────────────────────────────────────────── */}
      <div className="flex items-end gap-3 px-5 py-4 border-t border-white/[0.06] bg-white/[0.02] flex-shrink-0">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Type a message... (Enter to send)"
          className="flex-1 bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none"
          style={{ minHeight: "44px", maxHeight: "120px" }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = Math.min(target.scrollHeight, 120) + "px";
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          className="w-11 h-11 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white rounded-xl flex items-center justify-center transition-all flex-shrink-0 shadow-lg shadow-green-900/30"
        >
          {sending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />
          }
        </button>
      </div>
    </div>
  );
}