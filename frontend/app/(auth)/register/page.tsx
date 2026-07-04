"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Leaf, ArrowRight, Loader2, Check } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSearchParams } from "next/navigation";

const schema = z.object({
  first_name: z.string().min(2, "First name is required"),
  last_name: z.string().min(2, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["buyer", "farmer", "cooperative", "exporter", "processing_company", "logistics_provider", "warehouse_operator"]),
  business_name: z.string().optional(),
  country: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const roles = [
  { value: "buyer", label: "Buyer", desc: "Source agricultural products", icon: "🛒" },
  { value: "farmer", label: "Farmer", desc: "List and sell your produce", icon: "🌾" },
  { value: "exporter", label: "Exporter", desc: "Export African commodities", icon: "🚢" },
  { value: "cooperative", label: "Cooperative", desc: "Group of farmers trading together", icon: "🤝" },
];

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get("role") as any) || "buyer";

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: defaultRole },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await registerUser(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060f08] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_20%,_#14532d40_0%,_transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "linear-gradient(#22c55e 1px,transparent 1px),linear-gradient(90deg,#22c55e 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-green-700/10 rounded-full blur-[100px]" />

        <div className="relative">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-white">Afritide</span>
          </Link>
        </div>

        <div className="relative">
          <h2 className="text-4xl font-black text-white leading-tight mb-6">
            Join Africa&apos;s
            <br />
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              trading revolution.
            </span>
          </h2>
          <p className="text-gray-500 text-base leading-relaxed mb-10">
            Whether you&apos;re a farmer in Kano, an exporter in Accra, or a buyer in London — Afritide connects you to the whole chain.
          </p>

          <div className="space-y-3">
            {[
              "Free to join — no setup fees",
              "KYC verification for trusted trading",
              "Real-time commodity price intelligence",
              "Direct messaging with counterparties",
              "Export documentation support",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-900/60 border border-green-700/50 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-green-400" />
                </div>
                <span className="text-gray-500 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-gray-700 text-xs">
          © 2026 Afritide · Built by SuperILM Technologies
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-start justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black text-white">Afritide</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2">Create your account</h1>
            <p className="text-gray-500">Join thousands of farmers and buyers on Afritide</p>
          </div>

          {/* Role selector */}
          <div className="mb-7">
            <label className="block text-sm font-medium text-gray-400 mb-3">I am joining as a...</label>
            <div className="grid grid-cols-2 gap-2.5">
              {roles.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setValue("role", role.value as any)}
                  className={`relative flex flex-col items-start gap-1 p-4 rounded-xl border transition-all text-left ${
                    selectedRole === role.value
                      ? "border-green-600/70 bg-green-950/60 shadow-lg shadow-green-900/20"
                      : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.14] hover:bg-white/[0.05]"
                  }`}
                >
                  {selectedRole === role.value && (
                    <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                  <span className="text-xl">{role.icon}</span>
                  <span className={`font-bold text-sm ${selectedRole === role.value ? "text-white" : "text-gray-300"}`}>
                    {role.label}
                  </span>
                  <span className="text-gray-600 text-xs leading-snug">{role.desc}</span>
                </button>
              ))}
            </div>
            {errors.role && <p className="text-red-400 text-xs mt-1.5">{errors.role.message}</p>}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">First name</label>
                <input
                  {...register("first_name")}
                  placeholder="Olayinka"
                  className="w-full bg-white/[0.05] border border-white/[0.09] hover:border-white/[0.14] focus:border-green-600/60 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                />
                {errors.first_name && <p className="text-red-400 text-xs mt-1">{errors.first_name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Last name</label>
                <input
                  {...register("last_name")}
                  placeholder="Israel"
                  className="w-full bg-white/[0.05] border border-white/[0.09] hover:border-white/[0.14] focus:border-green-600/60 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                />
                {errors.last_name && <p className="text-red-400 text-xs mt-1">{errors.last_name.message}</p>}
              </div>
            </div>

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

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Phone number <span className="text-gray-600">(optional)</span></label>
              <input
                {...register("phone")}
                type="tel"
                placeholder="+2348023148419"
                className="w-full bg-white/[0.05] border border-white/[0.09] hover:border-white/[0.14] focus:border-green-600/60 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
              />
            </div>

            {/* Business name - show for non-buyers */}
            {selectedRole !== "buyer" && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {selectedRole === "farmer" ? "Farm name" : "Business name"}{" "}
                  <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  {...register("business_name")}
                  placeholder={selectedRole === "farmer" ? "e.g. Israel Farms" : "e.g. Global Agro Exports Ltd"}
                  className="w-full bg-white/[0.05] border border-white/[0.09] hover:border-white/[0.14] focus:border-green-600/60 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                />
              </div>
            )}

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Country</label>
              <input
                {...register("country")}
                placeholder="e.g. Nigeria"
                className="w-full bg-white/[0.05] border border-white/[0.09] hover:border-white/[0.14] focus:border-green-600/60 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  className="w-full bg-white/[0.05] border border-white/[0.09] hover:border-white/[0.14] focus:border-green-600/60 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
              ) : (
                <>Create Free Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-green-400 hover:text-green-300 font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          <p className="text-gray-700 text-xs text-center mt-4 leading-relaxed">
            By creating an account you agree to our{" "}
            <Link href="/" className="text-gray-600 hover:text-gray-400 underline">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/" className="text-gray-600 hover:text-gray-400 underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}