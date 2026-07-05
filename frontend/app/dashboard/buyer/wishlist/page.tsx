"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import { LayoutDashboard, ShoppingCart, Heart, MessageSquare, FileText, Bell, Package, MapPin } from "lucide-react";
import { formatPrice, getCategoryLabel } from "@/lib/utils";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "Overview",  href: "/dashboard/buyer",          icon: LayoutDashboard },
  { label: "My Orders", href: "/dashboard/buyer/orders",   icon: ShoppingCart },
  { label: "Wishlist",  href: "/dashboard/buyer/wishlist", icon: Heart },
  { label: "Messages",  href: "/dashboard/buyer/messages", icon: MessageSquare, badge: 2 },
  { label: "My RFQs",   href: "/dashboard/buyer/rfqs",     icon: FileText },
  { label: "Alerts",    href: "/dashboard/buyer/alerts",   icon: Bell },
];

export default function BuyerWishlistPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const res = await apiClient.get("/users/me/wishlist?page_size=50");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const products = data?.data || [];

  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="Wishlist">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Saved Products</h2>
          <p className="text-gray-500 text-sm mt-1">{products.length} saved products</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-64 bg-white/[0.03] rounded-2xl animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white/[0.03] border border-white/[0.07] rounded-2xl">
            <Heart className="w-12 h-12 text-gray-700 mb-3" />
            <h3 className="text-white font-bold mb-1">No saved products</h3>
            <p className="text-gray-600 text-sm mb-5">Save products you're interested in to find them quickly</p>
            <Link href="/marketplace" className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product: any) => (
              <Link key={product.id} href={`/products/${product.id}`}
                className="bg-white/[0.03] border border-white/[0.07] hover:border-green-800/50 rounded-2xl overflow-hidden transition-all hover:-translate-y-1 group">
                <div className="h-40 bg-gradient-to-br from-green-950/60 to-emerald-950/40 overflow-hidden">
                  {product.main_image
                    ? <img src={product.main_image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-green-900" /></div>
                  }
                </div>
                <div className="p-4">
                  <p className="text-green-500 text-[10px] font-bold uppercase tracking-widest mb-1">{getCategoryLabel(product.category)}</p>
                  <h3 className="text-white font-bold text-sm line-clamp-2 mb-2">{product.title}</h3>
                  {product.country && (
                    <div className="flex items-center gap-1 text-gray-600 text-xs mb-2">
                      <MapPin className="w-3 h-3" />{product.country}
                    </div>
                  )}
                  <p className="text-green-400 font-black">{formatPrice(product.price, product.currency)}<span className="text-gray-600 text-xs font-normal">/{product.unit}</span></p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}