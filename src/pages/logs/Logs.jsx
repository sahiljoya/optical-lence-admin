import { useState, useEffect } from "react";
import { ShieldAlert, History, Loader2 } from "lucide-react";
import { auditLogService } from "@/services/auditLogService";
import { getItem } from "@/services/storage";
import "@/styles/veriwide.css";

const formatActionLabel = (action) =>
  (action || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const ACTION_COLOR = (action) => {
  if (action.includes("REJECTED") || action.includes("FROZEN") || action.includes("DELETED")) return "bg-rose-50 text-rose-700 border-rose-200";
  if (action.includes("APPROVED") || action.includes("CREATED") || action.includes("UNFROZEN")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
};

export function Logs() {
  const storedUser = getItem("admin_user");
  const isAdmin = storedUser?.role?.name === "admin";

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const itemsPerPage = 25;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditLogService.getLogs({ pageNo: page, size: itemsPerPage });
      setLogs(res.data?.list || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error(err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchLogs();
  }, [page]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShieldAlert size={40} className="text-rose-400 mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
        <p className="text-[13px] text-slate-500 mt-1 max-w-sm">Activity Logs are visible to Owner / Admin accounts only. This cannot be granted through Roles & Access.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-3">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }} className="flex items-center gap-2"><History size={22} className="text-blue-600" /> Activity Logs</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            Every consequential action taken by your team. Shared-entity actions are visible to every admin; entity-specific actions are visible only to that entity's own admin.
          </p>
        </div>
      </div>

      <div className="vw-card flex flex-col mt-4" style={{ padding: 0, overflow: "hidden" }}>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[760px]" style={{ fontSize: 13, borderCollapse: "collapse" }}>
            <thead style={{ background: "var(--soft-bg)", borderBottom: "1px solid var(--divider)" }}>
              <tr>
                <th className="py-3 px-4 font-semibold text-muted-foreground">Action</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground">Description</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground">Performed By</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground">Entity</th>
                <th className="py-3 px-4 font-semibold text-muted-foreground text-right">When</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-slate-500"><Loader2 size={18} className="animate-spin inline-block" /></td></tr>
              ) : logs.length > 0 ? logs.map((log) => (
                <tr key={log._id} style={{ borderBottom: "1px solid var(--divider)" }} className="hover:bg-accent/50">
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wide border ${ACTION_COLOR(log.action)}`}>
                      {formatActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 max-w-md">{log.description}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{log.actor_name}</div>
                    <div className="text-[11px] text-slate-400 capitalize">{log.actor_role}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">{log.entity}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500 text-[12px]">
                    {new Date(log.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="py-10 text-center text-slate-500">No activity recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-3" style={{ borderTop: "1px solid var(--divider)", background: "var(--soft-bg)" }}>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Showing {total === 0 ? 0 : (page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, total)} of {total} entries
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded border border-card-border bg-card text-[13px] font-medium disabled:opacity-50 hover:bg-accent transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="px-3 py-1.5 rounded border border-card-border bg-card text-[13px] font-medium disabled:opacity-50 hover:bg-accent transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
