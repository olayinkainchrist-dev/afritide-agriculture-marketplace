"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Bell, X, CheckCheck, Megaphone, ShoppingCart, Package, MessageSquare, Star, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  announcement:      { icon: Megaphone,     color: "text-amber-400",   bg: "bg-amber-950/40" },
  order_placed:      { icon: ShoppingCart,  color: "text-green-400",   bg: "bg-green-950/40" },
  order_confirmed:   { icon: ShoppingCart,  color: "text-blue-400",    bg: "bg-blue-950/40" },
  order_shipped:     { icon: ShoppingCart,  color: "text-violet-400",  bg: "bg-violet-950/40" },
  order_delivered:   { icon: ShoppingCart,  color: "text-green-400",   bg: "bg-green-950/40" },
  order_cancelled:   { icon: ShoppingCart,  color: "text-red-400",     bg: "bg-red-950/40" },
  payment_received:  { icon: ShoppingCart,  color: "text-green-400",   bg: "bg-green-950/40" },
  new_message:       { icon: MessageSquare, color: "text-sky-400",     bg: "bg-sky-950/40" },
  new_rfq:           { icon: Package,       color: "text-amber-400",   bg: "bg-amber-950/40" },
  rfq_quoted:        { icon: Package,       color: "text-green-400",   bg: "bg-green-950/40" },
  product_approved:  { icon: Package,       color: "text-green-400",   bg: "bg-green-950/40" },
  product_rejected:  { icon: Package,       color: "text-red-400",     bg: "bg-red-950/40" },
  account_verified:  { icon: Star,          color: "text-green-400",   bg: "bg-green-950/40" },
  system:            { icon: AlertCircle,   color: "text-gray-400",    bg: "bg-gray-900/40" },
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await apiClient.get("/notifications?page_size=20");
      return res.data;
    },
    refetchInterval: 30_000, // Poll every 30 seconds
  });

  const notifications: Notification[] = data?.data || [];
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markRead = async (id: string) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await apiClient.put("/notifications/read-all");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch {}
  };

  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/notifications/${id}`);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch {}
  };

  const handleClick = (notif: Notification) => {
    if (!notif.is_read) markRead(notif.id);
    if (notif.action_url) window.location.href = notif.action_url;
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-500 hover:text-white rounded-xl hover:bg-white/[0.05] transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-green-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-lg shadow-green-900/40">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-[#0a1a0f] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-green-500/20 text-green-400 border border-green-700/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                <Bell className="w-10 h-10 text-gray-700 mb-3" />
                <p className="text-gray-500 font-medium text-sm">No notifications yet</p>
                <p className="text-gray-700 text-xs mt-1">
                  Order updates, messages, and announcements will appear here
                </p>
              </div>
            ) : (