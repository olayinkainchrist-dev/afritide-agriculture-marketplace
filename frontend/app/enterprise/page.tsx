"use client";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import apiClient from "@/lib/api/client";
import {
  Crown, Building2, Globe, Users, TrendingUp,
  CheckCircle2, Loader2, MessageCircle, Mail,
  Phone, ArrowRight, Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

const BENEFITS = [
  { icon: TrendingUp, label: "Unlimited Listings",         desc: "List as many products as your business needs" },
  { icon: Users,      label: "Multi-User Accounts",        desc: "Add team members with role-based access" },
  { icon: Globe,      label: "White-Label Storefront",     desc: "Branded marketplace experience for your business" },
  { icon: Building2,  label: "Dedicated Success Manager",  desc: "Personal account manager for your business" },
  { icon: Crown,      label: "API & ERP Integration",      desc: "Connect your existing systems seamlessly" },
  { icon: Sparkles,   label: "AI Demand Predictions",      desc: "Data-driven insights to grow your business" },
];

const VOLUMES = [
  "Under ₦10M/month",
  "₦10M – ₦50M/month",
  "₦50M – ₦200M/month",
  "Over ₦200M/month",
  "Prefer not to say",
];

const ROLES = [
  "CEO / Founder",
  "Sales Director",
  "Procurement Manager",
  "Export Manager",
  "Operations Manager",
  "Other",
];

export default function EnterprisePage() {
  const [submitted,  setSubmitted]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name:      "",
    email:          "",
    phone:          "",
    company_name:   "",
    role:           "",
    country:        "",
    monthly_volume: "",
    message:        "",
  });

  const handleSubmit = async () => {
    if (!form.full_name || !form.email || !form.company_name || !form.message) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/support/enterprise-inquiry", form);
      setSubmitted(true);
    } catch {
      toast.error("Failed to send inquiry. Please try WhatsApp or email directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />

      {/* Hero */}
      <div className="border-b border-white/[0.06] bg-[#07120a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-violet-950/40 border border-violet-800/40 rounded-full px-4 py-2 mb-6">
              <Crown className="w-4 h-4 text-violet-400" />
              <span className="text-violet-400 text-sm font-bold">Enterprise Plan</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
              Scale Your Agricultural Business Globally
            </h1>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              Purpose-built for large exporters, cooperatives, processors, and government agencies.
              Get unlimited access, dedicated support, and tools that grow with your business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#contact"
                className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold px-8 py-4 rounded-2xl transition-colors text-sm">
                Contact Sales <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/2349030320363?text=Hi%20Afritide%2C%20I%27m%20interested%20in%20the%20Enterprise%20plan"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-4 rounded-2xl transition-colors text-sm">
                <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Benefits */}
        <div className="mb-16">
          <h2 className="text-2xl font-black text-white text-center mb-2">Everything You Need to Scale</h2>
          <p className="text-gray-500 text-center mb-10">Negotiated pricing · Custom contracts · SLA support</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-950/50 border border-violet-800/40 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-1">{label}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Commission comparison */}
        <div className="bg-gradient-to-r from-violet-950/40 to-green-950/40 border border-white/[0.07] rounded-3xl p-8 mb-16 text-center">
          <h3 className="text-white font-black text-xl mb-2">Save More As You Scale</h3>
          <p className="text-gray-400 text-sm mb-8">Commission rates that reward high-volume sellers</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { plan: "Free",       commission: "5%",          color: "text-gray-400" },
              { plan: "Pro",        commission: "3.5%",        color: "text-green-400" },
              { plan: "Business",   commission: "2%",          color: "text-amber-400" },
              { plan: "Enterprise", commission: "Negotiated",  color: "text-violet-400" },
            ].map(({ plan, commission, color }) => (
              <div key={plan} className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4">
                <p className="text-gray-500 text-xs mb-2">{plan}</p>
                <p className={`font-black text-xl ${color}`}>{commission}</p>
                <p className="text-gray-600 text-[10px] mt-1">commission</p>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-6">
            A seller processing ₦100M/month saves up to ₦3M monthly by upgrading from Free to Enterprise.
          </p>
        </div>

        {/* Contact form */}
        <div id="contact" className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Left — form */}
          <div>
            <h2 className="text-2xl font-black text-white mb-2">Talk to Our Sales Team</h2>
            <p className="text-gray-500 text-sm mb-8">
              Fill in the form and we'll get back to you within 24 hours.
            </p>

            {submitted ? (
              <div className="bg-green-950/40 border border-green-800/40 rounded-3xl p-10 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-white font-black text-xl mb-2">Inquiry Received!</h3>
                <p className="text-gray-400 mb-2">Thank you for your interest in Afritide Enterprise.</p>
                <p className="text-green-400 text-sm font-medium mb-6">
                  Our team will contact you within 24 hours.
                </p>
                <p className="text-gray-500 text-sm">
                  For urgent inquiries, chat with us on WhatsApp below.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Full Name *</label>
                    <input value={form.full_name}
                      onChange={e => setForm({...form, full_name: e.target.value})}
                      placeholder="John Doe"
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-violet-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Email Address *</label>
                    <input value={form.email} type="email"
                      onChange={e => setForm({...form, email: e.target.value})}
                      placeholder="john@company.com"
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-violet-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Company Name *</label>
                    <input value={form.company_name}
                      onChange={e => setForm({...form, company_name: e.target.value})}
                      placeholder="Acme Exports Ltd"
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-violet-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Your Role</label>
                    <select value={form.role}
                      onChange={e => setForm({...form, role: e.target.value})}
                      className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3 focus:outline-none appearance-none">
                      <option value="" className="bg-[#0a1a0f]">Select role</option>
                      {ROLES.map(r => <option key={r} value={r} className="bg-[#0a1a0f]">{r}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Country</label>
                    <input value={form.country}
                      onChange={e => setForm({...form, country: e.target.value})}
                      placeholder="e.g. Nigeria"
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-violet-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Phone Number</label>
                    <input value={form.phone}
                      onChange={e => setForm({...form, phone: e.target.value})}
                      placeholder="+234 800 000 0000"
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-violet-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Expected Monthly Volume</label>
                  <select value={form.monthly_volume}
                    onChange={e => setForm({...form, monthly_volume: e.target.value})}
                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3 focus:outline-none appearance-none">
                    <option value="" className="bg-[#0a1a0f]">Select volume</option>
                    {VOLUMES.map(v => <option key={v} value={v} className="bg-[#0a1a0f]">{v}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Tell us about your business *</label>
                  <textarea value={form.message}
                    onChange={e => setForm({...form, message: e.target.value})}
                    rows={4}
                    placeholder="What products do you trade? What markets do you serve? What challenges are you facing?"
                    className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-violet-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none" />
                </div>

                <button onClick={handleSubmit} disabled={submitting}
                  className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2">
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    : <>Send Inquiry <ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </div>
            )}
          </div>

          {/* Right — contact options */}
          <div className="space-y-6">
            <div>
              <h3 className="text-white font-bold text-lg mb-6">Other Ways to Reach Us</h3>
              <div className="space-y-4">
                <a href="https://wa.me/2349030320363?text=Hi%20Afritide%2C%20I%27m%20interested%20in%20the%20Enterprise%20plan"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-4 p-5 bg-green-950/30 border border-green-800/40 rounded-2xl hover:bg-green-950/50 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Chat on WhatsApp</p>
                    <p className="text-gray-500 text-xs">Get an instant response from our sales team</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-green-400 ml-auto transition-colors" />
                </a>

                <a href="mailto:afritidegroup@gmail.com?subject=Enterprise Plan Inquiry"
                  className="flex items-center gap-4 p-5 bg-white/[0.03] border border-white/[0.07] rounded-2xl hover:bg-white/[0.06] transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-violet-950/50 border border-violet-800/40 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Email Sales Team</p>
                    <p className="text-gray-500 text-xs">afritidegroup@gmail.com</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-violet-400 ml-auto transition-colors" />
                </a>
              </div>
            </div>

            {/* What happens next */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
              <h3 className="text-white font-bold text-sm mb-4">What Happens Next?</h3>
              <div className="space-y-4">
                {[
                  { step: "1", label: "We review your inquiry",       desc: "Within 24 hours of submission" },
                  { step: "2", label: "Sales call scheduled",         desc: "We discuss your specific needs" },
                  { step: "3", label: "Custom proposal sent",         desc: "Tailored pricing and features" },
                  { step: "4", label: "Onboarding & setup",           desc: "Dedicated manager guides you" },
                ].map(({ step, label, desc }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 mt-0.5">
                      {step}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{label}</p>
                      <p className="text-gray-600 text-xs">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trusted by */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
              <h3 className="text-white font-bold text-sm mb-3">Trusted by African Businesses</h3>
              <p className="text-gray-500 text-xs leading-relaxed">
                From individual farmers to large cooperatives and export companies,
                Afritide powers agricultural trade across Africa.
                Join hundreds of businesses already growing on our platform.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
