"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ADMIN_NAV } from "@/components/dashboard/AdminNav";
import apiClient from "@/lib/api/client";
import {
  Search, CheckCircle2, XCircle, Shield,
  UserX, UserCheck, ChevronDown,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const ROLE_FILTERS = ["all", "BUYER", "FARMER", "EXPORTER", "COOPERATIVE", "ADMIN"];
const STATUS_FILTERS = ["all", "pending", "active", "verified", "suspended"];

export default function AdminUsersPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
    else if (user?.role !== "ADMIN") router.push("/dashboard/farmer");
  }, [isAuthenticated, user, router]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-all-users", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}&page_size=100` : "?page_size=100";
      const res = await apiClient.get(`/admin/users${params}`);
      return res.data;
    },
    enabled: isAuthenticated && user?.role === "ADMIN",
  });

  const users = (data?.data || []).filter((u: any) => {
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchSearch = !search ||
      u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const approveKYC = async (id: string) => {
    try {
      await apiClient.put(`/admin/users/${id}/approve-kyc`);
      toast.success("KYC approved");
      refetch();
    } catch { toast.error("Failed"); }
  };

  const rejectKYC = async (id: string) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    try {
      await apiClient.put(`/admin/users/${id}/reject-kyc?reason=${encodeURIComponent(reason)}`);
      toast.success("KYC rejected");
      refetch();
    } catch { toast.error("Failed"); }
  };

  const suspendUser = async (id: string) => {
    if (!confirm("Suspend this user?")) return;
    try {
      await apiClient.put(`/admin/users/${id}/suspend`);
      toast.success("User suspended");
      refetch();
    } catch { toast.error("Failed"); }
  };

  const reactivateUser = async (id: string) => {
    try {
      await apiClient.put(`/admin/users/${id}/reactivate`);
      toast.success("User reactivated");
      refetch();
    } catch { toast.error("Failed"); }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="User Management">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Users</h2>
          <p className="text-gray-500 text-sm mt-1">{users.length} users found</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] focus:border-green-700/50 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {ROLE_FILTERS.map(f => (
              <button key={f} onClick={() => setRoleFilter(f)}
                className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all capitalize ${
                  roleFilter === f ? "bg-green-600 text-white" : "bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]"
                }`}>{f}</button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {STATUS_FILTERS.map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all capitalize ${
                  statusFilter === f ? "bg-sky-600 text-white" : "bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]"
                }`}>{f}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-white/[0.03] rounded-xl animate-pulse" />)}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="w-10 h-10 text-gray-700 mb-3" />
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-600 font-medium uppercase tracking-wide">
                <div className="col-span-3">User</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1">KYC</div>
                <div className="col-span-2">Actions</div>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {users.map((u: any) => (
                  <div key={u.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center">
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-900/40 flex items-center justify-center text-green-400 font-black text-xs flex-shrink-0">
                        {u.first_name?.[0]}{u.last_name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{u.first_name} {u.last_name}</p>
                        <p className="text-gray-600 text-xs">{formatDate(u.created_at)}</p>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <p className="text-gray-400 text-xs truncate">{u.email}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-gray-400 capitalize bg-white/[0.04] px-2 py-1 rounded-lg">{u.role?.replace("_", " ")}</span>
                    </div>
                    <div className="col-span-1">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${
                        u.status === "active" || u.status === "verified" ? "bg-green-500/20 text-green-400 border-green-700/40"
                        : u.status === "pending" ? "bg-amber-500/20 text-amber-400 border-amber-700/40"
                        : "bg-red-500/20 text-red-400 border-red-700/40"
                      }`}>{u.status}</span>
                    </div>
                    <div className="col-span-1">
                      {u.kyc_approved
                        ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                        : u.kyc_submitted
                        ? <Shield className="w-4 h-4 text-amber-400" />
                        : <XCircle className="w-4 h-4 text-gray-700" />
                      }
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
                      {u.kyc_submitted && !u.kyc_approved && (
                        <>
                          <button onClick={() => approveKYC(u.id)}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-green-600/20 text-green-400 border border-green-700/40 hover:bg-green-600/30 transition-colors">
                            ✓ KYC
                          </button>
                          <button onClick={() => rejectKYC(u.id)}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-600/10 text-red-400 border border-red-700/30 hover:bg-red-600/20 transition-colors">
                            ✗ KYC
                          </button>
                        </>
                      )}
                      {u.status === "active" || u.status === "verified" ? (
                        <button onClick={() => suspendUser(u.id)}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-600/10 text-red-400 border border-red-700/30 hover:bg-red-600/20 transition-colors flex items-center gap-1">
                          <UserX className="w-3 h-3" /> Suspend
                        </button>
                      ) : u.status === "suspended" ? (
                        <button onClick={() => reactivateUser(u.id)}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-green-600/20 text-green-400 border border-green-700/40 hover:bg-green-600/30 transition-colors flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> Reactivate
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

