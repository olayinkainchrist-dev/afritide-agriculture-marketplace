"use client";
import { use } from "react";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import MessageThread from "@/components/dashboard/MessageThread";
import {
  LayoutDashboard, ShoppingCart, Heart,
  MessageSquare, FileText, Bell,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview",  href: "/dashboard/buyer",          icon: LayoutDashboard },
  { label: "My Orders", href: "/dashboard/buyer/orders",   icon: ShoppingCart },
  { label: "Wishlist",  href: "/dashboard/buyer/wishlist", icon: Heart },
  { label: "Messages",  href: "/dashboard/buyer/messages", icon: MessageSquare, badge: 2 },
  { label: "My RFQs",   href: "/dashboard/buyer/rfqs",     icon: FileText },
  { label: "Alerts",    href: "/dashboard/buyer/alerts",   icon: Bell },
];

export default function BuyerMessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout navItems={NAV_ITEMS} title="Messages">
      <MessageThread
        conversationId={id}
        backHref="/dashboard/buyer/messages"
      />
    </DashboardLayout>
  );
}