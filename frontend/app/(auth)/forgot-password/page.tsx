"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Leaf, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { authApi } from "@/lib/api/auth.api";
import toast from "react-hot-toast";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
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

        {sent ? (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-950/60 border border-green-800/40 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Check your email</h1>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              If an account with that email exists, we&apos;ve sent a password reset link. Check your inbox and spam folder.
            </p>
            <Link href="/login"
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
              Back to Login
            </Link>
          </div>
        ) : (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-black text-white mb-2">Forgot password?</h1>
              <p className="text-gray-500 text-sm">Enter your email and we&apos;ll send you a reset link.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email address</label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full bg-white/[0.05] border border-white/[0.09] hover:border-white/[0.14] focus:border-green-600/60 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                />
                {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-900 disabled:text-green-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-900/30"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                  : <>Send Reset Link <ArrowRight className="w-4 h-4" /></>
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