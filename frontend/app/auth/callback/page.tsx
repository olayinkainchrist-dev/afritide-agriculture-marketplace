"use client";
import { useEffect, Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth.store";

function CallbackHandler() {
  const router      = useRouter();
  const { setAuth } = useAuthStore();
  const [status, setStatus] = useState("Initializing...");

  useEffect(() => {
    const handleCallback = async () => {
      setStatus("Checking URL...");
      
      // Log the full URL
      console.log("CALLBACK URL:", window.location.href);
      console.log("HASH:", window.location.hash);
      console.log("SEARCH:", window.location.search);

      setStatus("Getting session...");
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log("SESSION:", session);
      console.log("ERROR:", error);

      if (session) {
        setStatus("Session found, calling backend...");
        console.log("USER:", session.user);
        try {
          const res = await apiClient.post("/auth/google", {
            email:      session.user.email,
            first_name: session.user.user_metadata?.given_name  || session.user.email?.split("@")[0],
            last_name:  session.user.user_metadata?.family_name || "",
            google_id:  session.user.id,
            avatar_url: session.user.user_metadata?.avatar_url  || "",
          });
          console.log("BACKEND RES:", JSON.stringify(res.data));
          console.log("SUCCESS FLAG:", res.data?.success);
          console.log("ACCESS TOKEN:", res.data?.data?.access_token);
          if (res.data?.success) {
            setStatus("Success! Redirecting...");
            const { access_token, refresh_token, user: afritideUser } = res.data.data;
            setAuth(afritideUser, access_token, refresh_token || "");
            const role = afritideUser.role;
            if (role === "ADMIN") router.replace("/dashboard/admin");
            else if (role === "BUYER") router.replace("/dashboard/buyer");
            else router.replace("/dashboard/farmer");
          } else {
            setStatus("Backend failed");
            console.log("BACKEND FAILED:", res.data);
          }
        } catch (err) {
          console.error("BACKEND ERROR:", err);
          setStatus("Backend error");
        }
      } else {
        setStatus("No session — waiting for auth state...");
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log("AUTH EVENT:", event, session);
          setStatus(`Auth event: ${event}`);
          if (event === "SIGNED_IN" && session) {
            subscription.unsubscribe();
            setStatus("Signed in via event, calling backend...");
            try {
              const res = await apiClient.post("/auth/google", {
                email:      session.user.email,
                first_name: session.user.user_metadata?.given_name  || session.user.email?.split("@")[0],
                last_name:  session.user.user_metadata?.family_name || "",
                google_id:  session.user.id,
                avatar_url: session.user.user_metadata?.avatar_url  || "",
              });
              console.log("BACKEND RES:", res.data);
              if (res.data?.success) {
                const { access_token, refresh_token, user: afritideUser } = res.data.data;
                setAuth(afritideUser, access_token, refresh_token || "");
                const role = afritideUser.role;
                if (role === "ADMIN") router.replace("/dashboard/admin");
                else if (role === "BUYER") router.replace("/dashboard/buyer");
                else router.replace("/dashboard/farmer");
              }
            } catch (err) {
              console.error("BACKEND ERROR:", err);
              setStatus("Backend error after event");
            }
          }
        });

        setTimeout(() => {
          subscription.unsubscribe();
          setStatus("Timeout — redirecting to login");
          router.replace("/login?error=timeout");
        }, 10000);
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