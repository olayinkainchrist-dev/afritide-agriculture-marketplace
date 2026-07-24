"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth.store";
import { Loader2 } from "lucide-react";
import apiClient from "@/lib/api/client";

function GoogleSuccessHandler() {
  const searchParams             = useSearchParams();
  const router                   = useRouter();
  const { setAuth, refreshUser } = useAuthStore();

  useEffect(() => {
    const token   = searchParams.get("token");
    const refresh = searchParams.get("refresh");
    if (token) {
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      refreshUser().then(() => {
        const { user } = useAuthStore.getState();
        if (user) {
          setAuth(user, token, refresh || "");
        }
        router.replace("/dashboard/buyer");
      });
    } else {
      router.replace("/login?error=auth_failed");
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#060f08] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Signing you in...</p>
      </div>
    </div>
  );
}

export default function GoogleSuccessPage() {
  return (
    <Suspense fallback={null}>
      <GoogleSuccessHandler />
    </Suspense>
  );
}