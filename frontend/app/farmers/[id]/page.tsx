"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  MapPin, Star, BadgeCheck, Package,
  MessageSquare, TrendingUp, Leaf, Globe,
  Clock, ArrowLeft, FileText,
} from "lucide-react";
import { getInitials, formatDate, formatNumber, getCategoryLabel, formatPrice } from "@/lib/utils";
import Link from "next/link";
import ProductCard from "@/components/marketplace/ProductCard";

export default function FarmerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["farmer-profile", id],
    queryFn: async () => {
      const res = await apiClient.get(`/users/profile/${id}`);
      return res.data.data;
    },
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["farmer-products", id],
    queryFn: async () => {
      const res = await apiClient.get(`/products?seller_id=${id}&page_size=12`);
      return res.data;
    },
  });

  const farmer = userData;
  const products = productsData?.data || [];

  if (userLoading) return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="h-96 bg-white/[0.03] rounded-3xl animate-pulse" />
          <div className="lg:col-span-2 space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white/[0.03] rounded-2xl animate-pulse" />)}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );

  if (!userLoading && !farmer) return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-white font-bold text-xl mb-2">Farmer not found</h2>
        <Link href="/farmers" className="text-green-400 hover:text-green-300 text-sm mt-2">
          ← Back to Farmers
        </Link>
      </div>
      <Footer />
    </main>
  );

  const displayName = farmer.business_name || `${farmer.first_name} ${farmer.last_name}`;
  const roleLabel = farmer.role === "cooperative" ? "Cooperative"
    : farmer.role === "exporter" ? "Exporter & Supplier"
    : "Farmer";

  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />

      {/* Breadcrumb */}
      <div className="border-b border-white/[0.05] bg-[#07120a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Link href="/farmers" className="hover:text-green-400 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Farmers
            </Link>
            <span>/</span>
            <span className="text-gray-400">{displayName}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left sidebar ─────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Profile card */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl overflow-hidden">
              {/* Cover */}
              <div className="h-24 bg-gradient-to-br from-green-950/80 to-emerald-950/60 relative">
                <div className="absolute inset-0 opacity-20"
                  style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #22c55e 0%, transparent 60%)" }} />
              </div>

              {/* Avatar */}
              <div className="px-6 pb-6">
                <div className="w-20 h-20 rounded-2xl border-4 border-[#060f08] overflow-hidden bg-green-700 flex items-center justify-center text-white font-black text-2xl -mt-10 mb-4 shadow-xl">
                  {farmer.profile_image
                    ? <img src={farmer.profile_image} alt={displayName} className="w-full h-full object-cover" />
                    : getInitials(displayName)
                  }
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-black text-white">{displayName}</h1>
                  {farmer.badge !== "none" && <BadgeCheck className="w-5 h-5 text-green-400" />}
                </div>
                <p className="text-gray-500 text-sm capitalize mb-4">{roleLabel}</p>

                {farmer.bio && (
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">{farmer.bio}</p>
                )}

                <div className="space-y-2.5 text-sm">
                  {farmer.country && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <MapPin className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      {[farmer.city, farmer.state, farmer.country].filter(Boolean).join(", ")}
                    </div>
                  )}
                  {farmer.website && (
                    <a href={farmer.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors">
                      <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                      Website
                    </a>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-3.5 h-3.5 text-green-700 flex-shrink-0" />
                    Member since {formatDate(farmer.created_at)}
                  </div>
                </div>

                <Link href={`/marketplace?seller_id=${farmer.id}`}
                  className="mt-5 w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                  <MessageSquare className="w-4 h-4" /> Contact Seller
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
              <h3 className="text-white font-bold mb-4 text-sm">Performance</h3>
              <div className="space-y-3">
                {[
                  { label: "Rating",        value: `${farmer.rating_average.toFixed(1)} ★`, color: "text-amber-400" },
                  { label: "Reviews",       value: farmer.rating_count.toString(),           color: "text-white" },
                  { label: "Total Sales",   value: farmer.total_sales.toString(),            color: "text-green-400" },
                  { label: "Response Rate", value: `${farmer.response_rate.toFixed(0)}%`,    color: "text-sky-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                    <span className="text-gray-500 text-sm">{label}</span>
                    <span className={`font-bold text-sm ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Farm details */}
            {farmer.farm_name && (
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
                <h3 className="text-white font-bold mb-4 text-sm flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-green-500" /> Farm Details
                </h3>
                <div className="space-y-2">
                  {[
                    { label: "Farm Name",   value: farmer.farm_name },
                    { label: "Farm Size",   value: farmer.farm_size_hectares ? `${farmer.farm_size_hectares} ha` : null },
                    { label: "Experience",  value: farmer.years_of_experience ? `${farmer.years_of_experience} years` : null },
                  ].filter(i => i.value).map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-gray-600 text-xs">{label}</span>
                      <span className="text-white text-xs font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Products ───────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Tab header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-green-500" />
                Products
                <span className="text-gray-600 font-normal text-base">({products.length})</span>
              </h2>
              <Link href={`/marketplace?seller_id=${farmer.id}`}
                className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors">
                View all →
              </Link>
            </div>

            {productsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-64 bg-white/[0.03] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                <Package className="w-10 h-10 text-gray-700 mb-3" />
                <p className="text-gray-500 font-medium">No active products yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {products.map((product: any) => (
                  <ProductCard key={product.id} product={product} viewMode="grid" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}