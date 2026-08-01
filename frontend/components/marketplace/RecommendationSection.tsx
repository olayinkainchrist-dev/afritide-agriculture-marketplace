"use client";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import ProductCard from "@/components/marketplace/ProductCard";
import { Loader2, TrendingUp, Sparkles, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";
import Link from "next/link";

interface RecommendationSectionProps {
  type:       "trending" | "for-you" | "similar";
  productId?: string;
  category?:  string;
  title:      string;
  subtitle?:  string;
  icon?:      "trending" | "sparkles";
  limit?:     number;
}

export default function RecommendationSection({
  type, productId, category, title, subtitle, icon = "trending", limit = 8,
}: RecommendationSectionProps) {
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["recommendations", type, productId, category],
    queryFn:  async () => {
      if (type === "trending") {
        const params = category ? `?category=${category}&limit=${limit}` : `?limit=${limit}`;
        const res = await apiClient.get(`/recommendations/trending${params}`);
        return res.data.data || [];
      }
      if (type === "for-you") {
        const res = await apiClient.get(`/recommendations/for-you?limit=${limit}`);
        return res.data.data || [];
      }
      if (type === "similar" && productId) {
        const res = await apiClient.get(`/recommendations/similar/${productId}?limit=${limit}`);
        return res.data.data || [];
      }
      return [];
    },
    enabled:   type !== "for-you" || isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const products = data || [];

  if (!isLoading && products.length === 0) return null;

  const Icon = icon === "sparkles" ? Sparkles : TrendingUp;

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-5 h-5 text-green-500" />
            <h2 className="text-xl font-black text-white">{title}</h2>
          </div>
          {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => refetch()} disabled={isFetching}
            className="text-gray-600 hover:text-green-400 transition-colors">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <Link href="/marketplace" className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors">
            View all →
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-white/[0.03] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.slice(0, limit).map((product: any) => (
            <ProductCard key={product.id} product={product} viewMode="grid" />
          ))}
        </div>
      )}
    </section>
  );
}