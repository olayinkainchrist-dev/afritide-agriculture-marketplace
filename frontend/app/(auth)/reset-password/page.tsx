"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Leaf, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { authApi } from "@/lib/api/auth.api";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

const schema = z.object({
  new_password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060f08]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error("Invalid reset link");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, new_password: data.new_password });
      setDone(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Reset failed. Link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060f08] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">

        <Link href="/" className="flex items-center gap-2 mb-12 justify-center">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black text-white">Afritide</span>
        </Link>

        {done ? (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-950/60 border border-green-800/40 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Password reset!</h1>
            <p className="text-gray-500 text-sm mb-6">
              Your password has been updated. Redirecting to login...
            </p>
            <Link href="/login"
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
              Go to Login
            </Link>
          </div>
        ) : !token ? (
          <div className="bg-white/[0.03] border border-red-800/30 rounded-3xl p-8 text-center">
            <h1 className="text-xl font-black text-white mb-2">Invalid reset link</h1>
            <p className="text-gray-500 text-sm mb-6">This link is invalid or has expired.</p>
            <Link href="/forgot-password"
              className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors">
              Request a new one →
            </Link>
          </div>
        ) : (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-black text-white mb-2">Reset your password</h1>
              <p className="text-gray-500 text-sm">Enter your new password below.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">New Password</label>
                <div className="relative">
                  <input
                    {...register("new_password")}
                    type={showPass ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    className="w-full bg-white/[0.05] border border-white/[0.09] focus:border-green-600/60 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors pr-12"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.new_password && <p className="text-red-400 text-xs mt-1.5">{errors.new_password.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Confirm Password</label>
                <input
                  {...register("confirm_password")}
                  type={showPass ? "text" : "password"}
                  placeholder="Repeat new password"
                  className="w-full bg-white/[0.05] border border-white/[0.09] focus:border-green-600/60 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                />
                {errors.confirm_password && <p className="text-red-400 text-xs mt-1.5">{errors.confirm_password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-900 disabled:text-green-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-900/30"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</>
                  : <>Reset Password <ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
                ← Back to login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
