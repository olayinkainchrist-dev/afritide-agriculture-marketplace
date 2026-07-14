"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ADMIN_NAV } from "@/components/dashboard/AdminNav";
import apiClient from "@/lib/api/client";
import { Megaphone, Loader2, Send, Users } from "lucide-react";
import toast from "react-hot-toast";

const ROLE_TARGETS = [
  { value: "",          label: "All Users",        desc: "Send to everyone on the platform" },
  { value: "BUYER",     label: "Buyers Only",       desc: "Send to all registered buyers" },
  { value: "FARMER",    label: "Farmers Only",      desc: "Send to all registered farmers" },
  { value: "EXPORTER",  label: "Exporters Only",    desc: "Send to all exporters" },
];

export default function AdminAnnouncePage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
    else if (user?.role !== "ADMIN") router.push("/dashboard/farmer");
  }, [isAuthenticated, user, router]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSending(true);
    try {
      const params = new URLSearchParams({ title, message });
      if (targetRole) params.append("target_role", targetRole);
      await apiClient.post(`/admin/announcements?${params.toString()}`);
      toast.success("Announcement sent successfully!");
      setSent(true);
      setTitle("");
      setMessage("");
      setTargetRole("");
      setTimeout(() => setSent(false), 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to send announcement");
    } finally {
      setSending(false);
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="Announcements">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-2xl font-black text-white">Send Announcement</h2>
          <p className="text-gray-500 text-sm mt-1">Send platform-wide notifications to users</p>
        </div>

        {/* Target audience */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-green-500" /> Target Audience
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {ROLE_TARGETS.map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => setTargetRole(value)}
                className={`flex flex-col items-start gap-1 p-4 rounded-xl border transition-all text-left ${
                  targetRole === value
                    ? "border-green-600/70 bg-green-950/50 text-white"
                    : "border-white/[0.08] bg-white/[0.02] text-gray-400 hover:text-white hover:border-white/[0.14]"
                }`}
              >
                <span className="font-bold text-sm">{label}</span>
                <span className="text-xs opacity-70">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Compose */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 space-y-4">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-amber-400" /> Compose Message
          </h3>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Platform Maintenance Notice"
              className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Write your announcement message here..."
              className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Preview */}
          {(title || message) && (
            <div className="bg-green-950/20 border border-green-800/30 rounded-xl p-4">
              <p className="text-green-400 text-xs font-bold uppercase tracking-wide mb-2">Preview</p>
              <p className="text-white font-bold text-sm mb-1">{title || "Title..."}</p>
              <p className="text-gray-400 text-sm leading-relaxed">{message || "Message..."}</p>
              <p className="text-gray-600 text-xs mt-2">
                → Sending to: <span className="text-green-400 font-medium">
                  {ROLE_TARGETS.find(r => r.value === targetRole)?.label}
                </span>
              </p>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim()}
            className={`w-full font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl ${
              sent
                ? "bg-green-700 text-white"
                : "bg-amber-500 hover:bg-amber-400 disabled:bg-amber-900 disabled:text-amber-700 text-white shadow-amber-900/30"
            }`}
          >
            {sending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
              : sent
              ? <><Megaphone className="w-4 h-4" /> Sent Successfully!</>
              : <><Send className="w-4 h-4" /> Send Announcement</>
            }
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

