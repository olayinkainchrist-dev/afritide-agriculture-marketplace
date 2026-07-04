"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import AdminDashboard from "@/components/dashboard/AdminDashboard";

export default function AdminDashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
    else if (user?.role !== "admin") router.push("/dashboard/farmer");
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user || user.role !== "admin") return null;

  return <AdminDashboard user={user} />;
}