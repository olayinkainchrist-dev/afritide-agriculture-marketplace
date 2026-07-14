"use client";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import Link from "next/link";
import {
  MapPin, Star, BadgeCheck, ArrowRight,
  TrendingUp, Users,
} from "lucide-react";
import { getInitials } from "@/lib/utils";

export default function FeaturedFarmers() {
  const { data, isLoading } = useQuery({
    queryKey: ["featured-farmers"],
    queryFn: async () => {
      const res = await apiClient.get("/users/farmers?page_size=8&is_featured=true");
      return res.data;
    },
    staleTime: 60_000,
  });

  const farmers = data?.data || [];

  if (isLoading) return (
    <section className="py-20 bg-[#07120a] border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-10 bg-white/[0.04] rounded-2xl w-64 mb-10 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white/[0.03] rounded-2xl h-52 animate-pulse" />
          ))}
        </div>
      </div>
    </section>
  );

  if (farmers.length === 0) return null;

  return (
    <section className="py-20 bg-[#07120a] border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <p className="text-green-500 text-sm font-bold uppercase tracking-widest mb-3">
              Verified Sellers
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Featured
              <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent"> Farmers</span>
            </h2>
          </div>
          <Link
            href="/farmers"
            className="flex items-center gap-2 text-green-400 hover:text-green-300 font-medium text-sm transition-colors whitespace-nowrap group"
          >
            View all farmers
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {farmers.map((farmer: any) => {
            const displayName = farmer.business_name || `${farmer.first_name} ${farmer.last_name}`;
            const roleColor = farmer.role === "EXPORTER"
              ? "text-blue-400 bg-blue-950/40 border-blue-800/40"
              : farmer.role === "COOPERATIVE"
              ? "text-amber-400 bg-amber-950/40 border-amber-800/40"
              : "text-green-400 bg-green-950/40 border-green-800/40";

            return (
              <Link
                key={farmer.id}
                href={`/farmers/${farmer.id}`}
                className="group bg-white/[0.03] border border-white/[0.07] hover:border-green-800/50 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/60"
              >
                {/* Top gradient */}
                <div className="relative h-20 bg-gradient-to-br from-green-950/80 to-emerald-950/60">
                  <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #22c55e 0%, transparent 60%)" }} />
                  <div className="absolute top-2 right-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${roleColor}`}>
                      {farmer.role}
                    </span>
                  </div>
                  {/* Avatar */}
                  <div className="absolute -bottom-5 left-4">
                    <div className="w-12 h-12 rounded-xl border-2 border-[#060f08] overflow-hidden bg-green-700 flex items-center justify-center text-white font-black shadow-lg">
                      {farmer.profile_image
                        ? <img src={farmer.profile_image} alt={displayName} className="w-full h-full object-cover" />
                        : <span className="text-sm">{getInitials(displayName)}</span>
                      }
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="pt-8 px-4 pb-4">
                  <div className="flex items-center gap-1 mb-0.5">
                    <h3 className="font-bold text-white text-sm truncate group-hover:text-green-400 transition-colors">
                      {displayName}
                    </h3>
                    {farmer.badge !== "none" && (
                      <BadgeCheck className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    )}
                  </div>

                  {farmer.farm_name && (
                    <p className="text-gray-600 text-xs mb-2 truncate">{farmer.farm_name}</p>
                  )}

                  {farmer.country && (
                    <div className="flex items-center gap-1 text-gray-600 text-xs mb-3">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{farmer.country}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-white font-bold text-xs">{farmer.rating_average.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <span className="text-gray-500 text-[10px]">{farmer.total_sales} sales</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/farmers"
            className="inline-flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-green-700/40 text-gray-300 hover:text-white font-bold px-8 py-3.5 rounded-2xl transition-all text-sm"
          >
            <Users className="w-4 h-4" />
            Browse All Verified Farmers
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
