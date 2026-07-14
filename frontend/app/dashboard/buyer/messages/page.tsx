"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import { LayoutDashboard, ShoppingCart, Heart, MessageSquare, FileText, Bell } from "lucide-react";
import { formatDate } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview",  href: "/dashboard/buyer",          icon: LayoutDashboard },
  { label: "My Orders", href: "/dashboard/buyer/orders",   icon: ShoppingCart },
  { label: "Wishlist",  href: "/dashboard/buyer/wishlist", icon: Heart },
  { label: "Messages",  href: "/dashboard/buyer/messages", icon: MessageSquare, badge: 2 },
  { label: "My RFQs",   href: "/dashboard/buyer/rfqs",     icon: FileText },
  { label: "Alerts",    href: "/dashboard/buyer/alerts",   icon: Bell },
];

export default function BuyerMessagesPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-conversations"],
    queryFn: async () => {
      const res = await apiClient.get("/messages/conversations");
      return res.data;
    },
    enabled: isAuthenticated,
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
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <MessageSquare className="w-12 h-12 text-gray-700 mb-3" />
              <h3 className="text-white font-bold mb-1">No messages yet</h3>
              <p className="text-gray-600 text-sm">Contact a seller from a product page to start a conversation</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {conversations.map((convo: any) => (
                <div key={convo.conversation_id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-green-900/40 flex items-center justify-center text-green-400 font-black text-sm flex-shrink-0">
                    {convo.other_user_id?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">Seller {convo.other_user_id?.slice(0, 8)}...</p>
                    <p className="text-gray-600 text-xs truncate">{convo.last_message || "No messages yet"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {convo.last_message_at && <p className="text-gray-600 text-xs">{formatDate(convo.last_message_at)}</p>}
                    {convo.unread_count > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white text-[10px] font-black rounded-full mt-1">
                        {convo.unread_count}
                      </span>
                    )}
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
