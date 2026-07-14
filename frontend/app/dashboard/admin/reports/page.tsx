"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ADMIN_NAV } from "@/components/dashboard/AdminNav";
import apiClient from "@/lib/api/client";
import {
  Download, FileText, Users, Package,
  ShoppingCart, TrendingUp, Loader2, Calendar,
} from "lucide-react";
import toast from "react-hot-toast";

const REPORTS = [
  {
    id: "users",
    title: "Users Report",
    desc: "All registered users with roles, status, KYC, and join date",
    icon: Users,
    color: "text-green-400",
    bg: "bg-green-950/50 border-green-900/50",
    endpoint: "/admin/reports/users",
    filename: "afritide-users-report.csv",
  },
  {
    id: "products",
    title: "Products Report",
    desc: "All listed products with seller, category, price, and status",
    icon: Package,
    color: "text-sky-400",
    bg: "bg-sky-950/50 border-sky-900/50",
    endpoint: "/admin/reports/products",
    filename: "afritide-products-report.csv",
  },
  {
    id: "orders",
    title: "Orders Report",
    desc: "All orders with buyer, seller, amount, and status",
    icon: ShoppingCart,
    color: "text-amber-400",
    bg: "bg-amber-950/50 border-amber-900/50",
    endpoint: "/admin/reports/orders",
    filename: "afritide-orders-report.csv",
  },
  {
    id: "commodities",
    title: "Commodity Prices Report",
    desc: "Full commodity price board history with trends",
    icon: TrendingUp,
    color: "text-violet-400",
    bg: "bg-violet-950/50 border-violet-900/50",
    endpoint: "/admin/reports/commodities",
    filename: "afritide-commodities-report.csv",
  },
];

export default function AdminReportsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
    else if (user?.role !== "ADMIN") router.push("/dashboard/farmer");
  }, [isAuthenticated, user, router]);

  const handleDownload = async (report: typeof REPORTS[0]) => {
    setDownloading(report.id);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      const res = await apiClient.get(
        `${report.endpoint}?${params.toString()}`,
        { responseType: "blob" }
      );

      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", report.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${report.title} downloaded`);
    } catch (err: any) {
      if (err.response?.status === 404) {
        toast.error("CSV export not available — use JSON instead");
      } else {
        toast.error("Failed to download report");
      }
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadJSON = async (report: typeof REPORTS[0]) => {
    setDownloading(report.id + "-json");
    try {
      const endpointMap: Record<string, string> = {
        users:       "/admin/users?page_size=1000",
        products:    "/products?page_size=1000",
        orders:      "/orders?page_size=1000",
        commodities: "/commodities?page_size=1000",
      };

      const res = await apiClient.get(endpointMap[report.id]);
      const data = res.data?.data || res.data || [];

      const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: "application/json" }
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", report.filename.replace(".csv", ".json"));
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${report.title} downloaded as JSON`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to download JSON");
    } finally {
      setDownloading(null);
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="Reports">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Reports & Exports</h2>
          <p className="text-gray-500 text-sm mt-1">Download platform data as CSV or JSON</p>
        </div>

        {/* Date filter */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <h3 className="text-white font-bold mb-4 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-green-500" /> Date Range Filter (optional)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Report cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORTS.map((report) => (
            <div key={report.id} className={`${report.bg} border rounded-2xl p-6`}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                  <report.icon className={`w-5 h-5 ${report.color}`} />
                </div>
                <div>
                  <h3 className="text-white font-bold">{report.title}</h3>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{report.desc}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadJSON(report)}
                  disabled={downloading === report.id + "-json"}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-gray-300 hover:text-white font-bold py-2.5 rounded-xl transition-all text-xs"
                >
                  {downloading === report.id + "-json"
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Download className="w-3.5 h-3.5" />
                  }
                  JSON
                </button>
                <button
                  onClick={() => handleDownload(report)}
                  disabled={downloading === report.id}
                  className={`flex-1 flex items-center justify-center gap-2 ${report.bg} hover:brightness-125 border text-white font-bold py-2.5 rounded-xl transition-all text-xs`}
                >
                  {downloading === report.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <FileText className="w-3.5 h-3.5" />
                  }
                  CSV
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Full platform report */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4 text-sm">Platform Summary Export</h3>
          <p className="text-gray-500 text-sm mb-4">
            Export a complete platform summary including all key metrics in one file.
          </p>
          <button
            disabled={downloading === "summary"}
            onClick={async () => {
              setDownloading("summary");
              try {
                const [usersRes, productsRes, ordersRes, commoditiesRes] = await Promise.all([
                  apiClient.get("/admin/users?page_size=1000"),
                  apiClient.get("/products?page_size=1000"),
                  apiClient.get("/orders?page_size=1000"),
                  apiClient.get("/commodities?page_size=1000"),
                ]);

                const summary = {
                  generated_at: new Date().toISOString(),
                  platform: "Afritide Agriculture Marketplace",
                  totals: {
                    users:       usersRes.data?.pagination?.total ?? usersRes.data?.data?.length ?? 0,
                    products:    productsRes.data?.pagination?.total ?? productsRes.data?.data?.length ?? 0,
                    orders:      ordersRes.data?.pagination?.total ?? ordersRes.data?.data?.length ?? 0,
                    commodities: commoditiesRes.data?.pagination?.total ?? commoditiesRes.data?.data?.length ?? 0,
                  },
                  users:       usersRes.data?.data || [],
                  products:    productsRes.data?.data || [],
                  orders:      ordersRes.data?.data || [],
                  commodities: commoditiesRes.data?.data || [],
                };

                const blob = new Blob(
                  [JSON.stringify(summary, null, 2)],
                  { type: "application/json" }
                );
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute(
                  "download",
                  `afritide-full-report-${new Date().toISOString().split("T")[0]}.json`
                );
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                toast.success("Full platform report downloaded");
              } catch (err: any) {
                toast.error(err.response?.data?.detail || "Failed to generate report");
              } finally {
                setDownloading(null);
              }
            }}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {downloading === "summary"
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              : <><Download className="w-4 h-4" /> Download Full Platform Report</>
            }
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
