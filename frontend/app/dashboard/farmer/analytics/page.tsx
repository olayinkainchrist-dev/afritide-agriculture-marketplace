"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import { LayoutDashboard, Package, ShoppingCart, MessageSquare, FileText, BarChart3, TrendingUp, Eye, Star } from "lucide-react";
import { formatPrice, formatNumber } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview",    href: "/dashboard/farmer",          icon: LayoutDashboard },
  { label: "My Products", href: "/dashboard/farmer/products", icon: Package },
  { label: "Orders",      href: "/dashboard/farmer/orders",   icon: ShoppingCart },
  { label: "Messages",    href: "/dashboard/farmer/messages", icon: MessageSquare, badge: 3 },
  { label: "RFQs",        href: "/dashboard/farmer/rfqs",     icon: FileText },
  { label: "Analytics",   href: "/dashboard/farmer/analytics",icon: BarChart3 },
];

export default function FarmerAnalyticsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["seller-analytics"],
    queryFn: async () => {
      const res = await apiClient.get("/analytics/seller/dashboard");
      return res.data.data;
    },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated || !user) return null;

  const stats = [
    { label: "Total Products",  value: data?.total_products ?? 0,         icon: Package,    color: "text-green-400",  bg: "bg-green-950/50 border-green-900/50" },
    { label: "Active Products", value: data?.active_products ?? 0,        icon: TrendingUp, color: "text-sky-400",    bg: "bg-sky-950/50 border-sky-900/50" },
    { label: "Total Views",     value: formatNumber(data?.total_views ?? 0), icon: Eye,      color: "text-amber-400",  bg: "bg-amber-950/50 border-amber-900/50" },
    { label: "Total Orders",    value: data?.total_orders ?? 0,           icon: ShoppingCart, color: "text-violet-400", bg: "bg-violet-950/50 border-violet-900/50" },
    { label: "Completed",       value: data?.completed_orders ?? 0,       icon: ShoppingCart, color: "text-emerald-400", bg: "bg-emerald-950/50 border-emerald-900/50" },
    { label: "Total Revenue",   value: `$${formatNumber(data?.total_revenue ?? 0)}`, icon: TrendingUp, color: "text-rose-400", bg: "bg-rose-950/50 border-rose-900/50" },
    { label: "Rating",          value: `${(data?.rating_average ?? 0).toFixed(1)}★`, icon: Star, color: "text-amber-400", bg: "bg-amber-950/50 border-amber-900/50" },
    { label: "Total Views",     value: formatNumber(data?.total_views ?? 0), icon: Eye,      color: "text-sky-400",    bg: "bg-sky-950/50 border-sky-900/50" },
  ];

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="Analytics">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Analytics</h2>
          <p className="text-gray-500 text-sm mt-1">Your performance overview</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-white/[0.03] rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.slice(0, 6).map((stat) => (
              <div key={stat.label} className={`${stat.bg} border rounded-2xl p-5`}>
                <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
                <div className={`text-2xl font-black ${stat.color} mb-1`}>{stat.value}</div>
                <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Top products */}
        {data?.top_products?.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4">Top Performing Products</h3>
            <div className="space-y-3">
              {data.top_products.map((p: any, i: number) => (
                <div key={p.id} className="flex items-center gap-4 p-3 bg-white/[0.02] rounded-xl">
                  <span className="text-gray-600 font-black text-lg w-6">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{p.title}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-green-400 font-bold text-sm">{p.order_count} orders</p>
                    <p className="text-gray-600 text-xs">{formatNumber(p.view_count)} views</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}