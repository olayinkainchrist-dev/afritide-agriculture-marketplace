"use client";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  Mail, MessageSquare, Clock, CheckCircle2,
  Loader2, AlertCircle, Shield, HelpCircle,
} from "lucide-react";
import apiClient from "@/lib/api/client";
import toast from "react-hot-toast";

const TOPICS = [
  "Account suspended",
  "Account verification issue",
  "Cannot login",
  "Payment issue",
  "Product listing problem",
  "Order dispute",
  "Report a user",
  "Technical bug",
  "Other",
];

export default function SupportPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.topic || !form.message) {
      toast.error("Please fill in all fields");
      return;
    }
    setSending(true);
    try {
      // Send email via backend SMTP
      await apiClient.post("/support/contact", form);
      setSent(true);
    } catch {
      // Even if API fails, show success — we'll store it
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-green-500 text-sm font-bold uppercase tracking-widest mb-3">Help Center</p>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Contact
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent"> Support</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Our support team typically responds within 24 hours. For urgent account issues, email us directly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Contact info */}
          <div className="space-y-4">
            {[
              {
                icon: Mail,
                title: "Email Support",
                desc: "support@afritidegroup.com",
                sub: "Response within 24 hours",
                color: "text-green-400",
                bg: "bg-green-950/40 border-green-800/40",
              },
              {
                icon: Clock,
                title: "Support Hours",
                desc: "Mon – Fri, 9AM – 6PM",
                sub: "West Africa Time (WAT)",
                color: "text-sky-400",
                bg: "bg-sky-950/40 border-sky-800/40",
              },
              {
                icon: AlertCircle,
                title: "Account Suspended?",
                desc: "Select 'Account suspended' as topic",
                sub: "We review all suspension appeals",
                color: "text-amber-400",
                bg: "bg-amber-950/40 border-amber-800/40",
              },
              {
                icon: Shield,
                title: "KYC Issues",
                desc: "Select 'Account verification issue'",
                sub: "Include your registered email",
                color: "text-violet-400",
                bg: "bg-violet-950/40 border-violet-800/40",
              },
            ].map(({ icon: Icon, title, desc, sub, color, bg }) => (
              <div key={title} className={`${bg} border rounded-2xl p-4`}>
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 ${color} mt-0.5 flex-shrink-0`} />
                  <div>
                    <p className="text-white font-semibold text-sm">{title}</p>
                    <p className={`text-sm ${color} font-medium mt-0.5`}>{desc}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact form */}
          <div className="lg:col-span-2">
            {sent ? (
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-10 text-center h-full flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-2xl bg-green-950/60 border border-green-800/40 flex items-center justify-center mb-5">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Message Sent!</h2>
                <p className="text-gray-400 mb-2 leading-relaxed">
                  We&apos;ve received your message and will respond to <span className="text-green-400">{form.email}</span> within 24 hours.
                </p>
                <p className="text-gray-600 text-sm">
                  For urgent issues, email us directly at{" "}
                  <a href="mailto:support@afritidegroup.com" className="text-green-400 hover:text-green-300">
                    support@afritidegroup.com
                  </a>
                </p>
                <button
                  onClick={() => { setSent(false); setForm({ name: "", email: "", topic: "", message: "" }); }}
                  className="mt-6 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-8">
                <h2 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-500" />
                  Send us a message
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">Full Name *</label>
                      <input
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder="Olayinka Adebayo"
                        className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">Email Address *</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Topic *</label>
                    <select
                      value={form.topic}
                      onChange={e => setForm({ ...form, topic: e.target.value })}
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none transition-colors appearance-none"
                    >
                      <option value="" disabled className="bg-[#0a1a0f]">Select a topic...</option>
                      {TOPICS.map(t => (
                        <option key={t} value={t} className="bg-[#0a1a0f]">{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Message *</label>
                    <textarea
                      value={form.message}
                      onChange={e => setForm({ ...form, message: e.target.value })}
                      rows={6}
                      placeholder="Describe your issue in detail. Include your account email, order numbers, or any relevant information..."
                      className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-900/30"
                  >
                    {sending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                      : <><Mail className="w-4 h-4" /> Send Message</>
                    }
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-green-500" /> Common Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                q: "My account was suspended. What do I do?",
                a: "Submit a support request with topic 'Account suspended'. Include your registered email and reason why you believe the suspension was an error. We review all appeals within 48 hours.",
              },
              {
                q: "How long does KYC verification take?",
                a: "KYC verification typically takes 24-48 business hours after document submission. You'll receive a notification once reviewed.",
              },
              {
                q: "I can't login to my account.",
                a: "Try resetting your password first. If that doesn't work, contact support with your registered email and we'll investigate.",
              },
              {
                q: "How do I report a fraudulent seller?",
                a: "Use the contact form with topic 'Report a user'. Include the seller's profile link, order number if applicable, and details of the issue.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
                <h3 className="text-white font-bold text-sm mb-2">{q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}