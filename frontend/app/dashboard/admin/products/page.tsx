"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth.store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import {
  LayoutDashboard, Users, Package, ShoppingCart,
  TrendingUp, Shield, Megaphone, BarChart3,
  CheckCircle2, XCircle, Eye, Loader2,
  ChevronUp,
} from "lucide-react";
import { formatDate, formatPrice, getCategoryLabel } from "@/lib/utils";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  { label: "Overview",      href: "/dashboard/admin",              icon: LayoutDashboard },
  { label: "Users",         href: "/dashboard/admin/users",        icon: Users },
  { label: "Products",      href: "/dashboard/admin/products",     icon: Package },
  { label: "Orders",        href: "/dashboard/admin/orders",       icon: ShoppingCart },
  { label: "Commodities",   href: "/dashboard/admin/commodities",  icon: TrendingUp },
  { label: "Certificates",  href: "/dashboard/admin/certificates", icon: Shield },
  { label: "Announcements", href: "/dashboard/admin/announce",     icon: Megaphone },
  { label: "Analytics",     href: "/dashboard/admin/analytics",    icon: BarChart3 },
];

const STATUS_TABS = [
  { key: "pending_review", label: "Pending Review" },
  { key: "active",         label: "Approved" },
  { key: "rejected",       label: "Rejected" },
  { key: "all",            label: "All" },
];

const STATUS_COLORS: Record<string, string> = {
  pending_review: "bg-amber-500/20 text-amber-400 border-amber-700/40",
  active:         "bg-green-500/20 text-green-400 border-green-700/40",
  rejected:       "bg-red-500/20 text-red-400 border-red-700/40",
  archived:       "bg-gray-500/20 text-gray-400 border-gray-700/40",
  draft:          "bg-gray-500/20 text-gray-400 border-gray-700/40",
};

export default function AdminProductsPage() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const router      = useRouter();
  const queryClient = useQueryClient();

  const [activeTab,    setActiveTab]    = useState("pending_review");
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [approving,    setApproving]    = useState<string | null>(null);
  const [rejecting,    setRejecting]    = useState<string | null>(null);
  const [rejectModal,  setRejectModal]  = useState<{ id: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) router.push("/login");
    else if (user?.role !== "ADMIN") router.push("/dashboard/farmer");
  }, [hasHydrated, isAuthenticated, user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", activeTab],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: "100", status: activeTab });
      const res = await apiClient.get(`/admin/products?${params}`);
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const products = data?.data || [];

  const handleApprove = async (id: string) => {
    setApproving(id);
    try {
      await apiClient.put(`/admin/products/${id}/approve`);
      toast.success("Product approved and published ✅");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setExpandedId(null);
    } catch {
      toast.error("Failed to approve product");
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) { toast.error("Please enter a rejection reason"); return; }
    setRejecting(rejectModal.id);
    try {
      await apiClient.put(`/admin/products/${rejectModal.id}/reject?reason=${encodeURIComponent(rejectReason)}`);
      toast.success("Product rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setRejectModal(null);
      setRejectReason("");
      setExpandedId(null);
    } catch {
      toast.error("Failed to reject product");
    } finally {
      setRejecting(null);
    }
  };

  if (!hasHydrated) return null;
  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="Product Moderation">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Product Moderation</h2>
          <p className="text-gray-500 text-sm mt-1">Review and approve seller product listings</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setExpandedId(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? "bg-green-600 text-white"
                  : "bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]"
              }`}>
              {tab.label}
              {tab.key === "pending_review" && products.length > 0 && activeTab === "pending_review" && (
                <span className="ml-2 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {products.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-white/[0.03] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-700 mb-3" />
              <h3 className="text-white font-bold mb-1">
                {activeTab === "pending_review" ? "All caught up!" : "No products found"}
              </h3>
              <p className="text-gray-600 text-sm">
                {activeTab === "pending_review" ? "No products pending review" : "No products in this category"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-600 font-medium uppercase tracking-wide">
                <div className="col-span-5">Product</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-2">Submitted</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-2">Actions</div>
              </div>

              {products.map((product: any) => {
                const isExpanded = expandedId === product.id;
                return (
                  <div key={product.id}>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center">

                      <div className="col-span-5 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.08] flex-shrink-0">
                          {product.main_image
                            ? <img src={product.main_image} alt="" className="w-full h-full object-cover" />
                            : <Package className="w-5 h-5 text-gray-700 m-auto mt-3.5" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-bold text-sm truncate">{product.title}</p>
                          <p className="text-gray-600 text-xs capitalize">
                            {getCategoryLabel(product.category)} · {product.unit}
                          </p>
                        </div>
                      </div>

                      <div className="col-span-2">
                        <p className="text-green-400 font-black text-sm">
                          {formatPrice(product.price, product.currency)}
                        </p>
                        <p className="text-gray-700 text-[10px]">per {product.unit}</p>
                      </div>

                      <div className="col-span-2">
                        <p className="text-gray-500 text-xs">{formatDate(product.created_at)}</p>
                      </div>

                      <div className="col-span-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                          STATUS_COLORS[product.status] ?? "bg-gray-500/20 text-gray-400 border-gray-700/40"
                        }`}>
                          {product.status?.replace("_", " ")}
                        </span>
                      </div>

                      <div className="col-span-2 flex items-center gap-2">
                        <button onClick={() => setExpandedId(isExpanded ? null : product.id)}
                          className="p-1.5 text-gray-600 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>

                        {product.status === "pending_review" && (
                          <>
                            <button onClick={() => handleApprove(product.id)}
                              disabled={approving === product.id}
                              className="flex items-center gap-1 bg-green-600/20 hover:bg-green-600/40 border border-green-700/40 text-green-400 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-colors disabled:opacity-50">
                              {approving === product.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <CheckCircle2 className="w-3 h-3" />
                              }
                              Approve
                            </button>
                            <button
                              onClick={() => { setRejectModal({ id: product.id, title: product.title }); setRejectReason(""); }}
                              className="flex items-center gap-1 bg-red-600/10 hover:bg-red-600/20 border border-red-700/30 text-red-400 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-colors">
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-5 pb-5 bg-white/[0.01] border-t border-white/[0.04]">
                        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                          {product.images?.length > 0 && (
                            <div>
                              <p className="text-gray-600 text-[10px] uppercase tracking-widest font-bold mb-2">Images</p>
                              <div className="grid grid-cols-4 gap-2">
                                {product.images.map((img: string, i: number) => (
                                  <img key={i} src={img} alt=""
                                    className="aspect-square rounded-xl object-cover border border-white/[0.08]" />
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="space-y-3">
                            <p className="text-gray-600 text-[10px] uppercase tracking-widest font-bold">Details</p>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { label: "Category",     value: getCategoryLabel(product.category) },
                                { label: "Price",        value: formatPrice(product.price, product.currency) },
                                { label: "Stock",        value: `${product.quantity_available} ${product.unit}` },
                                { label: "Min Order",    value: `${product.minimum_order_quantity} ${product.unit}` },
                                { label: "Location",     value: [product.city, product.state, product.country].filter(Boolean).join(", ") || "—" },
                                { label: "Organic",      value: product.is_organic ? "Yes" : "No" },
                                { label: "Export Ready", value: product.is_export_ready ? "Yes" : "No" },
                                { label: "Negotiable",   value: product.is_negotiable ? "Yes" : "No" },
                              ].map(({ label, value }) => (
                                <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                                  <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-0.5">{label}</p>
                                  <p className="text-white text-xs font-medium">{value}</p>
                                </div>
                              ))}
                            </div>

                            {product.description && (
                              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                                <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-1">Description</p>
                                <p className="text-gray-400 text-xs leading-relaxed line-clamp-4">{product.description}</p>
                              </div>
                            )}

                            {product.rejection_reason && (
                              <div className="bg-red-950/20 border border-red-800/30 rounded-xl p-3">
                                <p className="text-red-400 text-[10px] uppercase tracking-wide mb-1">Rejection Reason</p>
                                <p className="text-red-300 text-xs">{product.rejection_reason}</p>
                              </div>
                            )}

                            {product.status === "pending_review" && (
                              <div className="flex gap-2 pt-2">
                                <button onClick={() => handleApprove(product.id)}
                                  disabled={approving === product.id}
                                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                                  {approving === product.id
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <CheckCircle2 className="w-4 h-4" />
                                  }
                                  Approve & Publish
                                </button>
                                <button
                                  onClick={() => { setRejectModal({ id: product.id, title: product.title }); setRejectReason(""); }}
                                  className="flex-1 flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-700/40 text-red-400 font-bold py-2.5 rounded-xl text-sm transition-colors">
                                  <XCircle className="w-4 h-4" /> Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {rejectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a1a0f] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Reject Product</h3>
            <p className="text-gray-500 text-sm mb-4">
              Rejecting: <span className="text-white font-medium">{rejectModal.title}</span>
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason — this will be sent to the seller..."
              rows={4}
              className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-red-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-gray-400 hover:text-white text-sm font-medium transition-colors">
                Cancel
              </button>
              <button onClick={handleReject} disabled={!!rejecting}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
