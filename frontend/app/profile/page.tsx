"use client";
import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import apiClient from "@/lib/api/client";
import {
  User, MapPin, Star, Package, ShoppingCart,
  BadgeCheck, Clock, TrendingUp, Edit3,
  Camera, Loader2, CheckCircle2, Globe,
  Phone, Mail, Building2, Leaf,
} from "lucide-react";
import { getInitials, formatDate, formatNumber } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

export default function ProfilePage() {
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    bio: "",
    country: "",
    state: "",
    city: "",
    website: "",
    farm_name: "",
    farm_size_hectares: "",
    years_of_experience: "",
    farm_description: "",
    export_license_number: "",
  });

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
    if (user) {
      setForm({
        first_name:           user.first_name || "",
        last_name:            user.last_name || "",
        bio:                  (user as any).bio || "",
        country:              user.country || "",
        state:                user.state || "",
        city:                 (user as any).city || "",
        website:              (user as any).website || "",
        farm_name:            (user as any).farm_name || "",
        farm_size_hectares:   (user as any).farm_size_hectares || "",
        years_of_experience:  (user as any).years_of_experience || "",
        farm_description:     (user as any).farm_description || "",
        export_license_number:(user as any).export_license_number || "",
      });
    }
  }, [isAuthenticated, user, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        farm_size_hectares:  form.farm_size_hectares  ? Number(form.farm_size_hectares)  : undefined,
        years_of_experience: form.years_of_experience ? Number(form.years_of_experience) : undefined,
      };
      const res = await apiClient.put("/users/me", payload);
      if (res.data.success) {
        updateUser(res.data.data);
        toast.success("Profile updated successfully");
        setEditing(false);
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post("/users/me/avatar", formData, {
        headers: { "Content-Type": undefined },
      });
      if (res.data.success) {
        updateUser({ ...user!, profile_image: res.data.data.profile_image });
        toast.success("Avatar updated");
      }
    } catch {
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  if (!isAuthenticated || !user) return null;

  const isFarmer = ["farmer", "cooperative", "exporter"].includes(user.role);

  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* ── Hero section ─────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-green-950/60 to-emerald-950/40 border border-white/[0.07] rounded-3xl p-8 mb-6 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#14532d30_0%,_transparent_60%)]" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-green-700 flex items-center justify-center text-white text-3xl font-black overflow-hidden border-2 border-green-600/40">
                {uploadingAvatar
                  ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                  : user.profile_image
                  ? <img src={user.profile_image} alt="" className="w-full h-full object-cover" />
                  : getInitials(`${user.first_name} ${user.last_name}`)
                }
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-2 -right-2 w-7 h-7 bg-green-600 hover:bg-green-500 disabled:bg-green-900 rounded-full flex items-center justify-center transition-colors shadow-lg"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-2xl font-black text-white">
                  {user.business_name || `${user.first_name} ${user.last_name}`}
                </h1>
                {user.badge !== "none" && (
                  <BadgeCheck className="w-6 h-6 text-green-400" />
                )}
              </div>
              <p className="text-gray-400 text-sm capitalize mb-2">{user.role.replace("_", " ")}</p>
              {(user as any).bio && (
                <p className="text-gray-500 text-sm leading-relaxed max-w-xl">{(user as any).bio}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                {user.country && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-green-600" />
                    {[( user as any).city, user.state, user.country].filter(Boolean).join(", ")}
                  </span>
                )}
                {(user as any).website && (
                  <a href={(user as any).website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-green-400 hover:text-green-300 transition-colors">
                    <Globe className="w-3.5 h-3.5" />
                    Website
                  </a>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-green-600" />
                  Joined {formatDate(user.created_at)}
                </span>
              </div>
            </div>

            {/* Edit button */}
            <button
              onClick={() => setEditing(!editing)}
              className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl transition-all text-sm flex-shrink-0 ${
                editing
                  ? "bg-white/[0.08] text-gray-400 hover:text-white border border-white/[0.1]"
                  : "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/30"
              }`}
            >
              <Edit3 className="w-4 h-4" />
              {editing ? "Cancel" : "Edit Profile"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Stats ──────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Stats */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
              <h3 className="text-white font-bold mb-4 text-sm">Stats</h3>
              <div className="space-y-3">
                {[
                  { icon: Star,         label: "Rating",       value: `${user.rating_average.toFixed(1)} (${user.rating_count})`, color: "text-amber-400" },
                  { icon: TrendingUp,   label: "Total Sales",  value: user.total_sales.toString(),                                color: "text-green-400" },
                  { icon: ShoppingCart, label: "Orders",       value: ((user as any).total_orders ?? 0).toString(),               color: "text-sky-400" },
                  { icon: Package,      label: "Response Rate",value: `${user.response_rate.toFixed(0)}%`,                        color: "text-violet-400" },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-gray-500 text-sm">{label}</span>
                    </div>
                    <span className={`font-bold text-sm ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Account status */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
              <h3 className="text-white font-bold mb-4 text-sm">Account Status</h3>
              <div className="space-y-3">
                {[
                  { label: "Email Verified",  done: user.email_verified },
                  { label: "Phone Verified",  done: (user as any).phone_verified },
                  { label: "KYC Approved",    done: user.kyc_approved },
                  { label: "Profile Complete",done: !!(( user as any).bio && user.country) },
                ].map(({ label, done }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{label}</span>
                    {done
                      ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                      : <Clock className="w-4 h-4 text-amber-500" />
                    }
                  </div>
                ))}
              </div>
              {!user.kyc_approved && (
                <Link href="/verify"
                  className="mt-4 w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-700/40 text-amber-400 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                  Complete KYC Verification →
                </Link>
              )}
            </div>

            {/* Contact */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
              <h3 className="text-white font-bold mb-4 text-sm">Contact Info</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-gray-400 text-sm truncate">{user.email}</span>
                </div>
                {(user as any).phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-gray-400 text-sm">{(user as any).phone}</span>
                  </div>
                )}
                {user.business_name && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-gray-400 text-sm">{user.business_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Edit form or details ──────────────────────────── */}
          <div className="lg:col-span-2">
            {editing ? (
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 space-y-5">
                <h3 className="text-white font-bold">Edit Profile</h3>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "first_name", label: "First Name",  placeholder: "First name" },
                    { key: "last_name",  label: "Last Name",   placeholder: "Last name" },
                    { key: "country",    label: "Country",     placeholder: "e.g. Nigeria" },
                    { key: "state",      label: "State",       placeholder: "e.g. Kano" },
                    { key: "city",       label: "City",        placeholder: "e.g. Kano City" },
                    { key: "website",    label: "Website",     placeholder: "https://..." },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>
                      <input
                        value={(form as any)[key]}
                        onChange={e => setForm({ ...form, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Bio</label>
                  <textarea
                    value={form.bio}
                    onChange={e => setForm({ ...form, bio: e.target.value })}
                    rows={3}
                    placeholder="Tell buyers about yourself or your farm..."
                    className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none"
                  />
                </div>

                {/* Farmer-specific fields */}
                {isFarmer && (
                  <>
                    <div className="border-t border-white/[0.06] pt-4">
                      <h4 className="text-green-400 font-semibold text-sm mb-4 flex items-center gap-2">
                        <Leaf className="w-4 h-4" /> Farm Details
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { key: "farm_name",           label: "Farm Name",              placeholder: "e.g. Olulade Farms" },
                          { key: "farm_size_hectares",  label: "Farm Size (hectares)",   placeholder: "e.g. 50" },
                          { key: "years_of_experience", label: "Years of Experience",    placeholder: "e.g. 10" },
                          { key: "export_license_number", label: "Export License No.",   placeholder: "Optional" },
                        ].map(({ key, label, placeholder }) => (
                          <div key={key}>
                            <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>
                            <input
                              value={(form as any)[key]}
                              onChange={e => setForm({ ...form, [key]: e.target.value })}
                              placeholder={placeholder}
                              className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-4">
                        <label className="text-xs text-gray-500 mb-1.5 block">Farm Description</label>
                        <textarea
                          value={form.farm_description}
                          onChange={e => setForm({ ...form, farm_description: e.target.value })}
                          rows={3}
                          placeholder="Describe your farm, crops, practices..."
                          className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-900/30"
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    : <><CheckCircle2 className="w-4 h-4" /> Save Changes</>
                  }
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* About */}
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
                  <h3 className="text-white font-bold mb-4">About</h3>
                  {(user as any).bio ? (
                    <p className="text-gray-400 leading-relaxed">{(user as any).bio}</p>
                  ) : (
                    <div className="text-center py-8">
                      <User className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                      <p className="text-gray-600 text-sm">No bio yet</p>
                      <button onClick={() => setEditing(true)} className="text-green-400 hover:text-green-300 text-sm mt-2 transition-colors">
                        Add a bio →
                      </button>
                    </div>
                  )}
                </div>

                {/* Farmer details */}
                {isFarmer && (
                  <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-green-500" /> Farm Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Farm Name",       value: (user as any).farm_name },
                        { label: "Farm Size",        value: (user as any).farm_size_hectares ? `${(user as any).farm_size_hectares} ha` : null },
                        { label: "Experience",       value: (user as any).years_of_experience ? `${(user as any).years_of_experience} years` : null },
                        { label: "Export License",   value: (user as any).export_license_number },
                      ].filter(i => i.value).map(({ label, value }) => (
                        <div key={label} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                          <p className="text-gray-600 text-xs mb-1">{label}</p>
                          <p className="text-white font-semibold text-sm">{value}</p>
                        </div>
                      ))}
                    </div>
                    {(user as any).farm_description && (
                      <p className="text-gray-400 text-sm mt-4 leading-relaxed">{(user as any).farm_description}</p>
                    )}
                    {!(user as any).farm_name && (
                      <div className="text-center py-6">
                        <p className="text-gray-600 text-sm">No farm details yet</p>
                        <button onClick={() => setEditing(true)} className="text-green-400 hover:text-green-300 text-sm mt-2 transition-colors">
                          Add farm details →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick links */}
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
                  <h3 className="text-white font-bold mb-4">Quick Links</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "My Dashboard",    href: isFarmer ? "/dashboard/farmer" : "/dashboard/buyer" },
                      { label: "My Products",     href: "/dashboard/farmer/products", show: isFarmer },
                      { label: "My Orders",       href: isFarmer ? "/dashboard/farmer/orders" : "/dashboard/buyer/orders" },
                      { label: "Settings",        href: "/settings" },
                      { label: "Commodities",     href: "/dashboard/admin/commodities", show: user.role === "admin" },
                      { label: "Support Tickets", href: "/dashboard/admin/support",     show: user.role === "admin" },
                      { label: "View Reports",    href: "/dashboard/admin/reports",     show: user.role === "admin" },
                    ].filter(l => l.show !== false).map(({ label, href }) => (
                      <Link key={href} href={href}
                        className="bg-white/[0.03] border border-white/[0.06] hover:border-green-800/50 rounded-xl px-4 py-3 text-gray-400 hover:text-white text-sm font-medium transition-all text-center">
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}