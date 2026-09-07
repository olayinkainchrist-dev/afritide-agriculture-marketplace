"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import {
  LayoutDashboard, Package, ShoppingBag,
  MessageSquare, TrendingUp, Star, BarChart2,
  Wallet, Info, ChevronDown, ChevronUp,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview",    href: "/dashboard/farmer",          icon: LayoutDashboard },
  { label: "Products",    href: "/dashboard/farmer/products", icon: Package },
  { label: "Orders",      href: "/dashboard/farmer/orders",   icon: ShoppingBag },
  { label: "Messages",    href: "/dashboard/farmer/messages", icon: MessageSquare },
  { label: "Analytics",   href: "/dashboard/farmer/analytics",icon: BarChart2 },
  { label: "Commission",  href: "/dashboard/farmer/commission",icon: Wallet },
];

export default function CommissionPage() {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const [showSchedule, setShowSchedule] = useState(false);

  const { data: rateData, isLoading: rateLoading } = useQuery({
    queryKey: ["my-commission-rate"],
    queryFn:  async () => {
      const res = await apiClient.get("/commissions/my-rate");
      return res.data.data;
    },
    enabled: isAuthenticated,
  });

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery({
    queryKey: ["my-payouts"],
    queryFn:  async () => {
      const res = await apiClient.get("/commissions/my-payouts");
      return res.data.data;
    },
    enabled: isAuthenticated,
  });

  if (!hasHydrated || !isAuthenticated) return null;

  const rate     = rateData?.current_rate ?? 5;
  const summary  = payoutsData?.summary;
  const payouts  = payoutsData?.items || [];
  const schedule = rateData?.fee_schedule || [];

  const statusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-green-500/20 text-green-400";
      case "PENDING":   return "bg-amber-500/20 text-amber-400";
      case "FAILED":    return "bg-red-500/20 text-red-400";
      default:          return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="Commission & Fees">
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-black text-white">Commission & Fees</h2>
          <p className="text-gray-500 text-sm mt-1">
            Transparent breakdown of Afritide marketplace fees.
          </p>
        </div>

        {/* Current rate card */}
        <div className="bg-green-950/30 border border-green-800/30 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Your Current Commission Rate</p>
              <p className="text-5xl font-black text-green-400">{rate}%</p>
              <p className="text-gray-500 text-sm mt-2">
                Seller classification: <span className="text-white font-medium">{rateData?.rule_name || "Standard Seller"}</span>
              </p>
              <p className="text-gray-600 text-xs mt-2">
                Afritide currently charges a {rate}% marketplace commission on eligible product sales.
                Commission is calculated on the product value only — not on logistics or shipping fees.
              </p>
            </div>
            <div className="bg-green-500/10 border border-green-700/30 rounded-2xl p-4 text-center min-w-[100px]">
              <Wallet className="w-6 h-6 text-green-400 mx-auto mb-1" />
              <p className="text-green-400 text-xs font-medium">Active</p>
            </div>
          </div>

          {/* Example calculation */}
          <div className="mt-5 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-3">Example Calculation</p>
            <div className="space-y-2">
              {[
                { label: "Product Price",           value: "₦500,000",  color: "text-white" },
                { label: `Afritide Commission (${rate}%)`, value: `−₦${(500000 * rate / 100).toLocaleString()}`, color: "text-red-400" },
                { label: "Estimated Seller Payout", value: `₦${(500000 - 500000 * rate / 100).toLocaleString()}`, color: "text-green-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center py-1 border-b border-white/[0.04] last:border-0">
                  <span className="text-gray-500 text-xs">{label}</span>
                  <span className={`font-bold text-sm ${color}`}>{value}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-700 text-[10px] mt-3 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              Estimated payout based on your current seller classification. Additional applicable fees may affect your final payout.
            </p>
          </div>
        </div>

        {/* Summary stats */}
        {summary && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Gross Sales", value: summary.total_gross,      color: "text-white" },
              { label: "Total Commission",  value: summary.total_commission,  color: "text-red-400" },
              { label: "Total Net Payout",  value: summary.total_net,         color: "text-green-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
                <p className={`text-xl font-black ${color}`}>{formatPrice(value, "NGN")}</p>
                <p className="text-gray-500 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Fee schedule */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowSchedule(!showSchedule)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
            <h3 className="text-white font-bold text-sm">Full Fee Schedule</h3>
            {showSchedule
              ? <ChevronUp className="w-4 h-4 text-gray-500" />
              : <ChevronDown className="w-4 h-4 text-gray-500" />
            }
          </button>
          {showSchedule && (
            <div className="border-t border-white/[0.06]">
              <div className="divide-y divide-white/[0.04]">
                {schedule.map((r: any, i: number) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{r.name}</p>
                      <p className="text-gray-600 text-xs">
                        {r.seller_type || "All sellers"}
                        {r.transaction_type ? ` · ${r.transaction_type}` : ""}
                        {r.category ? ` · ${r.category}` : ""}
                      </p>
                    </div>
                    <span className="text-green-400 font-black text-lg">{r.rate_percentage}%</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-white/[0.01] border-t border-white/[0.05]">
                <p className="text-gray-600 text-xs">
                  Commission rates may vary based on seller classification, category, transaction type, volume and applicable agreements.
                  Afritide reserves the right to modify rates with advance notice.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Payout history */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-white font-bold text-sm">Transaction History</h3>
          </div>
          {payoutsLoading ? (
            <div className="py-10 flex justify-center">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : payouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <TrendingUp className="w-8 h-8 text-gray-700 mb-2" />
              <p className="text-gray-600 text-sm">No transactions yet</p>
              <p className="text-gray-700 text-xs mt-1">Commission records will appear here after your first sale</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["Order", "Gross Sale", "Commission", "Rate", "Net Payout", "Status"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-gray-600 text-xs font-bold uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {payouts.map((p: any) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-gray-400 text-xs font-mono">{p.order_id.substring(0, 8)}...</td>
                      <td className="px-5 py-3 text-white font-medium">{formatPrice(p.gross_amount, p.currency)}</td>
                      <td className="px-5 py-3 text-red-400">−{formatPrice(p.commission_amount, p.currency)}</td>
                      <td className="px-5 py-3 text-gray-400">{p.commission_rate}%</td>
                      <td className="px-5 py-3 text-green-400 font-bold">{formatPrice(p.net_amount, p.currency)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(p.payout_status)}`}>
                          {p.payout_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-green-500" /> How Commission Works
          </h3>
          <div className="space-y-2 text-gray-500 text-xs leading-relaxed">
            <p>• Afritide charges a marketplace commission when your product is successfully sold.</p>
            <p>• Commission is calculated on the <span className="text-white">product/commodity value only</span> — not on shipping or logistics fees.</p>
            <p>• Your rate is determined by your seller classification, transaction type, and applicable agreements.</p>
            <p>• Smallholder farmers benefit from a reduced 3% commission rate.</p>
            <p>• Cooperatives qualify for a 4% commission rate.</p>
            <p>• B2B bulk transactions may qualify for reduced rates between 1.5% and 3%.</p>
            <p>• Export transactions may qualify for reduced export commission rates.</p>
            <p>• Commission on refunded or cancelled orders is reversed.</p>
            <p>• You will be notified of any changes to your commission rate in advance.</p>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}