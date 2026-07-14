"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, TrendingUp, Users, Package, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth.store";

const stats = [
  { icon: Users,     label: "Verified Farmers", value: "10,000+", color: "text-emerald-400" },
  { icon: Globe,     label: "Countries",         value: "45+",     color: "text-sky-400" },
  { icon: Package,   label: "Products",          value: "50,000+", color: "text-amber-400" },
  { icon: TrendingUp,label: "Tonnes Traded",     value: "1M+",     color: "text-rose-400" },
];

const tags = [
  "Cocoa", "Palm Oil", "Cashew Nuts", "Ginger", "Sesame Seeds",
  "Cattle", "Rice", "Soybeans", "Shea Butter", "Coffee", "Cotton", "Catfish",
];

export default function HeroSection() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (q) router.push(`/marketplace?q=${encodeURIComponent(q)}`);
    else router.push("/marketplace");
  };

  const role = user?.role?.toUpperCase();

  const getDashboardHref = () => {
    if (role === "ADMIN") return "/dashboard/admin";
    if (role === "BUYER") return "/dashboard/buyer";
    return "/dashboard/farmer";
  };

  return (
    <section className="relative min-h-[94vh] flex flex-col justify-center overflow-hidden bg-[#060f08]">

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-5%,_#14532d55_0%,_transparent_72%)]" />
        <div className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage: "linear-gradient(#22c55e 1px,transparent 1px),linear-gradient(90deg,#22c55e 1px,transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div className="absolute top-1/3 left-1/4 w-[480px] h-[480px] bg-green-700/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-1/4 right-1/5 w-[360px] h-[360px] bg-emerald-600/[0.07] rounded-full blur-[110px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-700/40 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28">
        <div className="max-w-4xl mx-auto text-center">

          <div className="inline-flex items-center gap-3 bg-green-950/70 border border-green-800/50 rounded-full px-5 py-2 mb-10 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-green-300 text-sm font-medium tracking-wide">
              Live marketplace — 192 new products added today
            </span>
          </div>

          <h1 className="text-[clamp(2.6rem,7.5vw,5.2rem)] font-black leading-[1.02] tracking-tight text-white mb-3">
            Where African Farms
          </h1>
          <h1 className="text-[clamp(2.6rem,7.5vw,5.2rem)] font-black leading-[1.02] tracking-tight mb-7">
            <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
              Meet Global Trade.
            </span>
          </h1>

          <p className="text-gray-400 text-[1.15rem] md:text-xl max-w-2xl mx-auto mb-3 leading-relaxed">
            The most trusted B2B agricultural marketplace in Africa.
          </p>
          <p className="text-gray-600 text-base max-w-xl mx-auto mb-11 leading-relaxed">
            Source verified commodities — from cocoa to cattle — directly from 10,000+ KYC-verified farmers and exporters. No middlemen. No uncertainty.
          </p>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-7">
            <div className="relative flex items-center bg-white/[0.055] border border-white/[0.09] rounded-2xl p-1.5 backdrop-blur-md focus-within:border-green-600/50 focus-within:bg-white/[0.07] transition-all shadow-2xl shadow-black/60">
              <Search className="ml-3 w-5 h-5 text-gray-600 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                placeholder="Search cocoa, palm oil, cattle, sesame..."
                className="flex-1 bg-transparent text-white placeholder-gray-600 px-4 py-3 text-[0.95rem] focus:outline-none"
              />
              <button type="submit" onClick={() => handleSearch()}
                className="bg-green-500 hover:bg-green-400 active:bg-green-600 text-white font-bold px-7 py-3 rounded-xl transition-all flex items-center gap-2 text-sm shadow-lg shadow-green-900/40 whitespace-nowrap">
                Search <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-2 mb-12">
            <span className="text-xs text-gray-700 py-1.5 self-center">Trending:</span>
            {tags.map((tag) => (
              <Link key={tag} href={`/marketplace?q=${encodeURIComponent(tag)}`}
                className="text-xs text-gray-500 hover:text-green-400 bg-white/[0.04] hover:bg-green-950/50 border border-white/[0.07] hover:border-green-800/50 rounded-full px-3 py-1.5 transition-all">
                {tag}
              </Link>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-20">
            {isAuthenticated && user ? (
              <>
                <Link
                  href={role === "BUYER" ? "/marketplace" : "/dashboard/farmer/products"}
                  className="group bg-green-500 hover:bg-green-400 active:bg-green-600 text-white font-bold px-9 py-4 rounded-2xl transition-all shadow-xl shadow-green-900/40 flex items-center justify-center gap-2 text-[0.95rem]">
                  {role === "BUYER" ? "Browse Marketplace" : "My Products"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href={getDashboardHref()}
                  className="bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] hover:border-green-700/50 text-white font-bold px-9 py-4 rounded-2xl transition-all backdrop-blur-sm flex items-center justify-center text-[0.95rem]">
                  My Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link href="/register?role=buyer"
                  className="group bg-green-500 hover:bg-green-400 active:bg-green-600 text-white font-bold px-9 py-4 rounded-2xl transition-all shadow-xl shadow-green-900/40 flex items-center justify-center gap-2 text-[0.95rem]">
                  Start Sourcing
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/register?role=farmer"
                  className="bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] hover:border-green-700/50 text-white font-bold px-9 py-4 rounded-2xl transition-all backdrop-blur-sm flex items-center justify-center text-[0.95rem]">
                  List Your Farm
                </Link>
              </>
            )}
            <Link href="/marketplace"
              className="text-gray-600 hover:text-gray-300 font-semibold px-9 py-4 rounded-2xl transition-all flex items-center justify-center gap-1 text-[0.95rem] underline-offset-4 hover:underline">
              Explore Market →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label}
                className="bg-white/[0.035] border border-white/[0.07] hover:border-green-800/50 hover:bg-white/[0.055] rounded-2xl p-5 text-center transition-all group">
                <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-2 group-hover:scale-110 transition-transform`} />
                <div className={`text-[1.6rem] font-black ${s.color} mb-0.5 leading-tight`}>{s.value}</div>
                <div className="text-[11px] text-gray-600 font-medium uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>

        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.05] bg-white/[0.02] backdrop-blur-sm py-3">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-center gap-8 text-xs text-gray-600 font-medium tracking-wide">
          {[
            { color: "bg-green-500",  text: "KYC-Verified Sellers Only" },
            { color: "bg-sky-500",    text: "45+ Export Destinations" },
            { color: "bg-amber-500",  text: "Live Commodity Price Board" },
            { color: "bg-violet-500", text: "Direct Farmer-to-Buyer Trade" },
          ].map(({ color, text }) => (
            <span key={text} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
              {text}
            </span>
          ))}
        </div>
      </div>

    </section>
  );
}