"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import { LayoutDashboard, ShoppingCart, Heart, MessageSquare, FileText, Bell, Plus, Loader2 } from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  { label: "Overview",  href: "/dashboard/buyer",          icon: LayoutDashboard },
  { label: "My Orders", href: "/dashboard/buyer/orders",   icon: ShoppingCart },
  { label: "Wishlist",  href: "/dashboard/buyer/wishlist", icon: Heart },
  { label: "Messages",  href: "/dashboard/buyer/messages", icon: MessageSquare, badge: 2 },
  { label: "My RFQs",   href: "/dashboard/buyer/rfqs",     icon: FileText },
  { label: "Alerts",    href: "/dashboard/buyer/alerts",   icon: Bell },
];

const STATUS_COLORS: Record<string, string> = {
  open:      "bg-green-500/20 text-green-400 border-green-700/40",
  quoted:    "bg-blue-500/20 text-blue-400 border-blue-700/40",
  accepted:  "bg-emerald-500/20 text-emerald-400 border-emerald-700/40",
  rejected:  "bg-red-500/20 text-red-400 border-red-700/40",
  expired:   "bg-gray-500/20 text-gray-400 border-gray-700/40",
};

export default function BuyerRFQsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ product_name: "", quantity: "", unit: "kg", currency: "USD", delivery_country: "Nigeria", specifications: "" });

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["buyer-rfqs"],
    queryFn: async () => {
      const res = await apiClient.get("/rfqs?role=buyer&page_size=50");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const rfqs = data?.data || [];

  const handleSubmitRFQ = async () => {
    if (!form.product_name || !form.quantity) {
      toast.error("Product name and quantity are required");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/rfqs", { ...form, quantity: Number(form.quantity) });
      toast.success("RFQ submitted successfully!");
      setShowForm(false);
      setForm({ product_name: "", quantity: "", unit: "kg", currency: "USD", delivery_country: "Nigeria", specifications: "" });
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit RFQ");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="My RFQs">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">My RFQs</h2>
            <p className="text-gray-500 text-sm mt-1">{rfqs.length} requests submitted</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-3 rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> New RFQ
          </button>
        </div>

        {/* New RFQ form */}
        {showForm && (
          <div className="bg-white/[0.03] border border-green-800/40 rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-bold">Submit New Request for Quotation</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Product Name *</label>
                <input value={form.product_name} onChange={e => setForm({...form, product_name: e.target.value})}
                  placeholder="e.g. Grade A Cocoa Beans"
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Quantity *</label>
                <div className="flex gap-2">
                  <input value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})}
                    type="number" placeholder="0"
                    className="flex-1 bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                  <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}
                    className="bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-3 py-3 focus:outline-none appearance-none">
                    {["kg","tonne","piece","bag","litre","head"].map(u => <option key={u} value={u} className="bg-[#0a1a0f]">{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Delivery Country</label>
                <input value={form.delivery_country} onChange={e => setForm({...form, delivery_country: e.target.value})}
                  placeholder="e.g. Nigeria"
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Currency</label>
                <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3 focus:outline-none appearance-none">
                  {["USD","NGN","GBP","EUR","GHS"].map(c => <option key={c} value={c} className="bg-[#0a1a0f]">{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Specifications</label>
              <textarea value={form.specifications} onChange={e => setForm({...form, specifications: e.target.value})}
                rows={3} placeholder="Describe quality requirements, certifications needed, packaging, etc."
                className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSubmitRFQ} disabled={submitting}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit RFQ"}
              </button>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white font-medium px-4 py-3 rounded-xl hover:bg-white/[0.05] transition-all text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* RFQs list */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />)}
            </div>
          ) : rfqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="w-12 h-12 text-gray-700 mb-3" />
              <h3 className="text-white font-bold mb-1">No RFQs yet</h3>
              <p className="text-gray-600 text-sm mb-4">Submit a request to get quotes from multiple sellers</p>
              <button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                Submit First RFQ
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {rfqs.map((rfq: any) => (
                <div key={rfq.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{rfq.product_name}</p>
                    <p className="text-gray-600 text-xs">{rfq.quantity} {rfq.unit} · {rfq.delivery_country} · {formatDate(rfq.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {rfq.quoted_price && <p className="text-green-400 font-black text-sm">{formatPrice(rfq.quoted_price, rfq.currency)}</p>}
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${STATUS_COLORS[rfq.status] ?? "bg-gray-500/20 text-gray-400 border-gray-700/40"}`}>
                      {rfq.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}