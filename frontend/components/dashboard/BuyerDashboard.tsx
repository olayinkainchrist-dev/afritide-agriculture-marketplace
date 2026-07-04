"use client";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "./DashboardLayout";
import {
  LayoutDashboard, ShoppingCart, Heart,
  MessageSquare, FileText, Bell,
  Package, MapPin, Star, ArrowUpRight,
  TrendingUp, Search, Clock, CheckCircle2,
} from "lucide-react";
import { User } from "@/types";
import { formatPrice, getCategoryLabel } from "@/lib/utils";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "Overview",   href: "/dashboard/buyer",          icon: LayoutDashboard },
  { label: "My Orders",  href: "/dashboard/buyer/orders",   icon: ShoppingCart },
  { label: "Wishlist",   href: "/dashboard/buyer/wishlist", icon: Heart },
  { label: "Messages",   href: "/dashboard/buyer/messages", icon: MessageSquare, badge: 2 },
  { label: "My RFQs",    href: "/dashboard/buyer/rfqs",     icon: FileText },
  { label: "Alerts",     href: "/dashboard/buyer/alerts",   icon: Bell },
];

interface Props { user: User; }

export default function BuyerDashboard({ user }: Props) {
  const stats = [
    { label: "Total Orders",   value: user.total_orders ?? 0,   icon: ShoppingCart, color: "text-green-400",  bg: "bg-green-950/50 border-green-900/50" },
    { label: "Total Spent",    value: `$${(user.total_spent ?? 0).toLocaleString()}`, icon: TrendingUp, color: "text-sky-400", bg: "bg-sky-950/50 border-sky-900/50" },
    { label: "Saved Products", value: "—",                      icon: Heart,        color: "text-rose-400",   bg: "bg-rose-950/50 border-rose-900/50" },
    { label: "Active RFQs",    value: "—",                      icon: FileText,     color: "text-amber-400",  bg: "bg-amber-950/50 border-amber-900/50" },
  ];

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="Buyer Dashboard">

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className={`${stat.bg} border rounded-2xl p-5 transition-all hover:scale-[1.02]`}>
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className={`text-3xl font-black ${stat.color} mb-1`}>{stat.value}</div>
            <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Recent orders */}
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
            <h2 className="text-white font-bold">Recent Orders</h2>
            <Link href="/dashboard/buyer/orders" className="text-green-400 hover:text-green-300 text-xs font-medium transition-colors">
              View all →
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-gray-700" />
            </div>
            <h3 className="text-white font-bold mb-2">No orders yet</h3>
            <p className="text-gray-600 text-sm mb-5 max-w-xs">
              Browse the marketplace and place your first order from verified African farmers.
            </p>
            <Link href="/marketplace"
              className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2">
              <Search className="w-4 h-4" /> Browse Marketplace
            </Link>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">

          {/* Account status */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-white font-bold mb-4 text-sm">Account Status</h3>
            <div className="space-y-3">
              {[
                { label: "Email Verified", done: user.email_verified },
                { label: "Phone Verified", done: user.phone_verified },
                { label: "KYC Approved",   done: user.kyc_approved },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{label}</span>
                  {done
                    ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                    : <Clock className="w-4 h-4 text-amber-500" />
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
            <h3 className="text-white font-bold mb-4 text-sm">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "Browse Marketplace",  href: "/marketplace",          icon: Search,       color: "text-green-400" },
                { label: "View Wishlist",        href: "/dashboard/buyer/wishlist", icon: Heart,   color: "text-rose-400" },
                { label: "Send RFQ",             href: "/dashboard/buyer/rfqs", icon: FileText,     color: "text-amber-400" },
                { label: "Messages",             href: "/dashboard/buyer/messages", icon: MessageSquare, color: "text-violet-400" },
                { label: "Live Price Board",     href: "/commodities",          icon: TrendingUp,   color: "text-sky-400" },
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
        </div>
      </div>

      {/* Featured categories */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold">Browse by Category</h2>
          <Link href="/marketplace" className="text-green-400 hover:text-green-300 text-xs font-medium transition-colors">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {[
            { id: "livestock",  label: "Livestock",  emoji: "🐄" },
            { id: "cash_crops", label: "Cash Crops", emoji: "🌿" },
            { id: "dairy",      label: "Dairy",      emoji: "🥛" },
            { id: "fruits",     label: "Fruits",     emoji: "🥭" },
            { id: "fishery",    label: "Fishery",    emoji: "🐟" },
          ].map((cat) => (
            <Link key={cat.id} href={`/marketplace?category=${cat.id}`}
              className="bg-white/[0.03] border border-white/[0.06] hover:border-green-800/50 rounded-2xl p-4 text-center transition-all hover:-translate-y-0.5 group">
              <div className="text-2xl mb-2">{cat.emoji}</div>
              <p className="text-gray-400 group-hover:text-white text-xs font-medium transition-colors">{cat.label}</p>
            </Link>
          ))}
        </div>
      </div>

    </DashboardLayout>
  );
}