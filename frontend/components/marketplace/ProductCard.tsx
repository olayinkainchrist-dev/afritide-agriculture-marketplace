"use client";
import Link from "next/link";
import { Heart, MapPin, Star, Package, BadgeCheck, Leaf } from "lucide-react";
import { formatPrice, getCategoryLabel } from "@/lib/utils";
import { Product } from "@/types";
import { useState } from "react";
import { productsApi } from "@/lib/api/products.api";
import toast from "react-hot-toast";

interface Props {
  product: Product;
  viewMode?: "grid" | "list";
}

export default function ProductCard({ product, viewMode = "grid" }: Props) {
  const [wishlisted, setWishlisted] = useState(product.is_wishlisted || false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlistLoading(true);
    try {
      const res = await productsApi.toggleWishlist(product.id);
      if (res.success) {
        setWishlisted(res.data?.wishlisted || false);
      }
    } catch {
      toast.error("Please login to save products");
    } finally {
      setWishlistLoading(false);
    }
  };

  if (viewMode === "list") {
    return (
      <Link href={`/products/${product.id}`}
        className="group flex gap-4 bg-white/[0.03] border border-white/[0.07] hover:border-green-800/50 rounded-2xl overflow-hidden transition-all p-4">
        {/* Image */}
        <div className="relative w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-green-950/60 to-emerald-950/60">
          {product.main_image ? (
            <img src={product.main_image} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-8 h-8 text-green-800" />
            </div>
          )}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-green-500 text-[10px] font-bold uppercase tracking-widest mb-1">{getCategoryLabel(product.category)}</p>
              <h3 className="font-bold text-white text-base mb-1 truncate group-hover:text-green-400 transition-colors">{product.title}</h3>
              {product.short_description && (
                <p className="text-gray-600 text-sm line-clamp-1 mb-2">{product.short_description}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xl font-black text-green-400">{formatPrice(product.price, product.currency)}</div>
              <div className="text-xs text-gray-600">per {product.unit}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap mt-2">
            {product.country && (
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <MapPin className="w-3 h-3" />{product.country}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              {product.rating_average.toFixed(1)} ({product.rating_count})
            </span>
            {product.is_organic && (
              <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
                <Leaf className="w-3 h-3" /> Organic
              </span>
            )}
            {product.minimum_order_quantity > 1 && (
              <span className="text-xs text-gray-600">MOQ: {product.minimum_order_quantity} {product.unit}</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/products/${product.id}`}
      className="group bg-white/[0.03] border border-white/[0.07] hover:border-green-800/50 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/60 flex flex-col">

      {/* Image */}
      <div className="relative h-44 bg-gradient-to-br from-green-950/60 to-emerald-950/40 overflow-hidden flex-shrink-0">
        {product.main_image ? (
          <img
            src={product.main_image}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Package className="w-10 h-10 text-green-900" />
          </div>
        )}

        {/* Wishlist */}
        <button
          onClick={handleWishlist}
          disabled={wishlistLoading}
          className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100 z-10"
        >
          <Heart className={`w-3.5 h-3.5 transition-colors ${wishlisted ? "text-red-400 fill-red-400" : "text-white"}`} />
        </button>

        {/* Badges */}
        <div className="absolute bottom-2.5 left-2.5 flex gap-1.5 flex-wrap">
          {product.is_organic && (
            <span className="bg-green-500/90 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Leaf className="w-2.5 h-2.5" /> Organic
            </span>
          )}
          {product.is_export_ready && (
            <span className="bg-blue-500/90 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              Export Ready
            </span>
          )}
          {product.is_featured && (
            <span className="bg-amber-500/90 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              Featured
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-green-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">
          {getCategoryLabel(product.category)}
        </p>
        <h3 className="font-bold text-gray-200 text-sm mb-2 line-clamp-2 group-hover:text-white transition-colors leading-snug flex-1">
          {product.title}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-2">
          <div className="flex">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className={`w-3 h-3 ${i <= Math.round(product.rating_average) ? "text-amber-400 fill-amber-400" : "text-gray-700"}`} />
            ))}
          </div>
          <span className="text-xs text-gray-600">({product.rating_count})</span>
        </div>

        {/* Location */}
        {product.country && (
          <div className="flex items-center gap-1 text-[11px] text-gray-600 mb-3">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{product.city ? `${product.city}, ` : ""}{product.country}</span>
          </div>
        )}

        {/* Price */}
        <div className="pt-3 border-t border-white/[0.06] mt-auto">
          <div className="flex items-end gap-1 flex-wrap">
            <span className="text-base font-black text-green-400 break-all">{formatPrice(product.price, product.currency)}</span>
            <span className="text-[11px] text-gray-600">/{product.unit}</span>
          </div>
          {product.is_negotiable && (
            <span className="inline-block mt-1.5 text-[10px] text-amber-500 font-bold bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-900/40 whitespace-nowrap">
              Negotiable
            </span>
          )}
        </div>

        {product.minimum_order_quantity > 1 && (
          <p className="text-[10px] text-gray-700 mt-1.5">
            MOQ: {product.minimum_order_quantity} {product.unit}
          </p>
        )}
      </div>
    </Link>
  );
}
