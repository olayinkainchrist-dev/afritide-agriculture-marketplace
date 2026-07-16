"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/lib/api/products.api";
import { ProductCategory } from "@/types";
import ProductCard from "@/components/marketplace/ProductCard";
import MarketplaceSidebar from "@/components/marketplace/MarketplaceSidebar";
import {
  Search, SlidersHorizontal, X, ChevronDown,
  Grid3X3, List, Package,
} from "lucide-react";

const CATEGORIES = [
  { id: "all",          label: "All Products", emoji: "🌍" },
  { id: "LIVESTOCK",    label: "Livestock",    emoji: "🐄" },
  { id: "CASH_CROPS",   label: "Cash Crops",   emoji: "🌿" },
  { id: "DAIRY",        label: "Dairy",        emoji: "🥛" },
  { id: "FRUITS",       label: "Fruits",       emoji: "🥭" },
  { id: "VEGETABLES",   label: "Vegetables",   emoji: "🥬" },
  { id: "FISHERY",      label: "Fishery",      emoji: "🐟" },
  { id: "POULTRY",      label: "Poultry",      emoji: "🐔" },
  { id: "MACHINERY",    label: "Machinery",    emoji: "🚜" },
  { id: "SEEDS",        label: "Seeds",        emoji: "🌱" },
  { id: "FERTILIZERS",  label: "Fertilizers",  emoji: "🧪" },
];

const SORT_OPTIONS = [
  { value: "created_at-desc", label: "Newest First" },
  { value: "price-asc",       label: "Price: Low to High" },
  { value: "price-desc",      label: "Price: High to Low" },
  { value: "rating-desc",     label: "Top Rated" },
  { value: "views-desc",      label: "Most Viewed" },
];

export interface Filters {
  category:        ProductCategory | undefined;
  min_price:       number | undefined;
  max_price:       number | undefined;
  is_organic:      boolean | undefined;
  is_export_ready: boolean | undefined;
  is_negotiable:   boolean | undefined;
  country:         string | undefined;
  sort_by:         string;
  sort_order:      string;
}

const DEFAULT_FILTERS: Filters = {
  category:        undefined,
  min_price:       undefined,
  max_price:       undefined,
  is_organic:      undefined,
  is_export_ready: undefined,
  is_negotiable:   undefined,
  country:         undefined,
  sort_by:         "created_at",
  sort_order:      "desc",
};

export default function MarketplaceClient() {
  const searchParams = useSearchParams();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode,    setViewMode]    = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [page,        setPage]        = useState(1);
  const [filters,     setFilters]     = useState<Filters>({
    ...DEFAULT_FILTERS,
    category: (searchParams.get("category")?.toUpperCase() as ProductCategory) || undefined,
    country:  searchParams.get("country") || undefined,
  });

  useEffect(() => {
    const q        = searchParams.get("q") || "";
    const category = searchParams.get("category")?.toUpperCase() as ProductCategory || undefined;
    const country  = searchParams.get("country") || undefined;
    setSearchQuery(q);
    setFilters(prev => ({ ...prev, category, country }));
    setPage(1);
  }, [searchParams]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["products", filters, page, searchQuery],
    queryFn:  () => productsApi.list({
      ...filters,
      page,
      page_size: 20,
      search: searchQuery || undefined,
    }),
    staleTime: 30_000,
  });

  const products   = data?.data        || [];
  const pagination = data?.pagination;
  const totalCount = pagination?.total || 0;

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery("");
    setPage(1);
  };

  const handleSortChange = (val: string) => {
    const [sort_by, sort_order] = val.split("-");
    setFilters(prev => ({ ...prev, sort_by, sort_order }));
    setPage(1);
  };

  const activeFiltersCount = (
    [filters.category, filters.min_price, filters.max_price,
     filters.is_organic, filters.is_export_ready,
     filters.is_negotiable, filters.country] as unknown[]
  ).filter(Boolean).length;

  const currentCategoryLabel = filters.category
    ? (CATEGORIES.find(c => c.id === filters.category)?.emoji ?? "") + " " +
      (CATEGORIES.find(c => c.id === filters.category)?.label ?? "")
    : searchQuery
    ? `Search: "${searchQuery}"`
    : "All Products";

  return (
    <div className="min-h-screen bg-[#060f08]">

      {/* Page header */}
      <div className="border-b border-white/[0.06] bg-[#07120a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-green-500 text-xs font-bold uppercase tracking-widest mb-2">
                Marketplace
              </p>
              <h1 className="text-3xl md:text-4xl font-black text-white">
                {currentCategoryLabel}
              </h1>
              {totalCount > 0 && (
                <p className="text-gray-600 text-sm mt-1">
                  {totalCount.toLocaleString()} products found
                </p>
              )}
              {totalCount === 0 && !isLoading && searchQuery && (
                <p className="text-gray-600 text-sm mt-1">
                  No products found for &quot;{searchQuery}&quot;
                </p>
              )}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                onKeyDown={(e) => { if (e.key === "Enter") setPage(1); }}
                placeholder="Search products..."
                className="w-full pl-10 pr-10 py-3 bg-white/[0.04] border border-white/[0.08] focus:border-green-700/50 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-600 hover:text-white transition-colors" />
                </button>
              )}
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const isActive =
                (cat.id === "all" && !filters.category) ||
                filters.category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() =>
                    updateFilter(
                      "category",
                      cat.id === "all" ? undefined : (cat.id as ProductCategory)
                    )
                  }
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive
                      ? "bg-green-600 text-white shadow-lg shadow-green-900/30"
                      : "bg-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.07] border border-white/[0.06]"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">

          {/* Sidebar — desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <MarketplaceSidebar
              filters={filters}
              onFilterChange={<K extends keyof Filters>(k: K, v: Filters[K]) => updateFilter(k, v)}
              onClearAll={clearFilters}
              activeCount={activeFiltersCount}
            />
          </aside>

          {/* Main */}
          <div className="flex-1 min-w-0">

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {activeFiltersCount > 0 && (
                  <button onClick={clearFilters}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
                    <X className="w-3 h-3" /> Clear all ({activeFiltersCount})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="appearance-none bg-white/[0.04] border border-white/[0.08] text-gray-400 text-sm px-4 py-2.5 pr-8 rounded-xl focus:outline-none focus:border-green-700/50 transition-colors cursor-pointer">
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value} className="bg-[#0a1a0f]">
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
                </div>

                <div className="flex bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
                  {(["grid", "list"] as const).map((mode) => (
                    <button key={mode} onClick={() => setViewMode(mode)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        viewMode === mode ? "bg-green-600 text-white" : "text-gray-500 hover:text-white"
                      }`}>
                      {mode === "grid"
                        ? <Grid3X3 className="w-4 h-4" />
                        : <List    className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Products */}
            {isLoading || isFetching ? (
              <div className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl h-72 animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
                  <Package className="w-10 h-10 text-gray-700" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">No products found</h3>
                <p className="text-gray-600 text-sm mb-6 max-w-xs">
                  {searchQuery
                    ? `No results for "${searchQuery}". Try different keywords.`
                    : "Try adjusting your filters or search terms."
                  }
                </p>
                <button onClick={clearFilters}
                  className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm">
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <div className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} viewMode={viewMode} />
                  ))}
                </div>

                {pagination && pagination.total_pages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-12 flex-wrap">
                    <button
                      disabled={!pagination.has_prev}
                      onClick={() => setPage(p => p - 1)}
                      className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white disabled:opacity-30 rounded-xl text-sm font-medium transition-all">
                      ← Previous
                    </button>
                    <div className="flex gap-1.5">
                      {Array.from({ length: Math.min(pagination.total_pages, 7) }, (_, i) => i + 1).map((p) => (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                            p === page
                              ? "bg-green-600 text-white shadow-lg shadow-green-900/30"
                              : "bg-white/[0.04] border border-white/[0.08] text-gray-500 hover:text-white hover:bg-white/[0.07]"
                          }`}>
                          {p}
                        </button>
                      ))}
                    </div>
                    <button
                      disabled={!pagination.has_next}
                      onClick={() => setPage(p => p + 1)}
                      className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white disabled:opacity-30 rounded-xl text-sm font-medium transition-all">
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-[#0a1a0f] border-l border-white/[0.08] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-lg">Filters</h2>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5 text-gray-500 hover:text-white transition-colors" />
              </button>
            </div>
            <MarketplaceSidebar
              filters={filters}
              onFilterChange={<K extends keyof Filters>(k: K, v: Filters[K]) => updateFilter(k, v)}
              onClearAll={clearFilters}
              activeCount={activeFiltersCount}
            />
          </div>
        </div>
      )}
    </div>
  );
}