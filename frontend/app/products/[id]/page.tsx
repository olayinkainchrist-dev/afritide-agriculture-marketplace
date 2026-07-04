"use client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductDetailClient from "@/components/marketplace/ProductDetailClient";
import { use } from "react";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <ProductDetailClient id={id} />
      <Footer />
    </main>
  );
}