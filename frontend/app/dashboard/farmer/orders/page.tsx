"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import {
  LayoutDashboard, Package, ShoppingCart,
  MessageSquare, FileText, BarChart3,
  ChevronDown, ChevronUp, CheckCircle2,
  Truck, XCircle, Loader2, Clock,
} from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  { label: "Overview",    href: "/dashboard/farmer",           icon: LayoutDashboard },
  { label: "My Products", href: "/dashboard/farmer/products",  icon: Package },
  { label: "Orders",      href: "/dashboard/farmer/orders",    icon: ShoppingCart },
  { label: "Messages",    href: "/dashboard/farmer/messages",  icon: MessageSquare },
  { label: "RFQs",        href: "/dashboard/farmer/rfqs",      icon: FileText },
  { label: "Analytics",   href: "/dashboard/farmer/analytics", icon: BarChart3 },
];

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-amber-500/20 text-amber-400 border-amber-700/40",
  confirmed:  "bg-blue-500/20 text-blue-400 border-blue-700/40",
  processing: "bg-violet-500/20 text-violet-400 border-violet-700/40",
  shipped:    "bg-sky-500/20 text-sky-400 border-sky-700/40",
  delivered:  "bg-green-500/20 text-green-400 border-green-700/40",
  completed:  "bg-green-500/20 text-green-400 border-green-700/40",
  cancelled:  "bg-red-500/20 text-red-400 border-red-700/40",
};

const STATUS_FLOW = ["pending", "confirmed", "shipped", "delivered", "completed"];

export default function FarmerOrdersPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [updating,   setUpdating]     = useState<string | null>(null);
  const [tracking,   setTracking]     = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["farmer-orders"],
    queryFn: async () => {
      const res = await apiClient.get("/orders?role=seller&page_size=100");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const allOrders = data?.data || [];
  const orders    = filterStatus === "all"
    ? allOrders
    : allOrders.filter((o: any) => o.status === filterStatus);

  const handleUpdateStatus = async (order: any, newStatus: string) => {
    setUpdating(order.id);
    try {
      const payload: any = { status: newStatus };
      if (newStatus === "shipped" && tracking[order.id]) {
        payload.tracking_number = tracking[order.id];
      }
      await apiClient.put(`/orders/${order.id}/status`, payload);
      toast.success(`Order ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["farmer-orders"] });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update order");
    } finally {
      setUpdating(null);
    }
  };

  const getNextStatus = (current: string) => {
    const idx = STATUS_FLOW.indexOf(current);
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  };

  if (!isAuthenticated || !user) return null;

  const counts = {
    all:       allOrders.length,
    pending:   allOrders.filter((o: any) => o.status === "pending").length,
    confirmed: allOrders.filter((o: any) => o.status === "confirmed").length,
    shipped:   allOrders.filter((o: any) => o.status === "shipped").length,
    completed: allOrders.filter((o: any) => o.status === "completed").length,
  };

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="Orders">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Incoming Orders</h2>
          <p className="text-gray-500 text-sm mt-1">{allOrders.length} orders received</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "all",       label: "All",       count: counts.all },
            { key: "pending",   label: "Pending",   count: counts.pending },
            { key: "confirmed", label: "Confirmed", count: counts.confirmed },
            { key: "shipped",   label: "Shipped",   count: counts.shipped },
            { key: "completed", label: "Completed", count: counts.completed },
          ].map(({ key, label, count }) => (
            <button key={key} onClick={() => setFilterStatus(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filterStatus === key
                  ? "bg-green-600 text-white"
                  : "bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]"
              }`}>
              {label}
              {count > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  filterStatus === key ? "bg-white/20 text-white" : "bg-white/[0.08] text-gray-400"
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ShoppingCart className="w-12 h-12 text-gray-700 mb-3" />
              <h3 className="text-white font-bold mb-1">No orders yet</h3>
              <p className="text-gray-600 text-sm">Orders from buyers will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-600 font-medium uppercase tracking-wide">
                <div className="col-span-3">Order</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-3">Action</div>
              </div>

              {orders.map((order: any) => {
                const nextStatus = getNextStatus(order.status);
                const isUpdating = updating === order.id;
                const isExpanded = expandedId === order.id;

                return (
                  <div key={order.id}>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center">

                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setExpandedId(isExpanded ? null : order.id)}
                            className="text-gray-600 hover:text-white transition-colors">
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4" />
                              : <ChevronDown className="w-4 h-4" />
                            }
                          </button>
                          <div>
                            <p className="text-white font-bold text-sm">{order.order_number}</p>
                            <p className="text-gray-600 text-xs">{order.items?.length ?? 0} item(s)</p>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2">
                        <p className="text-green-400 font-black text-sm">
                          {formatPrice(order.total_amount, order.currency)}
                        </p>
                      </div>

                      <div className="col-span-2">
                        <p className="text-gray-500 text-xs">{formatDate(order.created_at)}</p>
                      </div>

                      <div className="col-span-2">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${
                          STATUS_COLORS[order.status] ?? "bg-gray-500/20 text-gray-400 border-gray-700/40"
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="col-span-3 flex items-center gap-2">
                        {nextStatus && order.status !== "cancelled" && (
                          <>
                            {nextStatus === "shipped" && (
                              <input
                                value={tracking[order.id] || ""}
                                onChange={e => setTracking(prev => ({ ...prev, [order.id]: e.target.value }))}
                                placeholder="Tracking no."
                                className="w-24 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-green-700/50"
                              />
                            )}
                            <button
                              onClick={() => handleUpdateStatus(order, nextStatus)}
                              disabled={isUpdating}
                              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-50 ${
                                nextStatus === "confirmed" ? "bg-blue-950/40 hover:bg-blue-900/50 text-blue-400 border border-blue-800/40" :
                                nextStatus === "shipped"   ? "bg-sky-950/40 hover:bg-sky-900/50 text-sky-400 border border-sky-800/40" :
                                nextStatus === "delivered" ? "bg-violet-950/40 hover:bg-violet-900/50 text-violet-400 border border-violet-800/40" :
                                "bg-green-950/40 hover:bg-green-900/50 text-green-400 border border-green-800/40"
                              }`}>
                              {isUpdating
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : nextStatus === "confirmed" ? <CheckCircle2 className="w-3 h-3" />
                                : nextStatus === "shipped"   ? <Truck className="w-3 h-3" />
                                : <Clock className="w-3 h-3" />
                              }
                              {isUpdating ? "Updating..." : `Mark ${nextStatus}`}
                            </button>
                          </>
                        )}
                        {order.status === "pending" && (
                          <button
                            onClick={() => handleUpdateStatus(order, "cancelled")}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-800/40 transition-all disabled:opacity-50">
                            <XCircle className="w-3 h-3" /> Cancel
                          </button>
                        )}
                        {order.status === "completed" && (
                          <span className="text-green-400 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Fulfilled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expanded order items */}
                    {isExpanded && (
                      <div className="px-5 pb-5 bg-white/[0.01] border-t border-white/[0.04]">
                        <div className="pt-4 space-y-3">
                          <p className="text-gray-600 text-[10px] uppercase tracking-widest font-bold">Order Items</p>
                          {order.items?.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                              {item.product_snapshot?.image && (
                                <img src={item.product_snapshot.image} alt=""
                                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">
                                  {item.product_snapshot?.title || "Product"}
                                </p>
                                <p className="text-gray-600 text-xs">
                                  {item.quantity} {item.unit} × {formatPrice(item.unit_price, order.currency)}
                                </p>
                              </div>
                              <p className="text-green-400 font-black text-sm flex-shrink-0">
                                {formatPrice(item.total_price, order.currency)}
                              </p>
                            </div>
                          ))}

                          {/* Tracking info */}
                          {order.tracking_number && (
                            <div className="bg-sky-950/20 border border-sky-800/30 rounded-xl p-3 mt-2">
                              <p className="text-sky-400 text-xs font-bold">
                                🚚 Tracking: {order.tracking_number}
                              </p>
                            </div>
                          )}

                          {/* Order notes */}
                          {order.buyer_notes && (
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                              <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-1">Buyer Notes</p>
                              <p className="text-gray-400 text-xs">{order.buyer_notes}</p>
                            </div>
                          )}
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
    </DashboardLayout>
  );
}