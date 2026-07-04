"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, Search, Bell, ChevronDown, Leaf, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";
import { getInitials } from "@/lib/utils";

const categories = [
  { label: "🐄 Livestock", href: "/marketplace?category=livestock" },
  { label: "🌿 Cash Crops", href: "/marketplace?category=cash_crops" },
  { label: "🥛 Dairy", href: "/marketplace?category=dairy" },
  { label: "🥭 Fruits", href: "/marketplace?category=fruits" },
  { label: "🥬 Vegetables", href: "/marketplace?category=vegetables" },
  { label: "🐟 Fishery", href: "/marketplace?category=fishery" },
  { label: "🚜 Machinery", href: "/marketplace?category=machinery" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <nav className="bg-[#060f08]/95 backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-50">
      {/* Top announcement bar */}
      <div className="bg-green-500/10 border-b border-green-900/40 text-center py-2 px-4">
        <p className="text-green-400 text-xs font-medium">
          🌍 Africa&apos;s #1 Agricultural Marketplace — <Link href="/register" className="underline hover:text-green-300">Join free today</Link>
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black text-white">Afritide</span>
          </Link>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-lg mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="text"
                placeholder="Search products, farmers, countries..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-700/60 focus:bg-white/[0.07] transition-all"
              />
            </div>
          </div>

          {/* Nav links */}
          <div className="hidden lg:flex items-center gap-1">
            <div className="relative" onMouseEnter={() => setCatOpen(true)} onMouseLeave={() => setCatOpen(false)}>
              <button className="flex items-center gap-1 text-gray-400 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/[0.05] transition-all">
                Categories <ChevronDown className={`w-3.5 h-3.5 transition-transform ${catOpen ? "rotate-180" : ""}`} />
              </button>
              {catOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-[#0a1a0f] border border-white/[0.08] rounded-xl shadow-2xl py-2 z-50">
                  {categories.map((c) => (
                    <Link key={c.href} href={c.href}
                      className="block px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link href="/commodities" className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/[0.05] transition-all">
              <TrendingUp className="w-3.5 h-3.5" /> Price Board
            </Link>
            <Link href="/farmers" className="text-gray-400 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/[0.05] transition-all">
              Farmers
            </Link>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 ml-auto">
            {isAuthenticated && user ? (
              <>
                <button className="relative p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-400 rounded-full" />
                </button>
                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/[0.05] transition-colors">
                    <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white text-xs font-black">
                      {getInitials(`${user.first_name} ${user.last_name}`)}
                    </div>
                    <span className="hidden md:block text-sm font-medium text-gray-300">{user.first_name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-[#0a1a0f] border border-white/[0.08] rounded-xl shadow-2xl py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <div className="px-4 py-2 border-b border-white/[0.06] mb-1">
                      <p className="text-white text-sm font-medium">{user.first_name} {user.last_name}</p>
                      <p className="text-gray-600 text-xs capitalize">{user.role}</p>
                    </div>
                    <Link href="/dashboard/buyer" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors">Dashboard</Link>
                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors">Profile</Link>
                    <hr className="my-1 border-white/[0.06]" />
                    <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors">Logout</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-white px-4 py-2 rounded-xl hover:bg-white/[0.05] transition-all">Login</Link>
                <Link href="/register" className="text-sm font-bold bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl transition-colors shadow-lg shadow-green-900/30">
                  Get Started
                </Link>
              </>
            )}
            <button className="lg:hidden p-2 text-gray-500 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/[0.06] bg-[#080f09] px-4 py-4 space-y-1">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none" />
          </div>
          {categories.map((c) => (
            <Link key={c.href} href={c.href} className="block py-2.5 px-3 text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors text-sm">
              {c.label}
            </Link>
          ))}
          {!isAuthenticated && (
            <div className="flex gap-3 pt-3">
              <Link href="/login" className="flex-1 text-center py-2.5 border border-green-800/60 text-green-400 rounded-xl text-sm font-bold">Login</Link>
              <Link href="/register" className="flex-1 text-center py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold">Register</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}