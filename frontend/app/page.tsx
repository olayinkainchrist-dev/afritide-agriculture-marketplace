import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/marketplace/HeroSection";
import CommodityBoard from "@/components/marketplace/CommodityBoard";
import FeaturedProducts from "@/components/marketplace/FeaturedProducts";
import FeaturedFarmers from "@/components/marketplace/FeaturedFarmers";
import CategoryGrid from "@/components/marketplace/CategoryGrid";
import WhyAfritide from "@/components/marketplace/WhyAfritide";
import CTASection from "@/components/marketplace/CTASection";
import MarketNews from "@/components/marketplace/MarketNews";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <HeroSection />
      <CategoryGrid />
      <FeaturedProducts />
      <FeaturedFarmers />
      <CommodityBoard />
      <MarketNews />
      <WhyAfritide />
      <CTASection />
      <Footer />
    </main>
  );
}