"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useCartStore } from "@/lib/store/cart.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import {
  LayoutDashboard, ShoppingCart, Heart,
  MessageSquare, FileText, Bell, Users,
  RefreshCw, Loader2, ChevronDown, ChevronUp,
  CheckCircle2, Clock, Truck, Package,
  MapPin, AlertCircle,
} from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  { label: "Overview",          href: "/dashboard/buyer",           icon: LayoutDashboard },
  { label: "My Orders",         href: "/dashboard/buyer/orders",    icon: ShoppingCart },
  { label: "Wishlist",          href: "/dashboard/buyer/wishlist",  icon: Heart },
  { label: "My Suppliers",      href: "/dashboard/buyer/suppliers", icon: Users },
  { label: "Messages",          href: "/dashboard/buyer/messages",  icon: MessageSquare },
  { label: "Sourcing Requests", href: "/dashboard/buyer/rfqs",      icon: FileText },
  { label: "Alerts",            href: "/dashboard/buyer/alerts",    icon: Bell },
];

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-amber-500/20 text-amber-400 border-amber-700/40",
  confirmed:  "bg-blue-500/20 text-blue-400 border-blue-700/40",
  processing: "bg-violet-500/20 text-violet-400 border-violet-700/40",
  shipped:    "bg-sky-500/20 text-sky-400 border-sky-700/40",
  delivered:  "bg-green-500/20 text-green-400 border-green-700/40",
  completed:  "bg-green-500/20 text-green-400 border-green-700/40",
  cancelled:  "bg-red-500/20 text-red-400 border-red-700/40",
  disputed:   "bg-orange-500/20 text-orange-400 border-orange-700/40",
};

const TIMELINE_STEPS = [
  { status: "pending",   label: "Order Placed", icon: Clock },
  { status: "confirmed", label: "Confirmed",    icon: CheckCircle2 },
  { status: "shipped",   label: "Shipped",      icon: Truck },
  { status: "delivered", label: "Delivered",    icon: MapPin },
  { status: "completed", label: "Completed",    icon: Package },
];

const STATUS_ORDER = ["pending", "confirmed", "shipped", "delivered", "completed"];

function OrderTimeline({ order }: { order: any }) {
  const currentIdx  = STATUS_ORDER.indexOf(order.status);
  const isCancelled = order.status === "cancelled";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 py-3">
        <AlertCircle className="w-4 h-4 text-red-400" />
        <p className="text-red-400 text-sm font-medium">Order Cancelled</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 py-3 overflow-x-auto">
      {TIMELINE_STEPS.map((step, idx) => {
        const isDone    = currentIdx >= idx;
        const isCurrent = currentIdx === idx;
        const Icon      = step.icon;
        return (
          <div key={step.status} className="flex items-center gap-1 flex-shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isDone
                  ? isCurrent
                    ? "bg-green-500 text-white ring-2 ring-green-500/30"
                    : "bg-green-900/60 text-green-400"
                  : "bg-white/[0.04] text-gray-700 border border-white/[0.08]"
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <p className={`text-[9px] font-medium whitespace-nowrap ${
                isDone ? "text-green-400" : "text-gray-700"
              }`}>
                {step.label}
              </p>
            </div>
            {idx < TIMELINE_STEPS.length - 1 && (
              <div className={`w-8 h-px mb-4 flex-shrink-0 ${
                currentIdx > idx ? "bg-green-700" : "bg-white/[0.08]"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BuyerOrdersPage() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const { setItems }                           = useCartStore();
  const router                                 = useRouter();
  const [reordering,   setReordering]   = useState<string | null>(null);
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.push("/login");
  }, [hasHydrated, isAuthenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-orders"],
    queryFn: async () => {
      const res = await apiClient.get("/orders?role=buyer&page_size=50");
      return res.data;
    },
    enabled:         isAuthenticated,
    refetchInterval: 30_000,
  });

  const allOrders = data?.data || [];
  const orders    = filterStatus === "all"
    ? allOrders
    : allOrders.filter((o: any) => o.status === filterStatus);

  const handleReorder = async (order: any) => {
    if (!order.items || order.items.length === 0) {
      toast.error("No items found in this order");
      return;
    }
    setReordering(order.id);
    try {
      let successCount = 0;
      for (const item of order.items) {
        try {
          await apiClient.post("/cart/items", {
            product_id: item.product_id,
            quantity:   item.quantity,
          });
          successCount++;
        } catch {
          // Product may no longer be available
        }
      }

      if (successCount === 0) {
        toast.error("None of the products are currently available");
        return;
      }

      const cartRes = await apiClient.get("/cart");
      setItems(cartRes.data?.data?.items || []);

      if (successCount < order.items.length) {
        toast.success(`${successCount} of ${order.items.length} items added to cart`);
      } else {
        toast.success("All items added to cart!");
      }

      router.push("/cart");
    } catch {
      toast.error("Failed to reorder");
    } finally {
      setReordering(null);
    }
  };

  if (!hasHydrated) return null;
  if (!isAuthenticated || !user) return null;

  const counts = {
    all:       allOrders.length,
    pending:   allOrders.filter((o: any) => o.status === "pending").length,
    shipped:   allOrders.filter((o: any) => o.status === "shipped").length,
    completed: allOrders.filter((o: any) => ["completed", "delivered"].includes(o.status)).length,
  };

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="My Orders">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">My Orders</h2>
          <p className="text-gray-500 text-sm mt-1">{allOrders.length} orders placed</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "all",       label: "All",        count: counts.all },
            { key: "pending",   label: "Pending",    count: counts.pending },
            { key: "shipped",   label: "In Transit", count: counts.shipped },
            { key: "completed", label: "Completed",  count: counts.completed },
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

        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-white/[0.03] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl flex flex-col items-center justify-center py-20 text-center">
              <ShoppingCart className="w-12 h-12 text-gray-700 mb-3" />
              <h3 className="text-white font-bold mb-1">No orders yet</h3>
              <p className="text-gray-600 text-sm mb-5">
                Browse the marketplace and place your first order
              </p>
              <a href="/marketplace"
                className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                Browse Marketplace
              </a>
            </div>
          ) : (
            orders.map((order: any) => {
              const isExpanded = expandedId === order.id;
              return (
                <div key={order.id}
                  className="bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] rounded-2xl overflow-hidden transition-all">

                  <div className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-white font-bold text-sm">{order.order_number}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                            STATUS_COLORS[order.status] ?? "bg-gray-500/20 text-gray-400 border-gray-700/40"
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-gray-600 text-xs">
                          {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""} ·
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      <p className="text-green-400 font-black text-sm flex-shrink-0">
                        {formatPrice(order.total_amount, order.currency)}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="text-gray-600 hover:text-white transition-colors flex-shrink-0 p-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="px-5 border-t border-white/[0.04]">
                    <OrderTimeline order={order} />
                  </div>

                  {order.tracking_number && (
                    <div className="px-5 pb-3">
                      <div className="bg-sky-950/20 border border-sky-800/30 rounded-xl px-3 py-2 flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 text-sky-400" />
                        <p className="text-sky-400 text-xs font-bold">
                          Tracking: {order.tracking_number}
                        </p>
                      </div>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-white/[0.04] pt-4 space-y-3">
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

                      {order.buyer_notes && (
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                          <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-1">Your Notes</p>
                          <p className="text-gray-400 text-xs">{order.buyer_notes}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={() => handleReorder(order)}
                          disabled={reordering === order.id}
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-green-950/40 hover:bg-green-900/50 text-green-400 border border-green-800/40 transition-all disabled:opacity-50">
                          {reordering === order.id
                            ? <><Loader2 className="w-3 h-3 animate-spin" /> Reordering...</>
                            : <><RefreshCw className="w-3 h-3" /> Reorder</>
                          }
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}