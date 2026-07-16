"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import apiClient from "@/lib/api/client";
import {
  Search, CheckCircle2, XCircle, Shield,
  UserX, UserCheck, Eye, X, FileText, ExternalLink,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  { label: "Overview",      href: "/dashboard/admin",              icon: Shield },
  { label: "Users",         href: "/dashboard/admin/users",        icon: UserCheck },
  { label: "Products",      href: "/dashboard/admin/products",     icon: FileText },
  { label: "Orders",        href: "/dashboard/admin/orders",       icon: FileText },
  { label: "Sourcing",      href: "/dashboard/admin/sourcing",     icon: FileText },
  { label: "Commodities",   href: "/dashboard/admin/commodities",  icon: FileText },
  { label: "Certificates",  href: "/dashboard/admin/certificates", icon: Shield },
  { label: "Announcements", href: "/dashboard/admin/announce",     icon: FileText },
  { label: "Analytics",     href: "/dashboard/admin/analytics",    icon: FileText },
  { label: "Reports",       href: "/dashboard/admin/reports",      icon: FileText },
  { label: "Support",       href: "/dashboard/admin/support",      icon: FileText },
];

const ROLE_FILTERS   = ["all", "BUYER", "FARMER", "EXPORTER", "COOPERATIVE", "ADMIN"];
const STATUS_FILTERS = ["all", "PENDING", "ACTIVE", "VERIFIED", "SUSPENDED"];

export default function AdminUsersPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [search,       setSearch]       = useState("");
  const [roleFilter,   setRoleFilter]   = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDocs,     setUserDocs]     = useState<any[]>([]);
  const [loadingDocs,  setLoadingDocs]  = useState(false);

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
    const matchRole   = roleFilter === "all" || u.role === roleFilter;
    const matchSearch = !search ||
      u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const openUserDocs = async (u: any) => {
    setSelectedUser(u);
    setLoadingDocs(true);
    try {
      const res = await apiClient.get(`/certificates/user/${u.id}`);
      setUserDocs(res.data?.data || []);
    } catch {
      setUserDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const approveKYC = async (id: string) => {
    try {
      await apiClient.put(`/admin/users/${id}/approve-kyc`);
      toast.success("KYC approved");
      setSelectedUser(null);
      refetch();
    } catch { toast.error("Failed"); }
  };

  const rejectKYC = async (id: string) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    try {
      await apiClient.put(`/admin/users/${id}/reject-kyc?reason=${encodeURIComponent(reason)}`);
      toast.success("KYC rejected");
      setSelectedUser(null);
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
    <DashboardLayout navItems={NAV_ITEMS} title="User Management">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Users</h2>
          <p className="text-gray-500 text-sm mt-1">{users.length} users found</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] focus:border-green-700/50 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none transition-colors" />
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
                      <span className="text-xs text-gray-400 capitalize bg-white/[0.04] px-2 py-1 rounded-lg">
                        {u.role?.replace(/_/g, " ").toLowerCase()}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${
                        u.status === "ACTIVE" || u.status === "VERIFIED" ? "bg-green-500/20 text-green-400 border-green-700/40"
                        : u.status === "PENDING" ? "bg-amber-500/20 text-amber-400 border-amber-700/40"
                        : "bg-red-500/20 text-red-400 border-red-700/40"
                      }`}>{u.status?.toLowerCase()}</span>
                    </div>
                    <div className="col-span-1">
                      {u.kyc_submitted ? (
                        <button onClick={() => openUserDocs(u)}
                          className="flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors">
                          {u.kyc_approved
                            ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                            : <Shield className="w-4 h-4 text-amber-400" />
                          }
                          <Eye className="w-3 h-3" />
                        </button>
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-700" />
                      )}
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
                      {u.status === "ACTIVE" || u.status === "VERIFIED" ? (
                        <button onClick={() => suspendUser(u.id)}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-600/10 text-red-400 border border-red-700/30 hover:bg-red-600/20 transition-colors flex items-center gap-1">
                          <UserX className="w-3 h-3" /> Suspend
                        </button>
                      ) : u.status === "SUSPENDED" ? (
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

      {/* KYC Document Viewer Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
          <div className="relative bg-[#0a1a0f] border border-white/[0.08] rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-bold text-lg">
                  {selectedUser.first_name} {selectedUser.last_name}
                </h3>
                <p className="text-gray-500 text-xs mt-0.5">
                  {selectedUser.email} · {selectedUser.role?.replace(/_/g, " ").toLowerCase()}
                </p>
              </div>
              <button onClick={() => setSelectedUser(null)}>
                <X className="w-5 h-5 text-gray-600 hover:text-white transition-colors" />
              </button>
            </div>

            {/* User info */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Status",    value: selectedUser.status?.toLowerCase() },
                  { label: "KYC",       value: selectedUser.kyc_approved ? "Approved" : selectedUser.kyc_submitted ? "Pending" : "Not submitted" },
                  { label: "Joined",    value: formatDate(selectedUser.created_at) },
                  { label: "Role",      value: selectedUser.role?.replace(/_/g, " ").toLowerCase() },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-white text-sm font-medium capitalize">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="mb-5">
              <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-3">Submitted Documents</h4>
              {loadingDocs ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => <div key={i} className="h-14 bg-white/[0.03] rounded-xl animate-pulse" />)}
                </div>
              ) : userDocs.length === 0 ? (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                  <p className="text-gray-600 text-sm">No documents found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userDocs.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <div>
                          <p className="text-white text-sm font-medium capitalize">
                            {doc.notes?.replace("KYC: ", "") || doc.type?.replace(/_/g, " ").toLowerCase()}
                          </p>
                          <p className="text-gray-600 text-xs">{formatDate(doc.created_at)}</p>
                        </div>
                      </div>
                      {doc.document_url && (
                        <a href={doc.document_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-bold text-green-400 hover:text-green-300 bg-green-950/40 border border-green-800/40 px-3 py-1.5 rounded-xl transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" /> View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            {selectedUser.kyc_submitted && !selectedUser.kyc_approved && (
              <div className="flex gap-3">
                <button onClick={() => approveKYC(selectedUser.id)}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Approve KYC
                </button>
                <button onClick={() => rejectKYC(selectedUser.id)}
                  className="flex-1 bg-red-600/20 hover:bg-red-600/30 border border-red-700/40 text-red-400 font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" /> Reject KYC
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}