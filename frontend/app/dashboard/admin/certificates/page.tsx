"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ADMIN_NAV } from "@/components/dashboard/AdminNav";
import apiClient from "@/lib/api/client";
import { Shield, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AdminCertificatesPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
    else if (user?.role !== "admin") router.push("/dashboard/farmer");
  }, [isAuthenticated, user, router]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pending-certs"],
    queryFn: async () => {
      const res = await apiClient.get("/certificates/pending");
      return res.data;
    },
    enabled: isAuthenticated && user?.role === "admin",
  });

  const certs = data?.data || [];

  const approve = async (id: string) => {
    try {
      await apiClient.put(`/certificates/${id}/review?approved=true`);
      toast.success("Certificate approved");
      refetch();
    } catch { toast.error("Failed"); }
  };

  const reject = async (id: string) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    try {
      await apiClient.put(`/certificates/${id}/review?approved=false&rejection_reason=${encodeURIComponent(reason)}`);
      toast.success("Certificate rejected");
      refetch();
    } catch { toast.error("Failed"); }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="Certificates">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Certificate Review</h2>
          <p className="text-gray-500 text-sm mt-1">{certs.length} pending certificates</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-white/[0.03] rounded-xl animate-pulse" />)}
            </div>
          ) : certs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-700 mb-3" />
              <h3 className="text-white font-bold mb-1">All caught up!</h3>
              <p className="text-gray-600 text-sm">No certificates pending review</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-600 font-medium uppercase tracking-wide">
                <div className="col-span-3">User</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Cert No.</div>
                <div className="col-span-2">Submitted</div>
                <div className="col-span-1">Doc</div>
                <div className="col-span-2">Actions</div>
              </div>
              {certs.map((c: any) => (
                <div key={c.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center">
                  <div className="col-span-3">
                    <p className="text-gray-400 text-xs font-mono">{c.user_id?.slice(0, 12)}...</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-gray-300 capitalize bg-white/[0.04] px-2 py-1 rounded-lg">{c.type?.replace("_", " ")}</span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500 text-xs">{c.certificate_number || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500 text-xs">{formatDate(c.created_at)}</p>
                  </div>
                  <div className="col-span-1">
                    <a href={c.document_url} target="_blank" rel="noopener noreferrer"
                      className="text-green-400 hover:text-green-300 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <button onClick={() => approve(c.id)}
                      className="flex items-center gap-1 bg-green-600/20 hover:bg-green-600/40 border border-green-700/40 text-green-400 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => reject(c.id)}
                      className="flex items-center gap-1 bg-red-600/10 hover:bg-red-600/20 border border-red-700/30 text-red-400 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors">
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}