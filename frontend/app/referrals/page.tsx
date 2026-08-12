"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import apiClient from "@/lib/api/client";
import {
  Copy, Share2, CheckCircle2, TrendingUp,
  Users, Clock, Wallet, ArrowDownToLine,
  Loader2, ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatPrice } from "@/lib/utils";

export default function ReferralsPage() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [copied,          setCopied]          = useState(false);
  const [showWithdraw,    setShowWithdraw]    = useState(false);
  const [withdrawAmount,  setWithdrawAmount]  = useState("");
  const [bankName,        setBankName]        = useState("");
  const [accountNumber,   setAccountNumber]   = useState("");
  const [accountName,     setAccountName]     = useState("");
  const [submitting,      setSubmitting]      = useState(false);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.push("/login");
  }, [hasHydrated, isAuthenticated, router]);

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["referral-profile"],
    queryFn:  async () => {
      const res = await apiClient.get("/referrals/profile");
      return res.data.data;
    },
    enabled: isAuthenticated,
  });

  const { data: commissionsData } = useQuery({
    queryKey: ["referral-commissions"],
    queryFn:  async () => {
      const res = await apiClient.get("/referrals/commissions?page_size=10");
      return res.data.data;
    },
    enabled: isAuthenticated,
  });

  const { data: referralsData } = useQuery({
    queryKey: ["my-referrals"],
    queryFn:  async () => {
      const res = await apiClient.get("/referrals/referrals");
      return res.data.data;
    },
    enabled: isAuthenticated,
  });

  const { data: withdrawalsData } = useQuery({
    queryKey: ["my-withdrawals"],
    queryFn:  async () => {
      const res = await apiClient.get("/referrals/withdrawals");
      return res.data.data;
    },
    enabled: isAuthenticated,
  });

  const profile     = profileData;
  const commissions = commissionsData?.items || [];
  const referrals   = referralsData || [];
  const withdrawals = withdrawalsData || [];

  const handleCopy = () => {
    if (!profile?.referral_link) return;
    navigator.clipboard.writeText(profile.referral_link);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const text = `Join Afritide — Africa's most trusted agricultural marketplace connecting farmers, businesses and global trade.\n\nJoin using my referral link:\n${profile?.referral_link}`;
    if (navigator.share) {
      await navigator.share({ title: "Join Afritide", text, url: profile?.referral_link });
    } else {
      const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(wa, "_blank");
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !bankName || !accountNumber || !accountName) {
      toast.error("Please fill all fields");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/referrals/withdraw", {
        amount:         parseFloat(withdrawAmount),
        bank_name:      bankName,
        account_number: accountNumber,
        account_name:   accountName,
      });
      toast.success("Withdrawal request submitted!");
      setShowWithdraw(false);
      queryClient.invalidateQueries({ queryKey: ["referral-profile"] });
      queryClient.invalidateQueries({ queryKey: ["my-withdrawals"] });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit withdrawal");
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE":  return "bg-green-500/20 text-green-400";
      case "HELD":       return "bg-amber-500/20 text-amber-400";
      case "PENDING":    return "bg-blue-500/20 text-blue-400";
      case "PAID":       return "bg-emerald-500/20 text-emerald-400";
      case "PROCESSING": return "bg-violet-500/20 text-violet-400";
      case "REVERSED":   return "bg-red-500/20 text-red-400";
      default:           return "bg-gray-500/20 text-gray-400";
    }
  };

  if (!hasHydrated || !isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Referral Program</h1>
          <p className="text-gray-500">
            Earn commissions by referring farmers, buyers and businesses to Afritide.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* Balance cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Available",     value: profile?.balance?.available    ?? 0, color: "text-green-400",  bg: "bg-green-950/30 border-green-800/30" },
                { label: "Pending/Held",  value: (profile?.balance?.pending ?? 0) + (profile?.balance?.held ?? 0), color: "text-amber-400", bg: "bg-amber-950/30 border-amber-800/30" },
                { label: "Total Earned",  value: profile?.balance?.total_earned ?? 0, color: "text-white",       bg: "bg-white/[0.03] border-white/[0.07]" },
                { label: "Total Withdrawn",value: profile?.balance?.total_withdrawn ?? 0, color: "text-sky-400", bg: "bg-sky-950/30 border-sky-800/30" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} border rounded-2xl p-5`}>
                  <p className={`text-2xl font-black ${color}`}>{formatPrice(value, "NGN")}</p>
                  <p className="text-gray-500 text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Referral stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Referrals",    value: profile?.total_referrals  ?? 0, icon: Users },
                { label: "Active Referrals",   value: profile?.active_referrals ?? 0, icon: TrendingUp },
                { label: "Qualifying",         value: profile?.qualifying       ?? 0, icon: CheckCircle2 },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 text-center">
                  <Icon className="w-5 h-5 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="text-gray-500 text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Referral link */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4">Your Referral Link</h3>
              <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 mb-4">
                <span className="text-gray-400 text-sm flex-1 truncate">{profile?.referral_link}</span>
                <span className="text-gray-600 text-xs">Code: <span className="text-green-400 font-bold">{profile?.referral_code}</span></span>
              </div>
              <div className="flex gap-3">
                <button onClick={handleCopy}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                <button onClick={handleShare}
                  className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                  <Share2 className="w-4 h-4" /> Share
                </button>
                {(profile?.balance?.available ?? 0) > 0 && (
                  <button onClick={() => setShowWithdraw(true)}
                    className="flex items-center gap-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-700/40 text-amber-400 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors ml-auto">
                    <ArrowDownToLine className="w-4 h-4" /> Withdraw
                  </button>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Commission Rate", value: `${profile?.commission_rate ?? 10}%` },
                  { label: "Holding Period",  value: `${profile?.holding_days ?? 30} days` },
                  { label: "Min Withdrawal",  value: formatPrice(profile?.min_withdrawal ?? 5000, "NGN") },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                    <p className="text-green-400 font-bold text-sm">{value}</p>
                    <p className="text-gray-600 text-[10px] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Recent commissions */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06]">
                  <h3 className="text-white font-bold text-sm">Recent Commissions</h3>
                </div>
                {commissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Wallet className="w-8 h-8 text-gray-700 mb-2" />
                    <p className="text-gray-600 text-sm">No commissions yet</p>
                    <p className="text-gray-700 text-xs mt-1">Share your referral link to start earning</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {commissions.map((c: any) => (
                      <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">{c.referred_name || "Referred User"}</p>
                          <p className="text-gray-600 text-xs">{new Date(c.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-bold text-sm">{formatPrice(c.commission_amount, c.currency)}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>
                            {c.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* My referrals */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06]">
                  <h3 className="text-white font-bold text-sm">My Referrals</h3>
                </div>
                {referrals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Users className="w-8 h-8 text-gray-700 mb-2" />
                    <p className="text-gray-600 text-sm">No referrals yet</p>
                    <p className="text-gray-700 text-xs mt-1">Share your link to invite people</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {referrals.slice(0, 8).map((r: any) => (
                      <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">{r.name || r.email}</p>
                          <p className="text-gray-600 text-xs">{new Date(r.registered_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.status === "QUALIFIED" ? "bg-green-500/20 text-green-400" :
                          r.status === "VERIFIED"  ? "bg-sky-500/20 text-sky-400" :
                          "bg-gray-500/20 text-gray-400"
                        }`}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Withdrawal history */}
            {withdrawals.length > 0 && (
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06]">
                  <h3 className="text-white font-bold text-sm">Withdrawal History</h3>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {withdrawals.map((w: any) => (
                    <div key={w.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{w.bank_name} — {w.account_number}</p>
                        <p className="text-gray-600 text-xs">{new Date(w.created_at).toLocaleDateString()} · Ref: {w.reference}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-sm">{formatPrice(w.amount, w.currency)}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(w.status)}`}>
                          {w.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Terms */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5">
              <h3 className="text-white font-bold text-sm mb-3">How It Works</h3>
              <div className="space-y-2 text-gray-500 text-xs leading-relaxed">
                <p>• Share your unique referral link with farmers, buyers and businesses.</p>
                <p>• When they join and complete verified transactions on Afritide, you earn a commission.</p>
                <p>• Commission is calculated as <span className="text-green-400">{profile?.commission_rate ?? 10}%</span> of Afritide's eligible platform revenue from their activity — not the full transaction value.</p>
                <p>• Commissions are held for <span className="text-green-400">{profile?.holding_days ?? 30} days</span> to protect against refunds and cancellations.</p>
                <p>• Once available, you can withdraw a minimum of <span className="text-green-400">{formatPrice(profile?.min_withdrawal ?? 5000, "NGN")}</span>.</p>
                <p>• Afritide reserves the right to modify or terminate the referral program at any time.</p>
                <p>• Self-referrals are not permitted. Fraudulent activity will result in permanent disqualification.</p>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Withdrawal modal */}
      {showWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowWithdraw(false)} />
          <div className="relative bg-[#0a1a0f] border border-white/[0.08] rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-1">Withdraw Commission</h3>
            <p className="text-gray-500 text-sm mb-5">
              Available: <span className="text-green-400 font-bold">{formatPrice(profile?.balance?.available ?? 0, "NGN")}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Amount (NGN)</label>
                <input value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                  type="number" placeholder="Enter amount"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-700/50" />
              </div>
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Bank Name</label>
                <input value={bankName} onChange={e => setBankName(e.target.value)}
                  placeholder="e.g. First Bank"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-700/50" />
              </div>
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Account Number</label>
                <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
                  placeholder="10-digit account number"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-700/50" />
              </div>
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Account Name</label>
                <input value={accountName} onChange={e => setAccountName(e.target.value)}
                  placeholder="Account holder name"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-700/50" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowWithdraw(false)}
                className="flex-1 py-3 rounded-xl border border-white/[0.08] text-gray-400 hover:text-white text-sm font-medium transition-colors">
                Cancel
              </button>
              <button onClick={handleWithdraw} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}