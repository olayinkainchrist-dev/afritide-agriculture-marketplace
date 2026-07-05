"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import {
  LayoutDashboard, Package, ShoppingCart,
  MessageSquare, FileText, BarChart3,
} from "lucide-react";
import Link from "next/link";
import { formatDate, getInitials } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview",    href: "/dashboard/farmer",          icon: LayoutDashboard },
  { label: "My Products", href: "/dashboard/farmer/products", icon: Package },
  { label: "Orders",      href: "/dashboard/farmer/orders",   icon: ShoppingCart },
  { label: "Messages",    href: "/dashboard/farmer/messages", icon: MessageSquare, badge: 3 },
  { label: "RFQs",        href: "/dashboard/farmer/rfqs",     icon: FileText },
  { label: "Analytics",   href: "/dashboard/farmer/analytics",icon: BarChart3 },
];

export default function FarmerMessagesPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["farmer-conversations"],
    queryFn: async () => {
      const res = await apiClient.get("/messages/conversations");
      return res.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 15_000,
  });

  const conversations = data?.data || [];
  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="Messages">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Messages</h2>
          <p className="text-gray-500 text-sm mt-1">{conversations.length} conversations</p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-white/[0.03] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <MessageSquare className="w-12 h-12 text-gray-700 mb-3" />
              <h3 className="text-white font-bold mb-1">No messages yet</h3>
              <p className="text-gray-600 text-sm">
                When buyers contact you, conversations will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {conversations.map((convo: any) => (
                <Link
                  key={convo.conversation_id}
                  href={`/dashboard/farmer/messages/${convo.conversation_id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.04] transition-colors cursor-pointer group"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-green-900/40 border border-green-800/30 flex items-center justify-center text-green-400 font-black text-sm flex-shrink-0">
                    {getInitials(convo.other_user_id?.slice(0, 2) || "?")}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-semibold text-sm">
                        Buyer {convo.other_user_id?.slice(0, 8)}...
                      </p>
                      {convo.last_message_at && (
                        <p className="text-gray-600 text-xs flex-shrink-0 ml-2">
                          {formatDate(convo.last_message_at)}
                        </p>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs truncate">
                      {convo.last_message || "No messages yet"}
                    </p>
                  </div>

                  {/* Unread badge */}
                  {convo.unread_count > 0 && (
                    <span className="w-5 h-5 bg-green-500 text-white text-[10px] font-black rounded-full flex items-center justify-center flex-shrink-0">
                      {convo.unread_count}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}