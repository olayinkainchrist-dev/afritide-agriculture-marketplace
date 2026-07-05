"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ADMIN_NAV } from "@/components/dashboard/AdminNav";
import apiClient from "@/lib/api/client";
import { Users, Package, ShoppingCart, TrendingUp, DollarSign, Globe } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default function AdminAnalyticsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
    else if (user?.role !== "admin") router.push("/dashboard/farmer");
  }, [isAuthenticated, user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics-full"],
    queryFn: async () => {
      const res = await apiClient.get("/analytics/admin/dashboard");
      return res.data.data;
    },
    enabled: isAuthenticated && user?.role === "admin",
  });

  if (!isAuthenticated || !user) return null;

  const stats = [
    { label: "Total Users",      value: formatNumber(data?.total_users ?? 0),      icon: Users,        color: "text-green-400",  bg: "bg-green-950/50 border-green-900/50" },
    { label: "Total Farmers",    value: formatNumber(data?.total_farmers ?? 0),     icon: Users,        color: "text-emerald-400", bg: "bg-emerald-950/50 border-emerald-900/50" },
    { label: "Total Buyers",     value: formatNumber(data?.total_buyers ?? 0),      icon: Users,        color: "text-sky-400",     bg: "bg-sky-950/50 border-sky-900/50" },
    { label: "New Users (30d)",  value: formatNumber(data?.new_users_30d ?? 0),     icon: TrendingUp,   color: "text-amber-400",   bg: "bg-amber-950/50 border-amber-900/50" },
    { label: "Total Products",   value: formatNumber(data?.total_products ?? 0),    icon: Package,      color: "text-violet-400",  bg: "bg-violet-950/50 border-violet-900/50" },
    { label: "Active Products",  value: formatNumber(data?.active_products ?? 0),   icon: Package,      color: "text-green-400",   bg: "bg-green-950/50 border-green-900/50" },
    { label: "Pending Products", value: formatNumber(data?.pending_products ?? 0),  icon: Package,      color: "text-rose-400",    bg: "bg-rose-950/50 border-rose-900/50" },
    { label: "Total Orders",     value: formatNumber(data?.total_orders ?? 0),      icon: ShoppingCart, color: "text-amber-400",   bg: "bg-amber-950/50 border-amber-900/50" },
    { label: "Total Revenue",    value: `$${formatNumber(data?.total_revenue ?? 0)}`, icon: DollarSign, color: "text-green-400",   bg: "bg-green-950/50 border-green-900/50" },
  ];

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="Analytics">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Platform Analytics</h2>
          <p className="text-gray-500 text-sm mt-1">Full platform performance overview</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => <div key={i} className="h-28 bg-white/[0.03] rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className={`${stat.bg} border rounded-2xl p-5`}>
                <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
                <div className={`text-3xl font-black ${stat.color} mb-1`}>{stat.value}</div>
                <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Top countries */}
        {data?.top_countries?.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
            <h3 className="text-white font-bold mb-5 flex items-center gap-2">
              <Globe className="w-4 h-4 text-green-500" /> Top Countries
            </h3>
            <div className="space-y-3">
              {data.top_countries.map((c: any, i: number) => (
                <div key={c.country} className="flex items-center gap-4">
                  <span className="text-gray-600 font-black w-5 text-sm">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium text-sm">{c.country}</span>
                      <span className="text-gray-500 text-xs">{c.count} users</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (c.count / (data.total_users || 1)) * 100)}%` }}
                      />
                    </div>
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