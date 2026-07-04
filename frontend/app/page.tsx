import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/marketplace/HeroSection";
import CommodityBoard from "@/components/marketplace/CommodityBoard";
import FeaturedProducts from "@/components/marketplace/FeaturedProducts";
import CategoryGrid from "@/components/marketplace/CategoryGrid";
import WhyAfritide from "@/components/marketplace/WhyAfritide";
import CTASection from "@/components/marketplace/CTASection";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <CategoryGrid />
      <FeaturedProducts />
      <CommodityBoard />
      <WhyAfritide />
      <CTASection />
      <Footer />
    </main>
  );
}