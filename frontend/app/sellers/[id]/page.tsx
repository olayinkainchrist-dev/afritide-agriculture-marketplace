"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import {
  MapPin, Star, BadgeCheck, Package, TrendingUp,
  Users, Clock, Globe, Award, Leaf, ChevronRight,
  FileText, ShoppingCart,
} from "lucide-react";
import { formatPrice, getCategoryLabel, formatDate, formatNumber } from "@/lib/utils";

export default function SellerStorefrontPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["seller-profile", id],
    queryFn:  async () => {
      const res = await apiClient.get(`/users/profile/${id}`);
      return res.data.data;
    },
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["seller-products", id],
    queryFn:  async () => {
      const res = await apiClient.get(`/products?seller_id=${id}&status=ACTIVE&page_size=50`);
      return res.data.data;
    },
  });

  const seller   = profileData;
  const products = productsData || [];

  const sellerName = seller?.business_name || `${seller?.first_name} ${seller?.last_name}`;

  const BADGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    VERIFIED_FARMER:   { label: "Verified Farmer",   color: "text-green-400",  bg: "bg-green-950/40 border-green-800/40" },
    VERIFIED_EXPORTER: { label: "Verified Exporter", color: "text-blue-400",   bg: "bg-blue-950/40 border-blue-800/40" },
    GOLD_SUPPLIER:     { label: "Gold Supplier",     color: "text-amber-400",  bg: "bg-amber-950/40 border-amber-800/40" },
    PREMIUM_SELLER:    { label: "Premium Seller",    color: "text-violet-400", bg: "bg-violet-950/40 border-violet-800/40" },
  };

  const badge = seller?.badge && seller.badge !== "NONE" ? BADGE_CONFIG[seller.badge] : null;

  if (profileLoading) return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-16 space-y-6">
        <div className="h-48 bg-white/[0.03] rounded-3xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white/[0.03] rounded-2xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-white/[0.03] rounded-2xl animate-pulse" />)}
        </div>
      </div>
      <Footer />
    </main>
  );

  if (!seller) return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="min-h-[60vh] flex items-center justify-center text-center">
        <div>
          <p className="text-gray-500 mb-4">Seller not found</p>
          <Link href="/marketplace" className="bg-green-600 text-white font-bold px-6 py-3 rounded-xl text-sm">
            Browse Marketplace
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );

  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />

      {/* Breadcrumb */}
      <div className="border-b border-white/[0.05] bg-[#07120a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Link href="/" className="hover:text-green-400 transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/marketplace" className="hover:text-green-400 transition-colors">Marketplace</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-400">{sellerName}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Profile header */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">

            {/* Avatar */}
            <div className="w-24 h-24 rounded-2xl bg-green-900/40 border border-green-800/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {seller.profile_image ? (
                <img src={seller.profile_image} alt={sellerName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-green-400">
                  {seller.first_name?.[0]}{seller.last_name?.[0]}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl font-black text-white">{sellerName}</h1>
                {seller.badge !== "NONE" && (
                  <BadgeCheck className="w-6 h-6 text-green-400" />
                )}
                {badge && (
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${badge.bg} ${badge.color}`}>
                    {badge.label}
                  </span>
                )}
              </div>

              <p className="text-gray-500 text-sm capitalize mb-3">
                {seller.role?.replace(/_/g, " ").toLowerCase()}
                {seller.farm_name && ` · ${seller.farm_name}`}
              </p>

              {seller.bio && (
                <p className="text-gray-400 text-sm leading-relaxed mb-4 max-w-2xl">{seller.bio}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {(seller.city || seller.state || seller.country) && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-green-600" />
                    <span>{[seller.city, seller.state, seller.country].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-green-600" />
                  <span>Member since {formatDate(seller.created_at).split(" ").slice(2).join(" ")}</span>
                </div>
                {seller.years_of_experience && (
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-green-600" />
                    <span>{seller.years_of_experience} years experience</span>
                  </div>
                )}
              </div>
            </div>

            {/* RFQ button */}
            <div className="flex-shrink-0">
              <Link href={`/marketplace?seller_id=${id}`}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm">
                <ShoppingCart className="w-4 h-4" /> View Products
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Package,    label: "Products",      value: products.length.toString(),                       color: "text-green-400" },
            { icon: Star,       label: "Rating",        value: `${(seller.rating_average ?? 0).toFixed(1)} ★`,  color: "text-amber-400" },
            { icon: TrendingUp, label: "Total Sales",   value: formatNumber(seller.total_sales ?? 0),           color: "text-sky-400" },
            { icon: Clock,      label: "Response Rate", value: `${(seller.response_rate ?? 0).toFixed(0)}%`,    color: "text-violet-400" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 text-center">
              <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
              <p className={`text-2xl font-black ${color} mb-1`}>{value}</p>
              <p className="text-gray-600 text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* Products */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-bold text-xl">
              Active Listings <span className="text-gray-600 text-sm font-normal ml-2">{products.length} products</span>
            </h2>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <div key={i} className="h-64 bg-white/[0.03] rounded-2xl animate-pulse" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 border border-white/[0.06] rounded-2xl">
              <Package className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">No active listings</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product: any) => (
                <Link key={product.id} href={`/products/${product.id}`}
                  className="bg-white/[0.03] border border-white/[0.07] hover:border-green-700/40 rounded-2xl overflow-hidden transition-all group">
                  <div className="aspect-video bg-green-950/30 relative overflow-hidden">
                    {product.main_image ? (
                      <img src={product.main_image} alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-10 h-10 text-green-900" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
                      {product.is_organic && (
                        <span className="bg-green-500/90 text-white text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <Leaf className="w-2.5 h-2.5" /> Organic
                        </span>
                      )}
                      {product.is_export_ready && (
                        <span className="bg-blue-500/90 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                          Export Ready
                        </span>
                      )}
                      {product.is_sponsored && (
                        <span className="bg-purple-500/90 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                          ⚡ Sponsored
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-gray-500 text-xs mb-1">{getCategoryLabel(product.category)}</p>
                    <p className="text-white font-bold text-sm mb-2 truncate">{product.title}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-green-400 font-black">{formatPrice(product.price, product.currency)}</p>
                      <p className="text-gray-600 text-xs">per {product.unit}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-gray-400 text-xs">{product.rating_average.toFixed(1)}</span>
                      <span className="text-gray-600 text-xs">({product.rating_count})</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}