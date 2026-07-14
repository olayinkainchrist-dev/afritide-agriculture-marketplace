"use client";
import { useQuery } from "@tanstack/react-query";
import { commoditiesApi } from "@/lib/api/commodities.api";
import { formatPrice } from "@/lib/utils";
import { TrendingUp, RefreshCw, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import Link from "next/link";

export default function CommodityBoard() {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["commodities"],
    queryFn: () => commoditiesApi.list({ page_size: 12 }),
    staleTime: 0,
    refetchOnMount: true,
  });

  const commodities = data?.data || [];
  const updatedTime = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null;

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "UP") return <ArrowUpRight className="w-4 h-4 text-green-400" />;
    if (trend === "DOWN") return <ArrowDownRight className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  return (
    <section className="py-20 bg-[#06100a] border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <p className="text-green-500 text-sm font-semibold uppercase tracking-widest mb-3">
              Market Intelligence
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Live Commodity
              <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent"> Prices</span>
            </h2>
            {updatedTime && (
              <p className="text-gray-600 text-sm mt-2">Updated at {updatedTime}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 text-sm text-green-500 hover:text-green-400 font-medium transition-colors bg-green-950/40 border border-green-900/60 hover:border-green-700/60 px-4 py-2 rounded-xl disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? "Refreshing..." : "Refresh"}
            </button>
            <Link href="/commodities" className="text-gray-500 hover:text-white text-sm font-medium transition-colors">
              Full board →
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl h-28 animate-pulse" />
            ))}
          </div>
        ) : commodities.length === 0 ? (
          <div className="text-center py-24 border border-white/[0.06] rounded-3xl bg-white/[0.02]">
            <TrendingUp className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No commodity prices available yet</p>
            <p className="text-gray-700 text-sm mt-1">Admin will update prices shortly</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {commodities.map((c) => (
              <div
                key={c.id}
                className="bg-white/[0.03] border border-white/[0.07] hover:border-green-800/50 hover:bg-white/[0.05] rounded-2xl p-5 transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="font-semibold text-gray-200 text-sm leading-tight">
                    {c.commodity_name}
                  </span>
                  <TrendIcon trend={c.trend} />
                </div>
                <div className="text-xl font-black text-white mb-2">
                  {formatPrice(c.price, c.currency)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">per {c.unit}</span>
                  {c.change_percentage !== undefined && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      c.trend === "UP" ? "bg-green-950/60 text-green-400" :
                      c.trend === "DOWN" ? "bg-red-950/60 text-red-400" :
                      "bg-gray-900 text-gray-500"
                    }`}>
                      {c.change_percentage > 0 ? "+" : ""}{c.change_percentage?.toFixed(1)}%
                    </span>
                  )}
                </div>
                {c.market && (
                  <p className="text-xs text-gray-700 mt-2 truncate">{c.market}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
