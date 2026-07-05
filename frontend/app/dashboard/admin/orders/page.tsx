"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ADMIN_NAV } from "@/components/dashboard/AdminNav";
import apiClient from "@/lib/api/client";
import { ShoppingCart } from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-500/20 text-amber-400 border-amber-700/40",
  confirmed: "bg-blue-500/20 text-blue-400 border-blue-700/40",
  shipped:   "bg-violet-500/20 text-violet-400 border-violet-700/40",
  completed: "bg-green-500/20 text-green-400 border-green-700/40",
  cancelled: "bg-red-500/20 text-red-400 border-red-700/40",
};

export default function AdminOrdersPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
    else if (user?.role !== "admin") router.push("/dashboard/farmer");
  }, [isAuthenticated, user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const res = await apiClient.get("/orders?page_size=100");
      return res.data;
    },
    enabled: isAuthenticated && user?.role === "admin",
  });

  const orders = data?.data || [];

  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="Orders">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">All Orders</h2>
          <p className="text-gray-500 text-sm mt-1">{orders.length} orders on platform</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-white/[0.03] rounded-xl animate-pulse" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingCart className="w-10 h-10 text-gray-700 mb-3" />
              <p className="text-gray-500">No orders yet</p>
            </div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-600 font-medium uppercase tracking-wide">
                <div className="col-span-3">Order</div>
                <div className="col-span-3">Buyer</div>
                <div className="col-span-2">Seller</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-1">Date</div>
                <div className="col-span-1">Status</div>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {orders.map((o: any) => (
                  <div key={o.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center">
                    <div className="col-span-3">
                      <p className="text-white font-bold text-sm">{o.order_number}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-gray-400 text-xs font-mono">{o.buyer_id?.slice(0, 12)}...</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400 text-xs font-mono">{o.seller_id?.slice(0, 8)}...</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-green-400 font-black text-sm">{formatPrice(o.total_amount, o.currency)}</p>
                    </div>
                    <div className="col-span-1">
                      <p className="text-gray-500 text-xs">{formatDate(o.created_at)}</p>
                    </div>
                    <div className="col-span-1">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${STATUS_COLORS[o.status] ?? "bg-gray-500/20 text-gray-400 border-gray-700/40"}`}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}