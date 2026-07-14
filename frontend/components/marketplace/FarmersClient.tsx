"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import {
  Search, MapPin, Star, BadgeCheck,
  Package, TrendingUp, Filter, Leaf,
  Users, Globe,
} from "lucide-react";
import { getInitials, formatNumber } from "@/lib/utils";
import Link from "next/link";

const COUNTRIES = [
  "All Countries", "Nigeria", "Ghana", "Kenya",
  "Ethiopia", "Ivory Coast", "Cameroon", "Tanzania",
  "Uganda", "Senegal", "Mali",
];

const ROLES = [
  { value: "all",         label: "All Sellers" },
  { value: "FARMER",      label: "Farmers" },
  { value: "COOPERATIVE", label: "Cooperatives" },
  { value: "EXPORTER",    label: "Exporters" },
];

export default function FarmersClient() {
  const [search, setSearch]     = useState("");
  const [country, setCountry]   = useState("All Countries");
  const [role, setRole]         = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["farmers-list", country, role],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: "50" });
      if (country !== "All Countries") params.append("country", country);
      const res = await apiClient.get(`/users/farmers?${params}`);
      return res.data;
    },
    staleTime: 60_000,
  });

  const farmers = (data?.data || []).filter((f: any) => {
    const matchRole = role === "all" || f.role === role;
    const matchSearch = !search ||
      f.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      f.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      f.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      f.farm_name?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#060f08]">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.06] bg-[#07120a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-green-500 text-sm font-bold uppercase tracking-widest mb-3">
            Verified Sellers
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            African Farmers &
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent"> Exporters</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mb-8">
            Connect directly with KYC-verified farmers, cooperatives, and exporters across Africa.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-6">
            {[
              { icon: Users,  label: "Verified Sellers",  value: "10,000+" },
              { icon: Globe,  label: "Countries",          value: "45+" },
              { icon: Leaf,   label: "Product Categories", value: "10+" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 text-green-500" />
                <span className="text-green-400 font-black">{value}</span>
                <span className="text-gray-600 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Filters ──────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search farmers, farms, businesses..."
              className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] focus:border-green-700/50 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
            />
          </div>

          {/* Role filter */}
          <div className="flex gap-2 overflow-x-auto">
            {ROLES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRole(r.value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  role === r.value
                    ? "bg-green-600 text-white shadow-lg shadow-green-900/30"
                    : "bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Country filter */}
          <div className="relative">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="appearance-none bg-white/[0.04] border border-white/[0.08] text-gray-400 text-sm px-4 py-2.5 pr-8 rounded-xl focus:outline-none focus:border-green-700/50 transition-colors cursor-pointer"
            >
              {COUNTRIES.map(c => (
                <option key={c} value={c} className="bg-[#0a1a0f]">{c}</option>
              ))}
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
          </div>
        </div>

        {/* Results count */}
        <p className="text-gray-600 text-sm mb-6">
          {isLoading ? "Loading..." : `${farmers.length} verified sellers found`}
        </p>

        {/* ── Grid ─────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : farmers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
              <Users className="w-10 h-10 text-gray-700" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">No farmers found</h3>
            <p className="text-gray-600 text-sm max-w-xs">
              Try adjusting your filters or search terms.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {farmers.map((farmer: any) => (
              <FarmerCard key={farmer.id} farmer={farmer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FarmerCard({ farmer }: { farmer: any }) {
  const displayName = farmer.business_name || `${farmer.first_name} ${farmer.last_name}`;
  const roleLabel = farmer.role === "COOPERATIVE" ? "COOPERATIVE"
    : farmer.role === "EXPORTER" ? "EXPORTER"
    : "FARMER";

  const roleColor = farmer.role === "EXPORTER" ? "text-blue-400 bg-blue-950/40 border-blue-800/40"
    : farmer.role === "COOPERATIVE" ? "text-amber-400 bg-amber-950/40 border-amber-800/40"
    : "text-green-400 bg-green-950/40 border-green-800/40";

  return (
    <Link
      href={`/farmers/${farmer.id}`}
      className="group bg-white/[0.03] border border-white/[0.07] hover:border-green-800/50 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/60 flex flex-col"
    >
      {/* Header with gradient */}
      <div className="relative h-24 bg-gradient-to-br from-green-950/80 to-emerald-950/60">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #22c55e 0%, transparent 60%)" }} />

        {/* Role badge */}
        <div className="absolute top-3 right-3">
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${roleColor}`}>
            {roleLabel}
          </span>
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-6 left-5">
          <div className="w-14 h-14 rounded-2xl border-2 border-[#060f08] overflow-hidden bg-green-700 flex items-center justify-center text-white font-black text-lg shadow-xl">
            {farmer.profile_image
              ? <img src={farmer.profile_image} alt={displayName} className="w-full h-full object-cover" />
              : getInitials(displayName)
            }
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-9 px-5 pb-5 flex flex-col flex-1">

        {/* Name + verified */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <h3 className="font-bold text-white text-sm truncate group-hover:text-green-400 transition-colors">
            {displayName}
          </h3>
          {farmer.badge !== "none" && (
            <BadgeCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
          )}
        </div>

        {/* Farm name */}
        {farmer.farm_name && (
          <p className="text-gray-600 text-xs mb-2">{farmer.farm_name}</p>
        )}

        {/* Location */}
        {farmer.country && (
          <div className="flex items-center gap-1 text-gray-600 text-xs mb-3">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {[farmer.state, farmer.country].filter(Boolean).join(", ")}
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-auto pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-white font-bold text-xs">{farmer.rating_average.toFixed(1)}</span>
            <span className="text-gray-600 text-[10px]">({farmer.rating_count})</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-600" />
            <span className="text-gray-500 text-xs">{farmer.total_sales} sales</span>
          </div>
          {farmer.years_of_experience && (
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-gray-600 text-[10px]">{farmer.years_of_experience}yr exp</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
