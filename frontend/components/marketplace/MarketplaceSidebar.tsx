"use client";
import { ProductCategory } from "@/types";
import { X } from "lucide-react";

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

interface Props {
  filters:        Filters;
  onFilterChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onClearAll:     () => void;
  activeCount:    number;
}

const COUNTRIES = [
  "Nigeria", "Ghana", "Kenya", "Ethiopia", "Ivory Coast",
  "Cameroon", "Tanzania", "Uganda", "Senegal", "Mali",
];

export default function MarketplaceSidebar({ filters, onFilterChange, onClearAll, activeCount }: Props) {
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-sm">Filters</h3>
        {activeCount > 0 && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <X className="w-3 h-3" /> Clear all ({activeCount})
          </button>
        )}
      </div>

      {/* Price range */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
        <h4 className="text-gray-300 font-semibold text-sm mb-4">Price Range (USD)</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-600 mb-1.5 block">Min</label>
            <input
              type="number"
              placeholder="0"
              value={filters.min_price ?? ""}
              onChange={(e) =>
                onFilterChange("min_price", e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-3 py-2.5 text-white placeholder-gray-700 text-sm focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1.5 block">Max</label>
            <input
              type="number"
              placeholder="Any"
              value={filters.max_price ?? ""}
              onChange={(e) =>
                onFilterChange("max_price", e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-3 py-2.5 text-white placeholder-gray-700 text-sm focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Product flags */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
        <h4 className="text-gray-300 font-semibold text-sm mb-4">Product Type</h4>
        <div className="space-y-3">
          {([
            { key: "is_organic",      label: "🌿 Organic Certified" },
            { key: "is_export_ready", label: "🚢 Export Ready" },
            { key: "is_negotiable",   label: "🤝 Price Negotiable" },
          ] as { key: keyof Filters; label: string }[]).map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() =>
                  onFilterChange(key, filters[key] ? undefined : (true as Filters[typeof key]))
                }
                className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                  filters[key]
                    ? "bg-green-500 border-green-500"
                    : "border-white/[0.15] group-hover:border-green-700/50"
                }`}
              >
                {filters[key] && (
                  <svg className="w-3 h-3 text-white" fill="NONE" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-gray-400 text-sm group-hover:text-white transition-colors">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Country */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
        <h4 className="text-gray-300 font-semibold text-sm mb-4">Country of Origin</h4>
        <div className="space-y-1">
          <button
            onClick={() => onFilterChange("country", undefined)}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
              !filters.country
                ? "bg-green-600/20 text-green-400 border border-green-700/40"
                : "text-gray-500 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            All Countries
          </button>
          {COUNTRIES.map((country) => (
            <button
              key={country}
              onClick={() =>
                onFilterChange("country", filters.country === country ? undefined : country)
              }
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                filters.country === country
                  ? "bg-green-600/20 text-green-400 border border-green-700/40"
                  : "text-gray-500 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {country}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
