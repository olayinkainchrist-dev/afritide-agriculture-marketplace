import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MarketplaceClient from "@/components/marketplace/MarketplaceClient";
import { Suspense } from "react";

export const metadata = {
  title: "Marketplace — Afritide Agriculture",
  description: "Browse thousands of verified agricultural products from African farmers and exporters.",
};

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <Suspense fallback={<div className="h-screen flex items-center justify-center text-gray-600">Loading marketplace...</div>}>
        <MarketplaceClient />
      </Suspense>
      <Footer />
    </main>
  );
}