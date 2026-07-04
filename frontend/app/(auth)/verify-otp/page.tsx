"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { Leaf, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { authApi } from "@/lib/api/auth.api";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const { verifyOtp } = useAuth();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) return toast.error("Enter the complete 6-digit code");
    setLoading(true);
    try {
      await verifyOtp(email, code);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authApi.resendOtp(email);
      toast.success("New OTP sent to your email");
    } catch {
      toast.error("Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060f08] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-12">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black text-white">Afritide</span>
        </Link>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-green-950/60 border border-green-800/40 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">📧</span>
          </div>

          <h1 className="text-2xl font-black text-white mb-2">Check your email</h1>
          <p className="text-gray-500 text-sm mb-2">We sent a 6-digit code to</p>
          <p className="text-green-400 font-semibold text-sm mb-8 truncate">{email}</p>

          <form onSubmit={handleSubmit}>
            <div className="flex gap-3 justify-center mb-8">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { refs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-black text-white bg-white/[0.05] border border-white/[0.1] focus:border-green-500/60 focus:bg-white/[0.08] rounded-xl focus:outline-none transition-all"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otp.join("").length !== 6}
              className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-900 disabled:text-green-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-900/30"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
              ) : (
                <>Verify Email <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/[0.06] flex items-center justify-center gap-2">
            <span className="text-gray-600 text-sm">Didn&apos;t get the code?</span>
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-green-400 hover:text-green-300 text-sm font-semibold transition-colors flex items-center gap-1"
            >
              {resending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Resend
            </button>
          </div>
        </div>

        <div className="mt-6">
          <Link href="/login" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}