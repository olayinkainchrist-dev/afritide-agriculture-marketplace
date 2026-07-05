"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth.store";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import {
  LayoutDashboard, Users, Package, ShoppingCart,
  TrendingUp, Shield, Megaphone, BarChart3,
  CheckCircle2, XCircle,
} from "lucide-react";
import { formatDate, getCategoryLabel } from "@/lib/utils";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  { label: "Overview",      href: "/dashboard/admin",              icon: LayoutDashboard },
  { label: "Users",         href: "/dashboard/admin/users",        icon: Users },
  { label: "Products",      href: "/dashboard/admin/products",     icon: Package },
  { label: "Orders",        href: "/dashboard/admin/orders",       icon: ShoppingCart },
  { label: "Commodities",   href: "/dashboard/admin/commodities",  icon: TrendingUp },
  { label: "Certificates",  href: "/dashboard/admin/certificates", icon: Shield },
  { label: "Announcements", href: "/dashboard/admin/announce",     icon: Megaphone },
  { label: "Analytics",     href: "/dashboard/admin/analytics",    icon: BarChart3 },
];

export default function AdminProductsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
    else if (user?.role !== "admin") router.push("/dashboard/farmer");
  }, [isAuthenticated, user, router]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-pending-products"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/products/pending?page_size=50");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const products = data?.data || [];

  const approve = async (id: string) => {
    try {
      await apiClient.put(`/admin/products/${id}/approve`);
      toast.success("Product approved and published");
      refetch();
    } catch {
      toast.error("Failed to approve product");
    }
  };

  const reject = async (id: string) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    try {
      await apiClient.put(`/admin/products/${id}/reject?reason=${encodeURIComponent(reason)}`);
      toast.success("Product rejected");
      refetch();
    } catch {
      toast.error("Failed to reject product");
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="Product Moderation">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Pending Products</h2>
          <p className="text-gray-500 text-sm mt-1">{products.length} products awaiting review</p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-700 mb-3" />
              <h3 className="text-white font-bold mb-1">All caught up!</h3>
              <p className="text-gray-600 text-sm">No products pending review</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {/* Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-xs text-gray-600 font-medium uppercase tracking-wide">
                <div className="col-span-5">Product</div>
                <div className="col-span-3">Seller</div>
                <div className="col-span-2">Submitted</div>
                <div className="col-span-2">Actions</div>
              </div>

              {products.map((product: any) => (
                <div key={product.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center">
                  <div className="col-span-5">
                    <p className="text-white font-semibold text-sm">{product.title}</p>
                    <p className="text-gray-600 text-xs capitalize">{getCategoryLabel(product.category)}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-gray-400 text-xs font-mono">{product.seller_id?.slice(0, 12)}...</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500 text-xs">{formatDate(product.created_at)}</p>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <button
                      onClick={() => approve(product.id)}
                      className="flex items-center gap-1.5 bg-green-600/20 hover:bg-green-600/40 border border-green-700/40 text-green-400 text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => reject(product.id)}
                      className="flex items-center gap-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-700/30 text-red-400 text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}