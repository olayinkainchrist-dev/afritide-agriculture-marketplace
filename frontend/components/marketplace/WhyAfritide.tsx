import { Shield, Globe, TrendingUp, MessageSquare, Award, Zap } from "lucide-react";

const features = [
  { icon: Shield, title: "KYC-Verified Sellers", desc: "Every farmer and exporter verified with government ID, business registration, and farm inspection.", accent: "text-green-400", bg: "bg-green-950/50 border-green-900/60" },
  { icon: Globe, title: "45+ Countries", desc: "Connect with international buyers from Europe, Asia, and the Americas with export documentation support.", accent: "text-sky-400", bg: "bg-sky-950/50 border-sky-900/60" },
  { icon: TrendingUp, title: "Live Prices", desc: "Real-time commodity prices in USD, GBP, EUR, NGN, GHS, and CFA — always know the market rate.", accent: "text-amber-400", bg: "bg-amber-950/50 border-amber-900/60" },
  { icon: MessageSquare, title: "Direct Trade", desc: "Chat directly with farmers and exporters. No middlemen cutting into your margins.", accent: "text-violet-400", bg: "bg-violet-950/50 border-violet-900/60" },
  { icon: Award, title: "Certified Quality", desc: "Phytosanitary, SON, NAFDAC, organic, and export-grade certifications on every listing.", accent: "text-rose-400", bg: "bg-rose-950/50 border-rose-900/60" },
  { icon: Zap, title: "Fast RFQ System", desc: "Post a Request for Quotation and get competitive bids from multiple verified sellers in 24 hours.", accent: "text-orange-400", bg: "bg-orange-950/50 border-orange-900/60" },
];

export default function WhyAfritide() {
  return (
    <section className="py-24 bg-[#060f08] border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-green-500 text-sm font-semibold uppercase tracking-widest mb-4">Why Afritide</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-5">
            Built for
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent"> serious traders</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-lg leading-relaxed">
            We built the most trusted infrastructure for African agricultural trade — combining technology with deep local market knowledge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div key={f.title}
              className={`border ${f.bg} rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-3xl bg-white/[0.02] group-hover:bg-white/[0.03] transition-colors" />
              <div className={`w-11 h-11 rounded-xl ${f.bg} border flex items-center justify-center mb-5`}>
                <f.icon className={`w-5 h-5 ${f.accent}`} />
              </div>
              <h3 className="font-bold text-white mb-2 text-base">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
