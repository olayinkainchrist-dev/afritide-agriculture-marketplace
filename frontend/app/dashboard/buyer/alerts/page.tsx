"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { LayoutDashboard, ShoppingCart, Heart, MessageSquare, FileText, Bell } from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview",  href: "/dashboard/buyer",          icon: LayoutDashboard },
  { label: "My Orders", href: "/dashboard/buyer/orders",   icon: ShoppingCart },
  { label: "Wishlist",  href: "/dashboard/buyer/wishlist", icon: Heart },
  { label: "Messages",  href: "/dashboard/buyer/messages", icon: MessageSquare, badge: 2 },
  { label: "My RFQs",   href: "/dashboard/buyer/rfqs",     icon: FileText },
  { label: "Alerts",    href: "/dashboard/buyer/alerts",   icon: Bell },
];

export default function BuyerAlertsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="Price Alerts">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Price Alerts</h2>
          <p className="text-gray-500 text-sm mt-1">Get notified when commodity prices change</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white/[0.03] border border-white/[0.07] rounded-2xl">
          <Bell className="w-12 h-12 text-gray-700 mb-3" />
          <h3 className="text-white font-bold mb-1">Price Alerts Coming Soon</h3>
          <p className="text-gray-600 text-sm max-w-xs">
            Set price thresholds for commodities and get notified when they hit your target price.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
