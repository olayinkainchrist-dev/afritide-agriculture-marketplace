"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import apiClient from "@/lib/api/client";
import {
  Search, MapPin, Star, BadgeCheck,
  Users, Filter, Loader2,
} from "lucide-react";
import Link from "next/link";

const ROLES = [
  { value: "all",                label: "All Suppliers" },
  { value: "FARMER",             label: "Farmers" },
  { value: "EXPORTER",           label: "Exporters" },
  { value: "COOPERATIVE",        label: "Cooperatives" },
  { value: "PROCESSING_COMPANY", label: "Processing Companies" },
  { value: "LOGISTICS_PROVIDER", label: "Logistics Providers" },
  { value: "WAREHOUSE_OPERATOR", label: "Warehouse Operators" },
];

export default function FarmersPage() {
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [country,    setCountry]    = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["public-farmers", search, roleFilter, country],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: "50" });
      if (search)               params.append("search", search);
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (country)              params.append("country", country);
      const res = await apiClient.get(`/users/farmers?${params}`);
      return res.data;
    },
    staleTime: 60_000,
  });

  const farmers = data?.data || [];

  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-10">
          <p className="text-green-500 text-sm font-bold uppercase tracking-widest mb-3">
            Verified Suppliers
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Browse
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent"> Suppliers</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl">
            Connect with verified farmers, exporters, cooperatives and agro-processors across Africa.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search suppliers..."
              className="w-full pl-11 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] focus:border-green-700/50 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
            />
          </div>
          <input
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="Filter by country..."
            className="px-4 py-3 bg-white/[0.04] border border-white/[0.08] focus:border-green-700/50 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none transition-colors w-48"
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ROLES.map(r => (
              <button key={r.value} onClick={() => setRoleFilter(r.value)}
                className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  roleFilter === r.value
                    ? "bg-green-600 text-white"
                    : "bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]"
                }`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          </div>
        ) : farmers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="w-12 h-12 text-gray-700 mb-3" />
            <p className="text-gray-500 font-medium">No suppliers found</p>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-6">{farmers.length} suppliers found</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {farmers.map((farmer: any) => {
                const displayName = farmer.business_name ||
                  `${farmer.first_name} ${farmer.last_name}`;
                return (
                  <Link key={farmer.id} href={`/farmers/${farmer.id}`}
                    className="bg-white/[0.03] border border-white/[0.07] hover:border-green-700/40 rounded-2xl p-5 transition-all group">

                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-green-900/40 border border-green-800/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {farmer.profile_image
                          ? <img src={farmer.profile_image} alt="" className="w-full h-full object-cover" />
                          : <span className="text-lg font-black text-green-400">
                              {displayName[0]?.toUpperCase()}
                            </span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-white font-bold text-sm truncate group-hover:text-green-400 transition-colors">
                            {displayName}
                          </h3>
                          {farmer.badge !== "NONE" && (
                            <BadgeCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-gray-500 text-xs capitalize">
                          {farmer.role?.replace("_", " ")}
                        </p>
                      </div>
                    </div>

                    {farmer.bio && (
                      <p className="text-gray-500 text-xs leading-relaxed mb-4 line-clamp-2">
                        {farmer.bio}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <div className="flex items-center gap-3">
                        {farmer.country && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {farmer.country}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          {farmer.rating_average?.toFixed(1) || "0.0"}
                        </span>
                      </div>
                      <span className="text-gray-600">
                        {farmer.total_sales || 0} sales
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
