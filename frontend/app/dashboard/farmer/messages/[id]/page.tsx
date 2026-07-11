"use client";
import { use } from "react";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import MessageThread from "@/components/dashboard/MessageThread";
import {
  LayoutDashboard, Package, ShoppingCart,
  MessageSquare, FileText, BarChart3,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview",    href: "/dashboard/farmer",          icon: LayoutDashboard },
  { label: "My Products", href: "/dashboard/farmer/products", icon: Package },
  { label: "Orders",      href: "/dashboard/farmer/orders",   icon: ShoppingCart },
  { label: "Messages",    href: "/dashboard/farmer/messages", icon: MessageSquare },
  { label: "RFQs",        href: "/dashboard/farmer/rfqs",     icon: FileText },
  { label: "Analytics",   href: "/dashboard/farmer/analytics",icon: BarChart3 },
];

export default function FarmerMessageThreadPage({
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
        backHref="/dashboard/farmer/messages"
      />
    </DashboardLayout>
  );
}