"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/lib/api/products.api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  LayoutDashboard, Package, ShoppingCart,
  MessageSquare, FileText, BarChart3,
  Plus, Eye, Edit, Trash2, Search,
  Filter, ChevronDown, Zap, X, Loader2,
} from "lucide-react";
import Link from "next/link";
import { formatPrice, getCategoryLabel, formatDate } from "@/lib/utils";
import { ProductStatus } from "@/types";
import toast from "react-hot-toast";
import apiClient from "@/lib/api/client";

const NAV_ITEMS = [
  { label: "Overview",    href: "/dashboard/farmer",          icon: LayoutDashboard },
  { label: "My Products", href: "/dashboard/farmer/products", icon: Package },
  { label: "Orders",      href: "/dashboard/farmer/orders",   icon: ShoppingCart },
  { label: "Messages",    href: "/dashboard/farmer/messages", icon: MessageSquare },
  { label: "RFQs",        href: "/dashboard/farmer/rfqs",     icon: FileText },
  { label: "Analytics",   href: "/dashboard/farmer/analytics",icon: BarChart3 },
];

const STATUS_FILTERS = [
  { value: "all",            label: "All" },
  { value: "ACTIVE",         label: "ACTIVE" },
  { value: "PENDING_REVIEW", label: "PENDING" },
  { value: "DRAFT",          label: "DRAFT" },
  { value: "OUT_OF_STOCK",   label: "Out of Stock" },
  { value: "ARCHIVED",       label: "ARCHIVED" },
];

export default function FarmerProductsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [search,         setSearch]         = useState("");
  const [promoteProduct, setPromoteProduct] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-products-full", statusFilter],
    queryFn: () => productsApi.getMyProducts({
      status:    statusFilter === "all" ? undefined : statusFilter as ProductStatus,
      page_size: 50,
    }),
    enabled: isAuthenticated,
  });

  const products = data?.data || [];

  const filtered = products.filter(p =>
    search ? p.title.toLowerCase().includes(search.toLowerCase()) : true
  );

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Archive "${title}"? It will be removed from the marketplace.`)) return;
    try {
      await apiClient.delete(`/products/${id}`);
      toast.success("Product archived");
      refetch();
    } catch {
      toast.error("Failed to archive product");
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="My Products">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">My Listings</h2>
            <p className="text-gray-500 text-sm mt-1">{filtered.length} products total</p>
          </div>
          <Link href="/products/new"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-3 rounded-xl transition-colors shadow-lg shadow-green-900/30 text-sm">
            <Plus className="w-4 h-4" /> Add New Product
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] focus:border-green-700/50 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  statusFilter === f.value
                    ? "bg-green-600 text-white shadow-lg shadow-green-900/30"
                    : "bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Products table */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-5">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-gray-700" />
              </div>
              <h3 className="text-white font-bold mb-2">No products found</h3>
              <p className="text-gray-600 text-sm mb-5 max-w-xs">
                {search ? "No products match your search." : "Start listing your agricultural products."}
              </p>
              <Link href="/products/new"
                className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add First Product
              </Link>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-600 font-medium uppercase tracking-wide">
                <div className="col-span-5">Product</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-2">Stock</div>
                <div className="col-span-1">Views</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1">Actions</div>
              </div>

              <div className="divide-y divide-white/[0.04]">
                {filtered.map((product) => (
                  <div key={product.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center">

                    {/* Product info */}
                    <div className="col-span-5 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-green-950/50 border border-white/[0.06] flex-shrink-0">
                        {product.main_image
                          ? <img src={product.main_image} alt="" className="w-full h-full object-cover" />
                          : <Package className="w-5 h-5 text-green-800 m-3.5" />
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold text-sm truncate">{product.title}</p>
                          {(product as any).is_sponsored && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-700/40 flex-shrink-0">
                              Sponsored
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-xs">{getCategoryLabel(product.category)}</p>
                        <p className="text-gray-700 text-xs">{formatDate(product.created_at)}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="col-span-2">
                      <p className="text-green-400 font-bold text-sm">{formatPrice(product.price, product.currency)}</p>
                      <p className="text-gray-600 text-xs">per {product.unit}</p>
                    </div>

                    {/* Stock */}
                    <div className="col-span-2">
                      <p className="text-white text-sm font-medium">{product.quantity_available}</p>
                      <p className="text-gray-600 text-xs">{product.unit} available</p>
                    </div>

                    {/* Views */}
                    <div className="col-span-1">
                      <p className="text-white text-sm">{product.view_count}</p>
                    </div>

                    {/* Status */}
                    <div className="col-span-1">
                      <StatusBadge status={product.status} />
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center gap-2">
                      <Link href={`/products/${product.id}`}
                        className="p-2 text-gray-500 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all" title="View">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link href={`/products/${product.id}/edit`}
                        className="p-2 text-gray-500 hover:text-green-400 hover:bg-green-950/30 rounded-lg transition-all" title="Edit">
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setPromoteProduct(product)}
                        className="p-2 text-gray-500 hover:text-amber-400 hover:bg-amber-950/30 rounded-lg transition-all" title="Promote">
                        <Zap className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.title)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all" title="Archive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {promoteProduct && (
        <PromoteModal
          product={promoteProduct}
          user={user}
          onClose={() => setPromoteProduct(null)}
        />
      )}
    </DashboardLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    active:         { label: "ACTIVE",    class: "bg-green-500/20 text-green-400 border-green-700/40" },
    pending_review: { label: "PENDING",   class: "bg-amber-500/20 text-amber-400 border-amber-700/40" },
    draft:          { label: "DRAFT",     class: "bg-gray-500/20 text-gray-400 border-gray-700/40" },
    out_of_stock:   { label: "No Stock",  class: "bg-red-500/20 text-red-400 border-red-700/40" },
    suspended:      { label: "SUSPENDED", class: "bg-red-500/20 text-red-400 border-red-700/40" },
    rejected:       { label: "REJECTED",  class: "bg-red-500/20 text-red-400 border-red-700/40" },
    archived:       { label: "ARCHIVED",  class: "bg-gray-500/20 text-gray-400 border-gray-700/40" },
  };
  const c = config[status] ?? { label: status, class: "bg-gray-500/20 text-gray-400 border-gray-700/40" };
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${c.class}`}>
      {c.label}
    </span>
  );
}

function PromoteModal({ product, user, onClose }: { product: any; user: any; onClose: () => void }) {
  const [selectedPackage, setSelectedPackage] = useState("7days");
  const [currency,        setCurrency]        = useState<"NGN" | "USD">("NGN");
  const [submitting,      setSubmitting]      = useState(false);

  const PACKAGES = [
    { id: "7days",  label: "7 Day Boost",  price_ngn: 2000, price_usd: 5,  desc: "Great for testing" },
    { id: "14days", label: "14 Day Boost", price_ngn: 3500, price_usd: 8,  desc: "Most popular" },
    { id: "30days", label: "30 Day Boost", price_ngn: 6000, price_usd: 15, desc: "Best value" },
  ];

  useEffect(() => {
    const script = document.createElement("script");
    script.src   = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const handlePromote = () => {
    const pkg    = PACKAGES.find(p => p.id === selectedPackage)!;
    const amount = currency === "NGN" ? pkg.price_ngn : pkg.price_usd;

    if (currency === "NGN") {
      const reference = `PROMO-${Date.now()}`;
      const handler = (window as any).PaystackPop.setup({
        key:      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email:    user?.email,
        amount:   amount * 100,
        currency: "NGN",
        reference,
        callback: (response: any) => {
          setSubmitting(true);
          apiClient.post("/promotions/promote", {
            product_id: product.id,
            package:    selectedPackage,
            currency:   "NGN",
            reference:  response.reference,
          }).then(() => {
            toast.success(`${product.title} is now promoted for ${pkg.label}!`);
            onClose();
          }).catch((err: any) => {
            toast.error(err.response?.data?.detail || "Failed to activate promotion");
          }).finally(() => setSubmitting(false));
        },
        onClose: () => {},
      });
      handler.openIframe();
    } else {
      setSubmitting(true);
      apiClient.post("/payments/stripe/create-session", {
        cart_items: [{
          id:         "promo",
          product_id: "promo",
          title:      `Promote: ${product.title} (${pkg.label})`,
          price:      amount,
          currency:   "USD",
          unit:       "promotion",
          quantity:   1,
          item_total: amount,
          seller_id:  "afritide",
        }],
        shipping_address: { address: "", city: "", country: "" },
        shipping_method:  "promotion",
        currency:         "USD",
        success_url:      `${window.location.origin}/dashboard/farmer/products?promo_product=${product.id}&promo_package=${selectedPackage}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:       `${window.location.origin}/dashboard/farmer/products`,
      }).then(res => {
        if (res.data?.success) {
          window.location.href = res.data.data.checkout_url;
        }
      }).catch((err: any) => {
        toast.error(err.response?.data?.detail || "Failed to create session");
      }).finally(() => setSubmitting(false));
    }
  };

  const pkg    = PACKAGES.find(p => p.id === selectedPackage)!;
  const amount = currency === "NGN" ? pkg.price_ngn : pkg.price_usd;
  const symbol = currency === "NGN" ? "₦" : "$";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a1a0f] border border-white/[0.08] rounded-3xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" /> Promote Product
            </h3>
            <p className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">{product.title}</p>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-600 hover:text-white transition-colors" />
          </button>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/30 rounded-xl p-3 mb-5 flex items-start gap-2">
          <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-300 text-xs leading-relaxed">
            Promoted products appear at the top of marketplace search results and category pages, giving you up to 5× more visibility.
          </p>
        </div>

        <div className="flex bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 mb-4 w-fit">
          {(["NGN", "USD"] as const).map(c => (
            <button key={c} onClick={() => setCurrency(c)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currency === c ? "bg-green-600 text-white" : "text-gray-500 hover:text-white"
              }`}>{c}</button>
          ))}
        </div>

        <div className="space-y-3 mb-6">
          {PACKAGES.map(p => (
            <label key={p.id}
              className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                selectedPackage === p.id
                  ? "border-amber-500/60 bg-amber-950/30"
                  : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]"
              }`}>
              <input type="radio" name="package" value={p.id}
                checked={selectedPackage === p.id}
                onChange={() => setSelectedPackage(p.id)}
                className="accent-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white font-bold text-sm">{p.label}</p>
                <p className="text-gray-500 text-xs">{p.desc}</p>
              </div>
              <span className="text-amber-400 font-black text-sm">
                {currency === "NGN" ? `₦${p.price_ngn.toLocaleString()}` : `$${p.price_usd}`}
              </span>
            </label>
          ))}
        </div>

        <button onClick={handlePromote} disabled={submitting}
          className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-amber-900 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2">
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            : <><Zap className="w-4 h-4" /> Boost for {symbol}{amount.toLocaleString()}</>
          }
        </button>
      </div>
    </div>
  );
}