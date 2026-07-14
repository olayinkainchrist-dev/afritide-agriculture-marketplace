"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import apiClient from "@/lib/api/client";
import { User, Bell, Lock, Globe, Loader2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", bio: "", country: "",
    state: "", city: "", website: "", language: "en", currency: "USD",
    email_notifications: true, sms_notifications: true,
  });

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
    if (user) {
      setForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        bio: (user as any).bio || "",
        country: user.country || "",
        state: user.state || "",
        city: (user as any).city || "",
        website: (user as any).website || "",
        language: (user as any).language || "en",
        currency: user.currency || "USD",
        email_notifications: (user as any).email_notifications ?? true,
        sms_notifications: (user as any).sms_notifications ?? true,
      });
    }
  }, [isAuthenticated, user, router]);

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

  if (!isAuthenticated || !user) return null;

  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Settings</h1>
          <p className="text-gray-500">Manage your account preferences</p>
        </div>

        <div className="space-y-6">
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
                { key: "website",    label: "Website",    placeholder: "https://..." },
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
              <textarea
                value={form.bio}
                onChange={e => setForm({...form, bio: e.target.value})}
                rows={3}
                placeholder="Tell buyers about yourself or your farm..."
                className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none"
              />
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
                  {["USD","NGN","GBP","EUR","GHS","CFA"].map(c => <option key={c} value={c} className="bg-[#0a1a0f]">{c}</option>)}
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
                    }`}
                  >
                    {(form as any)[key] && (
                      <svg className="w-3 h-3 text-white" fill="NONE" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
