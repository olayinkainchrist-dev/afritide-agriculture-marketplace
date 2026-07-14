"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import {
  LayoutDashboard, ShoppingCart, Heart,
  MessageSquare, FileText, Bell, Users,
  Star, MapPin, BadgeCheck,
} from "lucide-react";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "Overview",          href: "/dashboard/buyer",           icon: LayoutDashboard },
  { label: "My Orders",         href: "/dashboard/buyer/orders",    icon: ShoppingCart },
  { label: "Wishlist",          href: "/dashboard/buyer/wishlist",  icon: Heart },
  { label: "My Suppliers",      href: "/dashboard/buyer/suppliers", icon: Users },
  { label: "Messages",          href: "/dashboard/buyer/messages",  icon: MessageSquare },
  { label: "Sourcing Requests", href: "/dashboard/buyer/rfqs",      icon: FileText },
  { label: "Alerts",            href: "/dashboard/buyer/alerts",    icon: Bell },
];

export default function FavouriteSuppliersPage() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.push("/login");
  }, [hasHydrated, isAuthenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-following"],
    queryFn: async () => {
      const res = await apiClient.get("/users/following");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const suppliers = data?.data || [];

  if (!hasHydrated) return null;
  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="My Suppliers">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Favourite Suppliers</h2>
          <p className="text-gray-500 text-sm mt-1">{suppliers.length} suppliers you follow</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-white/[0.03] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="w-12 h-12 text-gray-700 mb-3" />
            <h3 className="text-white font-bold mb-1">No favourite suppliers yet</h3>
            <p className="text-gray-600 text-sm mb-4">
              Follow suppliers you trust to keep track of them here
            </p>
            <Link href="/farmers"
              className="bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
              Browse Suppliers
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suppliers.map((s: any) => (
              <Link key={s.id} href={`/farmers/${s.id}`}
                className="bg-white/[0.03] border border-white/[0.07] hover:border-green-700/40 rounded-2xl p-5 flex items-center gap-4 transition-all group">
                <div className="w-14 h-14 rounded-xl bg-green-900/40 border border-green-800/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {s.profile_image
                    ? <img src={s.profile_image} alt="" className="w-full h-full object-cover" />
                    : <span className="text-lg font-black text-green-400">
                        {s.display_name?.[0]?.toUpperCase()}
                      </span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-white font-bold text-sm group-hover:text-green-400 transition-colors truncate">
                      {s.display_name}
                    </p>
                    {s.badge !== "none" && <BadgeCheck className="w-4 h-4 text-green-400 flex-shrink-0" />}
                  </div>
                  <p className="text-gray-500 text-xs capitalize mb-1">{s.role?.replace("_", " ")}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    {s.country && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {s.country}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {s.rating_average?.toFixed(1)}
                    </span>
                    <span>{s.followers_count} followers</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
