import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CommodityBoard from "@/components/marketplace/CommodityBoard";

export const metadata = {
  title: "Live Commodity Prices — Afritide",
  description: "Real-time agricultural commodity prices from African markets",
};

export default function CommoditiesPage() {
  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <p className="text-green-500 text-sm font-bold uppercase tracking-widest mb-3">Market Intelligence</p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Live Commodity
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent"> Prices</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl">
            Real-time agricultural commodity prices from African and global markets. Updated by our admin team daily.
          </p>
        </div>
        <CommodityBoard />
      </div>
      <Footer />
    </main>
  );
}