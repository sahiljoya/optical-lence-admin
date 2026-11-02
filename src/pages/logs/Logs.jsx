import { useState, useEffect, useMemo } from "react";
import {
  ShieldAlert,
  History,
  Loader2,
  Search,
  RefreshCw,
  X,
  Filter,
  User,
  Clock,
  Sparkles
} from "lucide-react";
import { auditLogService } from "@/services/auditLogService";
import { getItem } from "@/services/storage";
import "@/styles/veriwide.css";

const CATEGORIES = [
  { id: "ALL", label: "All Activities" },
  { id: "CUSTOMER", label: "Customer & KYC" },
  { id: "PRICING", label: "Pricing & Limits" },
  { id: "RETURNS", label: "Returns & Claims" },
  { id: "STAFF", label: "Team & Roles" },
  { id: "INVENTORY", label: "Products & Stock" },
  { id: "SYSTEM", label: "System & Courier" }
];

const formatActionLabel = (action = "") =>
  (action || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const getActionMeta = (action = "") => {
  const act = action.toUpperCase();
  if (act.includes("REJECT") || act.includes("FROZEN") || act.includes("DELETE") || act.includes("REMOVE")) {
    return {
      pill: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-500"
    };
  }
  if (act.includes("APPROVE") || act.includes("CREATE") || act.includes("UNFROZEN") || act.includes("ACTIVE")) {
    return {
      pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500"
    };
  }
  if (act.includes("UPDATE") || act.includes("SET") || act.includes("EDIT")) {
    return {
      pill: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500"
    };
  }
  return {
    pill: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500"
  };
};

function formatRelativeTime(dateInput) {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);

  if (diffSec < 45) return "Just now";
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins} min${mins > 1 ? "s" : ""} ago`;
  }

  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeStr = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  return (
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) +
    `, ${timeStr}`
  );
}

function renderDescription(desc = "") {
  if (!desc) return <span className="text-slate-400 italic">No description</span>;
  // Match quoted parts e.g. "Sharma Opticals"
  const parts = desc.split(/("(?:[^"\\]|\\.)*")/g);
  return (
    <span className="leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith('"') && part.endsWith('"')) {
          const content = part.slice(1, -1);
          return (
            <span
              key={i}
              className="inline-block mx-1 px-1.5 py-0.5 text-[12px] font-semibold text-slate-900 bg-slate-100 rounded border border-slate-200/80"
            >
              {content}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export function Logs() {
  const storedUser = getItem("admin_user");
  const isAdmin = storedUser?.role?.name === "admin";

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const itemsPerPage = 25;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        pageNo: page,
        size: itemsPerPage
      };
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (category && category !== "ALL") {
        params.category = category;
      }

      const res = await auditLogService.getLogs(params);
      setLogs(res.data?.list || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error(err);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchLogs();
  }, [page, debouncedSearch, category]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShieldAlert size={40} className="text-rose-400 mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
        <p className="text-[13px] text-slate-500 mt-1 max-w-sm">
          Activity Logs are visible to Owner / Admin accounts only. This cannot be granted through Roles & Access.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <div className="w-full pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-3">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }} className="flex items-center gap-2 text-slate-900">
            <History size={24} className="text-blue-600" /> Activity Logs
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            Track every consequential action taken across customers, orders, team, and pricing in clear human language.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : "text-slate-500"} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategory(cat.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px] md:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search person, store, action..."
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="vw-card flex flex-col mt-3 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden" style={{ padding: 0 }}>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[760px]" style={{ fontSize: 13, borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--soft-bg)", borderBottom: "1px solid var(--divider)" }}>
              <tr>
                <th className="py-3 px-4 font-semibold text-slate-600 w-[170px]">Action</th>
                <th className="py-3 px-4 font-semibold text-slate-600">Activity Details</th>
                <th className="py-3 px-4 font-semibold text-slate-600 w-[180px]">Performed By</th>
                <th className="py-3 px-4 font-semibold text-slate-600 w-[110px]">Entity</th>
                <th className="py-3 px-4 font-semibold text-slate-600 text-right w-[150px]">When</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Loader2 size={20} className="animate-spin inline-block text-blue-600 mb-2" />
                    <div className="text-xs font-semibold text-slate-600">Loading activity logs...</div>
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => {
                  const meta = getActionMeta(log.action);
                  return (
                    <tr
                      key={log._id}
                      style={{ borderBottom: "1px solid var(--divider)" }}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Action Pill */}
                      <td className="py-3.5 px-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide border shadow-2xs ${meta.pill}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {formatActionLabel(log.action)}
                        </span>
                      </td>

                      {/* Description / Enriched Details */}
                      <td className="py-3.5 px-4 align-top text-slate-700 text-[13px]">
                        {renderDescription(log.description)}
                      </td>

                      {/* Performed By */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 uppercase">
                            {(log.actor_name || "U")[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 text-[12px] truncate">
                              {log.actor_name || "Unknown"}
                            </div>
                            <div className="text-[11px] text-slate-400 capitalize">
                              {log.actor_role || "Staff"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Entity */}
                      <td className="py-3.5 px-4 align-top">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {log.entity || "Shared"}
                        </span>
                      </td>

                      {/* Relative Time */}
                      <td
                        className="py-3.5 px-4 align-top text-right text-slate-500 text-[12px] whitespace-nowrap"
                        title={new Date(log.created_at).toLocaleString("en-IN", {
                          dateStyle: "full",
                          timeStyle: "medium"
                        })}
                      >
                        <div className="font-medium text-slate-700">
                          {formatRelativeTime(log.created_at)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {new Date(log.created_at).toLocaleTimeString("en-IN", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <History size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No activity logs found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {search || category !== "ALL"
                        ? "Try clearing filters or search query"
                        : "No activity has been recorded yet."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between p-3.5 sm:p-4 gap-3"
          style={{ borderTop: "1px solid var(--divider)", background: "var(--soft-bg)" }}
        >
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Showing {total === 0 ? 0 : (page - 1) * itemsPerPage + 1} to{" "}
            {Math.min(page * itemsPerPage, total)} of {total} activities
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
            >
              Previous
            </button>
            <span className="text-xs font-semibold px-2 text-slate-600">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0 || loading}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
