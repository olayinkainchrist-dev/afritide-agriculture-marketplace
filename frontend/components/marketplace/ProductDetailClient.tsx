"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/lib/api/products.api";
import { cartApi } from "@/lib/api/cart.api";
import { useAuthStore } from "@/lib/store/auth.store";
import { useCartStore } from "@/lib/store/cart.store";
import Link from "next/link";
import {
  MapPin, Star, Heart, Share2, MessageSquare,
  FileText, Package, Leaf, CheckCircle2, ArrowRight,
  ChevronLeft, ChevronRight, BadgeCheck, Clock,
  TrendingUp, Shield, Globe, Phone, Mail,
  AlertCircle, Truck, Award, Users, Loader2, X,
  ShoppingCart,
} from "lucide-react";
import { formatPrice, getCategoryLabel, formatDate, formatNumber } from "@/lib/utils";
import toast from "react-hot-toast";
import apiClient from "@/lib/api/client";

interface Props { id: string; }

export default function ProductDetailClient({ id }: Props) {
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab,   setActiveTab]   = useState<"overview" | "specs" | "seller" | "reviews">("overview");
  const [quantity,    setQuantity]    = useState(1);
  const [wishlisted,  setWishlisted]  = useState(false);
  const [showRFQModal, setShowRFQModal] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  const { user, isAuthenticated } = useAuthStore();
  const { setItems } = useCartStore();
  const queryClient = useQueryClient();

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
  const sellerName = seller ? (seller.business_name || `${seller.first_name} ${seller.last_name}`) : "the seller";

  // Calculate effective price based on tiers
  const getEffectivePrice = () => {
    if (!product.price_tiers || product.price_tiers.length === 0) return product.price;
    const tier = product.price_tiers.find((t: any) =>
      quantity >= t.min_qty && (t.max_qty === null || quantity <= t.max_qty)
    );
    return tier ? tier.price : product.price;
  };

  const effectivePrice = getEffectivePrice();

  const handleRFQ = () => {
    if (!isAuthenticated) {
      toast.error("Please login to send an RFQ");
      return;
    }
    setShowRFQModal(true);
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

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to add items to cart");
      return;
    }
    setAddingToCart(true);
    try {
      const res = await cartApi.addItem(product.id, quantity);
      setItems(res.data?.items || []);
      toast.success("Added to cart!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
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

              {/* Bulk pricing tiers */}
              {product.price_tiers && product.price_tiers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <p className="text-gray-600 text-xs uppercase tracking-wide mb-2 font-bold">Bulk Pricing</p>
                  <div className="space-y-1.5">
                    {product.price_tiers.map((tier: any, i: number) => {
                      const isActive = quantity >= tier.min_qty &&
                        (tier.max_qty === null || quantity <= tier.max_qty);
                      return (
                        <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                          isActive
                            ? "bg-green-500/20 border border-green-700/40"
                            : "bg-white/[0.02] border border-white/[0.05]"
                        }`}>
                          <span className="text-gray-400">
                            {tier.min_qty}{tier.max_qty ? `–${tier.max_qty}` : "+"} {product.unit}
                          </span>
                          <span className={`font-black ${isActive ? "text-green-400" : "text-white"}`}>
                            {formatPrice(tier.price, product.currency)}/{product.unit}
                            {isActive && <span className="text-green-500 ml-1">← your tier</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
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
                Total: <span className="text-green-400 font-bold">{formatPrice(effectivePrice * quantity, product.currency)}</span>
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3">

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-900/30"
              >
                {addingToCart
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
                  : <><ShoppingCart className="w-4 h-4" /> Add to Cart</>
                }
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
              <div className="space-y-8">
                {/* Basic specs */}
                <div>
                  <h3 className="text-white font-bold text-lg mb-5">Technical Specifications</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { label: "Category",       value: getCategoryLabel(product.category) },
                      { label: "Unit of Measure",value: product.unit },
                      { label: "Grade",          value: product.grade?.replace("_", " ") },
                      { label: "Minimum Order",  value: `${product.minimum_order_quantity} ${product.unit}` },
                      { label: "Available Stock",value: `${product.quantity_available} ${product.unit}` },
                      { label: "Currency",       value: product.currency },
                      { label: "Organic",        value: product.is_organic ? "Yes" : "No" },
                      { label: "Export Ready",   value: product.is_export_ready ? "Yes" : "No" },
                      { label: "Price Negotiable",value: product.is_negotiable ? "Yes" : "No" },
                      { label: "Delivery Time",  value: `${product.delivery_time_days ?? "3-7"} days` },
                      { label: "Country",        value: product.country },
                      { label: "Listed",         value: product.published_at ? formatDate(product.published_at) : "—" },
                      ...(product.moisture_percentage   ? [{ label: "Moisture %",      value: `${product.moisture_percentage}%` }]   : []),
                      ...(product.harvest_date          ? [{ label: "Harvest Date",    value: formatDate(product.harvest_date) }]    : []),
                      ...(product.packaging             ? [{ label: "Packaging",       value: product.packaging }]                   : []),
                      ...(product.storage_condition     ? [{ label: "Storage",         value: product.storage_condition }]           : []),
                      ...(product.shelf_life_days       ? [{ label: "Shelf Life",      value: `${product.shelf_life_days} days` }]   : []),
                      ...(product.breed                 ? [{ label: "Breed",           value: product.breed }]                       : []),
                      ...(product.weight_kg             ? [{ label: "Weight",          value: `${product.weight_kg} kg` }]           : []),
                      ...(product.age_months            ? [{ label: "Age",             value: `${product.age_months} months` }]      : []),
                      ...(product.gender                ? [{ label: "Gender",          value: product.gender }]                      : []),
                      ...(product.vaccination_status    ? [{ label: "Vaccination",     value: product.vaccination_status }]          : []),
                    ].filter(s => s.value && s.value !== "undefined").map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                        <span className="text-gray-500 text-sm">{label}</span>
                        <span className="text-white text-sm font-semibold capitalize">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quality Analysis */}
                {(product.purity_percentage || product.protein_percentage || product.oil_content_percentage ||
                  product.foreign_matter_percentage || product.broken_grain_percentage) && (
                  <div>
                    <h3 className="text-white font-bold text-lg mb-2">Quality Analysis</h3>
                    <p className="text-gray-500 text-sm mb-5">Lab-verified quality parameters for this product.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { label: "Purity",         value: product.purity_percentage,        color: "text-green-400",  bg: "bg-green-950/30 border-green-800/40",  suffix: "%" },
                        { label: "Protein",        value: product.protein_percentage,        color: "text-sky-400",    bg: "bg-sky-950/30 border-sky-800/40",      suffix: "%" },
                        { label: "Oil Content",    value: product.oil_content_percentage,    color: "text-amber-400",  bg: "bg-amber-950/30 border-amber-800/40",  suffix: "%" },
                        { label: "Moisture",       value: product.moisture_percentage,       color: "text-blue-400",   bg: "bg-blue-950/30 border-blue-800/40",    suffix: "%" },
                        { label: "Foreign Matter", value: product.foreign_matter_percentage, color: "text-red-400",    bg: "bg-red-950/30 border-red-800/40",      suffix: "%" },
                        { label: "Broken Grain",   value: product.broken_grain_percentage,   color: "text-orange-400", bg: "bg-orange-950/30 border-orange-800/40",suffix: "%" },
                      ].filter(q => q.value !== null && q.value !== undefined).map(({ label, value, color, bg, suffix }) => (
                        <div key={label} className={`border rounded-2xl p-4 text-center ${bg}`}>
                          <p className={`text-3xl font-black ${color} mb-1`}>{value}{suffix}</p>
                          <p className="text-gray-400 text-xs font-medium">{label}</p>
                          <div className="mt-3 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${color.replace("text-", "bg-")}`}
                              style={{ width: `${Math.min(100, Number(value))}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {product.certifications && product.certifications.length > 0 && (
                  <div>
                    <h3 className="text-white font-bold text-lg mb-5">Certifications</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {product.certifications.map((cert: string) => (
                        <div key={cert} className="flex items-center gap-3 p-4 bg-green-950/20 border border-green-800/30 rounded-2xl">
                          <div className="w-8 h-8 rounded-lg bg-green-600/20 border border-green-700/40 flex items-center justify-center flex-shrink-0">
                            <Award className="w-4 h-4 text-green-400" />
                          </div>
                          <span className="text-green-300 text-sm font-medium">{cert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lab Reports & Documents */}
                {(product.lab_report_url || product.inspection_certificate_url) && (
                  <div>
                    <h3 className="text-white font-bold text-lg mb-5">Lab Reports & Documents</h3>
                    <div className="space-y-3">
                      {product.lab_report_url && (
                        <a href={product.lab_report_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.07] hover:border-green-700/40 rounded-2xl transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-950/50 border border-green-800/40 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                              <p className="text-white font-medium text-sm">Lab Analysis Report</p>
                              <p className="text-gray-600 text-xs">Quality test results — Click to view</p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-green-400 transition-colors" />
                        </a>
                      )}
                      {product.inspection_certificate_url && (
                        <a href={product.inspection_certificate_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.07] hover:border-green-700/40 rounded-2xl transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-sky-950/50 border border-sky-800/40 flex items-center justify-center">
                              <Shield className="w-5 h-5 text-sky-400" />
                            </div>
                            <div>
                              <p className="text-white font-medium text-sm">Inspection Certificate</p>
                              <p className="text-gray-600 text-xs">Third-party inspection report — Click to view</p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-sky-400 transition-colors" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
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
                      {seller.badge !== "NONE" && (
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
                    { label: "Response Rate", value: `${(seller.response_rate ?? 0).toFixed(0)}%`,  icon: Clock },
                    { label: "Total Sales",   value: (seller.total_sales ?? 0).toString(),           icon: TrendingUp },
                    { label: "Rating",        value: `${(seller.rating_average ?? 0).toFixed(1)}★`,  icon: Star },
                    { label: "Member Since",  value: formatDate(seller.created_at).split(" ").slice(2).join(" "), icon: Users },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-center">
                      <Icon className="w-4 h-4 text-green-500 mx-auto mb-2" />
                      <p className="text-white font-bold text-lg">{value}</p>
                      <p className="text-gray-600 text-xs">{label}</p>
                    </div>
                  ))}
                </div>
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

                {/* Review form — only for authenticated buyers */}
                {isAuthenticated && user?.role === "BUYER" && (
                  <ReviewForm productId={product.id} onSubmitted={() => {
                    queryClient.invalidateQueries({ queryKey: ["product", id] });
                  }} />
                )}

                <ReviewsList productId={product.id} />
              </div>
            )}

          </div>
        </div>

      </div>

      {/* RFQ Modal */}
      {showRFQModal && (
        <RFQModal
          product={product}
          onClose={() => setShowRFQModal(false)}
        />
      )}
    </div>
  );
}

function ReviewForm({ productId, onSubmitted }: { productId: string; onSubmitted: () => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { toast.error("Please select a rating"); return; }
    if (!comment.trim()) { toast.error("Please write a review"); return; }
    setSubmitting(true);
    try {
      await apiClient.post("/reviews", {
        product_id: productId,
        overall_rating: rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      });
      toast.success("Review submitted!");
      setSubmitted(true);
      onSubmitted();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return (
    <div className="bg-green-950/30 border border-green-800/30 rounded-2xl p-5 text-center mb-6">
      <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
      <p className="text-white font-bold">Review submitted!</p>
      <p className="text-gray-500 text-sm mt-1">Thank you for your feedback.</p>
    </div>
  );

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 mb-6">
      <h4 className="text-white font-bold mb-4 text-sm">Write a Review</h4>

      {/* Star rating */}
      <div className="flex items-center gap-1 mb-4">
        {[1,2,3,4,5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110"
          >
            <Star className={`w-7 h-7 transition-colors ${
              star <= (hover || rating)
                ? "text-amber-400 fill-amber-400"
                : "text-gray-700"
            }`} />
          </button>
        ))}
        {rating > 0 && (
          <span className="text-gray-400 text-sm ml-2">
            {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
          </span>
        )}
      </div>

      {/* Title */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Review title (optional)"
        className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors mb-3"
      />

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Share your experience with this product..."
        className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none mb-4"
      />

      <button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        className="bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2 text-sm"
      >
        {submitting
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
          : <><Star className="w-4 h-4" /> Submit Review</>
        }
      </button>
    </div>
  );
}

function ReviewsList({ productId }: { productId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const res = await apiClient.get(`/reviews/product/${productId}?page_size=10`);
      return res.data;
    },
  });

  const reviews = data?.data || [];

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-white/[0.03] rounded-2xl animate-pulse" />
      ))}
    </div>
  );

  if (reviews.length === 0) return (
    <div className="text-center py-12 border border-white/[0.06] rounded-2xl">
      <Star className="w-10 h-10 text-gray-700 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">No reviews yet</p>
      <p className="text-gray-700 text-sm mt-1">Be the first to review this product after purchase</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {reviews.map((review: any) => (
        <div key={review.id} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-900/40 flex items-center justify-center text-green-400 font-black text-xs flex-shrink-0">
                {review.reviewer?.first_name?.[0]}{review.reviewer?.last_name?.[0]}
              </div>
              <div>
                <p className="text-white font-medium text-sm">
                  {review.reviewer?.first_name} {review.reviewer?.last_name}
                </p>
                <p className="text-gray-600 text-xs">{formatDate(review.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`w-3.5 h-3.5 ${i <= review.overall_rating ? "text-amber-400 fill-amber-400" : "text-gray-700"}`} />
              ))}
            </div>
          </div>

          {review.title && (
            <p className="text-white font-bold text-sm mb-1">{review.title}</p>
          )}
          <p className="text-gray-400 text-sm leading-relaxed">{review.comment}</p>

          {review.is_verified_purchase && (
            <div className="flex items-center gap-1.5 mt-3">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400 text-xs font-medium">Verified Purchase</span>
            </div>
          )}

          {review.seller_reply && (
            <div className="mt-4 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <p className="text-gray-500 text-xs font-bold mb-1">Seller Reply</p>
              <p className="text-gray-400 text-sm">{review.seller_reply}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RFQModal({ product, onClose }: { product: any; onClose: () => void }) {
  const [form, setForm] = useState({
    quantity: product.minimum_order_quantity || 1,
    unit: product.unit,
    target_price: "",
    currency: product.currency || "USD",
    delivery_country: "",
    delivery_date: "",
    specifications: "",
    additional_requirements: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!form.quantity) { toast.error("Quantity is required"); return; }
    setSubmitting(true);
    try {
      await apiClient.post("/rfqs", {
        product_id: product.id,
        seller_id: product.seller_id,
        product_name: product.title,
        category: product.category,
        quantity: Number(form.quantity),
        unit: form.unit,
        target_price: form.target_price ? Number(form.target_price) : undefined,
        currency: form.currency,
        delivery_country: form.delivery_country || undefined,
        delivery_date: form.delivery_date || undefined,
        specifications: form.specifications || undefined,
        additional_requirements: form.additional_requirements || undefined,
      });
      setSubmitted(true);
      toast.success("RFQ submitted! The seller will respond shortly.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit RFQ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a1a0f] border border-white/[0.08] rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white font-bold text-lg">Request for Quotation</h3>
            <p className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">{product.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h4 className="text-white font-bold text-xl mb-2">RFQ Submitted!</h4>
            <p className="text-gray-400 text-sm mb-6">
              Your request has been sent to the seller. They will respond with a quotation shortly.
            </p>
            <button
              onClick={onClose}
              className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Quantity + Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">
                  Quantity <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                  min={product.minimum_order_quantity || 1}
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-colors"
                />
                <p className="text-gray-700 text-[10px] mt-1">
                  Min: {product.minimum_order_quantity} {product.unit}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Unit</label>
                <input
                  value={form.unit}
                  readOnly
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-gray-400 text-sm cursor-not-allowed"
                />
              </div>
            </div>

            {/* Target price + Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">
                  Target Price <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.target_price}
                  onChange={(e) => setForm({ ...form, target_price: e.target.value })}
                  placeholder="Your budget"
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3 focus:outline-none appearance-none"
                >
                  {["USD","NGN","GBP","EUR","GHS","CFA"].map(c => (
                    <option key={c} value={c} className="bg-[#0a1a0f]">{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Delivery country + date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Delivery Country</label>
                <input
                  value={form.delivery_country}
                  onChange={(e) => setForm({ ...form, delivery_country: e.target.value })}
                  placeholder="e.g. Nigeria"
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Delivery Date</label>
                <input
                  type="date"
                  value={form.delivery_date}
                  onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Specifications */}
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Specifications</label>
              <textarea
                value={form.specifications}
                onChange={(e) => setForm({ ...form, specifications: e.target.value })}
                rows={2}
                placeholder="Quality requirements, grade, certifications needed..."
                className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Additional requirements */}
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Additional Requirements</label>
              <textarea
                value={form.additional_requirements}
                onChange={(e) => setForm({ ...form, additional_requirements: e.target.value })}
                rows={2}
                placeholder="Packaging, labelling, documentation..."
                className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Current product price reference */}
            <div className="bg-green-950/20 border border-green-800/20 rounded-xl p-3 flex items-center justify-between">
              <span className="text-gray-500 text-xs">Listed price</span>
              <span className="text-green-400 font-black text-sm">
                {formatPrice(product.price, product.currency)} / {product.unit}
              </span>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-900/30"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                : <><FileText className="w-4 h-4" /> Submit RFQ</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}