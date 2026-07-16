"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";

export default function DashboardRedirect() {
  const { user, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) { router.push("/login"); return; }
    const role = user.role?.toUpperCase();
    if (role === "BUYER")  router.push("/dashboard/buyer");
    else if (role === "ADMIN") router.push("/dashboard/admin");
    else router.push("/dashboard/farmer");
  }, [hasHydrated, user, router]);

  return null;
}