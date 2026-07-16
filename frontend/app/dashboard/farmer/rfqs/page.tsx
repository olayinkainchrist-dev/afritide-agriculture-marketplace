"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import {
  LayoutDashboard, Package, ShoppingCart,
  MessageSquare, FileText, BarChart3, X,
} from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview",  href: "/dashboard/farmer",           icon: LayoutDashboard },
  { label: "Listings",  href: "/dashboard/farmer/products",  icon: Package },
  { label: "Orders",    href: "/dashboard/farmer/orders",    icon: ShoppingCart },
  { label: "Messages",  href: "/dashboard/farmer/messages",  icon: MessageSquare },
  { label: "RFQs",      href: "/dashboard/farmer/rfqs",      icon: FileText },
  { label: "Analytics", href: "/dashboard/farmer/analytics", icon: BarChart3 },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN:      "bg-green-500/20 text-green-400 border-green-700/40",
  QUOTED:    "bg-blue-500/20 text-blue-400 border-blue-700/40",
  ACCEPTED:  "bg-emerald-500/20 text-emerald-400 border-emerald-700/40",
  REJECTED:  "bg-red-500/20 text-red-400 border-red-700/40",
  EXPIRED:   "bg-gray-500/20 text-gray-400 border-gray-700/40",
  CANCELLED: "bg-gray-500/20 text-gray-400 border-gray-700/40",
};

export default function FarmerRFQsPage() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const router = useRouter();
  const [selectedRFQ, setSelectedRFQ] = useState<any>(null);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.push("/login");
  }, [hasHydrated, isAuthenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["farmer-rfqs"],
    queryFn: async () => {
      const res = await apiClient.get("/rfqs?role=seller&page_size=50");
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const rfqs = data?.data || [];

  if (!hasHydrated) return null;
  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="RFQs">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Sourcing Requests</h2>
          <p className="text-gray-500 text-sm mt-1">
            Buyer sourcing requests matched to your products by the Afritide team.
          </p>
        </div>

        {/* Info banner */}
        <div className="bg-blue-950/30 border border-blue-800/30 rounded-2xl p-4 flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-400 font-bold text-sm">How This Works</p>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
              When buyers post sourcing requests, our team matches them with verified suppliers like you.
              If you are matched, the request will appear here. The Afritide team handles all buyer communication.
            </p>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : rfqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="w-12 h-12 text-gray-700 mb-3" />
              <h3 className="text-white font-bold mb-1">No sourcing requests yet</h3>
              <p className="text-gray-600 text-sm">
                When buyers request products matching yours, they will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-600 font-medium uppercase tracking-wide">
                <div className="col-span-1">RFQ #</div>
                <div className="col-span-3">Product</div>
                <div className="col-span-2">Quantity</div>
                <div className="col-span-2">Target Price</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Status</div>
              </div>

              <div className="divide-y divide-white/[0.04]">
                {rfqs.map((rfq: any) => (
                  <div key={rfq.id} onClick={() => setSelectedRFQ(rfq)}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-white/[0.04] transition-colors cursor-pointer items-center group">
                    <div className="col-span-1">
                      <p className="text-gray-500 text-xs font-mono">{rfq.rfq_number?.slice(-6)}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-white font-semibold text-sm group-hover:text-green-400 transition-colors">
                        {rfq.product_name}
                      </p>
                      <p className="text-gray-600 text-xs capitalize">{rfq.category?.toLowerCase()}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-white text-sm">{rfq.quantity} {rfq.unit?.toLowerCase()}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-green-400 font-bold text-sm">
                        {rfq.target_price ? formatPrice(rfq.target_price, rfq.currency) : "Open"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500 text-xs">{formatDate(rfq.created_at)}</p>
                    </div>
                    <div className="col-span-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${
                        STATUS_COLORS[rfq.status] ?? "bg-gray-500/20 text-gray-400 border-gray-700/40"
                      }`}>
                        {rfq.status?.toLowerCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Modal — read only */}
      {selectedRFQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedRFQ(null)} />
          <div className="relative bg-[#0a1a0f] border border-white/[0.08] rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-white font-bold text-lg">RFQ {selectedRFQ.rfq_number}</h3>
                <p className="text-gray-500 text-xs mt-0.5">Received {formatDate(selectedRFQ.created_at)}</p>
              </div>
              <button onClick={() => setSelectedRFQ(null)}
                className="text-gray-600 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-5 space-y-3">
              <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wide">Request Details</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Product",       value: selectedRFQ.product_name },
                  { label: "Category",      value: selectedRFQ.category?.toLowerCase() || "—" },
                  { label: "Quantity",      value: `${selectedRFQ.quantity} ${selectedRFQ.unit?.toLowerCase()}` },
                  { label: "Target Price",  value: selectedRFQ.target_price ? formatPrice(selectedRFQ.target_price, selectedRFQ.currency) : "Open to offers" },
                  { label: "Delivery To",   value: selectedRFQ.delivery_country || "—" },
                  { label: "Delivery Date", value: selectedRFQ.delivery_date ? formatDate(selectedRFQ.delivery_date) : "—" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-white text-sm font-medium capitalize">{value}</p>
                  </div>
                ))}
              </div>
              {selectedRFQ.specifications && (
                <div>
                  <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-0.5">Specifications</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{selectedRFQ.specifications}</p>
                </div>
              )}
              {selectedRFQ.additional_requirements && (
                <div>
                  <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-0.5">Additional Requirements</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{selectedRFQ.additional_requirements}</p>
                </div>
              )}
            </div>

            <div className="bg-amber-950/30 border border-amber-800/30 rounded-2xl p-4 text-center">
              <p className="text-amber-400 font-bold text-sm mb-1">Handled by Afritide Team</p>
              <p className="text-gray-500 text-xs leading-relaxed">
                The Afritide team manages all buyer communication and quotations on your behalf.
                If selected, you will be contacted directly by our team to confirm supply details.
              </p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}