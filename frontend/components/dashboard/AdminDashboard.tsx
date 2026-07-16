"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "./DashboardLayout";
import apiClient from "@/lib/api/client";
import {
  LayoutDashboard, Users, Package, ShoppingCart,
  TrendingUp, Shield, Bell,
  CheckCircle2, XCircle, Eye,
  BarChart3, Megaphone, DollarSign,
  ArrowUpRight, RefreshCw, Plus, Loader2,
  FileText, HeadphonesIcon,
} from "lucide-react";
import { User } from "@/types";
import { formatPrice, formatNumber, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "Overview",      href: "/dashboard/admin",              icon: LayoutDashboard },
  { label: "Users",         href: "/dashboard/admin/users",        icon: Users },
  { label: "Products",      href: "/dashboard/admin/products",     icon: Package },
  { label: "Orders",        href: "/dashboard/admin/orders",       icon: ShoppingCart },
  { label: "Sourcing",      href: "/dashboard/admin/sourcing",     icon: FileText },
  { label: "Commodities",   href: "/dashboard/admin/commodities",  icon: TrendingUp },
  { label: "Certificates",  href: "/dashboard/admin/certificates", icon: Shield },
  { label: "Announcements", href: "/dashboard/admin/announce",     icon: Megaphone },
  { label: "Analytics",     href: "/dashboard/admin/analytics",    icon: BarChart3 },
  { label: "Reports",       href: "/dashboard/admin/reports",      icon: BarChart3 },
  { label: "Support",       href: "/dashboard/admin/support",      icon: HeadphonesIcon },
];

interface Props { user: User; }

export default function AdminDashboard({ user }: Props) {
  const [activeTab,            setActiveTab]            = useState<"products" | "users" | "commodities">("products");
  const [announcementTitle,    setAnnouncementTitle]    = useState("");
  const [announcementMessage,  setAnnouncementMessage]  = useState("");
  const [sendingAnnouncement,  setSendingAnnouncement]  = useState(false);
  const queryClient = useQueryClient();

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/analytics");
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const { data: pendingProductsData, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ["pending-products"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/products/pending?page_size=20");
      return res.data;
    },
  });

  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/users?page_size=20");
      return res.data;
    },
  });

  const { data: commoditiesData, isLoading: commoditiesLoading, refetch: refetchCommodities } = useQuery({
    queryKey: ["admin-commodities"],
    queryFn: async () => {
      const res = await apiClient.get("/commodities?page_size=50");
      return res.data;
    },
  });

  const approveProduct = async (id: string) => {
    try {
      await apiClient.put(`/admin/products/${id}/approve`);
      toast.success("Product approved and published");
      refetchPending();
    } catch {
      toast.error("Failed to approve product");
    }
  };

  const rejectProduct = async (id: string) => {
    try {
      await apiClient.put(`/admin/products/${id}/reject?reason=Does not meet quality standards`);
      toast.success("Product rejected");
      refetchPending();
    } catch {
      toast.error("Failed to reject product");
    }
  };

  const approveKYC = async (id: string) => {
    try {
      await apiClient.put(`/admin/users/${id}/approve-kyc`);
      toast.success("User KYC approved");
      refetchUsers();
    } catch {
      toast.error("Failed to approve KYC");
    }
  };

  const suspendUser = async (id: string) => {
    try {
      await apiClient.put(`/admin/users/${id}/suspend`);
      toast.success("User suspended");
      refetchUsers();
    } catch {
      toast.error("Failed to suspend user");
    }
  };

  const sendAnnouncement = async () => {
    if (!announcementTitle || !announcementMessage) {
      toast.error("Please fill in both title and message");
      return;
    }
    setSendingAnnouncement(true);
    try {
      await apiClient.post(`/admin/announcements?title=${encodeURIComponent(announcementTitle)}&message=${encodeURIComponent(announcementMessage)}`);
      toast.success("Announcement sent to all users!");
      setAnnouncementTitle("");
      setAnnouncementMessage("");
    } catch {
      toast.error("Failed to send announcement");
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const analytics      = analyticsData;
  const pendingProducts = pendingProductsData?.data || [];
  const users          = usersData?.data            || [];
  const commodities    = commoditiesData?.data       || [];

  const stats = [
    { label: "Total Users",     value: formatNumber(analytics?.total_users      ?? 0), icon: Users,        color: "text-green-400", bg: "bg-green-950/50 border-green-900/50",  trend: `+${analytics?.new_users_30d ?? 0} this month` },
    { label: "Active Products", value: formatNumber(analytics?.active_products  ?? 0), icon: Package,      color: "text-sky-400",   bg: "bg-sky-950/50 border-sky-900/50",      trend: `${analytics?.pending_products ?? 0} pending` },
    { label: "Total Orders",    value: formatNumber(analytics?.total_orders     ?? 0), icon: ShoppingCart, color: "text-amber-400", bg: "bg-amber-950/50 border-amber-900/50",  trend: "all time" },
    { label: "Total Revenue",   value: formatNumber(analytics?.total_revenue    ?? 0), icon: DollarSign,   color: "text-rose-400",  bg: "bg-rose-950/50 border-rose-900/50",    trend: "NGN · completed orders" },
  ];

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="Admin Dashboard">

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className={`${stat.bg} border rounded-2xl p-5 transition-all hover:scale-[1.02]`}>
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-xs text-gray-600">{stat.trend}</span>
            </div>
            {analyticsLoading
              ? <div className="h-8 bg-white/[0.05] rounded-lg animate-pulse mb-1" />
              : <div className={`text-3xl font-black ${stat.color} mb-1`}>{stat.value}</div>
            }
            <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Top countries */}
      {analytics?.top_countries?.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 mb-6">
          <h3 className="text-white font-bold mb-4 text-sm">Top Countries</h3>
          <div className="flex flex-wrap gap-2">
            {analytics.top_countries.map((c: any) => (
              <div key={c.country} className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2">
                <span className="text-white text-sm font-medium">{c.country}</span>
                <span className="text-gray-500 text-xs">{c.count} users</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Main panel */}
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">

          <div className="flex border-b border-white/[0.06] bg-white/[0.02]">
            {(["products", "users", "commodities"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3.5 text-sm font-semibold capitalize transition-all border-b-2 ${
                  activeTab === tab
                    ? "border-green-500 text-green-400"
                    : "border-transparent text-gray-500 hover:text-white"
                }`}>
                {tab === "products"
                  ? `Pending Products ${pendingProducts.length > 0 ? `(${pendingProducts.length})` : ""}`
                  : tab === "users" ? "All Users"
                  : "Price Board"}
              </button>
            ))}
          </div>

          {/* Pending Products */}
          {activeTab === "products" && (
            <div>
              {pendingLoading ? (
                <div className="p-5 space-y-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />)}
                </div>
              ) : pendingProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-700 mb-3" />
                  <h3 className="text-white font-bold mb-1">All caught up!</h3>
                  <p className="text-gray-600 text-sm">No products pending review</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {pendingProducts.map((product: any) => (
                    <div key={product.id} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{product.title}</p>
                        <p className="text-gray-600 text-xs mt-0.5 capitalize">
                          {product.category?.toLowerCase()} · Seller: {product.seller_id?.slice(0, 8)}...
                        </p>
                        <p className="text-gray-700 text-xs">{formatDate(product.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => approveProduct(product.id)}
                          className="flex items-center gap-1.5 bg-green-600/20 hover:bg-green-600/40 border border-green-700/40 text-green-400 text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button onClick={() => rejectProduct(product.id)}
                          className="flex items-center gap-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-700/30 text-red-400 text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Users */}
          {activeTab === "users" && (
            <div>
              {usersLoading ? (
                <div className="p-5 space-y-3">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-white/[0.03] rounded-xl animate-pulse" />)}
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {users.slice(0, 15).map((u: any) => (
                    <div key={u.id} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-green-900/40 flex items-center justify-center text-green-400 font-black text-xs flex-shrink-0">
                        {u.first_name?.[0]}{u.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">
                          {u.first_name} {u.last_name}
                        </p>
                        <p className="text-gray-600 text-xs truncate">
                          {u.email} · <span className="capitalize">{u.role?.toLowerCase()}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${
                          u.status === "ACTIVE" || u.status === "VERIFIED"
                            ? "bg-green-500/20 text-green-400 border-green-700/40"
                            : u.status === "PENDING"
                            ? "bg-amber-500/20 text-amber-400 border-amber-700/40"
                            : "bg-red-500/20 text-red-400 border-red-700/40"
                        }`}>
                          {u.status?.toLowerCase()}
                        </span>
                        {!u.kyc_approved && u.kyc_submitted && (
                          <button onClick={() => approveKYC(u.id)}
                            className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-700/40 hover:bg-blue-500/30 transition-colors">
                            Verify KYC
                          </button>
                        )}
                        {u.status === "ACTIVE" && (
                          <button onClick={() => suspendUser(u.id)}
                            className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-700/30 hover:bg-red-500/20 transition-colors">
                            Suspend
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Commodities */}
          {activeTab === "commodities" && (
            <div>
              <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                <p className="text-gray-400 text-sm">{commodities.length} commodities on price board</p>
                <button onClick={() => refetchCommodities()}
                  className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
              {commoditiesLoading ? (
                <div className="p-5 space-y-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />)}
                </div>
              ) : commodities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                  <TrendingUp className="w-10 h-10 text-gray-700 mb-3" />
                  <h3 className="text-white font-bold mb-1">Price board is empty</h3>
                  <p className="text-gray-600 text-sm mb-4">Add commodities to display live prices</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {commodities.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                      <div>
                        <p className="text-white font-semibold text-sm">{c.commodity_name}</p>
                        <p className="text-gray-600 text-xs">{c.market || "Global"} · per {c.unit?.toLowerCase()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-black">{formatPrice(c.price, c.currency)}</p>
                        <p className={`text-xs font-medium ${
                          c.trend === "UP" ? "text-green-400"
                          : c.trend === "DOWN" ? "text-red-400"
                          : "text-gray-500"
                        }`}>
                          {c.trend === "UP" ? "▲" : c.trend === "DOWN" ? "▼" : "—"}
                          {c.change_percentage ? ` ${Math.abs(c.change_percentage).toFixed(1)}%` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">

          {/* Platform summary */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-white font-bold mb-4 text-sm">Platform Summary</h3>
            <div className="space-y-3">
              {[
                { label: "Total Farmers",   value: analytics?.total_farmers    ?? 0, color: "text-green-400" },
                { label: "Total Buyers",    value: analytics?.total_buyers     ?? 0, color: "text-sky-400" },
                { label: "New Users (30d)", value: analytics?.new_users_30d    ?? 0, color: "text-amber-400" },
                { label: "Total Products",  value: analytics?.total_products   ?? 0, color: "text-violet-400" },
                { label: "Pending Review",  value: analytics?.pending_products ?? 0, color: "text-rose-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                  <span className="text-gray-500 text-xs">{label}</span>
                  <span className={`${color} font-black text-sm`}>{formatNumber(value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Send announcement */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-white font-bold mb-4 text-sm flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-400" />
              Send Announcement
            </h3>
            <div className="space-y-3">
              <input type="text" value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="Title..."
                className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
              <textarea value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
                placeholder="Message to all users..."
                rows={3}
                className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none" />
              <button onClick={sendAnnouncement} disabled={sendingAnnouncement}
                className="w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-700/40 text-amber-400 font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                {sendingAnnouncement
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                  : <><Megaphone className="w-4 h-4" /> Send to All Users</>
                }
              </button>
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-white font-bold mb-4 text-sm">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "Add Commodity Price", href: "/dashboard/admin/commodities",                                              icon: Plus,      color: "text-green-400" },
                { label: "View All Products",   href: "/marketplace",                                                              icon: Package,   color: "text-sky-400" },
                { label: "Sourcing Requests",   href: "/dashboard/admin/sourcing",                                                 icon: FileText,  color: "text-violet-400" },
                { label: "Analytics Report",    href: "/dashboard/admin/analytics",                                                icon: BarChart3, color: "text-amber-400" },
                { label: "Support Tickets",     href: "/dashboard/admin/support",                                                  icon: HeadphonesIcon, color: "text-rose-400" },
                { label: "API Documentation",   href: "https://afritide-agriculture-marketplace.onrender.com/api/docs",            icon: Eye,       color: "text-gray-400" },
              ].map(({ label, href, icon: Icon, color }) => (
                <Link key={href} href={href} target={href.startsWith("http") ? "_blank" : undefined}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-all group">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-gray-400 group-hover:text-white text-sm transition-colors">{label}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-gray-400 ml-auto transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}