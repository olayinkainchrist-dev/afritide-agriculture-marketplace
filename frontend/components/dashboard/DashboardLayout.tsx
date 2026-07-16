"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth.store";
import {
  Leaf, Settings, LogOut, Menu, X, BadgeCheck,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import NotificationBell from "@/components/shared/NotificationBell";
import TradingAssistant from "@/components/ai/TradingAssistant";

interface NavItem {
  label: string;
  href:  string;
  icon:  React.ElementType;
  badge?: number;
}

interface Props {
  children:  React.ReactNode;
  navItems:  NavItem[];
  title:     string;
}

export default function DashboardLayout({ children, navItems, title }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#060f08] flex">

      {/* Sidebar */}
      <>
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-[#07120a] border-r border-white/[0.06] z-50 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}>

          {/* Logo */}
          <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-black text-white">Afritide</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User profile */}
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3 p-3 bg-white/[0.04] rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-green-700 flex items-center justify-center text-white font-black text-sm flex-shrink-0 overflow-hidden">
                {user?.profile_image
                  ? <img src={user.profile_image} alt="" className="w-full h-full object-cover" />
                  : getInitials(`${user?.first_name} ${user?.last_name}`)
                }
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-white font-bold text-sm truncate">
                    {user?.business_name || `${user?.first_name} ${user?.last_name}`}
                  </p>
                  {user?.badge !== "NONE" && <BadgeCheck className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                </div>
                <p className="text-gray-600 text-xs capitalize truncate">
                  {user?.role?.replace(/_/g, " ").toLowerCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-3 overflow-y-auto space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${
                    isActive
                      ? "bg-green-600/20 text-green-400 border border-green-700/40"
                      : "text-gray-500 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-4 h-4 ${isActive ? "text-green-400" : "text-gray-600 group-hover:text-white"}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 && (
                    <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="p-3 border-t border-white/[0.06] space-y-1">
            <Link href="/settings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.05] transition-all">
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Settings</span>
            </Link>
            <button onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-all">
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </aside>
      </>

      {/* Main content */}
      <div className="flex-1 min-w-0 lg:ml-64 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#07120a]/95 backdrop-blur-xl border-b border-white/[0.06] px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white font-bold text-base">{title}</h1>
              <p className="text-gray-600 text-xs hidden sm:block">
                Welcome back, {user?.first_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link href="/marketplace"
              className="hidden sm:flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 bg-green-950/40 border border-green-800/40 px-3 py-2 rounded-xl transition-colors font-medium">
              View Marketplace →
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* AI Trading Assistant — floating on all dashboard pages */}
      <TradingAssistant />
    </div>
  );
}