"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ADMIN_NAV } from "@/components/dashboard/AdminNav";
import apiClient from "@/lib/api/client";
import {
  X, Loader2, CheckCircle2,
  FileText, Clock, Package,
} from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  OPEN:      "bg-green-500/20 text-green-400 border-green-700/40",
  QUOTED:    "bg-blue-500/20 text-blue-400 border-blue-700/40",
  ACCEPTED:  "bg-emerald-500/20 text-emerald-400 border-emerald-700/40",
  REJECTED:  "bg-red-500/20 text-red-400 border-red-700/40",
  EXPIRED:   "bg-gray-500/20 text-gray-400 border-gray-700/40",
  CANCELLED: "bg-gray-500/20 text-gray-400 border-gray-700/40",
};

export default function AdminSourcingPage() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const router = useRouter();
  const [selectedRFQ,  setSelectedRFQ]  = useState<any>(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [quoteForm, setQuoteForm] = useState({
    quoted_price:      "",
    quoted_quantity:   "",
    quote_valid_until: "",
    quote_notes:       "",
  });

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) router.push("/login");
    else if (user?.role !== "ADMIN") router.push("/dashboard/farmer");
  }, [hasHydrated, isAuthenticated, user, router]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-sourcing-requests", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ role: "seller", page_size: "100" });
      if (statusFilter !== "all") params.append("status", statusFilter.toUpperCase());
      const res = await apiClient.get(`/rfqs?${params}`);
      return res.data;
    },
    enabled:         isAuthenticated && user?.role === "ADMIN",
    refetchInterval: 30_000,
  });

  const rfqs      = data?.data || [];
  const openCount = rfqs.filter((r: any) => r.status === "OPEN").length;

  const handleSubmitQuote = async () => {
    if (!quoteForm.quoted_price || !quoteForm.quoted_quantity || !quoteForm.quote_valid_until) {
      toast.error("Price, quantity and valid until date are required");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/rfqs/${selectedRFQ.id}/quote`, {
        quoted_price:      Number(quoteForm.quoted_price),
        quoted_quantity:   Number(quoteForm.quoted_quantity),
        quote_valid_until: quoteForm.quote_valid_until,
        quote_notes:       quoteForm.quote_notes || undefined,
      });
      toast.success("Quote sent to buyer!");
      setSelectedRFQ(null);
      setQuoteForm({ quoted_price: "", quoted_quantity: "", quote_valid_until: "", quote_notes: "" });
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit quote");
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasHydrated) return null;
  if (!isAuthenticated || !user) return null;

  const ADMIN_NAV_WITH_SOURCING = [
    ...ADMIN_NAV,
    { label: "Sourcing", href: "/dashboard/admin/sourcing", icon: Package },
  ];

  return (
    <DashboardLayout navItems={ADMIN_NAV_WITH_SOURCING} title="Sourcing Requests">
      <div className="space-y-6">

        <div>
          <h2 className="text-2xl font-black text-white">Sourcing Requests</h2>
          <p className="text-gray-500 text-sm mt-1">
            {openCount > 0 && (
              <span className="text-red-400 font-medium">{openCount} open request{openCount !== 1 ? "s" : ""} · </span>
            )}
            {rfqs.length} total requests from buyers
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {["all", "OPEN", "QUOTED", "ACCEPTED", "REJECTED"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all capitalize ${
                statusFilter === s
                  ? "bg-green-600 text-white"
                  : "bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]"
              }`}>
              {s === "all" ? "All" : s.toLowerCase()}
            </button>
          ))}
        </div>

        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />)}
            </div>
          ) : rfqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-10 h-10 text-gray-700 mb-3" />
              <h3 className="text-white font-bold mb-1">No sourcing requests</h3>
              <p className="text-gray-600 text-sm">Buyer sourcing requests will appear here</p>
            </div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-600 font-medium uppercase tracking-wide">
                <div className="col-span-1">RFQ #</div>
                <div className="col-span-3">Product</div>
                <div className="col-span-2">Quantity</div>
                <div className="col-span-2">Target Price</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Status</div>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {rfqs.map((rfq: any) => (
                  <div key={rfq.id}
                    onClick={() => {
                      setSelectedRFQ(rfq);
                      setQuoteForm({
                        quoted_price:      rfq.target_price?.toString() || "",
                        quoted_quantity:   rfq.quantity?.toString() || "",
                        quote_valid_until: "",
                        quote_notes:       "",
                      });
                    }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-white/[0.04] transition-colors cursor-pointer group items-center">
                    <div className="col-span-1">
                      <p className="text-gray-500 text-xs font-mono">{rfq.rfq_number?.slice(-6)}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-white font-semibold text-sm group-hover:text-green-400 transition-colors">
                        {rfq.product_name}
                      </p>
                      <p className="text-gray-600 text-xs">{rfq.delivery_country || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-white text-sm">{rfq.quantity} {rfq.unit?.toLowerCase()}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-green-400 font-bold text-sm">
                        {rfq.target_price ? formatPrice(rfq.target_price, rfq.currency) : "Open"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500 text-xs">{formatDate(rfq.created_at)}</p>
                    </div>
                    <div className="col-span-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${
                        STATUS_COLORS[rfq.status] ?? "bg-gray-500/20 text-gray-400 border-gray-700/40"
                      }`}>
                        {rfq.status?.toLowerCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {selectedRFQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedRFQ(null)} />
          <div className="relative bg-[#0a1a0f] border border-white/[0.08] rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-bold text-lg">{selectedRFQ.product_name}</h3>
                <p className="text-gray-500 text-xs mt-0.5">
                  Request #{selectedRFQ.rfq_number} · {formatDate(selectedRFQ.created_at)}
                </p>
              </div>
              <button onClick={() => setSelectedRFQ(null)}>
                <X className="w-5 h-5 text-gray-600 hover:text-white transition-colors" />
              </button>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-5">
              <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-3">Buyer Request</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Product",      value: selectedRFQ.product_name },
                  { label: "Quantity",     value: `${selectedRFQ.quantity} ${selectedRFQ.unit?.toLowerCase()}` },
                  { label: "Target Price", value: selectedRFQ.target_price ? formatPrice(selectedRFQ.target_price, selectedRFQ.currency) : "Open to offers" },
                  { label: "Delivery To",  value: selectedRFQ.delivery_country || "—" },
                  { label: "Deadline",     value: selectedRFQ.delivery_date ? formatDate(selectedRFQ.delivery_date) : "—" },
                  { label: "Currency",     value: selectedRFQ.currency },
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
              {selectedRFQ.additional_requirements && (
                <div className="mt-2">
                  <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-1">Additional Requirements</p>
                  <p className="text-gray-300 text-sm">{selectedRFQ.additional_requirements}</p>
                </div>
              )}
            </div>

            {selectedRFQ.status === "QUOTED" && (
              <div className="bg-blue-950/30 border border-blue-800/30 rounded-2xl p-4 mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400 font-bold text-sm">Quote Sent to Buyer</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-600 text-xs">Quoted Price</p>
                    <p className="text-white font-bold">{formatPrice(selectedRFQ.quoted_price, selectedRFQ.currency)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Quantity</p>
                    <p className="text-white font-bold">{selectedRFQ.quoted_quantity} {selectedRFQ.unit?.toLowerCase()}</p>
                  </div>
                </div>
                {selectedRFQ.quote_notes && (
                  <p className="text-gray-400 text-xs mt-2">{selectedRFQ.quote_notes}</p>
                )}
              </div>
            )}

            {selectedRFQ.status === "ACCEPTED" && (
              <div className="bg-green-950/30 border border-green-800/30 rounded-2xl p-4 mb-5 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-green-400 font-bold">Buyer Accepted the Quote!</p>
                <p className="text-gray-500 text-sm mt-1">Proceed to fulfil this order.</p>
              </div>
            )}

            {selectedRFQ.status === "OPEN" && (
              <div className="space-y-4">
                <h4 className="text-white font-bold text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-500" />
                  Send Quotation to Buyer
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">
                      Your Price <span className="text-red-400">*</span>
                    </label>
                    <input type="number" step="0.01"
                      value={quoteForm.quoted_price}
                      onChange={e => setQuoteForm({ ...quoteForm, quoted_price: e.target.value })}
                      placeholder="e.g. 1500.00"
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                    <p className="text-gray-700 text-[10px] mt-0.5">per {selectedRFQ.unit?.toLowerCase()}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">
                      Quantity Available <span className="text-red-400">*</span>
                    </label>
                    <input type="number"
                      value={quoteForm.quoted_quantity}
                      onChange={e => setQuoteForm({ ...quoteForm, quoted_quantity: e.target.value })}
                      placeholder={selectedRFQ.quantity?.toString()}
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">
                    Quote Valid Until <span className="text-red-400">*</span>
                  </label>
                  <input type="datetime-local"
                    value={quoteForm.quote_valid_until}
                    onChange={e => setQuoteForm({ ...quoteForm, quote_valid_until: e.target.value })}
                    className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-colors" />
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Notes to Buyer</label>
                  <textarea
                    value={quoteForm.quote_notes}
                    onChange={e => setQuoteForm({ ...quoteForm, quote_notes: e.target.value })}
                    rows={3}
                    placeholder="Supplier details, delivery timeline, quality info..."
                    className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none" />
                </div>

                <div className="flex gap-3">
                  <button onClick={handleSubmitQuote} disabled={submitting}
                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                      : <><FileText className="w-4 h-4" /> Send Quote to Buyer</>
                    }
                  </button>
                  <button onClick={() => setSelectedRFQ(null)}
                    className="px-5 text-gray-400 hover:text-white bg-white/[0.04] border border-white/[0.07] rounded-xl text-sm font-medium transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}