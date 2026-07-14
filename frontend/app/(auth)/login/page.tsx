"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Leaf, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060f08] flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_20%,_#14532d40_0%,_transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "linear-gradient(#22c55e 1px,transparent 1px),linear-gradient(90deg,#22c55e 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-700/10 rounded-full blur-[100px]" />

        <div className="relative">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-white">Afritide Group</span>
          </Link>
        </div>

        <div className="relative">
          <h2 className="text-5xl font-black text-white leading-tight mb-6">
            Trade Africa&apos;s
            <br />
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              finest produce.
            </span>
          </h2>
          <p className="text-gray-500 text-lg leading-relaxed mb-10">
            Access real-time commodity prices, connect with verified farmers, and manage your trade operations from one platform.
          </p>

          <div className="space-y-4">
            {[
              { val: "10,000+", label: "Verified farmers and exporters" },
              { val: "45+", label: "Countries with active buyers" },
              { val: "50,000+", label: "Live product listings" },
            ].map((s) => (
              <div key={s.val} className="flex items-center gap-4">
                <span className="text-green-400 font-black text-xl w-20">{s.val}</span>
                <span className="text-gray-500 text-sm">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-gray-700 text-xs">
          © 2026 Afritide · Built by SuperILM Technologies
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black text-white">Afritide</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2">Welcome back</h1>
            <p className="text-gray-500">Sign in to your Afritide account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
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

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-400">Password</label>
                <Link href="/forgot-password" className="text-xs text-green-500 hover:text-green-400 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full bg-white/[0.05] border border-white/[0.09] hover:border-white/[0.14] focus:border-green-600/60 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-900 disabled:text-green-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-900/30 mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
            <p className="text-gray-600 text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-green-400 hover:text-green-300 font-semibold transition-colors">
                Create one free
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-700 text-xs leading-relaxed">
              By signing in you agree to our{" "}
              <Link href="/" className="text-gray-600 hover:text-gray-400 underline">Terms</Link>
              {" "}and{" "}
              <Link href="/" className="text-gray-600 hover:text-gray-400 underline">Privacy Policy</Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-gray-600 text-xs">
              Account suspended or having trouble?{" "}
              <Link href="/support" className="text-amber-400 hover:text-amber-300 transition-colors font-medium">
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
