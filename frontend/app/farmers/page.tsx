import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FarmersClient from "@/components/marketplace/FarmersClient";
import { Suspense } from "react";

export const metadata = {
  title: "Verified Farmers & Exporters — Afritide",
  description: "Browse verified African farmers, cooperatives and exporters on Afritide.",
};

export default function FarmersPage() {
  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <Suspense fallback={<div className="h-screen flex items-center justify-center text-gray-600">Loading...</div>}>
        <FarmersClient />
      </Suspense>
      <Footer />
    </main>
  );
}