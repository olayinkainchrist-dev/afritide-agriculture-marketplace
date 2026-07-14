"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import {
  TrendingUp, RefreshCw, ArrowUpRight, ArrowDownRight,
  Search, X, ChevronUp, BarChart3, Minus, GitCompare,
  Bell, BellOff,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
  ReferenceLine,
} from "recharts";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";
import { useAuthStore } from "@/lib/store/auth.store";

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
  USD: 1, NGN: 1580, GBP: 0.79, EUR: 0.92, GHS: 12.5,
};

const TYPE_COLORS: Record<string, string> = {
  FARM_GATE:     "bg-green-500/20 text-green-400 border-green-700/40",
  WHOLESALE:     "bg-blue-500/20 text-blue-400 border-blue-700/40",
  RETAIL:        "bg-amber-500/20 text-amber-400 border-amber-700/40",
  EXPORT:        "bg-violet-500/20 text-violet-400 border-violet-700/40",
  INTERNATIONAL: "bg-sky-500/20 text-sky-400 border-sky-700/40",
};

const CHART_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#06b6d4"];

const TIME_FILTERS = [
  { days: 7,   label: "1W" },
  { days: 30,  label: "1M" },
  { days: 90,  label: "3M" },
  { days: 365, label: "1Y" },
];

const ProfessionalTooltip = ({ active, payload, label, commodityName, currency }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-[#0a1a0f] border border-white/[0.12] rounded-xl p-3 shadow-2xl min-w-[160px]">
      <p className="text-gray-500 text-[10px] font-medium mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="mb-1">
          <p className="text-gray-400 text-[10px]">{p.name || commodityName}</p>
          <p className="text-white font-black text-sm">{formatPrice(p.value, currency)}</p>
          {p.payload?.pct_change != null && (
            <p className={`text-[10px] font-bold mt-0.5 ${
              p.payload.pct_change > 0 ? "text-green-400" :
              p.payload.pct_change < 0 ? "text-red-400" : "text-gray-500"
            }`}>
              {p.payload.pct_change > 0 ? "▲" : p.payload.pct_change < 0 ? "▼" : "—"}
              {" "}{Math.abs(p.payload.pct_change).toFixed(2)}%
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default function FullCommodityBoard() {
  const [activeType,      setActiveType]      = useState("all");
  const [search,          setSearch]          = useState("");
  const [displayCurrency, setDisplayCurrency] = useState("NGN");
  const [expandedId,      setExpandedId]      = useState<string | null>(null);
  const [chartDays,       setChartDays]       = useState(30);
  const [compareMode,     setCompareMode]     = useState(false);
  const [compareIds,      setCompareIds]      = useState<string[]>([]);
  const [subscribedIds,   setSubscribedIds]   = useState<string[]>([]);
  const [alertLoading,    setAlertLoading]    = useState<string | null>(null);

  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["full-commodities", activeType],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: "100" });
      if (activeType !== "all") params.append("price_type", activeType);
      const res = await apiClient.get(`/commodities?${params}`);
      return res.data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["commodity-history", expandedId, chartDays],
    queryFn: async () => {
      const res = await apiClient.get(`/commodities/${expandedId}/history?days=${chartDays}`);
      return res.data;
    },
    enabled: !!expandedId && !compareMode,
  });

  const { data: compareHistories } = useQuery({
    queryKey: ["compare-histories", compareIds, chartDays],
    queryFn: async () => {
      const results = await Promise.all(
        compareIds.map(id =>
          apiClient.get(`/commodities/${id}/history?days=${chartDays}`)
            .then(r => ({
              id,
              commodity_name: r.data?.data?.commodity_name || "",
              currency:       r.data?.data?.currency || "NGN",
              history:        r.data?.data?.history || [],
              has_history:    r.data?.data?.has_history || false,
            }))
            .catch(() => ({ id, commodity_name: "", currency: "NGN", history: [], has_history: false }))
        )
      );
      return results;
    },
    enabled: compareMode && compareIds.length > 0,
  });

  const allCommodities = data?.data || [];
  const commodities    = allCommodities.filter((c: any) =>
    !search || c.commodity_name.toLowerCase().includes(search.toLowerCase())
  );

  const convertPrice = (price: number, fromCurrency: string) => {
    const inUSD = price / (EXCHANGE_RATES[fromCurrency] || 1);
    return inUSD * (EXCHANGE_RATES[displayCurrency] || 1);
  };

  const formatConverted = (price: number, fromCurrency: string) => {
    const converted = convertPrice(price, fromCurrency);
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: displayCurrency,
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(converted);
  };

  const historyInfo = historyData?.data;
  const history     = historyInfo?.history || [];
  const hasHistory  = historyInfo?.has_history || false;

  const toggleCompare = (id: string) => {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const buildCompareData = () => {
    if (!compareHistories || (compareHistories as any[]).length === 0) return [];

    const dateSet = new Set<string>();
    (compareHistories as any[]).forEach((ch: any) => {
      ch.history.forEach((h: any) => {
        const d = new Date(h.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        dateSet.add(d);
      });
    });

    const dates = Array.from(dateSet).sort();

    return dates.map(date => {
      const point: any = { date };
      (compareHistories as any[]).forEach((ch: any) => {
        const match = ch.history.find((h: any) =>
          new Date(h.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) === date
        );
        if (match) {
          point[ch.commodity_name]              = match.price;
          point[`${ch.commodity_name}_pct`]     = match.pct_change;
        }
      });
      return point;
    });
  };

  const handleAlert = async (c: any) => {
    if (!isAuthenticated) { toast.error("Please login to set price alerts"); return; }
    setAlertLoading(c.id);
    try {
      if (subscribedIds.includes(c.id)) {
        const res   = await apiClient.get("/price-alerts");
        const alert = res.data?.data?.find((a: any) =>
          a.commodity_name.toLowerCase() === c.commodity_name.toLowerCase()
        );
        if (alert) {
          await apiClient.delete(`/price-alerts/${alert.id}`);
          setSubscribedIds(prev => prev.filter(x => x !== c.id));
          toast.success("Price alert removed");
        }
      } else {
        await apiClient.post("/price-alerts", {
          commodity_name: c.commodity_name,
          alert_type:     "any_change",
          currency:       c.currency,
        });
        setSubscribedIds(prev => [...prev, c.id]);
        toast.success(`Price alert set for ${c.commodity_name} 🔔`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update alert");
    } finally {
      setAlertLoading(null);
    }
  };

  // Build chart data — deduplicate by date, keep last price per date
  const buildChartData = (history: any[]) => {
    const dateMap = new Map<string, any>();
    history.forEach(h => {
      const date = new Date(h.recorded_at).toLocaleDateString("en-US", {
        month: "short", day: "numeric",
      });
      dateMap.set(date, {
        date,
        price:      h.price,
        pct_change: h.pct_change,
      });
    });
    return Array.from(dateMap.values());
  };

  return (
    <div className="space-y-6">

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {PRICE_TYPES.map(pt => (
            <button key={pt.value} onClick={() => { setActiveType(pt.value); setExpandedId(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeType === pt.value
                  ? "bg-green-600 text-white"
                  : "bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]"
              }`}>
              {pt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => { setCompareMode(!compareMode); setCompareIds([]); setExpandedId(null); }}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all border ${
              compareMode
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white/[0.04] text-gray-400 hover:text-white border-white/[0.06]"
            }`}>
            <GitCompare className="w-4 h-4" />
            {compareMode ? `Comparing (${compareIds.length}/4)` : "Compare"}
          </button>

          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2">
            <span className="text-gray-600 text-xs">Display in:</span>
            <select value={displayCurrency} onChange={e => setDisplayCurrency(e.target.value)}
              className="bg-transparent text-white text-sm focus:outline-none">
              {CURRENCIES.map(c => <option key={c} value={c} className="bg-[#0a1a0f]">{c}</option>)}
            </select>
          </div>

          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-2 text-sm text-green-500 bg-green-950/40 border border-green-900/60 px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Updating..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search commodities..."
          className="w-full pl-11 pr-10 py-3 bg-white/[0.04] border border-white/[0.08] focus:border-green-700/50 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-gray-600 hover:text-white" />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total",   value: allCommodities.length, color: "text-white" },
          { label: "Rising",  value: allCommodities.filter((c: any) => c.trend === "UP"     || c.trend === "UP").length,     color: "text-green-400" },
          { label: "Falling", value: allCommodities.filter((c: any) => c.trend === "DOWN"   || c.trend === "DOWN").length,   color: "text-red-400" },
          { label: "STABLE",  value: allCommodities.filter((c: any) => c.trend === "STABLE" || c.trend === "STABLE").length, color: "text-gray-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-gray-600 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Compare chart */}
      {compareMode && compareIds.length >= 2 && (
        <div className="bg-[#080f0a] border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-violet-400" /> Historical Price Comparison
              </h3>
              <p className="text-gray-600 text-xs mt-0.5">Price movement over selected period</p>
            </div>
            <div className="flex gap-2">
              {TIME_FILTERS.map(f => (
                <button key={f.days} onClick={() => setChartDays(f.days)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                    chartDays === f.days
                      ? "bg-green-600 text-white"
                      : "bg-white/[0.04] text-gray-500 border border-white/[0.06] hover:text-white"
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mb-4 flex-wrap">
            {compareIds.map((id, idx) => {
              const commodity = allCommodities.find((c: any) => c.id === id);
              const ch        = (compareHistories as any[])?.find((x: any) => x.id === id);
              return commodity ? (
                <div key={id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
                  style={{ borderColor: CHART_COLORS[idx] + "60", backgroundColor: CHART_COLORS[idx] + "15" }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[idx] }} />
                  <span className="text-white text-xs font-medium">{commodity.commodity_name}</span>
                  {ch && !ch.has_history && <span className="text-[10px] text-amber-400">no history</span>}
                  <button onClick={() => toggleCompare(id)} className="text-gray-500 hover:text-white ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null;
            })}
          </div>

          {(compareHistories as any[])?.every((ch: any) => !ch.has_history) ? (
            <div className="h-48 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Not enough historical data to display a trend.</p>
                <p className="text-gray-700 text-xs mt-1">Update commodity prices to start building history.</p>
              </div>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={buildCompareData()} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                    tickFormatter={(v: number) => {
                      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                      if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
                      return `${v}`;
                    }}
                  />
                  <Tooltip content={(props: any) => <ProfessionalTooltip {...props} currency="NGN" />} />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "#9ca3af", paddingTop: "8px" }} />
                  {compareIds.map((id, idx) => {
                    const ch = (compareHistories as any[])?.find((x: any) => x.id === id);
                    if (!ch || !ch.has_history) return null;
                    return (
                      <Line
                        key={id}
                        type="linear"
                        dataKey={ch.commodity_name}
                        stroke={CHART_COLORS[idx]}
                        strokeWidth={2.5}
                        dot={{ fill: CHART_COLORS[idx], r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: CHART_COLORS[idx], stroke: "#0a1a0f", strokeWidth: 2 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {compareMode && compareIds.length < 2 && (
        <div className="bg-violet-950/20 border border-violet-800/30 rounded-2xl p-4 text-center">
          <p className="text-violet-300 text-sm">
            Select {2 - compareIds.length} more {compareIds.length === 0 ? "commodities" : "commodity"} to compare historical prices
          </p>
        </div>
      )}

      {/* Price board table */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />)}
          </div>
        ) : commodities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <TrendingUp className="w-10 h-10 text-gray-700 mb-3" />
            <p className="text-gray-500 font-medium">No commodities found</p>
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-600 font-medium uppercase tracking-wide">
              {compareMode && <div className="col-span-1">Select</div>}
              <div className={compareMode ? "col-span-2" : "col-span-3"}>Commodity</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Current Price</div>
              <div className="col-span-2">Market</div>
              <div className="col-span-2">Change</div>
              {!compareMode && <div className="col-span-1">Trend</div>}
            </div>

            <div className="divide-y divide-white/[0.04]">
              {commodities.map((c: any) => (
                <div key={c.id}>
                  <div
                    onClick={() => compareMode ? toggleCompare(c.id) : setExpandedId(expandedId === c.id ? null : c.id)}
                    className={`grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 transition-colors cursor-pointer items-center ${
                      compareMode && compareIds.includes(c.id)
                        ? "bg-violet-950/20 hover:bg-violet-950/30"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    {compareMode && (
                      <div className="col-span-1">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          compareIds.includes(c.id) ? "bg-violet-500 border-violet-500" : "border-white/[0.2]"
                        }`}>
                          {compareIds.includes(c.id) && (
                            <svg className="w-3 h-3 text-white" fill="NONE" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    )}

                    <div className={compareMode ? "col-span-2" : "col-span-3"}>
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
                          : formatConverted(c.price, c.currency)}
                      </p>
                      <p className="text-gray-600 text-[10px]">per {c.unit}</p>
                      {displayCurrency !== c.currency && (
                        <p className="text-gray-700 text-[10px]">{formatPrice(c.price, c.currency)} original</p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <p className="text-gray-400 text-xs">{c.market || "—"}</p>
                      <p className="text-gray-600 text-[10px]">{c.region ? `${c.region}, ` : ""}{c.country || ""}</p>
                    </div>

                    <div className="col-span-2">
                      <div className={`flex items-center gap-1 text-sm font-bold ${
                        (c.trend === "UP"   || c.trend === "UP")   ? "text-green-400" :
                        (c.trend === "DOWN" || c.trend === "DOWN") ? "text-red-400"   : "text-gray-500"
                      }`}>
                        {(c.trend === "UP"   || c.trend === "UP")   ? <ArrowUpRight className="w-4 h-4" />   :
                         (c.trend === "DOWN" || c.trend === "DOWN") ? <ArrowDownRight className="w-4 h-4" /> :
                         <Minus className="w-4 h-4" />}
                        {c.change_percentage
                          ? `${c.change_percentage > 0 ? "+" : ""}${c.change_percentage.toFixed(1)}%`
                          : "—"}
                      </div>
                      {c.previous_price && (
                        <p className="text-gray-700 text-[10px]">prev: {formatPrice(c.previous_price, c.currency)}</p>
                      )}
                    </div>

                    {!compareMode && (
                      <div className="col-span-1 flex justify-center">
                        <div className={`p-1.5 rounded-lg transition-colors ${
                          expandedId === c.id ? "bg-green-600 text-white" : "text-gray-600 hover:text-white hover:bg-white/[0.05]"
                        }`}>
                          {expandedId === c.id ? <ChevronUp className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expanded — Historical Price Trend */}
                  {!compareMode && expandedId === c.id && (
                    <div className="px-5 pb-6 bg-[#080f0a] border-t border-white/[0.04]">
                      <div className="pt-5">

                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-white font-bold text-sm flex items-center gap-2">
                              <BarChart3 className="w-4 h-4 text-green-500" />
                              {c.commodity_name} — Historical Price Trend
                            </h4>
                            <p className="text-gray-600 text-[10px] mt-0.5">
                              {c.market} · {c.price_type?.replace("_", " ")} · per {c.unit}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {TIME_FILTERS.map(f => (
                              <button key={f.days}
                                onClick={(e) => { e.stopPropagation(); setChartDays(f.days); }}
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                                  chartDays === f.days
                                    ? "bg-green-600 text-white"
                                    : "bg-white/[0.04] text-gray-500 border border-white/[0.06] hover:text-white"
                                }`}>
                                {f.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Current price highlight */}
                        <div className="flex items-center gap-6 mb-5 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                          <div>
                            <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-0.5">Current Price</p>
                            <p className="text-green-400 font-black text-2xl">{formatPrice(c.price, c.currency)}</p>
                          </div>
                          {c.previous_price && (
                            <div>
                              <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-0.5">Previous</p>
                              <p className="text-gray-400 font-bold text-sm">{formatPrice(c.previous_price, c.currency)}</p>
                            </div>
                          )}
                          {c.change_percentage != null && (
                            <div>
                              <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-0.5">Change</p>
                              <p className={`font-black text-sm ${
                                c.change_percentage > 0 ? "text-green-400" :
                                c.change_percentage < 0 ? "text-red-400" : "text-gray-400"
                              }`}>
                                {c.change_percentage > 0 ? "▲" : c.change_percentage < 0 ? "▼" : "—"}
                                {" "}{Math.abs(c.change_percentage).toFixed(2)}%
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Chart */}
                        {historyLoading ? (
                          <div className="h-56 flex items-center justify-center">
                            <RefreshCw className="w-6 h-6 text-green-500 animate-spin" />
                          </div>
                        ) : !hasHistory || history.length < 2 ? (
                          <div className="h-56 flex flex-col items-center justify-center border border-white/[0.05] rounded-xl">
                            <BarChart3 className="w-8 h-8 text-gray-700 mb-2" />
                            <p className="text-gray-500 text-sm font-medium">Not enough historical data to display a trend.</p>
                            <p className="text-gray-700 text-xs mt-1">Update this commodity price to start building history.</p>
                          </div>
                        ) : (
                          <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={buildChartData(history)}
                                margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                <XAxis
                                  dataKey="date"
                                  tick={{ fill: "#6b7280", fontSize: 10 }}
                                  tickLine={false}
                                  axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                                  interval={0}
                                />
                                <YAxis
                                  tick={{ fill: "#6b7280", fontSize: 10 }}
                                  tickLine={false}
                                  axisLine={false}
                                  width={70}
                                  tickFormatter={(v: number) => {
                                    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                                    if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
                                    return `${v}`;
                                  }}
                                />
                                <Tooltip
                                  content={(props: any) => (
                                    <ProfessionalTooltip
                                      {...props}
                                      commodityName={c.commodity_name}
                                      currency={c.currency}
                                    />
                                  )}
                                />
                                <ReferenceLine
                                  y={c.price}
                                  stroke="rgba(34,197,94,0.3)"
                                  strokeDasharray="4 4"
                                  label={{ value: "Current", fill: "#22c55e", fontSize: 9, position: "right" }}
                                />
                                <Line
                                  type="linear"
                                  dataKey="price"
                                  stroke="#22c55e"
                                  strokeWidth={2.5}
                                  dot={{ fill: "#22c55e", r: 4, strokeWidth: 0 }}
                                  activeDot={{ r: 6, fill: "#22c55e", stroke: "#0a1a0f", strokeWidth: 2 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {/* History table */}
                        {history.length >= 2 && (
                          <div className="mt-4">
                            <p className="text-gray-600 text-[10px] uppercase tracking-widest font-bold mb-2">Recent Records</p>
                            <div className="grid grid-cols-3 gap-2">
                              {history.slice(-6).reverse().map((h: any, i: number) => (
                                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                                  <p className="text-green-400 font-bold text-sm">{formatPrice(h.price, h.currency)}</p>
                                  {h.pct_change != null && (
                                    <p className={`text-[10px] font-bold ${
                                      h.pct_change > 0 ? "text-green-400" :
                                      h.pct_change < 0 ? "text-red-400" : "text-gray-500"
                                    }`}>
                                      {h.pct_change > 0 ? "▲" : h.pct_change < 0 ? "▼" : "—"}
                                      {" "}{Math.abs(h.pct_change).toFixed(1)}%
                                    </p>
                                  )}
                                  <p className="text-gray-600 text-[10px] mt-0.5">
                                    {new Date(h.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Details grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                          {[
                            { label: "Market",  value: c.market  || "—" },
                            { label: "Region",  value: c.region  || "—" },
                            { label: "Source",  value: c.source  || "—" },
                            { label: "Updated", value: c.updated_at ? new Date(c.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—" },
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

                        {/* Price Alert */}
                        <div className="mt-4 flex items-center gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAlert(c); }}
                            disabled={alertLoading === c.id}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                              subscribedIds.includes(c.id)
                                ? "bg-amber-500/20 text-amber-400 border-amber-700/40 hover:bg-amber-500/30"
                                : "bg-white/[0.04] text-gray-400 hover:text-green-400 hover:border-green-700/40 border-white/[0.07]"
                            }`}>
                            {alertLoading === c.id
                              ? <RefreshCw className="w-4 h-4 animate-spin" />
                              : subscribedIds.includes(c.id)
                              ? <BellOff className="w-4 h-4" />
                              : <Bell className="w-4 h-4" />
                            }
                            {subscribedIds.includes(c.id) ? "Remove Alert" : "Set Price Alert"}
                          </button>
                          <p className="text-gray-600 text-xs">
                            {subscribedIds.includes(c.id)
                              ? "You will be emailed when this price changes"
                              : "Get emailed when this price changes"
                            }
                          </p>
                        </div>
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
