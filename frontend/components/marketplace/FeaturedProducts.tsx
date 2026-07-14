"use client";
import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/lib/api/products.api";
import Link from "next/link";
import { Heart, MapPin, Star, Package, ArrowRight, BadgeCheck } from "lucide-react";
import { formatPrice, getCategoryLabel } from "@/lib/utils";

export default function FeaturedProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => productsApi.getFeatured(8),
  });

  const products = data?.data || [];

  if (isLoading) return (
    <section className="py-20 bg-[#060f08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-12 bg-white/5 rounded-2xl w-72 mb-12 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="bg-white/[0.04] rounded-2xl h-80 animate-pulse" />)}
        </div>
      </div>
    </section>
  );

  if (products.length === 0) return null;

  return (
    <section className="py-20 bg-[#060f08] border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <p className="text-green-500 text-sm font-semibold uppercase tracking-widest mb-3">Handpicked</p>
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Featured
              <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent"> Products</span>
            </h2>
          </div>
          <Link href="/marketplace" className="flex items-center gap-2 text-green-400 hover:text-green-300 font-medium text-sm transition-colors whitespace-nowrap group">
            View all <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`}
              className="group bg-white/[0.03] border border-white/[0.07] hover:border-green-800/50 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/60">
              {/* Image */}
              <div className="relative h-48 bg-gradient-to-br from-green-950/60 to-emerald-950/60 overflow-hidden">
                {product.main_image ? (
                  <img src={product.main_image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <Package className="w-10 h-10 text-green-800" />
                    <span className="text-xs text-green-900">{getCategoryLabel(product.category)}</span>
                  </div>
                )}
                {/* Wishlist */}
                <button className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100">
                  <Heart className="w-3.5 h-3.5 text-white" />
                </button>
                {/* Badges */}
                <div className="absolute bottom-3 left-3 flex gap-1.5">
                  {product.is_organic && (
                    <span className="bg-green-500/90 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Organic</span>
                  )}
                  {product.is_export_ready && (
                    <span className="bg-blue-500/90 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Export Ready</span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <p className="text-green-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">{getCategoryLabel(product.category)}</p>
                <h3 className="font-bold text-gray-200 text-sm mb-3 line-clamp-2 group-hover:text-white transition-colors leading-snug">{product.title}</h3>

                <div className="flex items-center gap-1.5 mb-3">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs text-gray-500">{product.rating_average.toFixed(1)}</span>
                  <span className="text-xs text-gray-700">({product.rating_count})</span>
                </div>

                {product.country && (
                  <div className="flex items-center gap-1 text-[11px] text-gray-600 mb-3">
                    <MapPin className="w-3 h-3" />{product.country}{product.state ? `, ${product.state}` : ""}
                  </div>
                )}

                <div className="flex items-end justify-between pt-3 border-t border-white/[0.06]">
                  <div>
                    <span className="text-lg font-black text-green-400">{formatPrice(product.price, product.currency)}</span>
                    <span className="text-[11px] text-gray-600 ml-1">/{product.unit}</span>
                  </div>
                  {product.is_negotiable && <span className="text-[10px] text-amber-500 font-bold bg-amber-950/50 px-2 py-0.5 rounded-full">Negotiable</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
