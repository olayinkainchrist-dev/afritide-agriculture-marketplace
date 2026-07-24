"use client";
import { useEffect, Suspense, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth.store";

function CallbackHandler() {
  const { setAuth }         = useAuthStore();
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!session || error) {
          setStatus("Session not found, retrying...");
          await new Promise(r => setTimeout(r, 1500));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (!retrySession) {
            window.location.href = "/login?error=auth_failed";
            return;
          }
        }

        const activeSession = session || (await supabase.auth.getSession()).data.session;
        if (!activeSession) {
          window.location.href = "/login?error=auth_failed";
          return;
        }

        const user = activeSession.user;
        setStatus("Authenticating with Afritide...");

        const res = await apiClient.post("/auth/google", {
          email:      user.email,
          first_name: user.user_metadata?.given_name  || user.email?.split("@")[0],
          last_name:  user.user_metadata?.family_name || "",
          google_id:  user.id,
          avatar_url: user.user_metadata?.avatar_url  || "",
        });

        if (res.data?.success) {
          const { access_token, refresh_token, user: afritideUser } = res.data.data;

          // Set auth in store
          setAuth(afritideUser, access_token, refresh_token || "");

          // Also manually set localStorage so it persists before redirect
          localStorage.setItem("access_token",  access_token);
          localStorage.setItem("refresh_token", refresh_token || "");

          setStatus("Redirecting...");

          const role = afritideUser.role;
          if (role === "ADMIN")        window.location.href = "/dashboard/admin";
          else if (role === "BUYER")   window.location.href = "/dashboard/buyer";
          else                         window.location.href = "/dashboard/farmer";
        } else {
          window.location.href = "/login?error=auth_failed";
        }
      } catch (err) {
        console.error("Callback error:", err);
        window.location.href = "/login?error=auth_failed";
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-[#060f08] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">{status}</p>
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