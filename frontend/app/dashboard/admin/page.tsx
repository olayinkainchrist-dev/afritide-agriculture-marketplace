"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import AdminDashboard from "@/components/dashboard/AdminDashboard";

export default function AdminDashboardPage() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) router.push("/login");
    else if (user?.role !== "ADMIN") router.push("/dashboard/farmer");
  }, [hasHydrated, isAuthenticated, user, router]);

  if (!hasHydrated) return null;
  if (!isAuthenticated || !user || user?.role !== "ADMIN") return null;

  return <AdminDashboard user={user} />;
}
