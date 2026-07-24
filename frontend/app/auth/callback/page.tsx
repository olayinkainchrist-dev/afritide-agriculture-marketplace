"use client";
import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth.store";

function CallbackHandler() {
  const router      = useRouter();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Listen for auth state change — fires when Supabase processes the OAuth code
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === "SIGNED_IN" && session) {
              subscription.unsubscribe();

              const user = session.user;

              try {
                const res = await apiClient.post("/auth/google", {
                  email:      user.email,
                  first_name: user.user_metadata?.given_name  || user.email?.split("@")[0],
                  last_name:  user.user_metadata?.family_name || "",
                  google_id:  user.id,
                  avatar_url: user.user_metadata?.avatar_url  || "",
                });

                if (res.data?.success && res.data?.data?.access_token) {
                  const { access_token, refresh_token, user: afritideUser } = res.data.data;
                  setAuth(afritideUser, access_token, refresh_token || "");

                  const role = afritideUser.role;
                  if (role === "ADMIN") {
                    router.replace("/dashboard/admin");
                  } else if (role === "BUYER") {
                    router.replace("/dashboard/buyer");
                  } else {
                    router.replace("/dashboard/farmer");
                  }
                } else {
                  router.replace("/login?error=auth_failed");
                }
              } catch (err) {
                console.error("Backend auth error:", err);
                router.replace("/login?error=auth_failed");
              }
            } else if (event === "SIGNED_OUT") {
              subscription.unsubscribe();
              router.replace("/login?error=auth_failed");
            }
          }
        );

        // Timeout fallback after 10 seconds
        setTimeout(() => {
          subscription.unsubscribe();
          router.replace("/login?error=timeout");
        }, 10000);

      } catch (err) {
        console.error("Callback error:", err);
        router.replace("/login?error=auth_failed");
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-[#060f08] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackHandler />
    </Suspense>
  );
}