"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import FarmerDashboard from "@/components/dashboard/FarmerDashboard";
import { Loader2 } from "lucide-react";

export default function FarmerDashboardPage() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.push("/login");
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated) return (
    <div className="min-h-screen bg-[#060f08] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
    </div>
  );

  if (!isAuthenticated || !user) return null;

  return <FarmerDashboard user={user} />;
}