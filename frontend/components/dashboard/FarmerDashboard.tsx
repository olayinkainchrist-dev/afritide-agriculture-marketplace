"use client";
import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/lib/api/products.api";
import DashboardLayout from "./DashboardLayout";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth.store";
import {
  LayoutDashboard, Package, ShoppingCart,
  MessageSquare, FileText, TrendingUp,
  BarChart3, Plus, Eye, Star,
  ArrowUpRight, AlertCircle,
  Clock, CheckCircle2,
} from "lucide-react";
import { User } from "@/types";
import { formatPrice, formatNumber, getCategoryLabel } from "@/lib/utils";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "Overview",    href: "/dashboard/farmer",           icon: LayoutDashboard },
  { label: "My Products", href: "/dashboard/farmer/products",  icon: Package },
  { label: "Orders",      href: "/dashboard/farmer/orders",    icon: ShoppingCart },
  { label: "Messages",    href: "/dashboard/farmer/messages",  icon: MessageSquare },
  { label: "RFQs",        href: "/dashboard/farmer/rfqs",      icon: FileText },
  { label: "Analytics",   href: "/dashboard/farmer/analytics", icon: BarChart3 },
];

interface Props { user: User; }

export default function FarmerDashboard({ user }: Props) {
  const { isAuthenticated } = useAuthStore();

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["my-products"],
    queryFn:  () => productsApi.getMyProducts({ page_size: 50 }),
    enabled:  isAuthenticated,
  });

  const { data: ordersData } = useQuery({
    queryKey: ["farmer-recent-orders"],
    queryFn:  async () => {
      const res = await apiClient.get("/orders?role=seller&page_size=5");
      return res.data;
    },
    refetchInterval: 30_000,
    enabled:         isAuthenticated,
  });

  const products        = productsData?.data || [];
  const recentOrders    = ordersData?.data   || [];
  const activeProducts  = products.filter(p => p.status === "ACTIVE").length;
  const pendingProducts = products.filter(p => p.status === "pending_review").length;
  const totalViews      = products.reduce((sum, p) => sum + p.view_count, 0);
  const totalOrders     = products.reduce((sum, p) => sum + p.order_count, 0);
  const pendingOrders   = recentOrders.filter((o: any) =>
    o.status === "PENDING" || o.status === "CONFIRMED"
  ).length;

  const stats = [
    { label: "Active Listings", value: activeProducts,           icon: Package,     color: "text-green-400", bg: "bg-green-950/50 border-green-900/50",  trend: `${pendingProducts} pending` },
    { label: "Total Views",     value: formatNumber(totalViews), icon: Eye,         color: "text-sky-400",   bg: "bg-sky-950/50 border-sky-900/50",      trend: "all time" },
    { label: "Total Orders",    value: totalOrders,              icon: ShoppingCart,color: "text-amber-400", bg: "bg-amber-950/50 border-amber-900/50",  trend: `${pendingOrders} to fulfill` },
    { label: "Avg. Rating",     value: user.rating_average.toFixed(1), icon: Star,  color: "text-rose-400",  bg: "bg-rose-950/50 border-rose-900/50",    trend: `${user.rating_count} reviews` },
  ];

  const ORDER_STATUS_COLORS: Record<string, string> = {
    PENDING:    "bg-amber-500/20 text-amber-400 border-amber-700/40",
    CONFIRMED:  "bg-blue-500/20 text-blue-400 border-blue-700/40",
    PROCESSING: "bg-violet-500/20 text-violet-400 border-violet-700/40",
    SHIPPED:    "bg-sky-500/20 text-sky-400 border-sky-700/40",
    DELIVERED:  "bg-green-500/20 text-green-400 border-green-700/40",
    COMPLETED:  "bg-green-500/20 text-green-400 border-green-700/40",
    CANCELLED:  "bg-red-500/20 text-red-400 border-red-700/40",
  };

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="Farmer Dashboard">

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className={`${stat.bg} border rounded-2xl p-5 transition-all hover:scale-[1.02]`}>
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-xs text-gray-600">{stat.trend}</span>
            </div>
            <div className={`text-3xl font-black ${stat.color} mb-1`}>{stat.value}</div>
            <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* My Products */}
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
            <h2 className="text-white font-bold">My Listings</h2>
            <Link href="/products/new"
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Product
            </Link>
          </div>

          {productsLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-5">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-gray-700" />
              </div>
              <h3 className="text-white font-bold mb-2">No products yet</h3>
              <p className="text-gray-600 text-sm mb-5 max-w-xs">
                Start listing your agricultural products to reach buyers worldwide.
              </p>
              <Link href="/products/new"
                className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" /> List First Product
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {products.slice(0, 6).map((product) => (
                <div key={product.id} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-green-950/50 border border-white/[0.06] flex-shrink-0">
                    {product.main_image
                      ? <img src={product.main_image} alt="" className="w-full h-full object-cover" />
                      : <Package className="w-5 h-5 text-green-800 m-auto mt-3.5" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{product.title}</p>
                    <p className="text-gray-600 text-xs">
                      {getCategoryLabel(product.category)} · {formatPrice(product.price, product.currency)}/{product.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-white text-xs font-bold">{formatNumber(product.view_count)} views</p>
                      <p className="text-gray-600 text-[10px]">{product.order_count} orders</p>
                    </div>
                    <StatusBadge status={product.status} />
                  </div>
                </div>
              ))}
              {products.length > 6 && (
                <div className="p-4 text-center">
                  <Link href="/dashboard/farmer/products"
                    className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors">
                    View all {products.length} products →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Account status */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-white font-bold mb-4 text-sm">Account Status</h3>
            <div className="space-y-3">
              {[
                { label: "Email Verified",   done: user.email_verified },
                { label: "KYC Approved",     done: user.kyc_approved },
                { label: "Profile Complete", done: !!(user.bio && user.country) },
                { label: "Subscription",     done: user.subscription_plan !== "free", note: user.subscription_plan },
              ].map(({ label, done, note }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{label}</span>
                  <div className="flex items-center gap-1.5">
                    {note && <span className="text-gray-600 text-[10px] capitalize">{note}</span>}
                    {done
                      ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                      : <AlertCircle className="w-4 h-4 text-amber-500" />
                    }
                  </div>
                </div>
              ))}
            </div>
            {!user.kyc_approved && (
              <Link href="/verify"
                className="mt-4 w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-700/40 text-amber-400 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Complete KYC Verification
              </Link>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-white font-bold mb-4 text-sm">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "Add New Product",  href: "/products/new",              icon: Plus,         color: "text-green-400" },
                { label: "View Marketplace", href: "/marketplace",               icon: Eye,          color: "text-sky-400" },
                { label: "Check Messages",   href: "/dashboard/farmer/messages", icon: MessageSquare,color: "text-violet-400" },
                { label: "View RFQs",        href: "/dashboard/farmer/rfqs",     icon: FileText,     color: "text-amber-400" },
                { label: "Analytics",        href: "/dashboard/farmer/analytics",icon: TrendingUp,   color: "text-rose-400" },
              ].map(({ label, href, icon: Icon, color }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-all group">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-gray-400 group-hover:text-white text-sm transition-colors">{label}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-gray-400 ml-auto transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {pendingProducts > 0 && (
            <div className="bg-amber-950/40 border border-amber-800/40 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-bold text-sm">Pending Review</span>
              </div>
              <p className="text-amber-600 text-xs">
                {pendingProducts} product{pendingProducts > 1 ? "s" : ""} awaiting admin approval.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden mb-8">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="text-white font-bold">Recent Orders</h2>
          <Link href="/dashboard/farmer/orders"
            className="text-green-400 hover:text-green-300 text-xs font-medium transition-colors">
            View all →
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ShoppingCart className="w-8 h-8 text-gray-700 mb-2" />
            <p className="text-gray-600 text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {recentOrders.map((order: any) => (
              <div key={order.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-white font-bold text-sm">{order.order_number}</p>
                  <p className="text-gray-600 text-xs">{order.items?.length ?? 0} item(s)</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-black text-sm">
                    {formatPrice(order.total_amount, order.currency)}
                  </p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                    ORDER_STATUS_COLORS[order.status] ?? "bg-gray-500/20 text-gray-400 border-gray-700/40"
                  }`}>
                    {order.status?.toLowerCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance overview */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
        <h2 className="text-white font-bold mb-6">Performance Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Response Rate",   value: `${user.response_rate.toFixed(0)}%`,   desc: "of inquiries answered",    good: user.response_rate > 80 },
            { label: "Rating Average",  value: `${user.rating_average.toFixed(1)}★`,  desc: `from ${user.rating_count} reviews`, good: user.rating_average >= 4 },
            { label: "Total Sales",     value: user.total_sales,                       desc: "completed orders",         good: user.total_sales > 0 },
            { label: "Active Products", value: activeProducts,                         desc: "live listings",            good: activeProducts > 0 },
          ].map(({ label, value, desc, good }) => (
            <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
              <div className={`text-2xl font-black mb-1 ${good ? "text-green-400" : "text-gray-500"}`}>{value}</div>
              <div className="text-white text-xs font-semibold mb-1">{label}</div>
              <div className="text-gray-600 text-[10px]">{desc}</div>
            </div>
          ))}
        </div>
      </div>

    </DashboardLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    active:         { label: "ACTIVE",    class: "bg-green-500/20 text-green-400 border-green-700/40" },
    pending_review: { label: "PENDING",   class: "bg-amber-500/20 text-amber-400 border-amber-700/40" },
    draft:          { label: "Draft",     class: "bg-gray-500/20 text-gray-400 border-gray-700/40" },
    out_of_stock:   { label: "No Stock",  class: "bg-red-500/20 text-red-400 border-red-700/40" },
    suspended:      { label: "SUSPENDED", class: "bg-red-500/20 text-red-400 border-red-700/40" },
    rejected:       { label: "Rejected",  class: "bg-red-500/20 text-red-400 border-red-700/40" },
    archived:       { label: "Archived",  class: "bg-gray-500/20 text-gray-400 border-gray-700/40" },
  } as Record<string, { label: string; class: string }>;

  const c = config[status] ?? { label: status, class: "bg-gray-500/20 text-gray-400 border-gray-700/40" };

  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${c.class}`}>
      {c.label}
    </span>
  );
}
