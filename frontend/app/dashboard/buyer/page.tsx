"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import {
  LayoutDashboard, ShoppingCart, Heart,
  MessageSquare, FileText, Bell, Users,
  Package, TrendingUp, ArrowRight, Clock,
} from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview",          href: "/dashboard/buyer",           icon: LayoutDashboard },
  { label: "My Orders",         href: "/dashboard/buyer/orders",    icon: ShoppingCart },
  { label: "Wishlist",          href: "/dashboard/buyer/wishlist",  icon: Heart },
  { label: "My Suppliers",      href: "/dashboard/buyer/suppliers", icon: Users },
  { label: "Messages",          href: "/dashboard/buyer/messages",  icon: MessageSquare },
  { label: "Sourcing Requests", href: "/dashboard/buyer/rfqs",      icon: FileText },
  { label: "Alerts",            href: "/dashboard/buyer/alerts",    icon: Bell },
];

export default function BuyerDashboardPage() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.push("/login");
  }, [hasHydrated, isAuthenticated, router]);

  const { data: ordersData } = useQuery({
    queryKey: ["buyer-recent-orders"],
    queryFn: async () => {
      const res = await apiClient.get("/orders?page_size=5");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const { data: rfqData } = useQuery({
    queryKey: ["buyer-recent-rfqs"],
    queryFn: async () => {
      const res = await apiClient.get("/rfqs?role=buyer&page_size=5");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const { data: cartData } = useQuery({
    queryKey: ["buyer-cart"],
    queryFn: async () => {
      const res = await apiClient.get("/cart");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const orders       = ordersData?.data || [];
  const rfqs         = rfqData?.data || [];
  const cartItems    = cartData?.data?.items || [];
  const cartSubtotal = cartData?.data?.subtotal || 0;

  if (!hasHydrated) return null;
  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="Dashboard">
      <div className="space-y-6">

        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-black text-white">
            Welcome back, {user.first_name}! 👋
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Here&apos;s what&apos;s happening with your account
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Orders",     value: orders.length,    icon: ShoppingCart, color: "text-green-400",  href: "/dashboard/buyer/orders" },
            { label: "Active RFQs",      value: rfqs.filter((r: any) => r.status === "open").length, icon: FileText, color: "text-blue-400", href: "/dashboard/buyer/rfqs" },
            { label: "Cart Items",       value: cartItems.length, icon: Package,      color: "text-amber-400", href: "/cart" },
            { label: "Pending Quotes",   value: rfqs.filter((r: any) => r.status === "quoted").length, icon: TrendingUp, color: "text-violet-400", href: "/dashboard/buyer/rfqs" },
          ].map(({ label, value, icon: Icon, color, href }) => (
            <Link key={label} href={href}
              className="bg-white/[0.03] border border-white/[0.07] hover:border-green-700/40 rounded-2xl p-5 transition-all group">
              <Icon className={`w-5 h-5 ${color} mb-3 group-hover:scale-110 transition-transform`} />
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-gray-600 text-xs mt-0.5">{label}</p>
            </Link>
          ))}
        </div>

        {/* Cart summary */}
        {cartItems.length > 0 && (
          <div className="bg-green-950/30 border border-green-800/30 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-green-400 font-bold text-sm">You have items in your cart</p>
              <p className="text-gray-400 text-xs mt-0.5">
                {cartItems.length} item{cartItems.length !== 1 ? "s" : ""} —
                Total: <span className="text-white font-bold">{formatPrice(cartSubtotal, cartItems[0]?.currency || "NGN")}</span>
              </p>
            </div>
            <Link href="/checkout"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors">
              Checkout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Recent orders */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-white font-bold text-sm">Recent Orders</h3>
              <Link href="/dashboard/buyer/orders" className="text-green-400 hover:text-green-300 text-xs transition-colors">
                View all →
              </Link>
            </div>
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ShoppingCart className="w-8 h-8 text-gray-700 mb-2" />
                <p className="text-gray-600 text-sm">No orders yet</p>
                <Link href="/marketplace" className="text-green-400 text-xs mt-2 hover:text-green-300">
                  Browse marketplace →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {orders.slice(0, 5).map((order: any) => (
                  <div key={order.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{order.order_number}</p>
                      <p className="text-gray-600 text-xs">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold text-sm">{formatPrice(order.total_amount, order.currency)}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        order.status === "confirmed"  ? "bg-green-500/20 text-green-400" :
                        order.status === "pending"    ? "bg-amber-500/20 text-amber-400" :
                        order.status === "delivered"  ? "bg-blue-500/20 text-blue-400"   :
                        "bg-gray-500/20 text-gray-400"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent sourcing requests */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-white font-bold text-sm">Sourcing Requests</h3>
              <Link href="/dashboard/buyer/rfqs" className="text-green-400 hover:text-green-300 text-xs transition-colors">
                View all →
              </Link>
            </div>
            {rfqs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <FileText className="w-8 h-8 text-gray-700 mb-2" />
                <p className="text-gray-600 text-sm">No sourcing requests yet</p>
                <Link href="/dashboard/buyer/rfqs" className="text-green-400 text-xs mt-2 hover:text-green-300">
                  Submit a request →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {rfqs.slice(0, 5).map((rfq: any) => (
                  <div key={rfq.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium truncate max-w-[160px]">{rfq.product_name}</p>
                      <p className="text-gray-600 text-xs">{rfq.quantity} {rfq.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {rfq.status === "quoted" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 animate-pulse">
                          Quote Ready!
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        rfq.status === "open"     ? "bg-green-500/20 text-green-400" :
                        rfq.status === "quoted"   ? "bg-blue-500/20 text-blue-400"   :
                        rfq.status === "accepted" ? "bg-emerald-500/20 text-emerald-400" :
                        "bg-gray-500/20 text-gray-400"
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

        {/* Quick actions */}
        <div>
          <h3 className="text-white font-bold text-sm mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Browse Marketplace", href: "/marketplace",          icon: Package,       color: "text-green-400" },
              { label: "My Suppliers",       href: "/dashboard/buyer/suppliers", icon: Users,    color: "text-blue-400" },
              { label: "Price Board",        href: "/commodities",           icon: TrendingUp,    color: "text-amber-400" },
              { label: "My Alerts",          href: "/dashboard/buyer/alerts",icon: Bell,          color: "text-violet-400" },
            ].map(({ label, href, icon: Icon, color }) => (
              <Link key={label} href={href}
                className="bg-white/[0.03] border border-white/[0.07] hover:border-green-700/40 rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-all group">
                <Icon className={`w-6 h-6 ${color} group-hover:scale-110 transition-transform`} />
                <p className="text-gray-400 text-xs font-medium group-hover:text-white transition-colors">{label}</p>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
