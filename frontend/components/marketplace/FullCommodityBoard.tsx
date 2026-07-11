"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import {
  TrendingUp, TrendingDown, Minus, RefreshCw,
  ArrowUpRight, ArrowDownRight, Search, X,
  ChevronDown, ChevronUp, BarChart3,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

const PRICE_TYPES = [
  { value: "all",           label: "All Prices" },
  { value: "FARM_GATE",     label: "Farm Gate" },
  { value: "WHOLESALE",     label: "Wholesale" },
  { value: "RETAIL",        label: "Retail" },
  { value: "EXPORT",        label: "Export" },
  { value: "INTERNATIONAL", label: "International" },
];

const CURRENCIES = ["USD", "NGN", "GBP", "EUR", "GHS"];

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  NGN: 1580,
  GBP: 0.79,
  EUR: 0.92,
  GHS: 12.5,
};

const TYPE_COLORS: Record<string, string> = {
  FARM_GATE:     "bg-green-500/20 text-green-400 border-green-700/40",
  WHOLESALE:     "bg-blue-500/20 text-blue-400 border-blue-700/40",
  RETAIL:        "bg-amber-500/20 text-amber-400 border-amber-700/40",
  EXPORT:        "bg-violet-500/20 text-violet-400 border-violet-700/40",
  INTERNATIONAL: "bg-sky-500/20 text-sky-400 border-sky-700/40",
};

export default function FullCommodityBoard() {
  const [activeType,    setActiveType]    = useState("all");
  const [search,        setSearch]        = useState("");
  const [displayCurrency, setDisplayCurrency] = useState("NGN");
  const [expandedId,    setExpandedId]    = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["full-commodities", activeType],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: "100" });
      if (activeType !== "all") params.append("price_type", activeType);
      const res = await apiClient.get(`/commodities?${params}`);
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: historyData } = useQuery({
    queryKey: ["commodity-history", expandedId],
    queryFn: async () => {
      const res = await apiClient.get(`/commodities/${expandedId}/history?days=30`);
      return res.data;
    },
    enabled: !!expandedId,
  });

  const allCommodities = data?.data || [];

  const commodities = allCommodities.filter((c: any) =>
    !search || c.commodity_name.toLowerCase().includes(search.toLowerCase())
  );

  const convertPrice = (price: number, fromCurrency: string) => {
    const inUSD = price / (EXCHANGE_RATES[fromCurrency] || 1);
    return inUSD * (EXCHANGE_RATES[displayCurrency] || 1);
  };

  const formatConverted = (price: number, fromCurrency: string) => {
    const converted = convertPrice(price, fromCurrency);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: displayCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(converted);
  };

  const history = historyData?.data?.history || [];

  return (
    <div className="space-y-6">

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">

        {/* Price type tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {PRICE_TYPES.map(pt => (
            <button key={pt.value} onClick={() => setActiveType(pt.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeType === pt.value
                  ? "bg-green-600 text-white"
                  : "bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]"
              }`}>
              {pt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Currency converter */}
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2">
            <span className="text-gray-600 text-xs">Display in:</span>
            <select
              value={displayCurrency}
              onChange={e => setDisplayCurrency(e.target.value)}
              className="bg-transparent text-white text-sm focus:outline-none"
            >
              {CURRENCIES.map(c => <option key={c} value={c} className="bg-[#0a1a0f]">{c}</option>)}
            </select>
          </div>

          {/* Refresh */}
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-2 text-sm text-green-500 hover:text-green-400 bg-green-950/40 border border-green-900/60 px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Updating..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search commodities..."
          className="w-full pl-11 pr-10 py-3 bg-white/[0.04] border border-white/[0.08] focus:border-green-700/50 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-gray-600 hover:text-white" />
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Commodities", value: allCommodities.length, color: "text-white" },
          { label: "Rising",  value: allCommodities.filter((c: any) => c.trend === "UP" || c.trend === "up").length,   color: "text-green-400" },
          { label: "Falling", value: allCommodities.filter((c: any) => c.trend === "DOWN" || c.trend === "down").length, color: "text-red-400" },
          { label: "Stable",  value: allCommodities.filter((c: any) => c.trend === "STABLE" || c.trend === "stable").length, color: "text-gray-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-gray-600 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Price board */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : commodities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <TrendingUp className="w-10 h-10 text-gray-700 mb-3" />
            <p className="text-gray-500 font-medium">No commodities found</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-600 font-medium uppercase tracking-wide">
              <div className="col-span-3">Commodity</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Price</div>
              <div className="col-span-2">Market</div>
              <div className="col-span-2">Change</div>
              <div className="col-span-1">Chart</div>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {commodities.map((c: any) => (
                <div key={c.id}>
                  <div
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors cursor-pointer items-center"
                  >
                    <div className="col-span-3">
                      <p className="text-white font-bold text-sm">{c.commodity_name}</p>
                      <p className="text-gray-600 text-[10px] mt-0.5">{c.category}</p>
                    </div>

                    <div className="col-span-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                        TYPE_COLORS[c.price_type] || "bg-gray-500/20 text-gray-400 border-gray-700/40"
                      }`}>
                        {c.price_type?.replace("_", " ") || "wholesale"}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <p className="text-green-400 font-black text-sm">
                        {displayCurrency === c.currency
                          ? formatPrice(c.price, c.currency)
                          : formatConverted(c.price, c.currency)
                        }
                      </p>
                      <p className="text-gray-600 text-[10px]">per {c.unit}</p>
                      {displayCurrency !== c.currency && (
                        <p className="text-gray-700 text-[10px]">
                          {formatPrice(c.price, c.currency)} original
                        </p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <p className="text-gray-400 text-xs">{c.market || "—"}</p>
                      <p className="text-gray-600 text-[10px]">
                        {c.region ? `${c.region}, ` : ""}{c.country || ""}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <div className={`flex items-center gap-1 text-sm font-bold ${
                        (c.trend === "UP" || c.trend === "up")     ? "text-green-400" :
                        (c.trend === "DOWN" || c.trend === "down") ? "text-red-400"   : "text-gray-500"
                      }`}>
                        {(c.trend === "UP" || c.trend === "up")     ? <ArrowUpRight className="w-4 h-4" />   :
                         (c.trend === "DOWN" || c.trend === "down") ? <ArrowDownRight className="w-4 h-4" /> :
                         <Minus className="w-4 h-4" />}
                        {c.change_percentage
                          ? `${c.change_percentage > 0 ? "+" : ""}${c.change_percentage.toFixed(1)}%`
                          : "—"
                        }
                      </div>
                      {c.previous_price && (
                        <p className="text-gray-700 text-[10px]">
                          prev: {formatPrice(c.previous_price, c.currency)}
                        </p>
                      )}
                    </div>

                    <div className="col-span-1 flex justify-center">
                      <div className={`p-1.5 rounded-lg transition-colors ${
                        expandedId === c.id
                          ? "bg-green-600 text-white"
                          : "text-gray-600 hover:text-white hover:bg-white/[0.05]"
                      }`}>
                        {expandedId === c.id
                          ? <ChevronUp className="w-4 h-4" />
                          : <BarChart3 className="w-4 h-4" />
                        }
                      </div>
                    </div>
                  </div>

                  {/* Expanded history */}
                  {expandedId === c.id && (
                    <div className="px-5 pb-5 bg-white/[0.01] border-t border-white/[0.04]">
                      <div className="pt-4">
                        <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-green-500" />
                          Price History — Last 30 Days
                        </h4>

                        {history.length === 0 ? (
                          <p className="text-gray-600 text-sm">No price history available yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {/* Mini chart */}
                            <div className="flex items-end gap-1 h-20">
                              {history.slice(-20).map((h: any, i: number) => {
                                const maxPrice = Math.max(...history.map((x: any) => x.price));
                                const minPrice = Math.min(...history.map((x: any) => x.price));
                                const range = maxPrice - minPrice || 1;
                                const height = ((h.price - minPrice) / range) * 100;
                                return (
                                  <div key={i} className="flex-1 flex flex-col justify-end group relative">
                                    <div
                                      className="bg-green-500/60 hover:bg-green-400 rounded-sm transition-all"
                                      style={{ height: `${Math.max(5, height)}%` }}
                                    />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-[#0a1a0f] border border-white/[0.08] rounded px-2 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                      {formatPrice(h.price, h.currency)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* History table */}
                            <div className="grid grid-cols-3 gap-2 mt-4">
                              {history.slice(-6).reverse().map((h: any, i: number) => (
                                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                                  <p className="text-green-400 font-bold text-sm">{formatPrice(h.price, h.currency)}</p>
                                  <p className="text-gray-600 text-[10px] mt-0.5">
                                    {new Date(h.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Current details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                          {[
                            { label: "Current Price", value: formatPrice(c.price, c.currency) },
                            { label: "Market",        value: c.market || "—" },
                            { label: "Region",        value: c.region || "—" },
                            { label: "Source",        value: c.source || "—" },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                              <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-1">{label}</p>
                              <p className="text-white text-sm font-medium">{value}</p>
                            </div>
                          ))}
                        </div>

                        {c.notes && (
                          <p className="text-gray-500 text-xs mt-3 bg-white/[0.02] rounded-xl p-3">
                            📝 {c.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}