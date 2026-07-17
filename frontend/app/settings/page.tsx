"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import apiClient from "@/lib/api/client";
import {
  User, Bell, Globe, Loader2, CheckCircle2,
  Crown, Zap, Building2, Check, X,
} from "lucide-react";
import toast from "react-hot-toast";

const PLANS = [
  {
    id:       "free",
    label:    "Free",
    icon:     User,
    color:    "text-gray-400",
    bg:       "bg-white/[0.03] border-white/[0.08]",
    active:   "border-gray-500/50 bg-white/[0.05]",
    price_ngn_monthly: 0,
    price_ngn_annual:  0,
    price_usd_monthly: 0,
    price_usd_annual:  0,
    features: [
      { label: "5 product listings",          included: true },
      { label: "Basic marketplace access",    included: true },
      { label: "Standard support",            included: true },
      { label: "Priority search placement",   included: false },
      { label: "Analytics dashboard",         included: false },
      { label: "Top Seller badge",            included: false },
      { label: "3 promoted listings",         included: false },
    ],
  },
  {
    id:       "pro",
    label:    "Pro",
    icon:     Zap,
    color:    "text-green-400",
    bg:       "bg-green-950/30 border-green-800/40",
    active:   "border-green-500 bg-green-950/50",
    price_ngn_monthly: 5000,
    price_ngn_annual:  50000,
    price_usd_monthly: 10,
    price_usd_annual:  100,
    badge:    "Most Popular",
    features: [
      { label: "20 product listings",         included: true },
      { label: "Priority search placement",   included: true },
      { label: "Analytics dashboard",         included: true },
      { label: "Top Seller badge",            included: true },
      { label: "3 promoted listings/month",   included: true },
      { label: "Priority support",            included: true },
      { label: "Dedicated account manager",   included: false },
    ],
  },
  {
    id:       "business",
    label:    "Business",
    icon:     Building2,
    color:    "text-amber-400",
    bg:       "bg-amber-950/30 border-amber-800/40",
    active:   "border-amber-500 bg-amber-950/50",
    price_ngn_monthly: 15000,
    price_ngn_annual:  150000,
    price_usd_monthly: 30,
    price_usd_annual:  300,
    badge:    "Best Value",
    features: [
      { label: "Unlimited listings",          included: true },
      { label: "Priority search placement",   included: true },
      { label: "Advanced analytics",          included: true },
      { label: "Top Seller badge",            included: true },
      { label: "10 promoted listings/month",  included: true },
      { label: "Dedicated account manager",   included: true },
      { label: "Branded storefront",          included: true },
    ],
  },
];

export default function SettingsPage() {
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const router = useRouter();
  const [saving,        setSaving]        = useState(false);
  const [billing,       setBilling]       = useState<"monthly" | "annual">("monthly");
  const [currency,      setCurrency]      = useState<"NGN" | "USD">("NGN");
  const [subscribing,   setSubscribing]   = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name:          "",
    last_name:           "",
    bio:                 "",
    country:             "",
    state:               "",
    city:                "",
    language:            "en",
    currency:            "USD",
    email_notifications: true,
    sms_notifications:   true,
  });

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
    if (user) {
      setForm({
        first_name:          user.first_name || "",
        last_name:           user.last_name  || "",
        bio:                 (user as any).bio      || "",
        country:             user.country           || "",
        state:               user.state             || "",
        city:                (user as any).city     || "",
        language:            (user as any).language || "en",
        currency:            user.currency          || "USD",
        email_notifications: (user as any).email_notifications ?? true,
        sms_notifications:   (user as any).sms_notifications   ?? true,
      });
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src   = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiClient.put("/users/me", form);
      if (res.data.success) {
        updateUser(res.data.data);
        toast.success("Settings saved successfully");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (planId === "free") return;
    if ((user as any)?.subscription_plan === planId) {
      toast("You are already on this plan");
      return;
    }

    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return;

    const amount = currency === "NGN"
      ? (billing === "monthly" ? plan.price_ngn_monthly : plan.price_ngn_annual)
      : (billing === "monthly" ? plan.price_usd_monthly : plan.price_usd_annual);

    setSubscribing(planId);

    if (currency === "NGN") {
      const reference = `SUB-${Date.now()}`;
      const handler = (window as any).PaystackPop.setup({
        key:      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email:    user?.email,
        amount:   amount * 100,
        currency: "NGN",
        reference,
        metadata: {
          custom_fields: [
            { display_name: "Plan",          variable_name: "plan",          value: planId },
            { display_name: "Billing Cycle", variable_name: "billing_cycle", value: billing },
          ],
        },
        callback: async (response: any) => {
          try {
            const res = await apiClient.post("/subscriptions/verify", {
              plan:          planId,
              billing_cycle: billing,
              currency:      "NGN",
              reference:     response.reference,
            });
            if (res.data.success) {
              toast.success(`Upgraded to ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan!`);
              updateUser({ ...(user as any), subscription_plan: planId });
            }
          } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to activate plan");
          } finally {
            setSubscribing(null);
          }
        },
        onClose: () => setSubscribing(null),
      });
      handler.openIframe();
    } else {
      // Stripe for USD
      try {
        const res = await apiClient.post("/payments/stripe/create-session", {
          cart_items: [{
            id:         "sub",
            product_id: "sub",
            title:      `Afritide ${plan.label} Plan (${billing})`,
            price:      amount,
            currency:   "USD",
            unit:       "subscription",
            quantity:   1,
            item_total: amount,
            seller_id:  "afritide",
          }],
          shipping_address: { address: "", city: "", country: "" },
          shipping_method:  "subscription",
          currency:         "USD",
          success_url:      `${window.location.origin}/settings?sub_plan=${planId}&sub_cycle=${billing}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url:       `${window.location.origin}/settings`,
        });
        if (res.data?.success) {
          sessionStorage.setItem("sub_plan",  planId);
          sessionStorage.setItem("sub_cycle", billing);
          window.location.href = res.data.data.checkout_url;
        }
      } catch (err: any) {
        toast.error(err.response?.data?.detail || "Failed to create session");
      } finally {
        setSubscribing(null);
      }
    }
  };

  // Handle Stripe subscription return
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const subPlan   = params.get("sub_plan") || sessionStorage.getItem("sub_plan");
    const subCycle  = params.get("sub_cycle") || sessionStorage.getItem("sub_cycle");

    if (sessionId && subPlan && subCycle) {
      apiClient.post("/subscriptions/verify", {
        plan:          subPlan,
        billing_cycle: subCycle,
        currency:      "USD",
        reference:     sessionId,
      }).then(res => {
        if (res.data.success) {
          toast.success(`Upgraded to ${subPlan.charAt(0).toUpperCase() + subPlan.slice(1)} plan!`);
          updateUser({ ...(user as any), subscription_plan: subPlan });
          sessionStorage.removeItem("sub_plan");
          sessionStorage.removeItem("sub_cycle");
          window.history.replaceState({}, "", "/settings");
        }
      }).catch(() => {
        toast.error("Failed to activate subscription");
      });
    }
  }, []);

  if (!isAuthenticated || !user) return null;

  const currentPlan = (user as any)?.subscription_plan || "free";

  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Settings</h1>
          <p className="text-gray-500">Manage your account preferences</p>
        </div>

        <div className="space-y-6">

          {/* Subscription Plans */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" /> Subscription Plan
              </h2>
              <div className="flex items-center gap-3">
                {/* Currency toggle */}
                <div className="flex bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
                  {(["NGN", "USD"] as const).map(c => (
                    <button key={c} onClick={() => setCurrency(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        currency === c ? "bg-green-600 text-white" : "text-gray-500 hover:text-white"
                      }`}>{c}</button>
                  ))}
                </div>
                {/* Billing toggle */}
                <div className="flex bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
                  {(["monthly", "annual"] as const).map(b => (
                    <button key={b} onClick={() => setBilling(b)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                        billing === b ? "bg-green-600 text-white" : "text-gray-500 hover:text-white"
                      }`}>
                      {b === "annual" ? "Annual (Save 17%)" : "Monthly"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Current plan badge */}
            <div className="bg-green-950/30 border border-green-800/30 rounded-xl p-3 mb-5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-green-300 text-sm">
                Current plan: <strong className="capitalize">{currentPlan}</strong>
                {(user as any)?.subscription_expires && (
                  <span className="text-gray-500 text-xs ml-2">
                    · Expires {new Date((user as any).subscription_expires).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map(plan => {
                const Icon      = plan.icon;
                const isActive  = currentPlan === plan.id;
                const price     = currency === "NGN"
                  ? (billing === "monthly" ? plan.price_ngn_monthly : plan.price_ngn_annual)
                  : (billing === "monthly" ? plan.price_usd_monthly : plan.price_usd_annual);
                const symbol    = currency === "NGN" ? "₦" : "$";
                const period    = billing === "monthly" ? "/mo" : "/yr";

                return (
                  <div key={plan.id}
                    className={`relative border rounded-2xl p-5 transition-all ${
                      isActive ? plan.active : plan.bg
                    }`}>
                    {plan.badge && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-black px-3 py-1 rounded-full bg-green-600 text-white whitespace-nowrap">
                        {plan.badge}
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={`w-4 h-4 ${plan.color}`} />
                      <span className={`font-bold text-sm ${plan.color}`}>{plan.label}</span>
                      {isActive && <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-700/40 px-2 py-0.5 rounded-full font-bold ml-auto">Active</span>}
                    </div>

                    <div className="mb-4">
                      <span className={`text-2xl font-black ${plan.color}`}>
                        {price === 0 ? "Free" : `${symbol}${price.toLocaleString()}`}
                      </span>
                      {price > 0 && <span className="text-gray-600 text-xs">{period}</span>}
                    </div>

                    <div className="space-y-2 mb-5">
                      {plan.features.map(f => (
                        <div key={f.label} className="flex items-center gap-2">
                          {f.included
                            ? <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                            : <X     className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />
                          }
                          <span className={`text-xs ${f.included ? "text-gray-300" : "text-gray-600"}`}>
                            {f.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isActive || plan.id === "free" || subscribing === plan.id}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        isActive || plan.id === "free"
                          ? "bg-white/[0.04] text-gray-600 cursor-default"
                          : plan.id === "pro"
                          ? "bg-green-600 hover:bg-green-500 text-white"
                          : "bg-amber-600 hover:bg-amber-500 text-white"
                      }`}>
                      {subscribing === plan.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : isActive ? "Current Plan"
                        : plan.id === "free" ? "Free Plan"
                        : `Upgrade to ${plan.label}`
                      }
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Profile */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
            <h2 className="text-white font-bold mb-5 flex items-center gap-2">
              <User className="w-4 h-4 text-green-500" /> Profile Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "first_name", label: "First Name", placeholder: "First name" },
                { key: "last_name",  label: "Last Name",  placeholder: "Last name" },
                { key: "country",    label: "Country",    placeholder: "e.g. Nigeria" },
                { key: "state",      label: "State",      placeholder: "e.g. Lagos" },
                { key: "city",       label: "City",       placeholder: "e.g. Lagos" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>
                  <input
                    value={(form as any)[key]}
                    onChange={e => setForm({...form, [key]: e.target.value})}
                    placeholder={placeholder}
                    className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4">
              <label className="text-xs text-gray-500 mb-1.5 block">Bio</label>
              <textarea value={form.bio}
                onChange={e => setForm({...form, bio: e.target.value})}
                rows={3}
                placeholder="Tell buyers about yourself or your farm..."
                className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none" />
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
            <h2 className="text-white font-bold mb-5 flex items-center gap-2">
              <Globe className="w-4 h-4 text-green-500" /> Preferences
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Language</label>
                <select value={form.language} onChange={e => setForm({...form, language: e.target.value})}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3 focus:outline-none appearance-none">
                  <option value="en" className="bg-[#0a1a0f]">English</option>
                  <option value="fr" className="bg-[#0a1a0f]">French</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Currency</label>
                <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3 focus:outline-none appearance-none">
                  {["USD","NGN","GBP","EUR","GHS","CFA"].map(c => (
                    <option key={c} value={c} className="bg-[#0a1a0f]">{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
            <h2 className="text-white font-bold mb-5 flex items-center gap-2">
              <Bell className="w-4 h-4 text-green-500" /> Notifications
            </h2>
            <div className="space-y-3">
              {[
                { key: "email_notifications", label: "Email Notifications", desc: "Receive order updates and messages via email" },
                { key: "sms_notifications",   label: "SMS Notifications",   desc: "Receive alerts via SMS" },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl cursor-pointer hover:border-green-700/30 transition-colors">
                  <div
                    onClick={() => setForm({...form, [key]: !(form as any)[key]})}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                      (form as any)[key] ? "bg-green-500 border-green-500" : "border-white/[0.15]"
                    }`}>
                    {(form as any)[key] && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{label}</p>
                    <p className="text-gray-600 text-xs">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Save */}
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-900/30">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : <><CheckCircle2 className="w-4 h-4" /> Save Settings</>
            }
          </button>
        </div>
      </div>
      <Footer />
    </main>
  );
}