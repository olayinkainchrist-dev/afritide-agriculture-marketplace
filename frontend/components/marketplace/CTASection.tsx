import Link from "next/link";
import { ArrowRight, Sprout, ShoppingBag } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-24 bg-[#060f08] border-t border-white/[0.04]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-gradient-to-br from-green-950/80 via-emerald-950/60 to-green-950/80 border border-green-800/40 rounded-3xl p-12 md:p-20 text-center overflow-hidden">
          {/* Background glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-green-500/8 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 left-1/4 w-60 h-60 bg-emerald-500/6 rounded-full blur-3xl" />

          <div className="relative">
            <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-4">Join Afritide Today</p>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-5 leading-tight">
              Ready to start
              <br />
              <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-green-400 bg-clip-text text-transparent">
                trading smarter?
              </span>
            </h2>
            <p className="text-gray-400 text-lg mb-12 max-w-xl mx-auto leading-relaxed">
              Join thousands of farmers, exporters, and buyers already using Africa&apos;s most trusted agricultural marketplace.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register?role=farmer"
                className="group flex items-center justify-center gap-3 bg-green-500 hover:bg-green-400 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-2xl shadow-green-900/50">
                <Sprout className="w-5 h-5" />
                Start Selling
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/marketplace"
                className="group flex items-center justify-center gap-3 bg-white/[0.06] hover:bg-white/10 border border-white/10 hover:border-green-700/40 text-white font-bold px-8 py-4 rounded-2xl transition-all backdrop-blur-sm">
                <ShoppingBag className="w-5 h-5" />
                Browse Products
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}