"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ADMIN_NAV } from "@/components/dashboard/AdminNav";
import apiClient from "@/lib/api/client";
import {
  MessageSquare, X, Loader2, CheckCircle2, Mail,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  open:        "bg-red-500/20 text-red-400 border-red-700/40",
  in_progress: "bg-amber-500/20 text-amber-400 border-amber-700/40",
  resolved:    "bg-green-500/20 text-green-400 border-green-700/40",
  closed:      "bg-gray-500/20 text-gray-400 border-gray-700/40",
};

export default function AdminSupportPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
    else if (user?.role !== "admin") router.push("/dashboard/farmer");
  }, [isAuthenticated, user, router]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["support-tickets", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}&page_size=50` : "?page_size=50";
      const res = await apiClient.get(`/support/tickets${params}`);
      return res.data;
    },
    enabled: isAuthenticated && user?.role === "admin",
    refetchInterval: 30_000,
  });

  const tickets = data?.data || [];
  const openCount = tickets.filter((t: any) => t.status === "open").length;

  const handleReply = async () => {
    if (!reply.trim()) { toast.error("Please write a reply"); return; }
    setSending(true);
    try {
      await apiClient.put(`/support/tickets/${selectedTicket.id}/reply`, { reply });
      toast.success("Reply sent to user!");
      setSelectedTicket(null);
      setReply("");
      refetch();
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (ticketId: string, status: string) => {
    try {
      await apiClient.put(`/support/tickets/${ticketId}/status?status=${status}`);
      toast.success("Status updated");
      refetch();
    } catch {
      toast.error("Failed to update status");
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="Support Tickets">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Support Tickets</h2>
          <p className="text-gray-500 text-sm mt-1">
            {openCount > 0 && (
              <span className="text-red-400 font-medium">{openCount} open ticket{openCount !== 1 ? "s" : ""} · </span>
            )}
            {tickets.length} total tickets
          </p>
        </div>

        {/* Status filters */}
        <div className="flex gap-2 overflow-x-auto">
          {["all", "open", "in_progress", "resolved", "closed"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all capitalize ${
                statusFilter === s
                  ? "bg-green-600 text-white"
                  : "bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]"
              }`}>
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Tickets list */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-700 mb-3" />
              <h3 className="text-white font-bold mb-1">No tickets</h3>
              <p className="text-gray-600 text-sm">No support tickets found</p>
            </div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-600 font-medium uppercase tracking-wide">
                <div className="col-span-3">User</div>
                <div className="col-span-3">Topic</div>
                <div className="col-span-3">Message Preview</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1">Status</div>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {tickets.map((ticket: any) => (
                  <div
                    key={ticket.id}
                    onClick={() => { setSelectedTicket(ticket); setReply(""); }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-white/[0.04] transition-colors cursor-pointer items-center group"
                  >
                    <div className="col-span-3">
                      <p className="text-white font-semibold text-sm group-hover:text-green-400 transition-colors">
                        {ticket.name}
                      </p>
                      <p className="text-gray-600 text-xs">{ticket.email}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-gray-300 text-sm">{ticket.topic}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-gray-600 text-xs truncate">{ticket.message}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500 text-xs">{formatDate(ticket.created_at)}</p>
                    </div>
                    <div className="col-span-1">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${
                        STATUS_COLORS[ticket.status] ?? "bg-gray-500/20 text-gray-400 border-gray-700/40"
                      }`}>
                        {ticket.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Ticket detail modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedTicket(null)} />
          <div className="relative bg-[#0a1a0f] border border-white/[0.08] rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-bold">{selectedTicket.topic}</h3>
                <p className="text-gray-500 text-xs mt-0.5">
                  From {selectedTicket.name} · {selectedTicket.email}
                </p>
              </div>
              <button onClick={() => setSelectedTicket(null)}>
                <X className="w-5 h-5 text-gray-600 hover:text-white transition-colors" />
              </button>
            </div>

            {/* Message */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-4">
              <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-2">User Message</p>
              <p className="text-gray-200 text-sm leading-relaxed">{selectedTicket.message}</p>
              <p className="text-gray-700 text-xs mt-3">{formatDate(selectedTicket.created_at)}</p>
            </div>

            {/* Previous reply */}
            {selectedTicket.admin_reply && (
              <div className="bg-green-950/30 border border-green-800/30 rounded-2xl p-4 mb-4">
                <p className="text-green-400 text-[10px] uppercase tracking-wide mb-2 font-bold">Your Previous Reply</p>
                <p className="text-gray-300 text-sm leading-relaxed">{selectedTicket.admin_reply}</p>
              </div>
            )}

            {/* Status update */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {["open", "in_progress", "resolved", "closed"].map(s => (
                <button key={s} onClick={() => updateStatus(selectedTicket.id, s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    selectedTicket.status === s
                      ? "bg-green-600 text-white"
                      : "bg-white/[0.04] text-gray-500 hover:text-white border border-white/[0.06]"
                  }`}>
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Reply form */}
            <div className="space-y-3">
              <label className="text-xs text-gray-500">
                Reply to {selectedTicket.email}
              </label>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                rows={5}
                placeholder="Write your response to the user..."
                className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleReply}
                  disabled={sending || !reply.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {sending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    : <><Mail className="w-4 h-4" /> Send Reply</>
                  }
                </button>
                <button onClick={() => setSelectedTicket(null)}
                  className="px-5 text-gray-400 hover:text-white bg-white/[0.04] border border-white/[0.07] rounded-xl text-sm font-medium transition-all">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}