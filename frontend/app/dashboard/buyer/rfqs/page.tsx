"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import {
  LayoutDashboard, ShoppingCart, Heart,
  MessageSquare, FileText, Bell,
  Plus, Loader2, CheckCircle2, XCircle, X,
} from "lucide-react";
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
  cancelled: "bg-gray-500/20 text-gray-400 border-gray-700/40",
};

export default function BuyerRFQsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState<any>(null);
  const [responding, setResponding] = useState(false);
  const [form, setForm] = useState({
    product_name: "", quantity: "", unit: "kg",
    currency: "USD", delivery_country: "Nigeria", specifications: "",
  });

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
    refetchInterval: 30_000,
  });

  const rfqs = data?.data || [];

  const handleSubmitRFQ = async () => {
    if (!form.product_name || !form.quantity) {
      toast.error("Product name and quantity are required");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/rfqs", {
        ...form,
        quantity: Number(form.quantity),
      });
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

  const handleAccept = async (rfqId: string) => {
    setResponding(true);
    try {
      await apiClient.post(`/rfqs/${rfqId}/accept`);
      toast.success("Quotation accepted!");
      setSelectedRFQ(null);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to accept");
    } finally {
      setResponding(false);
    }
  };

  const handleReject = async (rfqId: string) => {
    setResponding(true);
    try {
      await apiClient.post(`/rfqs/${rfqId}/reject`);
      toast.success("Quotation rejected");
      setSelectedRFQ(null);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to reject");
    } finally {
      setResponding(false);
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="My RFQs">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">My RFQs</h2>
            <p className="text-gray-500 text-sm mt-1">
              {rfqs.filter((r: any) => r.status === "quoted").length > 0 && (
                <span className="text-blue-400 font-medium">
                  {rfqs.filter((r: any) => r.status === "quoted").length} quote(s) waiting for your response ·{" "}
                </span>
              )}
              {rfqs.length} total requests
            </p>
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
                <input
                  value={form.product_name}
                  onChange={e => setForm({ ...form, product_name: e.target.value })}
                  placeholder="e.g. Grade A Cocoa Beans"
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Quantity *</label>
                <div className="flex gap-2">
                  <input
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    type="number" placeholder="0"
                    className="flex-1 bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                  />
                  <select
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-3 py-3 focus:outline-none appearance-none"
                  >
                    {["kg","tonne","piece","bag","litre","head"].map(u => (
                      <option key={u} value={u} className="bg-[#0a1a0f]">{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Delivery Country</label>
                <input
                  value={form.delivery_country}
                  onChange={e => setForm({ ...form, delivery_country: e.target.value })}
                  placeholder="e.g. Nigeria"
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Currency</label>
                <select
                  value={form.currency}
                  onChange={e => setForm({ ...form, currency: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3 focus:outline-none appearance-none"
                >
                  {["USD","NGN","GBP","EUR","GHS"].map(c => (
                    <option key={c} value={c} className="bg-[#0a1a0f]">{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Specifications</label>
              <textarea
                value={form.specifications}
                onChange={e => setForm({ ...form, specifications: e.target.value })}
                rows={3}
                placeholder="Quality requirements, certifications, packaging..."
                className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSubmitRFQ}
                disabled={submitting}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  : "Submit RFQ"
                }
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-white font-medium px-4 py-3 rounded-xl hover:bg-white/[0.05] transition-all text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* RFQ list */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : rfqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="w-12 h-12 text-gray-700 mb-3" />
              <h3 className="text-white font-bold mb-1">No RFQs yet</h3>
              <p className="text-gray-600 text-sm mb-4">Submit a request to get quotes from verified sellers</p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                Submit First RFQ
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {rfqs.map((rfq: any) => (
                <div
                  key={rfq.id}
                  onClick={() => setSelectedRFQ(rfq)}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.04] transition-colors cursor-pointer group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-semibold text-sm group-hover:text-green-400 transition-colors">
                        {rfq.product_name}
                      </p>
                      {rfq.status === "quoted" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-700/40 animate-pulse">
                          New Quote!
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-xs">
                      {rfq.quantity} {rfq.unit}
                      {rfq.delivery_country ? ` · ${rfq.delivery_country}` : ""}
                      {" · "}{formatDate(rfq.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {rfq.quoted_price && (
                      <div className="text-right">
                        <p className="text-green-400 font-black text-sm">
                          {formatPrice(rfq.quoted_price, rfq.currency)}
                        </p>
                        <p className="text-gray-600 text-[10px]">quoted price</p>
                      </div>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${
                      STATUS_COLORS[rfq.status] ?? "bg-gray-500/20 text-gray-400 border-gray-700/40"
                    }`}>
                      {rfq.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RFQ Detail Modal ─────────────────────────────────── */}
      {selectedRFQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedRFQ(null)}
          />
          <div className="relative bg-[#0a1a0f] border border-white/[0.08] rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-bold text-lg">{selectedRFQ.product_name}</h3>
                <p className="text-gray-500 text-xs mt-0.5">RFQ {selectedRFQ.rfq_number}</p>
              </div>
              <button
                onClick={() => setSelectedRFQ(null)}
                className="text-gray-600 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Your request */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-4">
              <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-3">Your Request</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Quantity",      value: `${selectedRFQ.quantity} ${selectedRFQ.unit}` },
                  { label: "Target Price",  value: selectedRFQ.target_price ? formatPrice(selectedRFQ.target_price, selectedRFQ.currency) : "Open" },
                  { label: "Delivery To",   value: selectedRFQ.delivery_country || "—" },
                  { label: "Submitted",     value: formatDate(selectedRFQ.created_at) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-white text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>
              {selectedRFQ.specifications && (
                <div className="mt-3 pt-3 border-t border-white/[0.05]">
                  <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-1">Specifications</p>
                  <p className="text-gray-300 text-sm">{selectedRFQ.specifications}</p>
                </div>
              )}
            </div>

            {/* Seller's quotation */}
            {selectedRFQ.status === "quoted" && (
              <div className="bg-blue-950/30 border border-blue-800/40 rounded-2xl p-5 mb-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <h4 className="text-blue-400 font-bold text-sm">Seller Has Responded!</h4>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Quoted Price</p>
                    <p className="text-white font-black text-xl">
                      {formatPrice(selectedRFQ.quoted_price, selectedRFQ.currency)}
                    </p>
                    <p className="text-gray-600 text-xs">per {selectedRFQ.unit}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Can Supply</p>
                    <p className="text-white font-black text-xl">{selectedRFQ.quoted_quantity}</p>
                    <p className="text-gray-600 text-xs">{selectedRFQ.unit}</p>
                  </div>
                </div>
                {selectedRFQ.quote_valid_until && (
                  <p className="text-amber-400 text-xs mb-3">
                    ⏰ Quote valid until {formatDate(selectedRFQ.quote_valid_until)}
                  </p>
                )}
                {selectedRFQ.quote_notes && (
                  <div className="bg-white/[0.03] rounded-xl p-3 mb-4">
                    <p className="text-gray-500 text-xs mb-1">Seller Notes</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{selectedRFQ.quote_notes}</p>
                  </div>
                )}

                {/* Accept / Reject */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAccept(selectedRFQ.id)}
                    disabled={responding}
                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    {responding
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><CheckCircle2 className="w-4 h-4" /> Accept Quote</>
                    }
                  </button>
                  <button
                    onClick={() => handleReject(selectedRFQ.id)}
                    disabled={responding}
                    className="flex-1 bg-red-600/20 hover:bg-red-600/30 border border-red-700/40 text-red-400 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            )}

            {/* Accepted state */}
            {selectedRFQ.status === "accepted" && (
              <div className="bg-green-950/30 border border-green-800/30 rounded-2xl p-5 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-green-400 font-bold">You accepted this quotation</p>
                <p className="text-gray-500 text-sm mt-1">
                  Quoted price: <span className="text-white font-bold">
                    {formatPrice(selectedRFQ.quoted_price, selectedRFQ.currency)}
                  </span>
                </p>
              </div>
            )}

            {/* Rejected state */}
            {selectedRFQ.status === "rejected" && (
              <div className="bg-red-950/20 border border-red-800/20 rounded-2xl p-5 text-center">
                <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                <p className="text-red-400 font-bold">You rejected this quotation</p>
              </div>
            )}

            {/* Open — waiting */}
            {selectedRFQ.status === "open" && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 text-center">
                <div className="w-10 h-10 rounded-full border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 font-medium">Waiting for seller response</p>
                <p className="text-gray-600 text-sm mt-1">The seller will respond with a quotation shortly.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}