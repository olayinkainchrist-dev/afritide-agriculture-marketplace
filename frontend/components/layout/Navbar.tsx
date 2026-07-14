"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Menu, X, Search, ChevronDown, Leaf, TrendingUp, ShoppingCart } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";
import { getInitials } from "@/lib/utils";
import NotificationBell from "@/components/shared/NotificationBell";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { useCartStore } from "@/lib/store/cart.store";

const categories = [
  { label: "🐄 Livestock",   href: "/marketplace?category=LIVESTOCK" },
  { label: "🌿 Cash Crops",  href: "/marketplace?category=CASH_CROPS" },
  { label: "🥛 Dairy",       href: "/marketplace?category=DAIRY" },
  { label: "🥭 Fruits",      href: "/marketplace?category=FRUITS" },
  { label: "🥬 Vegetables",  href: "/marketplace?category=VEGETABLES" },
  { label: "🐟 Fishery",     href: "/marketplace?category=FISHERY" },
  { label: "🚜 Machinery",   href: "/marketplace?category=MACHINERY" },
];

export default function Navbar() {
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [catOpen,      setCatOpen]      = useState(false);
  const [query,        setQuery]        = useState("");
  const [suggestions,  setSuggestions]  = useState<string[]>([]);
  const [showDrop,     setShowDrop]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const searchRef   = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { itemCount } = useCartStore();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (!value.trim() || value.length < 2) {
      setSuggestions([]);
      setShowDrop(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/search/autocomplete?q=${encodeURIComponent(value)}`);
        setSuggestions(res.data?.data || []);
        setShowDrop(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSearch = (q?: string) => {
    const term = q || query;
    if (!term.trim()) return;
    setShowDrop(false);
    setQuery(term);
    router.push(`/marketplace?q=${encodeURIComponent(term)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") setShowDrop(false);
  };

  const getDashboardHref = () => {
    const role = user?.role?.toUpperCase();
    if (role === "ADMIN") return "/dashboard/admin";
    if (role === "BUYER") return "/dashboard/buyer";
    return "/dashboard/farmer";
  };

  return (
    <nav className="bg-[#060f08]/95 backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-50">
      <div className="bg-green-500/10 border-b border-green-900/40 text-center py-2 px-4">
        <p className="text-green-400 text-xs font-medium">
          🌍 Africa&apos;s #1 Agricultural Marketplace —{" "}
          <Link href="/register" className="underline hover:text-green-300">Join free today</Link>
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-16">

          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black text-white">Afritide Group</span>
          </Link>

          <div className="hidden md:flex flex-1 max-w-lg mx-4" ref={searchRef}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowDrop(true)}
                placeholder="Search products, farmers, countries..."
                className="w-full pl-10 pr-10 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-700/60 focus:bg-white/[0.07] transition-all"
              />
              {query && (
                <button onClick={() => { setQuery(""); setSuggestions([]); setShowDrop(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-gray-600 hover:text-white transition-colors" />
                </button>
              )}
              {showDrop && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a1a0f] border border-white/[0.08] rounded-xl shadow-2xl py-2 z-50 max-h-64 overflow-y-auto">
                  {loading ? (
                    <div className="px-4 py-3 text-gray-600 text-sm">Searching...</div>
                  ) : suggestions.length === 0 ? (
                    <div className="px-4 py-3 text-gray-600 text-sm">No suggestions found</div>
                  ) : (
                    <>
                      <p className="px-4 py-1.5 text-gray-700 text-[10px] uppercase tracking-widest font-bold">
                        Suggestions
                      </p>
                      {suggestions.map((s, i) => (
                        <button key={i} onClick={() => handleSearch(s)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/[0.05] transition-colors text-left">
                          <Search className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />{s}
                        </button>
                      ))}
                      <div className="border-t border-white/[0.06] mt-1 pt-1">
                        <button onClick={() => handleSearch()}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-400 hover:text-green-300 hover:bg-green-950/30 transition-colors text-left font-medium">
                          <Search className="w-3.5 h-3.5 flex-shrink-0" />
                          Search for &quot;{query}&quot;
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

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

          <div className="flex items-center gap-2 ml-auto">
            {isAuthenticated && user ? (
              <>
                <Link href="/cart" className="relative p-2 text-gray-500 hover:text-white transition-colors">
                  <ShoppingCart className="w-5 h-5" />
                  {itemCount() > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                      {itemCount()}
                    </span>
                  )}
                </Link>

                <NotificationBell />

                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/[0.05] transition-colors">
                    <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white text-xs font-black overflow-hidden">
                      {user.profile_image
                        ? <img src={user.profile_image} alt="" className="w-full h-full object-cover" />
                        : getInitials(`${user.first_name} ${user.last_name}`)
                      }
                    </div>
                    <span className="hidden md:block text-sm font-medium text-gray-300">{user.first_name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-[#0a1a0f] border border-white/[0.08] rounded-xl shadow-2xl py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <div className="px-4 py-2 border-b border-white/[0.06] mb-1">
                      <p className="text-white text-sm font-medium">{user.first_name} {user.last_name}</p>
                      <p className="text-gray-600 text-xs capitalize">{user.role?.toLowerCase()}</p>
                    </div>
                    <Link href={getDashboardHref()}
                      className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                      Dashboard
                    </Link>
                    <Link href="/profile"
                      className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                      Profile
                    </Link>
                    <Link href="/cart"
                      className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                      🛒 Cart {itemCount() > 0 && `(${itemCount()})`}
                    </Link>
                    <hr className="my-1 border-white/[0.06]" />
                    <button onClick={logout}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors">
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link href="/login"
                  className="text-sm font-medium text-gray-400 hover:text-white px-4 py-2 rounded-xl hover:bg-white/[0.05] transition-all">
                  Login
                </Link>
                <Link href="/register"
                  className="text-sm font-bold bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl transition-colors shadow-lg shadow-green-900/30">
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

      {mobileOpen && (
        <div className="lg:hidden border-t border-white/[0.06] bg-[#080f09] px-4 py-4 space-y-1">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input type="text" value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none" />
          </div>
          {suggestions.length > 0 && showDrop && (
            <div className="bg-[#0a1a0f] border border-white/[0.08] rounded-xl py-2 mb-2">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => { handleSearch(s); setMobileOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/[0.05] transition-colors text-left">
                  <Search className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />{s}
                </button>
              ))}
            </div>
          )}
          {categories.map((c) => (
            <Link key={c.href} href={c.href} onClick={() => setMobileOpen(false)}
              className="block py-2.5 px-3 text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors text-sm">
              {c.label}
            </Link>
          ))}
          <Link href="/cart" onClick={() => setMobileOpen(false)}
            className="block py-2.5 px-3 text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors text-sm">
            🛒 Cart {itemCount() > 0 && `(${itemCount()})`}
          </Link>
          <Link href="/support" onClick={() => setMobileOpen(false)}
            className="block py-2.5 px-3 text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors text-sm">
            🆘 Support
          </Link>
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