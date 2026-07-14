"use client";
import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import apiClient from "@/lib/api/client";
import {
  Shield, Upload, CheckCircle2, Clock,
  AlertCircle, FileText, Loader2, ArrowRight,
  BadgeCheck, X,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

const KYC_STEPS = [
  { n: 1, label: "Identity",     desc: "Government-issued ID" },
  { n: 2, label: "Business",     desc: "Business registration" },
  { n: 3, label: "Review",       desc: "Admin verification" },
];

export default function VerifyPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [docUrl, setDocUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
    if (user?.kyc_approved) setSubmitted(true);
    else if (user?.kyc_submitted) setSubmitted(true);
  }, [isAuthenticated, user, router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      // No Content-Type header — let axios set it automatically with boundary
      const res = await apiClient.post("/certificates/upload-doc", formData);
      if (res.data.success) {
        setDocUrl(res.data.data.document_url);
        toast.success("Document uploaded successfully");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDocType) { toast.error("Please select a document type"); return; }
    if (!docUrl) { toast.error("Please upload your document first"); return; }
    setSubmitting(true);
    try {
      await apiClient.put("/users/me", {
        kyc_submitted: true,
        kyc_document_url: docUrl,
      });
      await apiClient.post(
        `/certificates/from-url?type=other&document_url=${encodeURIComponent(docUrl)}&notes=${encodeURIComponent(`KYC: ${selectedDocType}`)}`
      );
      setSubmitted(true);
      toast.success("KYC submitted! Admin will review within 24-48 hours.");
    } catch {
      toast.error("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <main className="min-h-screen bg-[#060f08]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-green-950/60 border border-green-800/40 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">KYC Verification</h1>
          <p className="text-gray-500">Get verified to unlock full platform features and build buyer trust</p>
        </div>

        {/* Already approved */}
        {user.kyc_approved ? (
          <div className="bg-green-950/40 border border-green-800/40 rounded-3xl p-10 text-center">
            <BadgeCheck className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white mb-2">You&apos;re Verified! 🎉</h2>
            <p className="text-gray-400 mb-6">Your account has been verified. You have a verified badge on your profile.</p>
            <Link href="/profile" className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3 rounded-xl transition-colors">
              View Profile →
            </Link>
          </div>
        ) : submitted ? (
          <div className="bg-amber-950/30 border border-amber-800/40 rounded-3xl p-10 text-center">
            <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white mb-2">Under Review</h2>
            <p className="text-gray-400 mb-2">Your documents have been submitted and are being reviewed by our team.</p>
            <p className="text-amber-400 text-sm font-medium mb-6">Expected review time: 24-48 hours</p>
            <Link href="/dashboard/farmer" className="bg-white/[0.06] hover:bg-white/[0.09] border border-white/[0.1] text-white font-bold px-8 py-3 rounded-xl transition-colors">
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-4 mb-10">
              {KYC_STEPS.map(({ n, label, desc }) => (
                <div key={n} className="flex items-center gap-3">
                  <div className={`flex flex-col items-center ${n <= step ? "opacity-100" : "opacity-40"}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm mb-1 transition-all ${
                      step > n ? "bg-green-600 text-white"
                      : step === n ? "bg-green-600 text-white ring-4 ring-green-600/20"
                      : "bg-white/[0.06] text-gray-500 border border-white/[0.1]"
                    }`}>
                      {step > n ? <CheckCircle2 className="w-5 h-5" /> : n}
                    </div>
                    <p className="text-xs text-white font-medium">{label}</p>
                    <p className="text-[10px] text-gray-600">{desc}</p>
                  </div>
                  {n < 3 && <div className="w-12 h-px bg-white/[0.08] mb-6" />}
                </div>
              ))}
            </div>

            {/* Benefits */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 mb-6">
              <h3 className="text-white font-bold mb-3 text-sm">Why get verified?</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  "Verified badge on your profile",
                  "Higher buyer trust and conversions",
                  "Access to export documentation",
                  "Priority listing in search results",
                  "Unlock premium features",
                  "Government-certified badge",
                ].map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-400 text-xs">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1: Identity */}
            {step === 1 && (
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="text-white font-bold mb-1">Step 1: Identity Document</h3>
                  <p className="text-gray-500 text-sm">Upload a government-issued ID (National ID, Passport, or Driver&apos;s License)</p>
                </div>

                <div className="space-y-3">
                  {["National ID Card", "International Passport", "Driver's License", "Voter's Card"].map((doc) => (
                    <button
                      key={doc}
                      type="button"
                      onClick={() => setSelectedDocType(doc)}
                      className={`w-full flex items-center gap-3 p-3.5 border rounded-xl transition-all text-left ${
                        selectedDocType === doc
                          ? "border-green-600/70 bg-green-950/40 text-white"
                          : "border-white/[0.06] bg-white/[0.02] text-gray-300 hover:border-white/[0.14] hover:text-white"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        selectedDocType === doc ? "border-green-500" : "border-white/[0.2]"
                      }`}>
                        {selectedDocType === doc && <div className="w-2 h-2 rounded-full bg-green-500" />}
                      </div>
                      <span className="text-sm font-medium">{doc}</span>
                    </button>
                  ))}
                </div>

                {/* Upload area */}
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    docUrl ? "border-green-600/60 bg-green-950/20" : "border-white/[0.1] hover:border-green-700/40 hover:bg-white/[0.02]"
                  }`}
                >
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                      <p className="text-gray-400 text-sm">Uploading...</p>
                    </div>
                  ) : docUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      <CheckCircle2 className="w-8 h-8 text-green-400" />
                      <p className="text-green-400 font-medium text-sm">Document uploaded</p>
                      <p className="text-gray-600 text-xs">{docUrl.replace("uploaded:", "")}</p>
                      <button onClick={(e) => { e.stopPropagation(); setDocUrl(""); }} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                        <X className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="w-8 h-8 text-gray-600" />
                      <div>
                        <p className="text-gray-300 font-medium text-sm">Click to upload document</p>
                        <p className="text-gray-600 text-xs mt-1">PDF, JPG or PNG · Max 10MB</p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!docUrl || !selectedDocType}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 2: Business */}
            {step === 2 && (
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="text-white font-bold mb-1">Step 2: Business Registration</h3>
                  <p className="text-gray-500 text-sm">Upload your business registration certificate or CAC document (optional for individual farmers)</p>
                </div>

                <div className="bg-amber-950/30 border border-amber-800/30 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-300 text-xs leading-relaxed">
                    Individual farmers can skip this step. Business registration is required for cooperatives and exporters.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setStep(3)}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    Continue to Review <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setStep(1)}
                    className="w-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-gray-400 hover:text-white font-medium py-3 rounded-2xl transition-all text-sm"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Submit */}
            {step === 3 && (
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="text-white font-bold mb-1">Step 3: Review & Submit</h3>
                  <p className="text-gray-500 text-sm">Review your submission before sending to our verification team</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-green-500" />
                      <span className="text-gray-300 text-sm">Identity Document</span>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-500 text-sm">Business Registration</span>
                    </div>
                    <span className="text-gray-600 text-xs">Skipped</span>
                  </div>
                </div>

                <div className="bg-green-950/30 border border-green-800/30 rounded-xl p-4">
                  <p className="text-green-300 text-sm leading-relaxed">
                    By submitting, you confirm that all documents are authentic and belong to you. False submissions will result in permanent account suspension.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-900/30"
                  >
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                      : <><Shield className="w-4 h-4" /> Submit for Verification</>
                    }
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="w-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-gray-400 hover:text-white font-medium py-3 rounded-2xl transition-all text-sm"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
