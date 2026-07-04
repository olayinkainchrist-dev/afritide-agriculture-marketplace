import Link from "next/link";

const categories = [
  { id: "livestock", label: "Livestock", emoji: "🐄", desc: "Cattle · Goats · Sheep", bg: "from-amber-950/80 to-amber-900/40", border: "border-amber-800/40 hover:border-amber-600/60", tag: "bg-amber-500/20 text-amber-300" },
  { id: "cash_crops", label: "Cash Crops", emoji: "🌿", desc: "Cocoa · Coffee · Cotton", bg: "from-green-950/80 to-green-900/40", border: "border-green-800/40 hover:border-green-600/60", tag: "bg-green-500/20 text-green-300" },
  { id: "dairy", label: "Dairy", emoji: "🥛", desc: "Milk · Cheese · Eggs", bg: "from-blue-950/80 to-blue-900/40", border: "border-blue-800/40 hover:border-blue-600/60", tag: "bg-blue-500/20 text-blue-300" },
  { id: "fruits", label: "Fruits", emoji: "🥭", desc: "Mango · Banana · Citrus", bg: "from-yellow-950/80 to-yellow-900/40", border: "border-yellow-800/40 hover:border-yellow-600/60", tag: "bg-yellow-500/20 text-yellow-300" },
  { id: "vegetables", label: "Vegetables", emoji: "🥬", desc: "Tomatoes · Peppers · Onions", bg: "from-emerald-950/80 to-emerald-900/40", border: "border-emerald-800/40 hover:border-emerald-600/60", tag: "bg-emerald-500/20 text-emerald-300" },
  { id: "fishery", label: "Fishery", emoji: "🐟", desc: "Catfish · Shrimp · Tilapia", bg: "from-cyan-950/80 to-cyan-900/40", border: "border-cyan-800/40 hover:border-cyan-600/60", tag: "bg-cyan-500/20 text-cyan-300" },
  { id: "poultry", label: "Poultry", emoji: "🐔", desc: "Chicken · Turkey · Duck", bg: "from-orange-950/80 to-orange-900/40", border: "border-orange-800/40 hover:border-orange-600/60", tag: "bg-orange-500/20 text-orange-300" },
  { id: "machinery", label: "Machinery", emoji: "🚜", desc: "Tractors · Harvesters", bg: "from-slate-950/80 to-slate-900/40", border: "border-slate-700/40 hover:border-slate-500/60", tag: "bg-slate-500/20 text-slate-300" },
  { id: "seeds", label: "Seeds", emoji: "🌱", desc: "Maize · Rice · Vegetable", bg: "from-lime-950/80 to-lime-900/40", border: "border-lime-800/40 hover:border-lime-600/60", tag: "bg-lime-500/20 text-lime-300" },
  { id: "fertilizers", label: "Fertilizers", emoji: "🧪", desc: "Organic · NPK · Urea", bg: "from-violet-950/80 to-violet-900/40", border: "border-violet-800/40 hover:border-violet-600/60", tag: "bg-violet-500/20 text-violet-300" },
];

export default function CategoryGrid() {
  return (
    <section className="py-20 bg-[#060f08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <p className="text-green-500 text-sm font-semibold uppercase tracking-widest mb-3">Marketplace</p>
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Browse by
              <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent"> Category</span>
            </h2>
          </div>
          <Link href="/marketplace" className="text-green-400 hover:text-green-300 font-medium text-sm flex items-center gap-1 transition-colors whitespace-nowrap">
            View all products →
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/marketplace?category=${cat.id}`}
              className={`relative bg-gradient-to-br ${cat.bg} border ${cat.border} rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 group overflow-hidden`}>
              {/* Subtle glow on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white/[0.03] to-transparent rounded-2xl" />
              <div className="text-4xl mb-3">{cat.emoji}</div>
              <div className="font-bold text-white text-sm mb-1">{cat.label}</div>
              <div className="text-xs text-gray-500">{cat.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}