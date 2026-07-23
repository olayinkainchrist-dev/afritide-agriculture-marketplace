"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import {
  LayoutDashboard, ShoppingCart, Heart,
  Bell, FileText, BellPlus, Trash2,
  TrendingUp, Loader2, X, Plus,
} from "lucide-react";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  { label: "Overview",     href: "/dashboard/buyer",               icon: LayoutDashboard },
  { label: "My Orders",    href: "/dashboard/buyer/orders",        icon: ShoppingCart },
  { label: "Wishlist",     href: "/dashboard/buyer/wishlist",      icon: Heart },
  { label: "Price Alerts", href: "/dashboard/buyer/alerts",        icon: Bell },
  { label: "RFQs",         href: "/dashboard/buyer/rfqs",          icon: FileText },
];

const COMMODITIES = [
  "Cocoa", "Sesame", "Maize", "Rice", "Soybean", "Groundnut",
  "Cassava", "Cashew", "Palm Oil", "Shea", "Sorghum", "Coffee",
  "Cotton", "Millet", "Ginger", "Pepper", "Turmeric", "Garlic",
  "Onion", "Tomato", "Yam", "Plantain", "Banana", "Pineapple",
];

export default function PriceAlertsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router                    = useRouter();
  const queryClient               = useQueryClient();
  const [showModal,    setShowModal]    = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [deleting,     setDeleting]     = useState<string | null>(null);
  const [form, setForm] = useState({
    commodity_name: "",
    alert_type:     "any_change",
    target_price:   "",
    currency:       "NGN",
  });

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["price-alerts"],
    queryFn:  async () => {
      const res = await apiClient.get("/price-alerts");
      return res.data.data || [];
    },
    enabled: isAuthenticated,
  });

  const handleCreate = async () => {
    if (!form.commodity_name) { toast.error("Select a commodity"); return; }
    if (form.alert_type !== "any_change" && !form.target_price) {
      toast.error("Enter a target price");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/price-alerts", {
        commodity_name: form.commodity_name,
        alert_type:     form.alert_type,
        target_price:   form.target_price ? Number(form.target_price) : undefined,
        currency:       form.currency,
      });
      toast.success("Price alert created!");
      queryClient.invalidateQueries({ queryKey: ["price-alerts"] });
      setShowModal(false);
      setForm({ commodity_name: "", alert_type: "any_change", target_price: "", currency: "NGN" });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create alert");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await apiClient.delete(`/price-alerts/${id}`);
      toast.success("Alert removed");
      queryClient.invalidateQueries({ queryKey: ["price-alerts"] });
    } catch {
      toast.error("Failed to remove alert");
    } finally {
      setDeleting(null);
    }
  };

  if (!isAuthenticated || !user) return null;

  const alerts = data || [];

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="Price Alerts">
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Price Alerts</h2>
            <p className="text-gray-500 text-sm mt-1">
              Get notified when commodity prices hit your target
            </p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-3 rounded-xl transition-colors text-sm">
            <Plus className="w-4 h-4" /> New Alert
          </button>
        </div>

        {/* Alerts list */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-gray-700" />
              </div>
              <h3 className="text-white font-bold mb-2">No price alerts yet</h3>
              <p className="text-gray-600 text-sm mb-5">
                Set alerts to be notified when commodity prices change
              </p>
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                <BellPlus className="w-4 h-4" /> Create First Alert
              </button>
            </div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-600 font-medium uppercase tracking-wide">
                <div className="col-span-4">Commodity</div>
                <div className="col-span-3">Alert Type</div>
                <div className="col-span-2">Target Price</div>
                <div className="col-span-2">Last Triggered</div>
                <div className="col-span-1">Action</div>
              </div>

              <div className="divide-y divide-white/[0.04]">
                {alerts.map((alert: any) => (
                  <div key={alert.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center">
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-950/50 border border-green-800/40 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      </div>
                      <p className="text-white font-semibold text-sm">{alert.commodity_name}</p>
                    </div>
                    <div className="col-span-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full border capitalize ${
                        alert.alert_type === "above"
                          ? "bg-green-500/20 text-green-400 border-green-700/40"
                          : alert.alert_type === "below"
                          ? "bg-red-500/20 text-red-400 border-red-700/40"
                          : "bg-sky-500/20 text-sky-400 border-sky-700/40"
                      }`}>
                        {alert.alert_type === "any_change" ? "Any Change" : `Price ${alert.alert_type}`}
                      </span>
                    </div>
                    <div className="col-span-2">
                      {alert.target_price ? (
                        <p className="text-white text-sm font-medium">
                          {alert.currency} {alert.target_price.toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-gray-600 text-sm">—</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500 text-xs">
                        {alert.last_triggered
                          ? new Date(alert.last_triggered).toLocaleDateString()
                          : "Never"
                        }
                      </p>
                    </div>
                    <div className="col-span-1">
                      <button onClick={() => handleDelete(alert.id)} disabled={deleting === alert.id}
                        className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all">
                        {deleting === alert.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Alert Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#0a1a0f] border border-white/[0.08] rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <BellPlus className="w-5 h-5 text-green-400" /> New Price Alert
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-gray-600 hover:text-white transition-colors" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Commodity *</label>
                <select value={form.commodity_name}
                  onChange={e => setForm({...form, commodity_name: e.target.value})}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3 focus:outline-none appearance-none">
                  <option value="" className="bg-[#0a1a0f]">Select commodity</option>
                  {COMMODITIES.map(c => (
                    <option key={c} value={c} className="bg-[#0a1a0f]">{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Alert When</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "any_change", label: "Any Change", color: "text-sky-400",   bg: "bg-sky-950/30 border-sky-700/40" },
                    { value: "above",      label: "Goes Above", color: "text-green-400", bg: "bg-green-950/30 border-green-700/40" },
                    { value: "below",      label: "Goes Below", color: "text-red-400",   bg: "bg-red-950/30 border-red-700/40" },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm({...form, alert_type: opt.value})}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        form.alert_type === opt.value
                          ? `${opt.bg} ${opt.color}`
                          : "border-white/[0.07] text-gray-500 hover:text-white"
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.alert_type !== "any_change" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Target Price *</label>
                    <input type="number" step="0.01"
                      value={form.target_price}
                      onChange={e => setForm({...form, target_price: e.target.value})}
                      placeholder="e.g. 50000"
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Currency</label>
                    <select value={form.currency}
                      onChange={e => setForm({...form, currency: e.target.value})}
                      className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3 focus:outline-none appearance-none">
                      {["NGN","USD","GBP","EUR","GHS"].map(c => (
                        <option key={c} value={c} className="bg-[#0a1a0f]">{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="bg-green-950/20 border border-green-800/30 rounded-xl p-3">
                <p className="text-green-300 text-xs leading-relaxed">
                  🔔 You'll receive an email notification when the price of <strong>{form.commodity_name || "your commodity"}</strong> {
                    form.alert_type === "any_change" ? "changes" :
                    form.alert_type === "above" ? `goes above ${form.currency} ${form.target_price || "..."}` :
                    `goes below ${form.currency} ${form.target_price || "..."}`
                  }.
                </p>
              </div>

              <button onClick={handleCreate} disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2">
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                  : <><BellPlus className="w-4 h-4" /> Create Alert</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}