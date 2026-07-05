"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import { LayoutDashboard, Package, ShoppingCart, MessageSquare, FileText, BarChart3, MapPin } from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  { label: "Overview",    href: "/dashboard/farmer",          icon: LayoutDashboard },
  { label: "My Products", href: "/dashboard/farmer/products", icon: Package },
  { label: "Orders",      href: "/dashboard/farmer/orders",   icon: ShoppingCart },
  { label: "Messages",    href: "/dashboard/farmer/messages", icon: MessageSquare, badge: 3 },
  { label: "RFQs",        href: "/dashboard/farmer/rfqs",     icon: FileText },
  { label: "Analytics",   href: "/dashboard/farmer/analytics",icon: BarChart3 },
];

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-500/20 text-amber-400 border-amber-700/40",
  confirmed: "bg-blue-500/20 text-blue-400 border-blue-700/40",
  shipped:   "bg-violet-500/20 text-violet-400 border-violet-700/40",
  delivered: "bg-green-500/20 text-green-400 border-green-700/40",
  completed: "bg-green-500/20 text-green-400 border-green-700/40",
  cancelled: "bg-red-500/20 text-red-400 border-red-700/40",
};

export default function FarmerOrdersPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["farmer-orders"],
    queryFn: async () => {
      const res = await apiClient.get("/orders?role=seller&page_size=50");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const orders = data?.data || [];

  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="Orders">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">My Orders</h2>
          <p className="text-gray-500 text-sm mt-1">{orders.length} orders received</p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ShoppingCart className="w-12 h-12 text-gray-700 mb-3" />
              <h3 className="text-white font-bold mb-1">No orders yet</h3>
              <p className="text-gray-600 text-sm">Orders from buyers will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-xs text-gray-600 font-medium uppercase tracking-wide">
                <div className="col-span-3">Order</div>
                <div className="col-span-3">Buyer</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Status</div>
              </div>
              {orders.map((order: any) => (
                <div key={order.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center">
                  <div className="col-span-3">
                    <p className="text-white font-bold text-sm">{order.order_number}</p>
                    <p className="text-gray-600 text-xs">{order.items?.length ?? 0} item(s)</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-gray-400 text-xs font-mono">{order.buyer_id?.slice(0, 12)}...</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-green-400 font-black">{formatPrice(order.total_amount, order.currency)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500 text-xs">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-500/20 text-gray-400 border-gray-700/40"}`}>
                      {order.status}
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