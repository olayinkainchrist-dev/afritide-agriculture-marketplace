"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import {
  LayoutDashboard, Users, Package, ShoppingCart,
  BarChart2, Settings, Shield, FileText,
  Wallet, Plus, Edit, Power, X, Loader2,
  TrendingUp, DollarSign,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  { label: "Overview",     href: "/dashboard/admin",              icon: LayoutDashboard },
  { label: "Products",     href: "/dashboard/admin/products",     icon: Package },
  { label: "Orders",       href: "/dashboard/admin/orders",       icon: ShoppingCart },
  { label: "Users",        href: "/dashboard/admin/users",        icon: Users },
  { label: "Commission",   href: "/dashboard/admin/commission",   icon: Wallet },
  { label: "Analytics",    href: "/dashboard/admin/analytics",    icon: BarChart2 },
  { label: "Reports",      href: "/dashboard/admin/reports",      icon: FileText },
];

const SELLER_TYPES = ["", "FARMER", "COOPERATIVE", "EXPORTER", "PROCESSING_COMPANY", "LOGISTICS_PROVIDER", "WAREHOUSE_OPERATOR"];
const TRANSACTION_TYPES = ["", "B2C", "B2B", "EXPORT", "DOMESTIC"];
const CATEGORIES = ["", "LIVESTOCK", "DAIRY", "CASH_CROPS", "FRUITS", "VEGETABLES", "FISHERY", "POULTRY", "MACHINERY", "SEEDS", "FERTILIZERS"];

interface Rule {
  id: string;
  name: string;
  description?: string;
  seller_type?: string;
  transaction_type?: string;
  category?: string;
  rate_percentage: number;
  min_amount?: number;
  max_amount?: number;
  priority: number;
  is_active: boolean;
  effective_from?: string;
  effective_until?: string;
}

export default function AdminCommissionPage() {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const queryClient = useQueryClient();
  const [showModal,   setShowModal]   = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", seller_type: "", transaction_type: "",
    category: "", rate_percentage: 5, min_amount: "", max_amount: "",
    priority: 10, effective_from: "", effective_until: "",
  });
  const [sellerForm, setSellerForm] = useState({
    seller_id: "", custom_rate: "", reason: "", effective_until: "",
  });

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ["admin-commission-rules"],
    queryFn:  async () => {
      const res = await apiClient.get("/commissions/admin/rules");
      return res.data.data;
    },
    enabled: isAuthenticated,
  });

  const { data: overviewData } = useQuery({
    queryKey: ["admin-commission-overview"],
    queryFn:  async () => {
      const res = await apiClient.get("/commissions/admin/overview");
      return res.data.data;
    },
    enabled: isAuthenticated,
  });

  const { data: payoutsData } = useQuery({
    queryKey: ["admin-commission-payouts"],
    queryFn:  async () => {
      const res = await apiClient.get("/commissions/admin/payouts?page_size=10");
      return res.data.data;
    },
    enabled: isAuthenticated,
  });

  if (!hasHydrated || !isAuthenticated) return null;

  const rules    = rulesData || [];
  const overview = overviewData;
  const payouts  = payoutsData?.items || [];

  const openCreate = () => {
    setEditingRule(null);
    setForm({ name: "", description: "", seller_type: "", transaction_type: "",
      category: "", rate_percentage: 5, min_amount: "", max_amount: "",
      priority: 10, effective_from: "", effective_until: "" });
    setShowModal(true);
  };

  const openEdit = (rule: Rule) => {
    setEditingRule(rule);
    setForm({
      name:             rule.name,
      description:      rule.description || "",
      seller_type:      rule.seller_type || "",
      transaction_type: rule.transaction_type || "",
      category:         rule.category || "",
      rate_percentage:  rule.rate_percentage,
      min_amount:       rule.min_amount?.toString() || "",
      max_amount:       rule.max_amount?.toString() || "",
      priority:         rule.priority,
      effective_from:   rule.effective_from?.substring(0, 10) || "",
      effective_until:  rule.effective_until?.substring(0, 10) || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.rate_percentage) { toast.error("Name and rate are required"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        seller_type:      form.seller_type      || null,
        transaction_type: form.transaction_type || null,
        category:         form.category         || null,
        min_amount:       form.min_amount        ? Number(form.min_amount)  : null,
        max_amount:       form.max_amount        ? Number(form.max_amount)  : null,
        effective_from:   form.effective_from   || null,
        effective_until:  form.effective_until  || null,
      };
      if (editingRule) {
        await apiClient.put(`/commissions/admin/rules/${editingRule.id}`, payload);
        toast.success("Rule updated");
      } else {
        await apiClient.post("/commissions/admin/rules", payload);
        toast.success("Rule created");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-commission-rules"] });
      setShowModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: Rule) => {
    try {
      await apiClient.put(`/commissions/admin/rules/${rule.id}/toggle`);
      toast.success(rule.is_active ? "Rule deactivated" : "Rule activated");
      queryClient.invalidateQueries({ queryKey: ["admin-commission-rules"] });
    } catch {
      toast.error("Failed to toggle rule");
    }
  };

  const handleSellerRate = async () => {
    if (!sellerForm.seller_id || !sellerForm.custom_rate) {
      toast.error("Seller ID and rate are required"); return;
    }
    setSaving(true);
    try {
      await apiClient.post("/commissions/admin/seller-rates", {
        seller_id:      sellerForm.seller_id,
        custom_rate:    Number(sellerForm.custom_rate),
        reason:         sellerForm.reason || null,
        effective_until:sellerForm.effective_until || null,
      });
      toast.success("Seller-specific rate set");
      setShowSellerModal(false);
      setSellerForm({ seller_id: "", custom_rate: "", reason: "", effective_until: "" });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to set rate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="Commission Management">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Commission Management</h2>
            <p className="text-gray-500 text-sm mt-1">Configure marketplace commission rules and rates.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowSellerModal(true)}
              className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors">
              <Users className="w-4 h-4" /> Seller Rate
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors">
              <Plus className="w-4 h-4" /> New Rule
            </button>
          </div>
        </div>

        {/* Overview stats */}
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Commission",  value: formatPrice(overview.total_commission, "NGN"),  color: "text-green-400" },
              { label: "Total Gross Sales", value: formatPrice(overview.total_gross, "NGN"),        color: "text-white" },
              { label: "Pending Payouts",   value: overview.pending_payouts.toString(),             color: "text-amber-400" },
              { label: "Avg Rate",          value: `${overview.avg_rate}%`,                         color: "text-sky-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
                <p className={`text-xl font-black ${color}`}>{value}</p>
                <p className="text-gray-500 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Commission rules */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-white font-bold text-sm">Commission Rules</h3>
            <span className="text-gray-600 text-xs">{rules.length} rules</span>
          </div>
          {isLoading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {rules.map((rule: Rule) => (
                <div key={rule.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-medium text-sm">{rule.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rule.is_active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-500"
                      }`}>
                        {rule.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                      {rule.seller_type      && <span className="bg-white/[0.04] px-2 py-0.5 rounded">{rule.seller_type}</span>}
                      {rule.transaction_type && <span className="bg-white/[0.04] px-2 py-0.5 rounded">{rule.transaction_type}</span>}
                      {rule.category         && <span className="bg-white/[0.04] px-2 py-0.5 rounded">{rule.category}</span>}
                      {!rule.seller_type && !rule.transaction_type && !rule.category && <span className="text-gray-700">All sellers · All transactions</span>}
                      <span className="text-gray-700">Priority: {rule.priority}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-green-400 font-black text-xl">{rule.rate_percentage}%</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(rule)}
                      className="p-2 text-gray-500 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleToggle(rule)}
                      className={`p-2 rounded-lg transition-colors ${
                        rule.is_active
                          ? "text-green-500 hover:text-red-400 hover:bg-red-950/30"
                          : "text-gray-600 hover:text-green-400 hover:bg-green-950/30"
                      }`}>
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent payouts */}
        {payouts.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-white font-bold text-sm">Recent Seller Payouts</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["Order", "Gross", "Commission", "Rate", "Net", "Status"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-gray-600 text-xs font-bold uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {payouts.map((p: any) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-gray-400 text-xs font-mono">{p.order_id.substring(0, 8)}...</td>
                      <td className="px-5 py-3 text-white">{formatPrice(p.gross_amount, p.currency)}</td>
                      <td className="px-5 py-3 text-green-400 font-bold">{formatPrice(p.commission_amount, p.currency)}</td>
                      <td className="px-5 py-3 text-gray-400">{p.commission_rate}%</td>
                      <td className="px-5 py-3 text-white">{formatPrice(p.net_amount, p.currency)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.payout_status === "COMPLETED" ? "bg-green-500/20 text-green-400" :
                          p.payout_status === "PENDING"   ? "bg-amber-500/20 text-amber-400" :
                          "bg-gray-500/20 text-gray-400"
                        }`}>{p.payout_status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#0a1a0f] border border-white/[0.08] rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">{editingRule ? "Edit Rule" : "New Commission Rule"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-600 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Rule Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g. Verified Smallholder Farmer"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-700/50" />
              </div>
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Description</label>
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Optional description"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-700/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Commission Rate (%) *</label>
                  <input type="number" step="0.01" value={form.rate_percentage}
                    onChange={e => setForm({...form, rate_percentage: Number(e.target.value)})}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-700/50" />
                </div>
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Priority (higher = first)</label>
                  <input type="number" value={form.priority}
                    onChange={e => setForm({...form, priority: Number(e.target.value)})}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-700/50" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Seller Type</label>
                  <select value={form.seller_type} onChange={e => setForm({...form, seller_type: e.target.value})}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-3 text-white text-xs focus:outline-none appearance-none">
                    {SELLER_TYPES.map(t => <option key={t} value={t} className="bg-[#0a1a0f]">{t || "All"}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Transaction Type</label>
                  <select value={form.transaction_type} onChange={e => setForm({...form, transaction_type: e.target.value})}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-3 text-white text-xs focus:outline-none appearance-none">
                    {TRANSACTION_TYPES.map(t => <option key={t} value={t} className="bg-[#0a1a0f]">{t || "All"}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-3 text-white text-xs focus:outline-none appearance-none">
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0a1a0f]">{c || "All"}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Min Transaction Amount</label>
                  <input type="number" value={form.min_amount} onChange={e => setForm({...form, min_amount: e.target.value})}
                    placeholder="0"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-700/50" />
                </div>
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Max Transaction Amount</label>
                  <input type="number" value={form.max_amount} onChange={e => setForm({...form, max_amount: e.target.value})}
                    placeholder="Unlimited"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-700/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Effective From</label>
                  <input type="date" value={form.effective_from} onChange={e => setForm({...form, effective_from: e.target.value})}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-700/50" />
                </div>
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Effective Until</label>
                  <input type="date" value={form.effective_until} onChange={e => setForm({...form, effective_until: e.target.value})}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-700/50" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-white/[0.08] text-gray-400 hover:text-white text-sm font-medium transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingRule ? "Update Rule" : "Create Rule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seller-specific rate modal */}
      {showSellerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowSellerModal(false)} />
          <div className="relative bg-[#0a1a0f] border border-white/[0.08] rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Set Seller-Specific Rate</h3>
              <button onClick={() => setShowSellerModal(false)} className="text-gray-600 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Seller ID *</label>
                <input value={sellerForm.seller_id} onChange={e => setSellerForm({...sellerForm, seller_id: e.target.value})}
                  placeholder="Paste seller UUID"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-700/50 font-mono" />
              </div>
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Custom Rate (%) *</label>
                <input type="number" step="0.01" value={sellerForm.custom_rate}
                  onChange={e => setSellerForm({...sellerForm, custom_rate: e.target.value})}
                  placeholder="e.g. 2.5"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-700/50" />
              </div>
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Reason</label>
                <input value={sellerForm.reason} onChange={e => setSellerForm({...sellerForm, reason: e.target.value})}
                  placeholder="e.g. High-volume exporter agreement"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-700/50" />
              </div>
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Effective Until</label>
                <input type="date" value={sellerForm.effective_until}
                  onChange={e => setSellerForm({...sellerForm, effective_until: e.target.value})}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-700/50" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowSellerModal(false)}
                className="flex-1 py-3 rounded-xl border border-white/[0.08] text-gray-400 hover:text-white text-sm font-medium transition-colors">
                Cancel
              </button>
              <button onClick={handleSellerRate} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Set Rate
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}