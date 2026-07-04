"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/lib/api/products.api";
import { useAuthStore } from "@/lib/store/auth.store";
import Link from "next/link";
import {
  MapPin, Star, Heart, Share2, MessageSquare,
  FileText, Package, Leaf, CheckCircle2, ArrowRight,
  ChevronLeft, ChevronRight, BadgeCheck, Clock,
  TrendingUp, Shield, Globe, Phone, Mail,
  AlertCircle, Truck, Award, Users,
} from "lucide-react";
import { formatPrice, getCategoryLabel, formatDate, formatNumber } from "@/lib/utils";
import toast from "react-hot-toast";

interface Props { id: string; }

export default function ProductDetailClient({ id }: Props) {
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab,   setActiveTab]   = useState<"overview" | "specs" | "seller" | "reviews">("overview");
  const [quantity,    setQuantity]    = useState(1);
  const [wishlisted,  setWishlisted]  = useState(false);

  const { user, isAuthenticated } = useAuthStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn:  () => productsApi.getById(id),
    staleTime: 60_000,
  });

  const product = data?.data;

  // ── Loading state ──────────────────────────────────────────
  if (isLoading) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-4">
          <div className="aspect-square bg-white/[0.04] rounded-3xl animate-pulse" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square bg-white/[0.04] rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-white/[0.04] rounded-xl animate-pulse" style={{ width: `${[80,50,60,40,70,90][i]}%` }} />
          ))}
        </div>
      </div>
    </div>
  );

  // ── Error state ────────────────────────────────────────────
  if (isError || !product) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
        <AlertCircle className="w-10 h-10 text-gray-700" />
      </div>
      <h2 className="text-white font-bold text-xl mb-2">Product not found</h2>
      <p className="text-gray-600 text-sm mb-6">This product may have been removed or is no longer available.</p>
      <Link href="/marketplace" className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm">
        Browse Marketplace
      </Link>
    </div>
  );

  const images = product.images?.length ? product.images : (product.main_image ? [product.main_image] : []);
  const seller = product.seller;

  const handleContact = () => {
    if (!isAuthenticated) {
      toast.error("Please login to contact the seller");
      return;
    }
    toast.success("Opening chat with seller...");
  };

  const handleRFQ = () => {
    if (!isAuthenticated) {
      toast.error("Please login to send an RFQ");
      return;
    }
    toast.success("RFQ form coming soon!");
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to save products");
      return;
    }
    try {
      await productsApi.toggleWishlist(product.id);
      setWishlisted(!wishlisted);
      toast.success(wishlisted ? "Removed from wishlist" : "Saved to wishlist");
    } catch {
      toast.error("Failed to update wishlist");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-[#060f08]">

      {/* ── Breadcrumb ───────────────────────────────────── */}
      <div className="border-b border-white/[0.05] bg-[#07120a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Link href="/" className="hover:text-green-400 transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/marketplace" className="hover:text-green-400 transition-colors">Marketplace</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/marketplace?category=${product.category}`} className="hover:text-green-400 transition-colors capitalize">
              {getCategoryLabel(product.category)}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-400 truncate max-w-xs">{product.title}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Main grid ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">

          {/* Left — Image gallery */}
          <div className="space-y-4">
            {/* Main image */}
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-green-950/60 to-emerald-950/40 border border-white/[0.07]">
              {images.length > 0 ? (
                <img
                  src={images[activeImage]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <Package className="w-16 h-16 text-green-900" />
                  <span className="text-gray-700 text-sm">{getCategoryLabel(product.category)}</span>
                </div>
              )}

              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImage(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => setActiveImage(i => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.is_organic && (
                  <span className="bg-green-500/90 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                    <Leaf className="w-3 h-3" /> Organic
                  </span>
                )}
                {product.is_export_ready && (
                  <span className="bg-blue-500/90 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                    <Globe className="w-3 h-3" /> Export Ready
                  </span>
                )}
                {product.is_featured && (
                  <span className="bg-amber-500/90 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                    <Star className="w-3 h-3 fill-white" /> Featured
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button
                  onClick={handleWishlist}
                  className="w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <Heart className={`w-4 h-4 ${wishlisted ? "text-red-400 fill-red-400" : "text-white"}`} />
                </button>
                <button
                  onClick={handleShare}
                  className="w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <Share2 className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      activeImage === i
                        ? "border-green-500 opacity-100"
                        : "border-white/[0.07] opacity-50 hover:opacity-80"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Shield, label: "Verified Seller", sub: "KYC approved" },
                { icon: Truck, label: "Fast Dispatch", sub: `${product.delivery_time_days ?? "3-7"} days` },
                { icon: Award, label: "Quality Grade", sub: product.grade?.replace("_", " ") ?? "Standard" },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-3 text-center">
                  <Icon className="w-5 h-5 text-green-500 mx-auto mb-1.5" />
                  <p className="text-white text-xs font-semibold">{label}</p>
                  <p className="text-gray-600 text-[10px] mt-0.5 capitalize">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Product info */}
          <div className="flex flex-col gap-6">

            {/* Category & title */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-500 text-xs font-bold uppercase tracking-widest">
                  {getCategoryLabel(product.category)}
                </span>
                {product.grade && (
                  <span className="text-xs text-gray-600 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded-full capitalize">
                    {product.grade.replace("_", " ")}
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-3">
                {product.title}
              </h1>

              {/* Rating row */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`w-4 h-4 ${i <= Math.round(product.rating_average) ? "text-amber-400 fill-amber-400" : "text-gray-700"}`} />
                  ))}
                  <span className="text-gray-400 text-sm font-medium ml-1">{product.rating_average.toFixed(1)}</span>
                  <span className="text-gray-600 text-sm">({product.rating_count} reviews)</span>
                </div>
                <span className="text-gray-700 text-sm">·</span>
                <span className="text-gray-500 text-sm">{formatNumber(product.view_count)} views</span>
                <span className="text-gray-700 text-sm">·</span>
                <span className="text-gray-500 text-sm">{product.order_count} orders</span>
              </div>
            </div>

            {/* Price block */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
              <div className="flex items-end gap-3 mb-3">
                <span className="text-4xl font-black text-green-400">
                  {formatPrice(product.price, product.currency)}
                </span>
                <span className="text-gray-500 text-base mb-1">per {product.unit}</span>
                {product.is_negotiable && (
                  <span className="text-amber-400 text-sm font-bold bg-amber-950/40 px-3 py-1 rounded-full border border-amber-900/40 mb-1">
                    Negotiable
                  </span>
                )}
              </div>

              {product.min_price && product.max_price && (
                <p className="text-gray-600 text-sm mb-3">
                  Price range: {formatPrice(product.min_price, product.currency)} — {formatPrice(product.max_price, product.currency)}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/[0.06]">
                <div>
                  <p className="text-gray-600 text-xs uppercase tracking-wide mb-1">Available Stock</p>
                  <p className="text-white font-bold">{product.quantity_available.toLocaleString()} {product.unit}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs uppercase tracking-wide mb-1">Min. Order</p>
                  <p className="text-white font-bold">{product.minimum_order_quantity} {product.unit}</p>
                </div>
              </div>
            </div>

            {/* Key details */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Origin", value: [product.city, product.state, product.country].filter(Boolean).join(", ") || "—" },
                { label: "Delivery", value: `${product.delivery_time_days ?? "3-7"} days` },
                ...(product.harvest_date ? [{ label: "Harvest Date", value: formatDate(product.harvest_date) }] : []),
                ...(product.moisture_percentage ? [{ label: "Moisture", value: `${product.moisture_percentage}%` }] : []),
                ...(product.breed ? [{ label: "Breed", value: product.breed }] : []),
                ...(product.weight_kg ? [{ label: "Weight", value: `${product.weight_kg} kg` }] : []),
                ...(product.packaging ? [{ label: "Packaging", value: product.packaging }] : []),
                ...(product.storage_condition ? [{ label: "Storage", value: product.storage_condition }] : []),
              ].slice(0, 6).map(({ label, value }) => (
                <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-white text-sm font-semibold truncate">{value}</p>
                </div>
              ))}
            </div>

            {/* Certifications */}
            {product.certifications && product.certifications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.certifications.map((cert) => (
                  <span key={cert} className="flex items-center gap-1.5 text-xs text-green-400 bg-green-950/40 border border-green-800/40 px-3 py-1.5 rounded-full font-medium">
                    <CheckCircle2 className="w-3 h-3" /> {cert}
                  </span>
                ))}
              </div>
            )}

            {/* Quantity selector */}
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity(q => Math.max(product.minimum_order_quantity, q - 1))}
                  className="px-4 py-3 text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all font-bold text-lg"
                >
                  −
                </button>
                <span className="px-5 py-3 text-white font-bold min-w-[60px] text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(product.quantity_available, q + 1))}
                  className="px-4 py-3 text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all font-bold text-lg"
                >
                  +
                </button>
              </div>
              <span className="text-gray-500 text-sm">
                Total: <span className="text-green-400 font-bold">{formatPrice(product.price * quantity, product.currency)}</span>
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleContact}
                className="w-full group bg-green-500 hover:bg-green-400 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-green-900/30 flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Contact Seller
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleRFQ}
                  className="bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] hover:border-green-700/40 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Request Quote
                </button>
                <button
                  onClick={handleWishlist}
                  className="bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] hover:border-red-700/40 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Heart className={`w-4 h-4 ${wishlisted ? "text-red-400 fill-red-400" : ""}`} />
                  {wishlisted ? "Saved" : "Save"}
                </button>
              </div>
            </div>

            {/* Location */}
            {product.country && (
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>
                  {[product.farm_location, product.city, product.state, product.country]
                    .filter(Boolean).join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs section ─────────────────────────────────── */}
        <div className="border border-white/[0.07] rounded-3xl overflow-hidden mb-16">

          {/* Tab headers */}
          <div className="flex border-b border-white/[0.07] bg-white/[0.02] overflow-x-auto">
            {(["overview", "specs", "seller", "reviews"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-semibold capitalize whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab
                    ? "border-green-500 text-green-400"
                    : "border-transparent text-gray-500 hover:text-white"
                }`}
              >
                {tab === "overview" ? "Product Overview"
                  : tab === "specs" ? "Specifications"
                  : tab === "seller" ? "About Seller"
                  : "Reviews"}
              </button>
            ))}
          </div>

          <div className="p-8">

            {/* Overview tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {product.description ? (
                  <div>
                    <h3 className="text-white font-bold text-lg mb-3">Product Description</h3>
                    <p className="text-gray-400 leading-relaxed whitespace-pre-line">{product.description}</p>
                  </div>
                ) : (
                  <p className="text-gray-600">No description provided for this product.</p>
                )}

                {product.tags && product.tags.length > 0 && (
                  <div>
                    <h3 className="text-white font-bold text-sm mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.tags.map((tag) => (
                        <span key={tag} className="text-xs text-gray-400 bg-white/[0.04] border border-white/[0.07] px-3 py-1.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Specs tab */}
            {activeTab === "specs" && (
              <div>
                <h3 className="text-white font-bold text-lg mb-5">Technical Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: "Category", value: getCategoryLabel(product.category) },
                    { label: "Unit of Measure", value: product.unit },
                    { label: "Grade", value: product.grade?.replace("_", " ") },
                    { label: "Minimum Order", value: `${product.minimum_order_quantity} ${product.unit}` },
                    { label: "Available Stock", value: `${product.quantity_available} ${product.unit}` },
                    { label: "Currency", value: product.currency },
                    { label: "Organic", value: product.is_organic ? "Yes" : "No" },
                    { label: "Export Ready", value: product.is_export_ready ? "Yes" : "No" },
                    { label: "Price Negotiable", value: product.is_negotiable ? "Yes" : "No" },
                    { label: "Delivery Time", value: `${product.delivery_time_days ?? "3-7"} days` },
                    { label: "Country", value: product.country },
                    { label: "Listed", value: product.published_at ? formatDate(product.published_at) : "—" },
                    ...(product.moisture_percentage ? [{ label: "Moisture %", value: `${product.moisture_percentage}%` }] : []),
                    ...(product.harvest_date ? [{ label: "Harvest Date", value: formatDate(product.harvest_date) }] : []),
                    ...(product.packaging ? [{ label: "Packaging", value: product.packaging }] : []),
                    ...(product.storage_condition ? [{ label: "Storage", value: product.storage_condition }] : []),
                    ...(product.shelf_life_days ? [{ label: "Shelf Life", value: `${product.shelf_life_days} days` }] : []),
                    ...(product.breed ? [{ label: "Breed", value: product.breed }] : []),
                    ...(product.weight_kg ? [{ label: "Weight", value: `${product.weight_kg} kg` }] : []),
                    ...(product.age_months ? [{ label: "Age", value: `${product.age_months} months` }] : []),
                    ...(product.gender ? [{ label: "Gender", value: product.gender }] : []),
                    ...(product.vaccination_status ? [{ label: "Vaccination", value: product.vaccination_status }] : []),
                  ].filter(s => s.value && s.value !== "undefined").map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                      <span className="text-gray-500 text-sm">{label}</span>
                      <span className="text-white text-sm font-semibold capitalize">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seller tab */}
            {activeTab === "seller" && seller && (
              <div className="space-y-6">
                <div className="flex items-start gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-green-900/40 border border-green-800/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {seller.profile_image ? (
                      <img src={seller.profile_image} alt={seller.first_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-green-400">
                        {seller.first_name[0]}{seller.last_name[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-bold text-xl">
                        {seller.business_name || `${seller.first_name} ${seller.last_name}`}
                      </h3>
                      {seller.badge !== "none" && (
                        <BadgeCheck className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                    <p className="text-gray-500 text-sm capitalize mb-3">{seller.role.replace("_", " ")}</p>

                    <div className="flex items-center gap-4 flex-wrap text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-white font-bold">{seller.rating_average.toFixed(1)}</span>
                        <span>({seller.rating_count} reviews)</span>
                      </div>
                      {seller.country && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-green-600" />
                          <span>{seller.country}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                        <span>{seller.total_sales} sales</span>
                      </div>
                    </div>
                  </div>
                </div>

                {seller.bio && (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                    <p className="text-gray-400 text-sm leading-relaxed">{seller.bio}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Response Rate",  value: `${seller.response_rate.toFixed(0)}%`,   icon: Clock },
                    { label: "Total Sales",    value: seller.total_sales.toString(),            icon: TrendingUp },
                    { label: "Rating",         value: seller.rating_average.toFixed(1),         icon: Star },
                    { label: "Member Since",   value: formatDate(seller.created_at).split(" ").slice(2).join(" "), icon: Users },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-center">
                      <Icon className="w-4 h-4 text-green-500 mx-auto mb-2" />
                      <p className="text-white font-bold text-lg">{value}</p>
                      <p className="text-gray-600 text-xs">{label}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleContact}
                  className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-900/30"
                >
                  <MessageSquare className="w-5 h-5" />
                  Send Message to Seller
                </button>
              </div>
            )}

            {/* Reviews tab */}
            {activeTab === "reviews" && (
              <div className="space-y-6">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-6xl font-black text-white mb-1">{product.rating_average.toFixed(1)}</div>
                    <div className="flex justify-center mb-1">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className={`w-5 h-5 ${i <= Math.round(product.rating_average) ? "text-amber-400 fill-amber-400" : "text-gray-700"}`} />
                      ))}
                    </div>
                    <p className="text-gray-600 text-sm">{product.rating_count} reviews</p>
                  </div>

                  <div className="flex-1 space-y-2">
                    {[5,4,3,2,1].map(star => (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-3">{star}</span>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: star === Math.round(product.rating_average) ? "60%" : `${Math.max(5, 60 - (Math.abs(star - product.rating_average) * 15))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-center py-12 border border-white/[0.06] rounded-2xl">
                  <Star className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No reviews yet</p>
                  <p className="text-gray-700 text-sm mt-1">Be the first to review this product after purchase</p>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}