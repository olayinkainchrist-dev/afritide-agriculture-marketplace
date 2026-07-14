"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import FarmerDashboard from "@/components/dashboard/FarmerDashboard";

export default function FarmerDashboardPage() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const router = useRouter();
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.push("/login");
  }, [hasHydrated, isAuthenticated, router]);
  if (!hasHydrated) return null;
  if (!isAuthenticated || !user) return null;
  return <FarmerDashboard user={user} />;
}

