import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code);

    if (user) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email:      user.email,
            first_name: user.user_metadata?.given_name  || user.email?.split("@")[0],
            last_name:  user.user_metadata?.family_name || "",
            google_id:  user.id,
            avatar_url: user.user_metadata?.avatar_url  || "",
          }),
        });
        const data = await res.json();
        if (data.success && data.data?.access_token) {
          return NextResponse.redirect(
            `${requestUrl.origin}/auth/google-success?token=${data.data.access_token}&refresh=${data.data.refresh_token || ""}`
          );
        }
      } catch (err) {
        console.error("Google auth error:", err);
      }
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`);
}