"use client";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import {
  Calendar, TrendingUp, ShoppingCart, Package,
  ChevronDown, Leaf, Sun, Cloud, Droplets,
} from "lucide-react";

const CURRENT_MONTH = new Date().getMonth(); // 0-indexed

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const REGIONS = ["All Regions", "West Africa", "East Africa", "Central Africa", "Southern Africa"];

const CROPS = [
  {
    name:          "Cocoa",
    emoji:         "🫘",
    category:      "CASH_CROPS",
    region:        "West Africa",
    description:   "West Africa produces 70% of the world's cocoa. Nigeria, Ghana and Côte d'Ivoire are the top producers.",
    harvest:       [9, 10, 11, 2, 3],        // Sep-Nov (main), Feb-Mar (mid)
    peak_supply:   [10, 11],
    best_buy:      [11, 0, 1],               // Nov-Jan
    best_sell:     [9, 10],
    harvest_label: "Sep–Nov (main), Feb–Mar (mid-crop)",
    peak_label:    "October–November",
    buy_label:     "November–January",
    sell_label:    "September–October",
    tip:           "Main crop accounts for 80% of annual production. Price typically peaks just before harvest.",
  },
  {
    name:          "Sesame",
    emoji:         "🌿",
    category:      "SEEDS",
    region:        "West Africa",
    description:   "Nigeria is Africa's largest sesame producer. Benue, Nasarawa and Taraba states are key growing areas.",
    harvest:       [10, 11, 0],
    peak_supply:   [11, 0],
    best_buy:      [11, 0, 1],
    best_sell:     [1, 2, 3],
    harvest_label: "October–December",
    peak_label:    "November–December",
    buy_label:     "November–January",
    sell_label:    "January–March",
    tip:           "Export demand peaks in Q1. Buy immediately after harvest for best prices.",
  },
  {
    name:          "Maize",
    emoji:         "🌽",
    category:      "CASH_CROPS",
    region:        "West Africa",
    description:   "Two growing seasons in Nigeria — the main season (rainy) and dry season. Kano, Kaduna and Benue are top producers.",
    harvest:       [7, 8, 9, 1, 2],
    peak_supply:   [8, 9],
    best_buy:      [8, 9, 10],
    best_sell:     [3, 4, 5],
    harvest_label: "Aug–Sep (main), Jan–Feb (dry season)",
    peak_label:    "August–September",
    buy_label:     "August–October",
    sell_label:    "March–May",
    tip:           "Prices are lowest at harvest time (Aug-Sep) and highest in the lean season (Apr-Jun).",
  },
  {
    name:          "Rice",
    emoji:         "🌾",
    category:      "CASH_CROPS",
    region:        "West Africa",
    description:   "Nigeria is the largest rice producer in West Africa. Kebbi, Niger and Ebonyi are key states.",
    harvest:       [8, 9, 10, 11],
    peak_supply:   [10],
    best_buy:      [10, 11, 0],
    best_sell:     [4, 5, 6],
    harvest_label: "September–November",
    peak_label:    "October",
    buy_label:     "November–January",
    sell_label:    "April–June",
    tip:           "Best export window is November–January when quality is highest and prices are competitive.",
  },
  {
    name:          "Soybean",
    emoji:         "🫘",
    category:      "SEEDS",
    region:        "West Africa",
    description:   "Benue, Plateau and Taraba states are the main soybean growing areas in Nigeria.",
    harvest:       [10, 11, 0],
    peak_supply:   [11],
    best_buy:      [11, 0],
    best_sell:     [3, 4, 5],
    harvest_label: "October–December",
    peak_label:    "November",
    buy_label:     "November–January",
    sell_label:    "March–May",
    tip:           "High protein content makes Nigerian soybeans competitive for export to Asian markets.",
  },
  {
    name:          "Groundnut",
    emoji:         "🥜",
    category:      "SEEDS",
    region:        "West Africa",
    description:   "Kano, Katsina and Jigawa are Nigeria's groundnut belt. Used for oil, flour and confectionery.",
    harvest:       [9, 10, 11],
    peak_supply:   [10, 11],
    best_buy:      [10, 11, 0],
    best_sell:     [2, 3, 4],
    harvest_label: "September–November",
    peak_label:    "October–November",
    buy_label:     "October–December",
    sell_label:    "February–April",
    tip:           "Aflatoxin risk increases with improper storage. Buy from certified sellers with lab reports.",
  },
  {
    name:          "Cassava",
    emoji:         "🌿",
    category:      "CASH_CROPS",
    region:        "West Africa",
    description:   "Nigeria is the world's largest cassava producer. Available year-round but peak quality is seasonal.",
    harvest:       [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    peak_supply:   [10, 11, 0, 1],
    best_buy:      [10, 11, 0],
    best_sell:     [4, 5, 6],
    harvest_label: "Year-round (peak Oct–Jan)",
    peak_label:    "October–January",
    buy_label:     "October–December",
    sell_label:    "April–June",
    tip:           "Processed forms (garri, starch, flour) fetch 3-5x the price of raw cassava.",
  },
  {
    name:          "Cashew",
    emoji:         "🥜",
    category:      "FRUITS",
    region:        "West Africa",
    description:   "Nigeria is Africa's third largest cashew producer. Oyo, Kwara and Kogi are key states.",
    harvest:       [1, 2, 3, 4],
    peak_supply:   [3, 4],
    best_buy:      [2, 3, 4],
    best_sell:     [5, 6, 7],
    harvest_label: "February–April",
    peak_label:    "March–April",
    buy_label:     "February–April",
    sell_label:    "May–July",
    tip:           "Raw cashew nuts (RCN) export window is tight — Feb to May. Processing adds significant value.",
  },
  {
    name:          "Palm Oil",
    emoji:         "🫙",
    category:      "CASH_CROPS",
    region:        "West Africa",
    description:   "Cross River, Akwa Ibom and Rivers state are Nigeria's palm oil belt.",
    harvest:       [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    peak_supply:   [5, 6, 7, 8],
    best_buy:      [5, 6, 7],
    best_sell:     [11, 0, 1],
    harvest_label: "Year-round (peak May–Aug)",
    peak_label:    "May–August",
    buy_label:     "May–July",
    sell_label:    "November–January",
    tip:           "Prices are lowest during peak production (May-Aug). Stock up for dry season premium.",
  },
  {
    name:          "Shea",
    emoji:         "🌰",
    category:      "CASH_CROPS",
    region:        "West Africa",
    description:   "Nigeria's shea belt runs through Kwara, Niger, Kogi, Benue and FCT.",
    harvest:       [5, 6, 7, 8],
    peak_supply:   [6, 7],
    best_buy:      [6, 7, 8],
    best_sell:     [11, 0, 1],
    harvest_label: "May–August",
    peak_label:    "June–July",
    buy_label:     "June–August",
    sell_label:    "November–January",
    tip:           "Shea butter demand peaks in European winter (Nov-Jan) for cosmetics industry.",
  },
  {
    name:          "Sorghum",
    emoji:         "🌾",
    category:      "CASH_CROPS",
    region:        "West Africa",
    description:   "Kano, Sokoto and Borno are major sorghum producing states. Used for food and brewing.",
    harvest:       [9, 10, 11],
    peak_supply:   [10, 11],
    best_buy:      [10, 11, 0],
    best_sell:     [3, 4, 5],
    harvest_label: "September–November",
    peak_label:    "October–November",
    buy_label:     "October–December",
    sell_label:    "March–May",
    tip:           "Brewing industry demand is consistent year-round. Food use peaks during festive seasons.",
  },
  {
    name:          "Coffee",
    emoji:         "☕",
    category:      "CASH_CROPS",
    region:        "East Africa",
    description:   "Ethiopia, Kenya and Uganda dominate African coffee production. Specialty grades command premium prices.",
    harvest:       [9, 10, 11, 0],
    peak_supply:   [11, 0],
    best_buy:      [11, 0, 1],
    best_sell:     [2, 3, 4],
    harvest_label: "October–January",
    peak_label:    "November–December",
    buy_label:     "November–January",
    sell_label:    "February–April",
    tip:           "Ethiopian Yirgacheffe and Kenyan AA are the most sought-after specialty grades globally.",
  },
  {
    name:          "Cotton",
    emoji:         "🌿",
    category:      "CASH_CROPS",
    region:        "West Africa",
    description:   "Katsina, Zamfara and Sokoto states produce the most cotton in Nigeria.",
    harvest:       [10, 11, 0],
    peak_supply:   [11, 0],
    best_buy:      [11, 0, 1],
    best_sell:     [3, 4, 5],
    harvest_label: "October–December",
    peak_label:    "November–December",
    buy_label:     "November–January",
    sell_label:    "March–May",
    tip:           "Lint quality is critical for export. Ginning and grading add significant export value.",
  },
  {
    name:          "Millet",
    emoji:         "🌾",
    category:      "SEEDS",
    region:        "West Africa",
    description:   "Drought-resistant crop grown across the Sahel belt. Key food security crop.",
    harvest:       [9, 10, 11],
    peak_supply:   [10, 11],
    best_buy:      [10, 11],
    best_sell:     [4, 5, 6],
    harvest_label: "September–November",
    peak_label:    "October–November",
    buy_label:     "October–November",
    sell_label:    "April–June",
    tip:           "Growing international demand for gluten-free grains is creating new export opportunities.",
  },
];

function getMonthStatus(crop: any, monthIdx: number) {
  if (crop.peak_supply.includes(monthIdx)) return "peak";
  if (crop.harvest.includes(monthIdx))     return "harvest";
  if (crop.best_buy.includes(monthIdx))    return "buy";
  return "off";
}

function getCurrentStatus(crop: any) {
  if (crop.peak_supply.includes(CURRENT_MONTH))  return { label: "Peak Supply",  color: "text-green-400",  bg: "bg-green-500/20 border-green-700/40" };
  if (crop.harvest.includes(CURRENT_MONTH))       return { label: "In Season",    color: "text-emerald-400",bg: "bg-emerald-500/20 border-emerald-700/40" };
  if (crop.best_buy.includes(CURRENT_MONTH))      return { label: "Best to Buy",  color: "text-sky-400",    bg: "bg-sky-500/20 border-sky-700/40" };
  if (crop.best_sell.includes(CURRENT_MONTH))     return { label: "Best to Sell", color: "text-amber-400",  bg: "bg-amber-500/20 border-amber-700/40" };
  return { label: "Off Season", color: "text-gray-500", bg: "bg-gray-500/20 border-gray-700/40" };
}

export default function HarvestCalendarPage() {
  const [selectedRegion,   setSelectedRegion]   = useState("All Regions");
  const [selectedCrop,     setSelectedCrop]     = useState<any>(null);
  const [searchQuery,      setSearchQuery]       = useState("");

  const filteredCrops = CROPS.filter(c => {
    const matchRegion = selectedRegion === "All Regions" || c.region === selectedRegion;
    const matchSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchRegion && matchSearch;
  });

  const inSeasonNow = CROPS.filter(c => c.harvest.includes(CURRENT_MONTH) || c.peak_supply.includes(CURRENT_MONTH));

  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />

      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#07120a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-950/60 border border-green-800/40 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-green-500 text-xs font-bold uppercase tracking-widest">Harvest Calendar</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-3">African Crop Calendar</h1>
          <p className="text-gray-500 max-w-2xl">
            Know when to buy, when to sell, and when crops are at peak quality.
            Plan your trades around African harvest seasons for maximum profitability.
          </p>

          {/* Current month highlight */}
          <div className="mt-6 inline-flex items-center gap-2 bg-green-950/40 border border-green-800/40 rounded-xl px-4 py-2.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-sm font-medium">
              Currently {MONTHS[CURRENT_MONTH]} — {inSeasonNow.length} crops in season
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* In Season Now */}
        <div className="mb-10">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-400" /> In Season Now
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {inSeasonNow.map(crop => {
              const status = getCurrentStatus(crop);
              return (
                <button key={crop.name} onClick={() => setSelectedCrop(crop)}
                  className="flex-shrink-0 flex items-center gap-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-green-700/40 rounded-2xl px-4 py-3 transition-all">
                  <span className="text-2xl">{crop.emoji}</span>
                  <div className="text-left">
                    <p className="text-white font-bold text-sm">{crop.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-8">
          {[
            { color: "bg-green-500",   label: "Peak Supply" },
            { color: "bg-emerald-400", label: "Harvest Season" },
            { color: "bg-sky-500",     label: "Best to Buy" },
            { color: "bg-amber-500",   label: "Best to Sell" },
            { color: "bg-white/[0.08]",label: "Off Season" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-sm ${color}`} />
              <span className="text-gray-500 text-xs">{label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search crops..."
            className="flex-1 max-w-xs bg-white/[0.04] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
          />
          <div className="flex gap-2 overflow-x-auto">
            {REGIONS.map(r => (
              <button key={r} onClick={() => setSelectedRegion(r)}
                className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  selectedRegion === r
                    ? "bg-green-600 text-white"
                    : "bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]"
                }`}>{r}</button>
            ))}
          </div>
        </div>

        {/* Crop Calendar Grid */}
        <div className="space-y-4">
          {filteredCrops.map(crop => {
            const status = getCurrentStatus(crop);
            return (
              <div key={crop.name}
                onClick={() => setSelectedCrop(selectedCrop?.name === crop.name ? null : crop)}
                className="bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] rounded-2xl overflow-hidden cursor-pointer transition-all">

                {/* Crop header */}
                <div className="flex items-center gap-4 p-5">
                  <span className="text-3xl flex-shrink-0">{crop.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-white font-bold">{crop.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-gray-600 text-xs">{crop.region}</span>
                    </div>

                    {/* Month bar */}
                    <div className="flex gap-1 mt-2">
                      {MONTHS.map((month, idx) => {
                        const mStatus = getMonthStatus(crop, idx);
                        const isCurrent = idx === CURRENT_MONTH;
                        return (
                          <div key={month} className="flex-1 flex flex-col items-center gap-1">
                            <div className={`w-full h-4 rounded-sm transition-all ${
                              mStatus === "peak"    ? "bg-green-500" :
                              mStatus === "harvest" ? "bg-emerald-400/70" :
                              mStatus === "buy"     ? "bg-sky-500/60" :
                              "bg-white/[0.06]"
                            } ${isCurrent ? "ring-1 ring-white/40" : ""}`} />
                            <span className={`text-[8px] font-medium ${isCurrent ? "text-white" : "text-gray-700"}`}>
                              {month}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform ${
                    selectedCrop?.name === crop.name ? "rotate-180" : ""
                  }`} />
                </div>

                {/* Expanded details */}
                {selectedCrop?.name === crop.name && (
                  <div className="border-t border-white/[0.06] p-5 space-y-4">
                    <p className="text-gray-400 text-sm leading-relaxed">{crop.description}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { icon: Calendar,     label: "Harvest Season",    value: crop.harvest_label, color: "text-emerald-400" },
                        { icon: TrendingUp,   label: "Peak Supply",       value: crop.peak_label,    color: "text-green-400" },
                        { icon: ShoppingCart, label: "Best to Buy",       value: crop.buy_label,     color: "text-sky-400" },
                        { icon: Package,      label: "Best to Sell",      value: crop.sell_label,    color: "text-amber-400" },
                      ].map(({ icon: Icon, label, value, color }) => (
                        <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Icon className={`w-3.5 h-3.5 ${color}`} />
                            <span className="text-gray-600 text-[10px] uppercase tracking-wide font-medium">{label}</span>
                          </div>
                          <p className={`${color} font-bold text-sm`}>{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-amber-950/30 border border-amber-800/30 rounded-xl p-4 flex gap-3">
                      <Sun className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-400 font-bold text-xs mb-1">Trading Tip</p>
                        <p className="text-gray-400 text-xs leading-relaxed">{crop.tip}</p>
                      </div>
                    </div>

                    <Link href={`/marketplace?category=${crop.category}`}
                      className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                      <ShoppingCart className="w-4 h-4" /> Browse {crop.name} on Marketplace
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <Footer />
    </main>
  );
}