"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ADMIN_NAV } from "@/components/dashboard/AdminNav";
import apiClient from "@/lib/api/client";
import { Plus, Edit2, Trash2, TrendingUp, Loader2, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

const CATEGORIES  = ["Grains", "Livestock", "Cash Crops", "Fruits", "Vegetables", "Fishery", "Dairy", "Oils"];
const UNITS       = ["kg", "tonne", "litre", "piece", "bag", "head"];
const CURRENCIES  = ["USD", "NGN", "GBP", "EUR", "GHS", "CFA"];
const MARKETS     = ["Lagos", "Kano", "Kaduna", "Abuja", "Accra", "Nairobi", "London", "New York", "Rotterdam", "Dubai"];
const PRICE_TYPES = [
  { value: "farm_gate",     label: "Farm Gate" },
  { value: "wholesale",     label: "Wholesale" },
  { value: "retail",        label: "Retail" },
  { value: "export",        label: "Export" },
  { value: "international", label: "International" },
];

const EMPTY_FORM = {
  commodity_name:    "",
  category:          "Cash Crops",
  price_type:        "wholesale",
  price:             "",
  currency:          "NGN",
  unit:              "tonne",
  market:            "Lagos",
  region:            "",
  country:           "Nigeria",
  is_export_price:   false,
  is_domestic_price: true,
  source:            "",
  notes:             "",
};

export default function AdminCommoditiesPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [showForm,   setShowForm]   = useState(false);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
    else if (user?.role !== "ADMIN") router.push("/dashboard/farmer");
  }, [isAuthenticated, user, router]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-commodities-full"],
    queryFn: async () => {
      const res = await apiClient.get("/commodities?page_size=100");
      return res.data;
    },
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  const commodities = data?.data || [];

  const handleSave = async () => {
    if (!form.commodity_name || !form.price) {
      toast.error("Name and price are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        is_export_price:   form.price_type === "export" || form.price_type === "international",
        is_domestic_price: form.price_type !== "export" && form.price_type !== "international",
      };
      if (editingId) {
        await apiClient.put(`/commodities/${editingId}`, payload);
        toast.success("Commodity updated");
      } else {
        await apiClient.post("/commodities", payload);
        toast.success("Commodity added to price board");
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c: any) => {
    setForm({
      commodity_name:    c.commodity_name,
      category:          c.category || "Cash Crops",
      price_type:        c.price_type || "wholesale",
      price:             c.price.toString(),
      currency:          c.currency,
      unit:              c.unit,
      market:            c.market || "Lagos",
      region:            c.region || "",
      country:           c.country || "Nigeria",
      is_export_price:   c.is_export_price,
      is_domestic_price: c.is_domestic_price,
      source:            c.source || "",
      notes:             c.notes || "",
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from price board?`)) return;
    try {
      await apiClient.delete(`/commodities/${id}`);
      toast.success("Removed from price board");
      refetch();
    } catch { toast.error("Failed to remove"); }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="Commodity Prices">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Commodity Price Board</h2>
            <p className="text-gray-500 text-sm mt-1">{commodities.length} commodities listed</p>
          </div>
          <button
            onClick={() => { setForm({ ...EMPTY_FORM }); setEditingId(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-3 rounded-xl transition-colors text-sm shadow-lg shadow-green-900/30"
          >
            <Plus className="w-4 h-4" /> Add Commodity
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white/[0.03] border border-green-800/40 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold">{editingId ? "Edit Commodity" : "Add New Commodity"}</h3>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-gray-500 hover:text-white transition-colors" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">

              {/* Commodity Name */}
              <div className="col-span-2 md:col-span-1">
                <label className="text-xs text-gray-500 mb-1.5 block">Commodity Name *</label>
                <input
                  value={form.commodity_name}
                  onChange={e => setForm({ ...form, commodity_name: e.target.value })}
                  placeholder="e.g. Cocoa Beans"
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3 focus:outline-none appearance-none">
                  {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0a1a0f]">{c}</option>)}
                </select>
              </div>

              {/* Price Type */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Price Type *</label>
                <select value={form.price_type} onChange={e => setForm({ ...form, price_type: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3 focus:outline-none appearance-none">
                  {PRICE_TYPES.map(p => <option key={p.value} value={p.value} className="bg-[#0a1a0f]">{p.label}</option>)}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Price *</label>
                <input
                  type="number" step="0.01"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Currency</label>
                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3 focus:outline-none appearance-none">
                  {CURRENCIES.map(c => <option key={c} value={c} className="bg-[#0a1a0f]">{c}</option>)}
                </select>
              </div>

              {/* Unit */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Unit</label>
                <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3 focus:outline-none appearance-none">
                  {UNITS.map(u => <option key={u} value={u} className="bg-[#0a1a0f]">{u}</option>)}
                </select>
              </div>

              {/* Market */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Market</label>
                <select value={form.market} onChange={e => setForm({ ...form, market: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3 focus:outline-none appearance-none">
                  {MARKETS.map(m => <option key={m} value={m} className="bg-[#0a1a0f]">{m}</option>)}
                </select>
              </div>

              {/* Region */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Region</label>
                <input
                  value={form.region}
                  onChange={e => setForm({ ...form, region: e.target.value })}
                  placeholder="e.g. North West, South West"
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                />
              </div>

              {/* Country */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Country</label>
                <input
                  value={form.country}
                  onChange={e => setForm({ ...form, country: e.target.value })}
                  placeholder="e.g. Nigeria"
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                />
              </div>

              {/* Source */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Source</label>
                <input
                  value={form.source}
                  onChange={e => setForm({ ...form, source: e.target.value })}
                  placeholder="e.g. CBOT, FAO"
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                />
              </div>

            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1.5 block">Notes</label>
              <input
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes about this price..."
                className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm">
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  : editingId ? "Update Price" : "Add to Board"
                }
              </button>
              <button onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-white font-medium px-4 py-3 rounded-xl hover:bg-white/[0.05] transition-all text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Commodities table */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />)}
            </div>
          ) : commodities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <TrendingUp className="w-10 h-10 text-gray-700 mb-3" />
              <h3 className="text-white font-bold mb-1">Price board is empty</h3>
              <p className="text-gray-600 text-sm mb-4">Add commodities to display live prices to buyers</p>
              <button onClick={() => setShowForm(true)}
                className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                Add First Commodity
              </button>
            </div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-600 font-medium uppercase tracking-wide">
                <div className="col-span-3">Commodity</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-2">Market / Region</div>
                <div className="col-span-1">Trend</div>
                <div className="col-span-2">Actions</div>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {commodities.map((c: any) => (
                  <div key={c.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center">
                    <div className="col-span-3">
                      <p className="text-white font-semibold text-sm">{c.commodity_name}</p>
                      <p className="text-gray-600 text-[10px]">{c.category}</p>
                    </div>
                    <div className="col-span-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                        c.price_type === "farm_gate"     ? "bg-green-500/20 text-green-400 border-green-700/40" :
                        c.price_type === "wholesale"     ? "bg-blue-500/20 text-blue-400 border-blue-700/40" :
                        c.price_type === "retail"        ? "bg-amber-500/20 text-amber-400 border-amber-700/40" :
                        c.price_type === "export"        ? "bg-violet-500/20 text-violet-400 border-violet-700/40" :
                        c.price_type === "international" ? "bg-sky-500/20 text-sky-400 border-sky-700/40" :
                        "bg-gray-500/20 text-gray-400 border-gray-700/40"
                      }`}>
                        {c.price_type?.replace("_", " ") || "wholesale"}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-green-400 font-black text-sm">{formatPrice(c.price, c.currency)}</p>
                      <p className="text-gray-600 text-xs">per {c.unit}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400 text-xs">{c.market || "—"}</p>
                      <p className="text-gray-600 text-[10px]">{c.region ? `${c.region}, ` : ""}{c.country || "—"}</p>
                    </div>
                    <div className="col-span-1">
                      <span className={`text-sm font-black ${
                        c.trend === "up"   ? "text-green-400" :
                        c.trend === "down" ? "text-red-400"   : "text-gray-500"
                      }`}>
                        {c.trend === "up" ? "▲" : c.trend === "down" ? "▼" : "—"}
                        {c.change_percentage ? ` ${Math.abs(c.change_percentage).toFixed(1)}%` : ""}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <button onClick={() => handleEdit(c)}
                        className="p-2 text-gray-500 hover:text-green-400 hover:bg-green-950/30 rounded-lg transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id, c.commodity_name)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

