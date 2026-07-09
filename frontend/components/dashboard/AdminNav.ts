import {
  LayoutDashboard, Users, Package, ShoppingCart,
  TrendingUp, Shield, Megaphone, BarChart3, MessageSquare, FileDown,
} from "lucide-react";

export const ADMIN_NAV = [
  { label: "Overview",      href: "/dashboard/admin",              icon: LayoutDashboard },
  { label: "Users",         href: "/dashboard/admin/users",        icon: Users },
  { label: "Products",      href: "/dashboard/admin/products",     icon: Package },
  { label: "Orders",        href: "/dashboard/admin/orders",       icon: ShoppingCart },
  { label: "Commodities",   href: "/dashboard/admin/commodities",  icon: TrendingUp },
  { label: "Certificates",  href: "/dashboard/admin/certificates", icon: Shield },
  { label: "Announcements", href: "/dashboard/admin/announce",     icon: Megaphone },
  { label: "Analytics",     href: "/dashboard/admin/analytics",    icon: BarChart3 },
  { label: "Support",       href: "/dashboard/admin/support",      icon: MessageSquare },
  { label: "Reports",       href: "/dashboard/admin/reports",      icon: FileDown },
];